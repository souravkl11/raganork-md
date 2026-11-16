// hands every row that has no accountId to an account. runs on every boot and only does
// work when rows with accountId IS NULL exist, which also picks up rows that older code
// wrote after a rollback.
//
// gate: only when EVERY configured session resolved its account id on this boot. a session
// that failed to load, or has not logged in yet, makes the split unknowable: its rows would
// all go to the surviving account. the legacy rows stay visible to everyone through the
// "OR accountId IS NULL" clause of scoped models until a boot passes the gate.
//
//   one account        UPDATE ... SET accountId WHERE accountId IS NULL
//   several accounts   settings tables: every account gets a copy of each NULL row unless
//                      it already has a row with the same natural key, then the NULL row
//                      is deleted. UserStats: the first account gets them (merging into a
//                      row it already has). AntiDeleteCaches: deleted (48 hour cache).
//   antilink_configs   copied once into account_antilink_configs for every account that
//                      lacks the jid; the old table is left alone. completion is recorded
//                      in schema_migrations under COPY_NAME. while the gate is shut the copy
//                      still goes to the accounts that did resolve (nothing is recorded), or
//                      antilink would be silently off for them.
//
// self-contained: table names are written out, only the passed sequelize is used.
const { QueryTypes } = require("sequelize");

// natural key per settings table: the columns that say "same setting"
const SETTINGS = {
  _warns: { key: ["chat", "user", "timestamp"], time: ["timestamp"] },
  fakes: { key: ["jid"] },
  antilinks: { key: ["jid"] },
  antispams: { key: ["jid"] },
  pdms: { key: ["jid"] },
  antidemotes: { key: ["jid"] },
  antipromotes: { key: ["jid"] },
  antibots: { key: ["jid"] },
  antiwords: { key: ["jid"] },
  welcomes: { key: ["jid"] },
  goodbyes: { key: ["jid"] },
  filters: { key: ["jid", "trigger"] },
  automutes: { key: ["chat"] },
  autounmutes: { key: ["chat"] },
  stickcmds: { key: ["file"] },
  scheduled_messages: { key: ["jid", "message", "scheduleTime"], time: ["scheduleTime"] },
};

const COPY_NAME = "003-backfill-account-id:antilink-copy";
const COUNTERS = ["totalMessages", "textMessages", "imageMessages", "videoMessages", "audioMessages", "stickerMessages", "otherMessages"];
const CHUNK = 100;

