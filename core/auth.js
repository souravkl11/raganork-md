// one db row per signal key; only changed keys are written
const { WhatsappSession, WhatsappSessionKey, sequelize } = require("./database");
const { logger } = require("../config");
const { Op } = require("sequelize");
const { fetchInitialSession } = require("./private");

let WAProto;
let initAuthCreds;
const { loadBaileys } = require("./helpers");
loadBaileys()
  .then((baileys) => {
    ({ WAProto, initAuthCreds } = baileys);
  })
  .catch((err) => {
    console.error("Failed to load baileys:", err.message);
  });

const STORAGE_VERSION = 3;
const FLUSH_INTERVAL = 3000;
const WRITE_CHUNK = 300;

const sessionStore = new Map();
let flushTimer = null;
let flushing = false;

function bufferReplacer(_, value) {
  if (
    Buffer.isBuffer(value) ||
    value instanceof Uint8Array ||
    (value && value.type === "Buffer" && value.data !== undefined)
  ) {
    return {
      type: "Buffer",
      data: Buffer.from(value?.data ?? value).toString("base64"),
    };
  }
  return value;
}

function bufferReviver(_, value) {
  if (value && typeof value === "object" && value.type === "Buffer") {
    if (typeof value.data === "string") return Buffer.from(value.data, "base64");
    if (Array.isArray(value.data)) return Buffer.from(value.data);
  }
  return value;
}

const serialize = (value) => JSON.stringify(value, bufferReplacer);
const deserialize = (text) =>
  JSON.parse(typeof text === "string" ? text : JSON.stringify(text), bufferReviver);

function newSessionEntry() {
  return {
    creds: {},
    keys: {},
    dirtyKeys: new Set(),
    deletedKeys: new Set(),
    credsDirty: false,
  };
}

function hasPendingWrites(entry) {
  return entry.credsDirty || entry.dirtyKeys.size > 0 || entry.deletedKeys.size > 0;
}

async function flushSession(sessionId, entry) {
  if (!hasPendingWrites(entry)) return;

  // snapshot and reset so writes during the flush aren't lost
  const dirty = [...entry.dirtyKeys];
  const deleted = [...entry.deletedKeys];
  const credsDirty = entry.credsDirty;
  entry.dirtyKeys.clear();
  entry.deletedKeys.clear();
  entry.credsDirty = false;

  try {
    const rows = [];
    for (const keyName of dirty) {
      const value = entry.keys[keyName];
      if (value === undefined || value === null) continue;
      rows.push({ sessionId, keyName, value: serialize(value) });
    }

    await sequelize.transaction(async (transaction) => {
      for (let i = 0; i < rows.length; i += WRITE_CHUNK) {
        await WhatsappSessionKey.bulkCreate(rows.slice(i, i + WRITE_CHUNK), {
          updateOnDuplicate: ["value"],
          transaction,
        });
      }
      for (let i = 0; i < deleted.length; i += WRITE_CHUNK) {
        await WhatsappSessionKey.destroy({
          where: { sessionId, keyName: deleted.slice(i, i + WRITE_CHUNK) },
          transaction,
        });
      }
      if (credsDirty) {
        await WhatsappSession.upsert(
          {
            sessionId,
            creds: serialize(entry.creds),
            storageVersion: STORAGE_VERSION,
          },
          { fields: ["creds", "storageVersion"], transaction },
        );
      }
    });
  } catch (error) {
    for (const k of dirty) if (!entry.deletedKeys.has(k)) entry.dirtyKeys.add(k);
    for (const k of deleted) if (!entry.dirtyKeys.has(k)) entry.deletedKeys.add(k);
    if (credsDirty) entry.credsDirty = true;
    throw error;
  }
}

async function flushAllSessions() {
  if (flushing) return;
  flushing = true;
  try {
    for (const [sessionId, entry] of sessionStore.entries()) {
      try {
        await flushSession(sessionId, entry);
      } catch (error) {
        logger.error({ sessionId, err: error }, "Failed to flush session keys");
      }
    }
  } finally {
    flushing = false;
  }
}

function initPeriodicFlush() {
  if (flushTimer) return;
  flushTimer = setInterval(flushAllSessions, FLUSH_INTERVAL);
  flushTimer.unref?.();
}

initPeriodicFlush();

