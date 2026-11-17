const P = require("pino");
const fs = require("fs");
const schema = require("./core/config/schema");
const store = require("./core/config/store");

const platform = require("./core/platform").current();
const { isVPS, isHeroku, isKoyeb, isRailway } = platform;

// app logs and baileys logs are separate: baileys is very chatty at info/debug
const logger = P({ level: process.env.LOG_LEVEL || "warn" });
const baileysLogger = P({ level: process.env.BAILEYS_LOG_LEVEL || "silent" });

const VERSION = require("./package.json").version;
const DEBUG = store.fromEnv("DEBUG");
const { sequelize, DATABASE_URL } = require("./core/db");

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
  { title: "Auto like status updates", env_var: "AUTO_LIKE_STATUS" },
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
  PLATFORM: platform.label,
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
