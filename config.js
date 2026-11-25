const P = require("pino");
const fs = require("fs");
const schema = require("./core/config/schema");
const store = require("./core/config/store");

const platform = require("./core/platform").current();
const { isVPS, isHeroku, isKoyeb, isRailway } = platform;

// error+ goes to stderr so pm2's error log (and .log) carries it
const logger = P(
  { level: process.env.LOG_LEVEL || "warn" },
  P.multistream(
    [
      { level: "trace", stream: process.stdout },
      { level: "error", stream: process.stderr },
    ],
    { dedupe: true }
  )
);
const baileysLogger = P({ level: process.env.BAILEYS_LOG_LEVEL || "silent" });

const VERSION = require("./package.json").version;
const DEBUG = store.fromEnv("DEBUG");
const { sequelize, DATABASE_URL } = require("./core/db");

const SESSION_STRING = process.env.SESSION || process.env.SESSION_ID;

// ids never depend on the method, so switching qr/pair keeps a linked account
const sessionEntries = [];
const LOGIN_METHODS = {};
let unnamedLocals = 0;
for (const token of (SESSION_STRING || "").split(",").map((s) => s.trim()).filter(Boolean)) {
  let entry;
  if (token.includes("~")) {
    const id = token.split("~")[1].trim();
    if (!id) continue;
    entry = { id, local: false };
  } else {
    const colon = token.indexOf(":");
    const method = (colon === -1 ? token : token.slice(0, colon)).trim().toLowerCase();
    if (method !== "qr" && method !== "pair") {
      console.warn(`⚠️ SESSION "${token}" is not a session string (like RGNK~abc123), "qr" or "pair". Logging in with a QR code instead.`);
    }
    let name = colon === -1 ? null : token.slice(colon + 1).trim().toLowerCase();
    // digit names would collide with positional local-2
    if (name !== null && /^\d+$/.test(name)) {
      console.warn(`⚠️ SESSION "${token}": a name can't be only digits (put the phone number in PAIRING_NUMBER). Ignoring the name.`);
      name = null;
    } else if (name !== null && !/^[a-z0-9_-]{1,24}$/.test(name)) {
      console.warn(`⚠️ SESSION "${token}": names may use only a-z, 0-9, _ and -, up to 24 characters. Ignoring the name.`);
      name = null;
    }
    const id = name ? `local-${name}` : ++unnamedLocals === 1 ? "local" : `local-${unnamedLocals}`;
    entry = { id, local: true, method: method === "pair" ? "pair" : "qr" };
  }
  if (sessionEntries.some((e) => e.id === entry.id)) {
    console.warn(`⚠️ SESSION lists "${entry.id}" twice. Starting it once.`);
    continue;
  }
  sessionEntries.push(entry);
}
if (sessionEntries.length === 0) sessionEntries.push({ id: "local", local: true, method: "qr" });
for (const entry of sessionEntries) {
  if (entry.local) LOGIN_METHODS[entry.id] = entry.method;
}

const SESSION = sessionEntries.map((entry) => entry.id);
const LOCAL_SESSIONS = Object.keys(LOGIN_METHODS);

const settingsMenu = require("./core/config/catalog").legacySettingsMenu();

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
  LOCAL_SESSIONS,
  LOGIN_METHODS,
  logger,
  baileysLogger,
  sequelize,
  DATABASE_URL,
  DEBUG,
};
store.attachBase(baseConfig);

// non-configurable, so the proxy must list them in ownKeys with their real descriptors
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

    // read live so commands follow MODE; anything but "public" keeps them owner-only
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