function createTransactionalKeyStore(baseStore, logger) {
  let inTransaction = false;
  let transactionCache = {};
  let transactionMutations = {};

  const prefetch = async (type, ids) => {
    if (!inTransaction) {
      throw new Error("Cannot prefetch without transaction");
    }

    const cached = transactionCache[type];
    const uncachedIds = cached ? ids.filter((id) => !(id in cached)) : ids;

    if (uncachedIds.length) {
      const keys = await baseStore.get(type, uncachedIds);
      transactionCache[type] = transactionCache[type] || {};
      Object.assign(transactionCache[type], keys);
    }
  };

  return {
    get: async (type, ids) => {
      if (inTransaction) {
        await prefetch(type, ids);
        return ids.reduce((result, id) => {
          const cached = transactionCache[type];
          const value = cached?.[id];
          if (value !== undefined) {
            result[id] = value;
          }
          return result;
        }, {});
      }
      return baseStore.get(type, ids);
    },

    set: (data) => {
      if (!inTransaction) {
        return baseStore.set(data);
      }

      logger.trace({ types: Object.keys(data) }, "caching in transaction");
      for (const type in data) {
        transactionCache[type] = transactionCache[type] || {};
        Object.assign(transactionCache[type], data[type]);
        transactionMutations[type] = transactionMutations[type] || {};
        Object.assign(transactionMutations[type], data[type]);
      }
    },

    isInTransaction: () => inTransaction,

    prefetch: (type, ids) => {
      logger.trace({ type, ids }, "prefetching");
      return prefetch(type, ids);
    },

    transaction: async (handler) => {
      if (inTransaction) {
        await handler();
      } else {
        logger.debug("entering transaction");
        inTransaction = true;
        try {
          await handler();
          if (Object.keys(transactionMutations).length) {
            logger.debug("committing transaction");
            await baseStore.set(transactionMutations);
          } else {
            logger.debug("no mutations in transaction");
          }
        } finally {
          inTransaction = false;
          transactionCache = {};
          transactionMutations = {};
        }
      }
    },
  };
}

class CustomAuthState {
  constructor(sessionId) {
    this.sessionId = sessionId;
    if (!sessionStore.has(sessionId)) {
      sessionStore.set(sessionId, newSessionEntry());
    }
    this.sessionData = sessionStore.get(sessionId);

    const baseKeyStore = {
      get: async (type, ids) => {
        const result = {};
        for (const id of ids) {
          const key = this._getKey(type, id);
          if (key !== undefined) result[id] = key;
        }
        return result;
      },
      set: async (data) => {
        for (const type in data) {
          for (const id in data[type]) {
            const keyData = data[type][id];
            if (keyData) this._setKey(type, id, keyData);
            else this._deleteKey(type, id);
          }
        }
      },
    };

    this.keyStore = createTransactionalKeyStore(
      baseKeyStore,
      logger.child({ session: sessionId }),
    );
  }

  get creds() {
    return this.sessionData.creds;
  }

  get keys() {
    return this.sessionData.keys;
  }

  _getKey(type, id) {
    let keyData = this.sessionData.keys[`${type}-${id}`];
    if (type === "app-state-sync-key" && keyData) {
      try {
        keyData = WAProto.Message.AppStateSyncKeyData.fromObject(keyData);
      } catch (error) {
        logger.warn(
          { session: this.sessionId, type, id, err: error },
          "Failed to deserialize app state sync key",
        );
        return undefined;
      }
    }
    return keyData;
  }

  _setKey(type, id, keyData) {
    const keyName = `${type}-${id}`;
    if (type === "app-state-sync-key" && keyData) {
      try {
        keyData = WAProto.Message.AppStateSyncKeyData.toObject(keyData);
      } catch (error) {
        logger.warn(
          { session: this.sessionId, type, id, err: error },
          "Failed to serialize app state sync key",
        );
      }
    }
    this.sessionData.keys[keyName] = keyData;
    this.sessionData.deletedKeys.delete(keyName);
    this.sessionData.dirtyKeys.add(keyName);
  }

  _deleteKey(type, id) {
    this._deleteKeyByName(`${type}-${id}`);
  }

  _deleteKeyByName(keyName) {
    delete this.sessionData.keys[keyName];
    this.sessionData.dirtyKeys.delete(keyName);
    this.sessionData.deletedKeys.add(keyName);
  }

  // legacy file-map format ({ "creds.json": "...", "<key>.json": "..." })
  _parseLegacyFileMap(fileMap, source) {
    try {
      this.sessionData.creds = fileMap["creds.json"]
        ? deserialize(fileMap["creds.json"])
        : {};
    } catch (e) {
      logger.error(
        { session: this.sessionId, err: e, source },
        `Error parsing creds.json from ${source}`,
      );
      this.sessionData.creds = {};
    }

    this.sessionData.keys = {};
    for (const [filename, contentString] of Object.entries(fileMap)) {
      if (!filename.endsWith(".json") || filename === "creds.json") continue;
      try {
        this.sessionData.keys[filename.slice(0, -5)] = deserialize(contentString);
      } catch (e) {
        logger.warn(
          { session: this.sessionId, file: filename, err: e, source },
          `Failed to parse key file '${filename}' from ${source}`,
        );
      }
    }
    return Object.keys(this.sessionData.creds).length > 0;
  }

