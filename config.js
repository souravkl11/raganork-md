const P = require("pino");
const fs = require("fs");
const { Sequelize } = require("sequelize");

function convertToBool(text, fault = "true", fault2 = "on") {
  return text === fault || text === fault2;
}

const isVPS = !(__dirname.startsWith("/rgnk") || __dirname.startsWith("/skl"));
const isHeroku = __dirname.startsWith("/skl");
const isKoyeb = __dirname.startsWith("/rgnk");
const isRailway = __dirname.startsWith("/railway");

const logger = P({ level: process.env.LOG_LEVEL || "silent" });

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
    // only queue writes; reads can run concurrently
    if (!isWriteQuery(sql)) {
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
      if (!isWriteQuery(sql)) {
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

const MAX_RECONNECT_ATTEMPTS = parseInt(
  process.env.MAX_RECONNECT_ATTEMPTS || "5",
  10
);
const VERSION = require("./package.json").version;
const DATABASE_URL =
  process.env.DATABASE_URL === undefined
    ? "./bot.db"
    : process.env.DATABASE_URL;
const DEBUG =
  process.env.DEBUG === undefined ? false : convertToBool(process.env.DEBUG);

const sequelize = (() => {
  if (DATABASE_URL === "./bot.db") {
    const sqliteInstance = new Sequelize({
      dialect: "sqlite",
      storage: DATABASE_URL,
      logging: DEBUG,
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

  return new Sequelize(DATABASE_URL, {
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
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

const baseConfig = {
  VERSION,
  ALIVE:
    process.env.ALIVE ||
    "_I am alive! (use .setalive help for custom alive msg)_",
  BLOCK_CHAT: process.env.BLOCK_CHAT || "",
  PM_ANTISPAM: convertToBool(process.env.PM_ANTISPAM) || "",
  ALWAYS_ONLINE: convertToBool(process.env.ALWAYS_ONLINE) || false,
  MANGLISH_CHATBOT: convertToBool(process.env.MANGLISH_CHATBOT) || false,
  ADMIN_ACCESS: convertToBool(process.env.ADMIN_ACCESS) || false,
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
  AUTOMUTE_MSG:
    process.env.AUTOMUTE_MSG || "_Group automuted!_\n_(edit AUTOMUTE_MSG)_",
  ANTIWORD_WARN: process.env.ANTIWORD_WARN || "",
  ANTI_SPAM: process.env.ANTI_SPAM || "919074309534-1632403322@g.us",
  MULTI_HANDLERS: convertToBool(process.env.MULTI_HANDLERS) || false,
  DISABLE_START_MESSAGE:
    convertToBool(process.env.DISABLE_START_MESSAGE) || false,
  NOLOG: process.env.NOLOG || false,
  DISABLED_COMMANDS:
    (process.env.DISABLED_COMMANDS
      ? process.env.DISABLED_COMMANDS.split(",")
      : undefined) || [],
  ANTI_BOT: process.env.ANTI_BOT || "",
  ANTISPAM_COUNT: process.env.ANTISPAM_COUNT || "6/10",
  AUTOUNMUTE_MSG:
    process.env.AUTOUNMUTE_MSG ||
    "_Group auto unmuted!_\n_(edit AUTOUNMUTE_MSG)_",
  AUTO_READ_STATUS: convertToBool(process.env.AUTO_READ_STATUS) || false,
  READ_MESSAGES: convertToBool(process.env.READ_MESSAGES) || false,
  PMB_VAR: convertToBool(process.env.PMB_VAR) || false,
  DIS_PM: convertToBool(process.env.DIS_PM) || false,
  REJECT_CALLS: convertToBool(process.env.REJECT_CALLS) || false,
  ALLOWED_CALLS: process.env.ALLOWED_CALLS || "",
  CALL_REJECT_MESSAGE: process.env.CALL_REJECT_MESSAGE || "",
  PMB: process.env.PMB || "_Personal messages not allowed, BLOCKED!_",
  READ_COMMAND: convertToBool(process.env.READ_COMMAND) || true,
  IMGBB_KEY: [
    "76a050f031972d9f27e329d767dd988f",
    "deb80cd12ababea1c9b9a8ad6ce3fab2",
    "78c84c62b32a88e86daf87dd509a657a",
  ],
  RG: process.env.RG || "919074309534-1632403322@g.us,120363116963909366@g.us",
  BOT_INFO: process.env.BOT_INFO || "𝖱𝖺𝗀𝖺𝗇𝗈𝗋𝗄;𝖱𝗒𝗓𝖾𝗇;default",
  RBG_KEY: process.env.RBG_KEY || "",
  ALLOWED: process.env.ALLOWED || "91,94,2",
  NOT_ALLOWED: process.env.NOT_ALLOWED || "852",
  CHATBOT: process.env.CHATBOT || "off",
  HANDLERS: process.env.HANDLERS || ".,",
  STICKER_DATA: process.env.STICKER_DATA || "Raganork",
  BOT_NAME: process.env.BOT_NAME || "Raganork",
  AUDIO_DATA:
    process.env.AUDIO_DATA === undefined || process.env.AUDIO_DATA === "private"
      ? "default"
      : process.env.AUDIO_DATA,
  TAKE_KEY: process.env.TAKE_KEY || "",
  CMD_REACTION: convertToBool(process.env.CMD_REACTION) || false,
  MODE: process.env.MODE || "private",
  WARN: process.env.WARN || "4",
  ANTILINK_WARN: process.env.ANTILINK_WARN || "",
  ANTI_DELETE: convertToBool(process.env.ANTI_DELETE) || false,
  SUDO: process.env.SUDO || "",
  LANGUAGE: process.env.LANGUAGE || "english",
  AUTO_UPDATE: convertToBool(process.env.AUTO_UPDATE) || true,
  SUPPORT_GROUP: process.env.SUPPORT_GROUP || "https://t.me/raganork_in",
  ACR_A: "ff489a0160188cf5f0750eaf486eee74",
  ACR_S: "ytu3AdkCu7fkRVuENhXxs9jsOW4YJtDXimAWMpJp",
  settingsMenu,

  SESSION,
  logger,
  MAX_RECONNECT_ATTEMPTS,
  sequelize,
  DATABASE_URL,
  DEBUG,
};

const dynamicValues = new Map();

const config = new Proxy(baseConfig, {
  get(target, prop) {
    const key = typeof prop === "symbol" ? prop.toString() : prop;

    if (key === "toJSON" || key === "valueOf") {
      return () => ({ ...target, ...Object.fromEntries(dynamicValues) });
    }

    if (key === "inspect" || key === Symbol.for("nodejs.util.inspect.custom")) {
      return () => ({ ...target, ...Object.fromEntries(dynamicValues) });
    }

    if (key === 'isPrivate') {
      const mode = dynamicValues.has('MODE') ? dynamicValues.get('MODE') : target.MODE;
      return mode === 'private';
    }

    if (dynamicValues.has(key)) {
      return dynamicValues.get(key);
    }

    if (key in target) {
      return target[key];
    }

    if (typeof key === "string" && process.env[key] !== undefined) {
      return process.env[key];
    }

    return undefined;
  },

  set(target, prop, value) {
    const key = typeof prop === "symbol" ? prop.toString() : prop;

    dynamicValues.set(key, value);
    return true;
  },

  has(target, prop) {
    const key = typeof prop === "symbol" ? prop.toString() : prop;
    return (
      dynamicValues.has(key) ||
      key in target ||
      (typeof key === "string" && key in process.env)
    );
  },

  ownKeys(target) {
    const baseKeys = Object.keys(target);
    const dynamicKeys = Array.from(dynamicValues.keys()).filter(
      (k) => typeof k === "string"
    );
    return [...new Set([...baseKeys, ...dynamicKeys])];
  },

  getOwnPropertyDescriptor(target, prop) {
    const key = typeof prop === "symbol" ? prop.toString() : prop;

    if (dynamicValues.has(key) || key in target) {
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
    let loadedCount = 0;
    const booleanKeys = [
      ...settingsMenu.map((item) => item.env_var),
      "MANGLISH_CHATBOT",
    ];
    for (const [key, value] of Object.entries(dbValues)) {
      if (value !== undefined && value !== null) {
        if (booleanKeys.includes(key)) {
          this[key] = convertToBool(value);
        } else {
          this[key] = value;
        }
        loadedCount++;
      }
    }

    console.log(`- Loaded ${loadedCount} vars`);
    return this;
  },
  writable: false,
  enumerable: false,
});

Object.defineProperty(config, "getDynamicKeys", {
  value: function () {
    return Array.from(dynamicValues.keys());
  },
  writable: false,
  enumerable: false,
});

Object.defineProperty(config, "isDynamic", {
  value: function (key) {
    return dynamicValues.has(key);
  },
  writable: false,
  enumerable: false,
});

Object.defineProperty(config, "getSource", {
  value: function (key) {
    if (dynamicValues.has(key)) return "database";
    if (key in baseConfig) return "config";
    if (typeof key === "string" && process.env[key] !== undefined)
      return "environment";
    return "not_found";
  },
  writable: false,
  enumerable: false,
});

Object.defineProperty(config, "debug", {
  value: function () {
    const result = {
      static: Object.keys(baseConfig),
      dynamic: Array.from(dynamicValues.keys()),
      values: { ...baseConfig, ...Object.fromEntries(dynamicValues) },
    };
    console.log("Config Debug Info:", result);
    return result;
  },
  writable: false,
  enumerable: false,
});

module.exports = config;
