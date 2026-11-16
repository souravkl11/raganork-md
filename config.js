const P = require("pino");
const fs = require("fs");
const { Sequelize } = require("sequelize");
const schema = require("./core/config/schema");
const store = require("./core/config/store");

const isVPS = !(__dirname.startsWith("/rgnk") || __dirname.startsWith("/skl"));
const isHeroku = __dirname.startsWith("/skl");
const isKoyeb = __dirname.startsWith("/rgnk");
const isRailway = __dirname.startsWith("/railway");

// app logs and baileys logs are separate: baileys is very chatty at info/debug
const logger = P({ level: process.env.LOG_LEVEL || "warn" });
const baileysLogger = P({ level: process.env.BAILEYS_LOG_LEVEL || "silent" });

function applySQLiteResilience(sequelizeInstance) {
  if (!sequelizeInstance || sequelizeInstance.__sqliteGuardsApplied) {
    return;
  }

  sequelizeInstance.__sqliteGuardsApplied = true;
  const busyTimeoutMs = parseInt(process.env.SQLITE_BUSY_TIMEOUT || "15000", 10); // modifiable
  const pragmas = [
    "PRAGMA journal_mode=WAL;",
    "PRAGMA synchronous=NORMAL;",
    "PRAGMA temp_store=MEMORY;",
    "PRAGMA cache_size=-32000;",
    `PRAGMA busy_timeout=${busyTimeoutMs};`,
  ];

  sequelizeInstance.addHook("afterConnect", async (connection) => {
    if (!connection || typeof connection.exec !== "function") {
      return;
    }

    try {
      for (const pragma of pragmas) {
        await new Promise((resolve, reject) => {
          connection.exec(pragma, (err) => (err ? reject(err) : resolve()));
        });
      }
    } catch (error) {
      logger.warn({ err: error }, "failed to apply sqlite pragmas");
    }
  });

  const originalQuery = sequelizeInstance.query.bind(sequelizeInstance);
  const writeQueue = [];
  let queueActive = false;

  const flushQueue = async () => {
    if (queueActive || writeQueue.length === 0) {
      return;
    }

    queueActive = true;

    while (writeQueue.length > 0) {
      const { task, resolve, reject } = writeQueue.shift();
      try {
        const result = await task();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }

    queueActive = false;
  };

  const isWriteQuery = (sql) => {
    if (!sql || typeof sql !== "string") return true; // default to safe mode
    const normalizedSql = sql.trim().toUpperCase();
    return (
      normalizedSql.startsWith("INSERT") ||
      normalizedSql.startsWith("UPDATE") ||
      normalizedSql.startsWith("DELETE") ||
      normalizedSql.startsWith("CREATE") ||
      normalizedSql.startsWith("ALTER") ||
      normalizedSql.startsWith("DROP") ||
      normalizedSql.startsWith("PRAGMA")
    );
  };

  sequelizeInstance.query = function serializedQuery(sql, ...rest) {
    // only queue writes; reads can run concurrently. queries bound to a transaction
    // skip the queue: the transaction already holds the lock, and queueing them behind
    // a writer that is waiting on that lock stalls everything until busy_timeout
    if (!isWriteQuery(sql) || rest[0]?.transaction) {
      return originalQuery(sql, ...rest);
    }

    return new Promise((resolve, reject) => {
      writeQueue.push({
        task: () => originalQuery(sql, ...rest),
        resolve,
        reject,
      });
      setImmediate(flushQueue);
    });
  };

  if (typeof sequelizeInstance.queryRaw === "function") {
    const originalQueryRaw = sequelizeInstance.queryRaw.bind(sequelizeInstance);
    sequelizeInstance.queryRaw = function serializedQueryRaw(sql, ...rest) {
      if (!isWriteQuery(sql) || rest[0]?.transaction) {
        return originalQueryRaw(sql, ...rest);
      }

      return new Promise((resolve, reject) => {
        writeQueue.push({
          task: () => originalQueryRaw(sql, ...rest),
          resolve,
          reject,
        });
        setImmediate(flushQueue);
      });
    };
  }
}

const VERSION = require("./package.json").version;
const SQLITE_PATH = process.env.SQLITE_PATH || "./bot.db";
const DATABASE_URL =
  process.env.DATABASE_URL === undefined
    ? SQLITE_PATH
    : process.env.DATABASE_URL;
const DEBUG = store.fromEnv("DEBUG");

const sequelize = (() => {
  if (DATABASE_URL === SQLITE_PATH) {
    const sqliteInstance = new Sequelize({
      dialect: "sqlite",
      storage: DATABASE_URL,
      logging: false,
      retry: {
        match: [/SQLITE_BUSY/, /database is locked/, /EBUSY/],
        max: 3,
      },
      pool: {
        max: 5,
        min: 1,
        acquire: 30000,
        idle: 10000,
      },
    });

    applySQLiteResilience(sqliteInstance);
    return sqliteInstance;
  }

  // ssl stays on unless DATABASE_SSL says otherwise (a plain postgres service in ci has none)
  const useSsl = !["false", "0", "off", "no"].includes(
    String(process.env.DATABASE_SSL ?? "true").trim().toLowerCase(),
  );
  return new Sequelize(DATABASE_URL, {
    dialectOptions: useSsl ? { ssl: { require: true, rejectUnauthorized: false } } : {},
    logging: DEBUG,
    pool: {
      max: 20,
      min: 5,
      acquire: 30000,
      idle: 10000,
    },
  });
})();

const SESSION_STRING = process.env.SESSION || process.env.SESSION_ID;

const SESSION = SESSION_STRING
  ? SESSION_STRING.split(",").map((s) => s.split("~")[1].trim())
  : [];

const settingsMenu = [
  { title: "PM antispam block", env_var: "PM_ANTISPAM" },
  //{ title: "Command auto reaction", env_var: "CMD_REACTION" },
  { title: "Auto read all messages", env_var: "READ_MESSAGES" },
  { title: "Auto read command messages", env_var: "READ_COMMAND" },
  { title: "Auto read status updates", env_var: "AUTO_READ_STATUS" },
  { title: "Admin sudo (group commands)", env_var: "ADMIN_ACCESS" },
  { title: "With & without handler mode", env_var: "MULTI_HANDLERS" },
  { title: "Auto reject calls", env_var: "REJECT_CALLS" },
  { title: "Always online", env_var: "ALWAYS_ONLINE" },
  { title: "PM Auto blocker", env_var: "PMB_VAR" },
  { title: "Disable bot in PM", env_var: "DIS_PM" },
  { title: "Disable bot startup message", env_var: "DISABLE_START_MESSAGE" },
];

// defaults and env parsing live in core/config/schema.js
const envValues = {};
for (const [key, entry] of schema.schema) {
  if (!entry.external) envValues[key] = store.fromEnv(key);
}

const baseConfig = {
  VERSION,
  ...envValues,
  PLATFORM: isHeroku
    ? "Heroku"
    : isRailway
    ? "Railway"
    : isKoyeb
    ? "Koyeb"
    : "Other server",
  isHeroku,
  isKoyeb,
  isVPS,
  isRailway,
  settingsMenu,

  SESSION,
  logger,
  baileysLogger,
  sequelize,
  DATABASE_URL,
  DEBUG,
};
store.attachBase(baseConfig);

// plain function properties, defined below. they are non-configurable, so the proxy
// must list them in ownKeys and report their real descriptors
const HELPER_NAMES = ["loadFromDB", "getDynamicKeys", "isDynamic", "getSource", "debug"];

const config = new Proxy(baseConfig, {
  get(target, prop) {
    const key = typeof prop === "symbol" ? prop.toString() : prop;

    if (key === "toJSON" || key === "valueOf") {
      return () => store.snapshot();
    }

    if (key === "inspect" || key === Symbol.for("nodejs.util.inspect.custom")) {
      return () => store.snapshot();
    }

    // read at every access so commands without an explicit fromMe follow MODE live.
    // fails closed: anything but "public" (typo, empty, unset) keeps commands owner-only
    if (key === "isPrivate") {
      return store.get("MODE") !== "public";
    }

    return store.get(key);
  },

  set(target, prop, value) {
    const key = typeof prop === "symbol" ? prop.toString() : prop;
    store.set(key, value);
    return true;
  },

  has(target, prop) {
    const key = typeof prop === "symbol" ? prop.toString() : prop;
    return store.has(key);
  },

  // drops a runtime/db value; the env or default value shows again. the database
  // row is removed by delVar in plugins/manage.js
  deleteProperty(target, prop) {
    const key = typeof prop === "symbol" ? prop.toString() : prop;
    if (HELPER_NAMES.includes(key)) return false;
    store.unset(key);
    return true;
  },

  ownKeys(target) {
    const baseKeys = Object.keys(target);
    const dynamicKeys = store.overriddenKeys().filter((k) => typeof k === "string");
    return [...new Set([...baseKeys, ...dynamicKeys, ...HELPER_NAMES])];
  },

  getOwnPropertyDescriptor(target, prop) {
    const key = typeof prop === "symbol" ? prop.toString() : prop;

    if (HELPER_NAMES.includes(key)) {
      return Reflect.getOwnPropertyDescriptor(target, prop);
    }
    if (store.isOverridden(key) || key in target) {
      return {
        enumerable: true,
        configurable: true,
        value: this.get(target, prop),
      };
    }
    return undefined;
  },
});

Object.defineProperty(config, "loadFromDB", {
  value: function (dbValues = {}) {
    const loadedCount = store.loadAll(dbValues);
    console.log(`- Loaded ${loadedCount} vars`);
    return this;
  },
  writable: false,
  enumerable: false,
});

Object.defineProperty(config, "getDynamicKeys", {
  value: function () {
    return store.overriddenKeys();
  },
  writable: false,
  enumerable: false,
});

Object.defineProperty(config, "isDynamic", {
  value: function (key) {
    return store.isOverridden(key);
  },
  writable: false,
  enumerable: false,
});

Object.defineProperty(config, "getSource", {
  value: function (key) {
    return store.sourceOf(key);
  },
  writable: false,
  enumerable: false,
});

Object.defineProperty(config, "debug", {
  value: function () {
    const result = {
      static: Object.keys(baseConfig),
      dynamic: store.overriddenKeys(),
      values: store.snapshot(),
    };
    console.log("Config Debug Info:", result);
    return result;
  },
  writable: false,
  enumerable: false,
});

module.exports = config;