  async _loadV3() {
    const record = await WhatsappSession.findByPk(this.sessionId, {
      attributes: ["sessionId", "creds", "storageVersion"],
    });
    if (!record) return { found: false };
    if (!(record.storageVersion >= STORAGE_VERSION) || !record.creds) {
      return { found: true, legacy: true };
    }

    this.sessionData.creds = deserialize(record.creds);
    const rows = await WhatsappSessionKey.findAll({
      where: { sessionId: this.sessionId },
      attributes: ["keyName", "value"],
      raw: true,
    });
    const keys = {};
    for (const row of rows) {
      try {
        keys[row.keyName] = deserialize(row.value);
      } catch (e) {
        logger.warn(
          { session: this.sessionId, keyName: row.keyName },
          "Skipping unreadable key row",
        );
      }
    }
    this.sessionData.keys = keys;
    return { found: true, legacy: false };
  }

  async _writeFullV3() {
    const rows = Object.entries(this.sessionData.keys)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([keyName, value]) => ({
        sessionId: this.sessionId,
        keyName,
        value: serialize(value),
      }));

    await sequelize.transaction(async (transaction) => {
      await WhatsappSessionKey.destroy({
        where: { sessionId: this.sessionId },
        transaction,
      });
      for (let i = 0; i < rows.length; i += 500) {
        await WhatsappSessionKey.bulkCreate(rows.slice(i, i + 500), { transaction });
      }
      await WhatsappSession.upsert(
        {
          sessionId: this.sessionId,
          creds: serialize(this.sessionData.creds),
          storageVersion: STORAGE_VERSION,
        },
        { fields: ["creds", "storageVersion"], transaction },
      );
    });

