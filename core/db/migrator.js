// numbered migrations with a schema_migrations table.
//
// files in core/db/migrations/NNN-name.js export { stage, up, repeat?, transaction? }:
//   stage        "schema" runs right after the database connects (before sync()),
//                "data" runs once the auth states are loaded and before sockets connect
//   up(args)     args = { sequelize, queryInterface, dialect, accounts, transaction, tableExists, logger }
//                accounts: one { sessionId, accountId, resolved } per configured session, in
//                SESSION order. resolved is false for a session that failed to load its auth or
//                has no login yet (accountId is then null or only the session id)
//                every query must pass `transaction` along, or it runs outside it
//   repeat       data migrations only: run on every boot, never recorded, must be idempotent
//   transaction  set to false for a migration that cannot run inside one
// schema migrations run before sync(), so on a fresh install the tables they would
// change do not exist yet: they must skip those (tableExists) and let the model create
// the table complete. migrations are expand-only: never drop or rename.
const fs = require("fs");
const path = require("path");
const { DataTypes } = require("sequelize");
const context = require("../context");

const DEFAULT_DIR = path.join(__dirname, "migrations");
const STAGES = ["schema", "data"];
const quiet = { info() {}, warn() {}, error() {} };
const KEEP_BACKUPS = 2;

// keeps the newest `keep` "<db>.bak-*" files next to the database, deletes the rest
function pruneBackups(storage, keep = KEEP_BACKUPS) {
  try {
    const dir = path.dirname(path.resolve(storage));
    const prefix = `${path.basename(storage)}.bak-`;
    const backups = fs
      .readdirSync(dir)
      .filter((f) => f.startsWith(prefix))
      .map((f) => ({ file: path.join(dir, f), mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
    for (const { file } of backups.slice(keep)) fs.unlinkSync(file);
  } catch (_) {}
}

function loadMigrations(dir = DEFAULT_DIR) {
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".js"))
    .sort()
    .map((file) => {
      const mod = require(path.join(dir, file));
      const name = file.slice(0, -3);
      if (!STAGES.includes(mod.stage) || typeof mod.up !== "function") {
        throw new Error(`Migration ${name} must export a stage ("schema" or "data") and an up() function`);
      }
      if (mod.repeat && mod.stage !== "data") {
        throw new Error(`Migration ${name}: only data migrations can repeat`);
      }
      return { name, stage: mod.stage, repeat: Boolean(mod.repeat), transaction: mod.transaction !== false, up: mod.up };
    });
}

function createMigrator({ sequelize, dir = DEFAULT_DIR, logger = quiet, version } = {}) {
  const queryInterface = sequelize.getQueryInterface();
  const dialect = sequelize.getDialect();
  let backedUp = false;

  const Applied =
    sequelize.models.SchemaMigration ||
    sequelize.define(
      "SchemaMigration",
      {
        name: { type: DataTypes.STRING, primaryKey: true, allowNull: false },
        appliedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      },
      { tableName: "schema_migrations", timestamps: false },
    );

  async function tableNames(options) {
    const tables = await queryInterface.showAllTables(options);
    return tables.map((t) => (typeof t === "string" ? t : t.tableName));
  }

  async function tableExists(name, options) {
    return (await tableNames(options)).includes(name);
  }

  // a plain file copy is unsafe in WAL mode, VACUUM INTO writes a consistent snapshot
  async function backupSqlite(firstName) {
    const storage = sequelize.options.storage;
    if (dialect !== "sqlite" || backedUp || !storage || storage === ":memory:") return null;
    const existing = (await tableNames()).filter((t) => t !== "schema_migrations");
    if (existing.length === 0) return null; // fresh install, nothing to protect
    let target = `${storage}.bak-${version || require("../../package.json").version}`;
    if (fs.existsSync(target)) target += `-${Date.now()}`;
    await sequelize.query("VACUUM INTO :target", { replacements: { target } });
    backedUp = true;
    // the copy holds the whatsapp credentials: owner-only, and never let them pile up
    try {
      fs.chmodSync(target, 0o600);
    } catch (_) {}
    pruneBackups(storage, KEEP_BACKUPS);
    logger.info({ backup: target, migration: firstName }, "Database backed up before migrating");
    return target;
  }

  async function runStage(stage, { accounts = [] } = {}) {
    if (!STAGES.includes(stage)) throw new Error(`Unknown migration stage: ${stage}`);
    return context.runUnscoped(async () => {
      await Applied.sync();
      const applied = new Set((await Applied.findAll({ attributes: ["name"], raw: true })).map((row) => row.name));
      const todo = loadMigrations(dir).filter((m) => m.stage === stage && (m.repeat || !applied.has(m.name)));
      const firstPending = todo.find((m) => !m.repeat);
      let backup = null;
      const ran = [];

      if (firstPending) {
        try {
          backup = await backupSqlite(firstPending.name);
        } catch (error) {
          throw new Error(`Could not back up the database before migration ${firstPending.name}: ${error.message}`);
        }
      }

      for (const migration of todo) {
        const exec = async (transaction) => {
          const options = transaction ? { transaction } : undefined;
          await migration.up({
            sequelize,
            queryInterface,
            dialect,
            accounts,
            transaction,
            tableExists: (name) => tableExists(name, options),
            logger,
          });
          if (!migration.repeat) await Applied.create({ name: migration.name, appliedAt: new Date() }, options);
        };
        try {
          if (migration.transaction) await sequelize.transaction(exec);
          else await exec(undefined);
        } catch (error) {
          const hint = backup ? ` A backup of the database is at ${backup}.` : "";
          const failure = new Error(
            `Database migration ${migration.name} (${stage}) failed: ${error.message}. The bot cannot start until this is fixed.${hint}`,
          );
          failure.migration = migration.name;
          failure.cause = error;
          throw failure;
        }
        if (!migration.repeat) {
          logger.info({ migration: migration.name }, "Applied database migration");
          ran.push(migration.name);
        }
      }
      return { applied: ran, backup };
    });
  }

  return { runStage, loadMigrations: () => loadMigrations(dir), tableExists };
}

// the migrator for the bot's own database
let shared = null;
function defaultMigrator() {
  if (!shared) {
    const config = require("../../config");
    shared = createMigrator({ sequelize: config.sequelize, logger: config.logger });
  }
  return shared;
}

module.exports = {
  createMigrator,
  loadMigrations,
  pruneBackups,
  runStage: (stage, options) => defaultMigrator().runStage(stage, options),
};
