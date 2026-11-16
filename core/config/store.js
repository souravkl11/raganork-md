// resolution and storage behind the config proxy in config.js.
// lookup order: runtime/db override, then the base values built from env at load,
// then process.env (so keys nobody registered still work).
// this file must not require config.js or core/database at load time: config.js
// requires it first. persisting loads the database lazily.
const schema = require("./schema");
const events = require("../events");

const TRUE_WORDS = new Set(["true", "on", "1", "yes"]);
const FALSE_WORDS = new Set(["false", "off", "0", "no"]);

let base = {};
const overrides = new Map();

function attachBase(values) {
  base = values;
}

// true / false for a recognised word, undefined for anything else.
// case matters on purpose: "True" has always read as false for a db value, and
// flipping stored values on a live bot would be a surprise
function parseBool(raw) {
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "number") raw = String(raw);
  if (typeof raw !== "string") return undefined;
  if (TRUE_WORDS.has(raw)) return true;
  if (FALSE_WORDS.has(raw)) return false;
  return undefined;
}

function parseInteger(raw) {
  if (typeof raw === "number") return Number.isNaN(raw) ? undefined : raw;
  if (typeof raw !== "string") return undefined;
  const n = parseInt(raw, 10);
  return Number.isNaN(n) ? undefined : n;
}

// a listener that throws must not make `config.X = v` throw inside a plugin
function notify(key, value) {
  try {
    events.emit("config:changed", { key, value, sessionId: null });
  } catch (error) {
    console.error(`config:changed listener failed for ${key}:`, error);
  }
}

function defaultOf(entry) {
  return Array.isArray(entry.default) ? [...entry.default] : entry.default;
}

function normalize(entry, value) {
  return entry.normalize && typeof value === "string" ? entry.normalize(value) : value;
}

// value coming from the db or a runtime write. an unrecognised word on a bool key is
// false (what db loading has always done); undefined means "no value" and gives the default
function coerce(key, raw) {
  const entry = schema.entryFor(key);
  if (raw === undefined) return defaultOf(entry);
  switch (entry.type) {
    case "bool": {
      if (raw === null || (typeof raw === "object")) return raw;
      return parseBool(raw) ?? false;
    }
    case "int":
      return parseInteger(raw) ?? defaultOf(entry);
    default:
      return normalize(entry, raw);
  }
}

// value for a key from the environment, used once when config.js builds the base values.
// unset, empty and unrecognised values all give the default
function fromEnv(key, env = process.env) {
  const entry = schema.entryFor(key);
  const raw = env[key];
  if (entry.env) return entry.env(raw);
  if (raw === undefined || raw === "") return defaultOf(entry);
  switch (entry.type) {
    case "bool":
      return parseBool(raw) ?? defaultOf(entry);
    case "int":
      return parseInteger(raw) ?? defaultOf(entry);
    default:
      return normalize(entry, raw);
  }
}

function get(key) {
  if (overrides.has(key)) return overrides.get(key);
  if (key in base) return base[key];
  if (typeof key === "string" && process.env[key] !== undefined) return process.env[key];
  return undefined;
}

function has(key) {
  return overrides.has(key) || key in base || (typeof key === "string" && key in process.env);
}

// sync unless persist is set, then a promise that resolves after the database write
// (database first, memory second: a failed write leaves the live value alone).
// the database keeps the raw value; only the in-memory one is coerced
function set(key, value, { persist = false } = {}) {
  const apply = () => {
    const stored = coerce(key, value);
    overrides.set(key, stored);
    notify(key, stored);
    return stored;
  };
  if (!persist) return apply();
  const { BotVariable } = require("../database");
  return BotVariable.upsert({ key, value }).then(apply);
}

// drops the override only: the base value (env or default) shows again.
// the event carries the value readers see afterwards (undefined if there is none)
function unset(key, { persist = false } = {}) {
  const apply = () => {
    const had = overrides.delete(key);
    notify(key, get(key));
    return had;
  };
  if (!persist) return apply();
  const { BotVariable } = require("../database");
  return BotVariable.destroy({ where: { key } }).then(apply);
}

// bulk load of bot_variables rows at boot. returns how many were applied.
// no events: nothing is subscribed yet and the values are not changes
function loadAll(dbValues = {}) {
  let count = 0;
  for (const [key, value] of Object.entries(dbValues)) {
    if (value === undefined || value === null) continue;
    overrides.set(key, coerce(key, value));
    count++;
  }
  return count;
}

function isOverridden(key) {
  return overrides.has(key);
}

function overriddenKeys() {
  return Array.from(overrides.keys());
}

function snapshot() {
  return { ...base, ...Object.fromEntries(overrides) };
}

function sourceOf(key) {
  if (overrides.has(key)) return "database";
  if (key in base) return "config";
  if (typeof key === "string" && process.env[key] !== undefined) return "environment";
  return "not_found";
}

module.exports = {
  attachBase,
  parseBool,
  coerce,
  fromEnv,
  get,
  has,
  set,
  unset,
  loadAll,
  isOverridden,
  overriddenKeys,
  snapshot,
  sourceOf,
};