    this.sessionData.dirtyKeys.clear();
    this.sessionData.deletedKeys.clear();
    this.sessionData.credsDirty = false;
    return rows.length;
  }

  async _migrateToV3(source) {
    try {
      const count = await this._writeFullV3();
      logger.info(
        { session: this.sessionId, keys: count, source },
        "Session stored in per-key layout",
      );
    } catch (error) {
      logger.error(
        { session: this.sessionId, err: error, source },
        "Session migration failed, continuing from memory",
      );
    }
  }

  async loadSession({ skipBackend = false } = {}) {
    if (Object.keys(this.sessionData.creds).length > 0) {
      logger.info({ session: this.sessionId }, "Session already loaded in memory");
      return;
    }

    try {
      const v3 = await this._loadV3();
      if (v3.found && !v3.legacy && Object.keys(this.sessionData.creds).length) {
        logger.info({ session: this.sessionId }, "Session loaded from database");
        this._validateAndCleanKeys();
        return;
      }
      if (v3.found) {
        const record = await WhatsappSession.findByPk(this.sessionId, {
          attributes: ["sessionId", "sessionData"],
        });
        if (record?.sessionData && this._parseLegacyFileMap(record.sessionData, "database")) {
          console.log(`- Migrating session ${this.sessionId} to the new storage format...`);
          this._validateAndCleanKeys();
          await this._migrateToV3("legacy-blob");
          return;
        }
        logger.warn(
          { session: this.sessionId },
          "Session row found in DB but no usable credentials",
        );
      }
    } catch (dbError) {
      logger.error(
        { session: this.sessionId, err: dbError },
        "Error loading from database, will try session backend",
      );
    }

    if (skipBackend) {
      logger.info({ session: this.sessionId }, "No stored session, terminal login needed");
      this.sessionData.creds = {};
      this.sessionData.keys = {};
      return;
    }

    try {
      console.log(`- Fetching initial data for session ${this.sessionId}...`);
      const fileMap = await fetchInitialSession(this.sessionId);
      if (fileMap && this._parseLegacyFileMap(fileMap, "session-backend")) {
        this._validateAndCleanKeys();
        await this._migrateToV3("session-backend");
        return;
      }
      logger.warn(
        { session: this.sessionId },
        "Session backend returned no valid credentials",
      );
    } catch (error) {
      console.error(`Error fetching session: ${error.message}`);
      logger.warn(
        { session: this.sessionId, err: error.message },
        "Failed to fetch session from backend",
      );
    }

    logger.info({ session: this.sessionId }, "No existing session found");
    this.sessionData.creds = {};
    this.sessionData.keys = {};
  }

  _validateAndCleanKeys() {
    const toDelete = [];
    for (const [keyName, keyData] of Object.entries(this.sessionData.keys)) {
      if (keyData === null || keyData === undefined) {
        toDelete.push(keyName);
        continue;
      }
      if (keyName.startsWith("app-state-sync-key-")) {
        try {
          WAProto.Message.AppStateSyncKeyData.fromObject(keyData);
        } catch (_) {
          toDelete.push(keyName);
        }
      }
    }
    for (const keyName of toDelete) this._deleteKeyByName(keyName);
    if (toDelete.length) {
      logger.info(
        { session: this.sessionId, cleanedCount: toDelete.length },
        "Cleaned up invalid keys",
      );
    }
  }

  // requestPairingCode sets me.id before the link exists
  isLinked() {
    const creds = this.sessionData.creds;
    return Boolean(creds?.me?.id && (creds.account || creds.me.id.includes(":")));
  }

  // baileys logs in instead of registering whenever creds.me exists
  dropPairingPlaceholder() {
    if (this.isLinked() || !this.sessionData.creds?.me) return;
    delete this.sessionData.creds.me;
    delete this.sessionData.creds.pairingCode;
    this.sessionData.credsDirty = true;
  }

  startFresh() {
    if (!initAuthCreds) throw new Error("Baileys is not loaded yet");
    for (const keyName of Object.keys(this.sessionData.keys)) this._deleteKeyByName(keyName);
    this.sessionData.creds = initAuthCreds();
    this.sessionData.credsDirty = true;
  }

  // creds.me.id is "<digits>:<device>@s.whatsapp.net"; falls back to the session id
  getAccountId() {
    return this._accountDigits() || this.sessionId;
  }

  hasAccountId() {
    return this._accountDigits() !== null;
  }

  _accountDigits() {
    const id = this.sessionData.creds?.me?.id;
    const head = typeof id === "string" ? id.split(/[:@]/)[0] : "";
    return /^\d+$/.test(head) ? head : null;
  }

  async saveSession() {
    await flushSession(this.sessionId, this.sessionData);
  }

  async initAuthCreds() {
    return this.sessionData.creds;
  }

  // mutate in place so baileys and the store share one creds object
  async saveCredentials(newCreds) {
    Object.assign(this.sessionData.creds, newCreds);
    this.sessionData.credsDirty = true;
  }

  getBaileysKeysInterface() {
    return {
      get: (type, ids) => this.keyStore.get(type, ids),
      set: (data) => this.keyStore.set(data),
      transaction: (handler) => this.keyStore.transaction(handler),
      prefetch: async (type, ids) => {
        if (this.keyStore.isInTransaction()) {
          await this.keyStore.prefetch(type, ids);
        }
      },
    };
  }

  static async deleteGarbageSessions(activeSessionIds) {
    try {
      const where = { sessionId: { [Op.notIn]: activeSessionIds } };
      const count = await WhatsappSession.destroy({ where });
      await WhatsappSessionKey.destroy({ where });

      let memoryCleanupCount = 0;
      for (const sessionId of sessionStore.keys()) {
        if (!activeSessionIds.includes(sessionId)) {
          sessionStore.delete(sessionId);
          memoryCleanupCount++;
        }
      }
      if (count > 0 || memoryCleanupCount > 0) {
        console.log(
          `Cleaned up ${count} sessions from database and ${memoryCleanupCount} from memory`,
        );
      }
      return count;
    } catch (error) {
      logger.error({ err: error }, "Error during garbage session cleanup");
      throw error;
    }
  }

  static async deleteSessionById(sessionId) {
    try {
      sessionStore.delete(sessionId);
      const count = await WhatsappSession.destroy({ where: { sessionId } });
      await WhatsappSessionKey.destroy({ where: { sessionId } });
      if (count > 0) {
        console.log(`Cleaned up session ${sessionId} from database and memory`);
      }
      return count;
    } catch (error) {
      logger.error({ sessionId, err: error }, "Error deleting session by ID");
      throw error;
    }
  }

  static async saveAllSessions() {
    while (flushing) await new Promise((r) => setTimeout(r, 50));
    await flushAllSessions();
  }

  static getStats() {
    const stats = {};
    for (const [sessionId, entry] of sessionStore.entries()) {
      stats[sessionId] = {
        keys: Object.keys(entry.keys).length,
        pendingWrites: entry.dirtyKeys.size + entry.deletedKeys.size,
      };
    }
    return stats;
  }

  static stopPeriodicSave() {
    if (flushTimer) {
      clearInterval(flushTimer);
      flushTimer = null;
    }
  }
}

module.exports = { CustomAuthState };
