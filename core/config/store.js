// resolution and storage behind the config proxy. lookup order: session override,
// global override, env-built base, process.env. must not require config.js at load (circular).
const schema = require("./schema");
const events = require("../events");
const context = require("../context");

const TRUE_WORDS = new Set(["true", "on", "1", "yes"]);
const FALSE_WORDS = new Set(["false", "off", "0", "no"]);

let base = {};
const overrides = new Map();
let sessionOverrides = new Map();

function attachBase(values) {
  base = values;
}

// case-sensitive on purpose: "True" has always read as false from the db
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

function sessionAccount(key) {
  const accountId = context.accountId();
  return accountId && schema.scopeOf(key) === "session" ? accountId : null;
}

function sessionValues(accountId, create = false) {
  let values = sessionOverrides.get(accountId);
  if (!values && create) {
    values = new Map();
    sessionOverrides.set(accountId, values);
  }
  return values;
}

// a throwing listener must not make `config.X = v` throw in a plugin
function notify(key, value, accountId = null) {
  const sessionId = accountId ? context.current()?.sessionId ?? null : null;
  try {
    events.emit("config:changed", { key, value, sessionId, accountId });
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
  const accountId = sessionAccount(key);
  if (accountId) {
    const values = sessionOverrides.get(accountId);
    if (values?.has(key)) return values.get(key);
  }
  if (overrides.has(key)) return overrides.get(key);
  if (key in base) return base[key];
  if (typeof key === "string" && process.env[key] !== undefined) return process.env[key];
  return undefined;
}

function has(key) {
  return isOverridden(key) || key in base || (typeof key === "string" && key in process.env);
}

// db first, memory second: a failed write leaves the live value alone
function set(key, value, { persist = false } = {}) {
  const accountId = sessionAccount(key);
  const apply = () => {
    const stored = coerce(key, value);
    if (accountId) sessionValues(accountId, true).set(key, stored);
    else overrides.set(key, stored);
    notify(key, stored, accountId);
    return stored;
  };
  if (!persist) return apply();
  if (accountId) {
    const { SessionVariable } = require("../database");
    return SessionVariable.upsert({ accountId, key, value }).then(apply);
  }
  const { BotVariable } = require("../database");
  return BotVariable.upsert({ key, value }).then(apply);
}

function unset(key, { persist = false } = {}) {
  const accountId = sessionAccount(key);
  const apply = () => {
    const had = accountId ? Boolean(sessionValues(accountId)?.delete(key)) : overrides.delete(key);
    notify(key, get(key), accountId);
    return had;
  };
  if (!persist) return apply();
  if (accountId) {
    const { SessionVariable } = require("../database");
    return SessionVariable.destroy({ where: { accountId, key } }).then(apply);
  }
  const { BotVariable } = require("../database");
  return BotVariable.destroy({ where: { key } }).then(apply);
}

function loadAll(dbValues = {}) {
  let count = 0;
  for (const [key, value] of Object.entries(dbValues)) {
    if (value === undefined || value === null) continue;
    overrides.set(key, coerce(key, value));
    count++;
  }
  return count;
}

function loadSessions(rows = []) {
  const next = new Map();
  let count = 0;
  for (const { accountId, key, value } of rows) {
    if (!accountId || value === undefined || value === null) continue;
    if (schema.scopeOf(key) !== "session") continue;
    if (!next.has(accountId)) next.set(accountId, new Map());
    next.get(accountId).set(key, coerce(key, value));
    count++;
  }
  sessionOverrides = next;
  return count;
}

async function reloadSessions() {
  const { SessionVariable } = require("../database");
  const rows = await SessionVariable.findAll({ attributes: ["accountId", "key", "value"], raw: true });
  return loadSessions(rows);
}

function clearSessions() {
  sessionOverrides = new Map();
}

function isOverridden(key) {
  const accountId = sessionAccount(key);
  return Boolean(accountId && sessionOverrides.get(accountId)?.has(key)) || overrides.has(key);
}

function currentSessionValues() {
  const accountId = context.accountId();
  return (accountId && sessionOverrides.get(accountId)) || new Map();
}

function overriddenKeys() {
  return [...new Set([...overrides.keys(), ...currentSessionValues().keys()])];
}

function snapshot() {
  return { ...base, ...Object.fromEntries(overrides), ...Object.fromEntries(currentSessionValues()) };
}

function sourceOf(key) {
  if (isOverridden(key)) return "database";
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
  loadSessions,
  reloadSessions,
  clearSessions,
  isOverridden,
  overriddenKeys,
  snapshot,
  sourceOf,
};