module.exports = {
  stage: "data",
  repeat: true,
  async up({ sequelize, queryInterface, accounts, transaction, tableExists, logger }) {
    const qg = queryInterface.queryGenerator;
    const q = (name) => qg.quoteIdentifier(name);
    const t = (name) => qg.quoteTable(name);
    const run = (sql, replacements, type = QueryTypes.SELECT) =>
      sequelize.query(sql, { replacements, type, transaction });

    const ids = [...new Set((accounts || []).map((a) => a.accountId).filter(Boolean))];
    const resolvedIds = [...new Set((accounts || []).filter((a) => a.resolved && a.accountId).map((a) => a.accountId))];
    const gateOpen = (accounts || []).length > 0 && accounts.every((a) => a.resolved && a.accountId);

    // a table that exists and has the column (002 may not have run on a table created later)
    async function hasAccountColumn(table) {
      if (!(await tableExists(table))) return false;
      return Boolean((await queryInterface.describeTable(table, { transaction })).accountId);
    }
    async function countNull(table) {
      const [row] = await run(`SELECT COUNT(*) AS c FROM ${t(table)} WHERE ${q("accountId")} IS NULL`);
      return Number(row.c);
    }
    const nullRows = (table, order) =>
      run(`SELECT * FROM ${t(table)} WHERE ${q("accountId")} IS NULL ORDER BY ${q(order)}`);
    async function insertRows(table, rows) {
      for (let i = 0; i < rows.length; i += CHUNK) {
        await queryInterface.bulkInsert(table, rows.slice(i, i + CHUNK), { transaction });
      }
    }
    const deleteNull = (table) =>
      run(`DELETE FROM ${t(table)} WHERE ${q("accountId")} IS NULL`, {}, QueryTypes.DELETE);

    async function copyAntilink(accountIds) {
      if (accountIds.length === 0) return false;
      if (!(await tableExists("antilink_configs")) || !(await tableExists("account_antilink_configs"))) return false;
      const old = await run(`SELECT * FROM ${t("antilink_configs")}`);
      const have = new Set(
        (await run(`SELECT ${q("accountId")}, ${q("jid")} FROM ${t("account_antilink_configs")}`)).map(
          (row) => `${row.accountId}\u0001${row.jid}`,
        ),
      );
      const copies = [];
      for (const row of old) {
        for (const accountId of accountIds) {
          if (!have.has(`${accountId}\u0001${row.jid}`)) copies.push({ ...row, accountId });
        }
      }
      await insertRows("account_antilink_configs", copies);
      if (copies.length) logger?.info?.({ copied: copies.length }, "Copied antilink settings to the per-account table");
      return true;
    }

    const timeValue = (value) => {
      const ms = new Date(value).getTime();
      return Number.isNaN(ms) ? String(value) : String(ms);
    };
    const naturalKey = (row, spec) =>
      spec.key.map((col) => (row[col] == null ? "\u0000" : spec.time?.includes(col) ? timeValue(row[col]) : String(row[col]))).join("\u0001");

    // ---- the antilink copy, with or without the gate
    const alreadyCopied = (await run(`SELECT COUNT(*) AS c FROM ${t("schema_migrations")} WHERE ${q("name")} = :name`, { name: COPY_NAME }))[0];
    if (Number(alreadyCopied.c) === 0) {
      const copied = await copyAntilink(gateOpen ? ids : resolvedIds);
      if (copied && gateOpen) {
        await queryInterface.bulkInsert("schema_migrations", [{ name: COPY_NAME, appliedAt: new Date() }], { transaction });
      }
    }

    // ---- the backfill proper
    const pending = {};
    let anyPending = false;
    for (const table of [...Object.keys(SETTINGS), "UserStats", "AntiDeleteCaches"]) {
      if (!(await hasAccountColumn(table))) continue;
      pending[table] = await countNull(table);
      if (pending[table] > 0) anyPending = true;
    }
    if (!anyPending) return;

    if (!gateOpen) {
      const unresolved = (accounts || []).filter((a) => !(a.resolved && a.accountId)).map((a) => a.sessionId);
      logger?.warn?.(
        { unresolvedSessions: unresolved },
        "Skipping the account backfill: not every session resolved its account id. Existing rows stay visible to all sessions until a boot where they all do.",
      );
      return;
    }

    const first = ids[0];

    for (const [table, spec] of Object.entries(SETTINGS)) {
      if (!pending[table]) continue;
      if (ids.length === 1) {
        await run(`UPDATE ${t(table)} SET ${q("accountId")} = :id WHERE ${q("accountId")} IS NULL`, { id: first }, QueryTypes.UPDATE);
        continue;
      }
      const have = new Set(
        (await run(`SELECT * FROM ${t(table)} WHERE ${q("accountId")} IS NOT NULL`)).map(
          (row) => `${row.accountId}\u0002${naturalKey(row, spec)}`,
        ),
      );
      const copies = [];
      for (const row of await nullRows(table, "id")) {
        const { id, ...values } = row;
        const key = naturalKey(row, spec);
        for (const accountId of ids) {
          const tag = `${accountId}\u0002${key}`;
          if (have.has(tag)) continue;
          have.add(tag);
          copies.push({ ...values, accountId });
        }
      }
      await insertRows(table, copies);
      await deleteNull(table);
      logger?.info?.({ table, copies: copies.length }, "Backfilled account id (copied to every account)");
    }

    if (pending.UserStats) {
      // rows whose key is free for the first account move over in one statement; the rest
      // (it already has that user and chat, or the old table had duplicates) are merged
      const T = t("UserStats");
      const same = (a, b) => `${a}.${q("userJid")} = ${b}.${q("userJid")} AND ${a}.${q("chatJid")} = ${b}.${q("chatJid")}`;
      await run(
        `UPDATE ${T} SET ${q("accountId")} = :id WHERE ${q("accountId")} IS NULL` +
          ` AND NOT EXISTS (SELECT 1 FROM ${T} AS o WHERE o.${q("accountId")} = :id AND ${same("o", T)})` +
          ` AND NOT EXISTS (SELECT 1 FROM ${T} AS d WHERE d.${q("accountId")} IS NULL AND d.${q("id")} <> ${T}.${q("id")} AND ${same("d", T)})`,
        { id: first },
        QueryTypes.UPDATE,
      );
      for (const row of await nullRows("UserStats", "id")) {
        const [existing] = await run(
          `SELECT * FROM ${T} WHERE ${q("accountId")} = :id AND ${q("userJid")} = :userJid AND ${q("chatJid")} = :chatJid`,
          { id: first, userJid: row.userJid, chatJid: row.chatJid },
        );
        if (!existing) {
          await run(`UPDATE ${T} SET ${q("accountId")} = :id WHERE ${q("id")} = :rowId`, { id: first, rowId: row.id }, QueryTypes.UPDATE);
          continue;
        }
        const sums = COUNTERS.map((c) => `${q(c)} = :${c}`).join(", ");
        const last = [existing.lastMessageAt, row.lastMessageAt].filter(Boolean).sort((a, b) => new Date(b) - new Date(a))[0] ?? null;
        const values = { rowId: existing.id, last };
        for (const c of COUNTERS) values[c] = (existing[c] || 0) + (row[c] || 0);
        await run(`UPDATE ${T} SET ${sums}, ${q("lastMessageAt")} = :last WHERE ${q("id")} = :rowId`, values, QueryTypes.UPDATE);
        await run(`DELETE FROM ${T} WHERE ${q("id")} = :rowId`, { rowId: row.id }, QueryTypes.DELETE);
      }
      logger?.info?.({ rows: pending.UserStats }, "Backfilled account id on UserStats");
    }

    if (pending.AntiDeleteCaches) {
      if (ids.length === 1) {
        await run(`UPDATE ${t("AntiDeleteCaches")} SET ${q("accountId")} = :id WHERE ${q("accountId")} IS NULL`, { id: first }, QueryTypes.UPDATE);
      } else {
        await deleteNull("AntiDeleteCaches");
      }
    }
  },
};
