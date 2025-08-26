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

const sequelize =
  DATABASE_URL === "./bot.db"
    ? new Sequelize({
        dialect: "sqlite",
        storage: DATABASE_URL,
        logging: DEBUG,
        retry: {
          match: [/SQLITE_BUSY/, /database is locked/, /EBUSY/],
          max: 3,
        },
      })
    : new Sequelize(DATABASE_URL, {
        dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
        logging: DEBUG,
      });

const SESSION_STRING = process.env.SESSION || process.env.SESSION_ID;

const SESSION = SESSION_STRING
  ? SESSION_STRING.split(",").map((s) => s.split("~")[1].trim())
  : [];

const settingsMenu = [
  { title: "PM antispam block", env_var: "PM_ANTISPAM" },
  { title: "Command auto reaction", env_var: "CMD_REACTION" },
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

settings: {
                AUDIO_CHATBOT: process.env.AUDIO_CHATBOT || 'no',
                AUTO_BIO: process.env.AUTO_BIO || 'yes',
                AUTO_DOWNLOAD_STATUS: process.env.AUTO_DOWNLOAD_STATUS || 'no',
                AUTO_REACT: process.env.AUTO_REACT || 'no',
                AUTO_REACT_STATUS: process.env.AUTO_REACT_STATUS || 'yes',
                AUTO_READ: process.env.AUTO_READ || 'yes',
                AUTO_READ_STATUS: process.env.AUTO_READ_STATUS || 'yes',
                CHATBOT: process.env.CHATBOT || 'no',
                PUBLIC_MODE: process.env.PUBLIC_MODE || 'yes',
                STARTING_BOT_MESSAGE: process.env.STARTING_BOT_MESSAGE || 'yes',
                PRESENCE: process.env.PRESENCE || '',
                ANTIDELETE_RECOVER_CONVENTION: process.env.ANTIDELETE_RECOVER_CONVENTION || 'no',
                ANTIDELETE_SENT_INBOX: process.env.ANTIDELETE_SENT_INBOX || 'yes',
                GOODBYE_MESSAGE: process.env.GOODBYE_MESSAGE || 'no',
                AUTO_REJECT_CALL: process.env.AUTO_REJECT_CALL || 'no',
                WELCOME_MESSAGE: process.env.WELCOME_MESSAGE || 'no',
                GROUPANTILINK: process.env.GROUPANTILINK || 'no',
                AUTO_REPLY_STATUS: process.env.AUTO_REPLY_STATUS || 'no'
            }
        };
                  

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

    get AUTO_READ_STATUS() { return hybridConfig.getSetting('AUTO_READ_STATUS', 'yes'); },
    get AUTO_DOWNLOAD_STATUS() { return hybridConfig.getSetting('AUTO_DOWNLOAD_STATUS', 'no'); },
    get AUTO_REPLY_STATUS() { return hybridConfig.getSetting('AUTO_REPLY_STATUS', 'no'); },
    get MODE() { return hybridConfig.getSetting('PUBLIC_MODE', 'yes'); },
    get PM_PERMIT() { return process.env.PM_PERMIT || 'yes'; },
    get ETAT() { return hybridConfig.getSetting('PRESENCE', ''); },
    get CHATBOT() { return hybridConfig.getSetting('CHATBOT', 'no'); },
    get CHATBOT1() { return hybridConfig.getSetting('AUDIO_CHATBOT', 'no'); },
    get DP() { return hybridConfig.getSetting('STARTING_BOT_MESSAGE', 'yes'); },
    get ANTIDELETE1() { return hybridConfig.getSetting('ANTIDELETE_RECOVER_CONVENTION', 'no'); },
    get ANTIDELETE2() { return hybridConfig.getSetting('ANTIDELETE_SENT_INBOX', 'yes'); },
    get GOODBYE_MESSAGE() { return hybridConfig.getSetting('GOODBYE_MESSAGE', 'no'); },
    get ANTICALL() { return hybridConfig.getSetting('AUTO_REJECT_CALL', 'no'); },
    get WELCOME_MESSAGE() { return hybridConfig.getSetting('WELCOME_MESSAGE', 'no'); },
    get GROUP_ANTILINK2() { return process.env.GROUPANTILINK_DELETE_ONLY || 'yes'; },
    get GROUP_ANTILINK() { return hybridConfig.getSetting('GROUPANTILINK', 'no'); },
    get STATUS_REACT_EMOJIS() { return process.env.STATUS_REACT_EMOJIS || ""; },
    get REPLY_STATUS_TEXT() { return process.env.REPLY_STATUS_TEXT || ""; },
    get AUTO_REACT() { return hybridConfig.getSetting('AUTO_REACT', 'no'); },
    get AUTO_REACT_STATUS() { return hybridConfig.getSetting('AUTO_REACT_STATUS', 'yes'); },
    get AUTO_REPLY() { return process.env.AUTO_REPLY || 'yes'; },
    get AUTO_READ() { return hybridConfig.getSetting('AUTO_READ', 'yes'); },
    get AUTO_SAVE_CONTACTS() { return process.env.AUTO_SAVE_CONTACTS || 'yes'; },
    get AUTO_REJECT_CALL() { return hybridConfig.getSetting('AUTO_REJECT_CALL', 'yes'); },
    get AUTO_BIO() { return hybridConfig.getSetting('AUTO_BIO', 'yes'); },
    get AUDIO_REPLY() { return process.env.AUDIO_REPLY || 'yes'; },

  
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
      ? "ꪶ͢٭𝑺𝜣𝑼𝑹𝛢𝑽𝑲𝑳¹¹ꫂ;Raganork MD bot;https://i.imgur.com/P7ziVhr.jpeg"
      : process.env.AUDIO_DATA,
  TAKE_KEY: process.env.TAKE_KEY || "",
  CMD_REACTION: convertToBool(process.env.CMD_REACTION) || false,
  MODE: process.env.MODE || "private",
  WARN: process.env.WARN || "4",
  ANTILINK_WARN: process.env.ANTILINK_WARN || "",
  ANTI_DELETE: convertToBool(process.env.ANTI_DELETE) || false,
  SUDO: process.env.SUDO || "",
  LANGUAGE: process.env.LANGUAGE || "english",
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

