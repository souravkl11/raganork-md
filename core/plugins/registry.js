// the command registry. main.js re-exports Module and commands from here, so
// `require("../main")` in plugins keeps working unchanged.
const path = require("path");
const config = require("../../config");

const commands = [];
let currentSource = null;

const VALID_EVENTS = ["photo", "image", "text", "button", "group-update", "message", "start"];

function escapeRegex(str) {
  return String(str).replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
}

function buildHandlerPrefix(rawHandlers, allowNoPrefix) {
  if (rawHandlers === "^" || rawHandlers === "" || rawHandlers == null) {
    return "^";
  }

  const handlersStr = String(rawHandlers);

  if (handlersStr.length > 1 && handlersStr[0] === handlersStr[1]) {
    const literal = `^${escapeRegex(handlersStr)}`;
    return allowNoPrefix ? `${literal}?` : literal;
  }

  const parts = Array.from(handlersStr)
    .map((h) => escapeRegex(h))
    .filter(Boolean);

  if (parts.length === 0) {
    return "^";
  }

  const group = `^(?:${parts.join("|")})`;
  return allowNoPrefix ? `${group}?` : group;
}

// read at call time, not at require time: plugins must see db-loaded HANDLERS
function currentHandlerPrefix() {
  const raw = config.HANDLERS === "false" ? "^" : config.HANDLERS;
  return buildHandlerPrefix(raw, Boolean(config.MULTI_HANDLERS));
}

// first handler character for help text (".ping" -> "."), read when the text is built
function helpPrefix() {
  return config.HANDLERS !== "false" ? config.HANDLERS.split("")[0] : "";
}

function compilePattern(info) {
  const prefix = (info.handler ?? true) ? currentHandlerPrefix() : "";
  return new RegExp(`${prefix}${info.pattern}`, "s");
}

// one compiled regex per (prefix, raw pattern). a session whose HANDLERS differs from
// the boot-time value gets its own set, built the first time it needs one. the regexes
// have no g flag, so sharing them between sessions is safe
const MAX_CACHED_PREFIXES = 16;
const patternCache = new Map();

// the pattern of a command for the session running now. cmd.pattern stays what it was
// built as at load (for plugins that read it); this follows the session's current
// HANDLERS and MULTI_HANDLERS
function patternFor(cmd) {
  if (cmd.rawPattern === undefined || cmd.useHandler === false) return cmd.pattern;
  const prefix = currentHandlerPrefix();
  let byPattern = patternCache.get(prefix);
  if (!byPattern) {
    if (patternCache.size >= MAX_CACHED_PREFIXES) {
      patternCache.delete(patternCache.keys().next().value);
    }
    byPattern = new Map();
    patternCache.set(prefix, byPattern);
  }
  let pattern = byPattern.get(cmd.rawPattern);
  if (!pattern) {
    pattern = new RegExp(`${prefix}${cmd.rawPattern}`, "s");
    byPattern.set(cmd.rawPattern, pattern);
  }
  return pattern;
}

// the first word of a command's pattern as the disabled list and per-command settings
// spell it: lowercase letters and digits, "" when it has none
function commandName(cmd) {
  let source = cmd.rawPattern;
  if (source === undefined) {
    if (cmd.pattern === undefined) return "";
    source = cmd.pattern instanceof RegExp ? cmd.pattern.source : String(cmd.pattern);
    const prefix = currentHandlerPrefix();
    if (cmd.useHandler !== false && source.startsWith(prefix)) source = source.slice(prefix.length);
  }
  return String(source).match(/[a-z0-9]+/i)?.[0].toLowerCase() ?? "";
}

function Module(info, func) {
  // an explicit fromMe is kept. without one the command follows MODE at dispatch
  // time instead of whatever MODE was when the plugin loaded. an enumerable accessor
  // keeps `fromMe` in Object.keys and reading as a boolean for plugins that list commands
  let explicitFromMe = info.fromMe;
  const commandInfo = {
    get fromMe() {
      return explicitFromMe ?? config.isPrivate;
    },
    set fromMe(value) {
      explicitFromMe = value;
    },
    desc: info.desc ?? "",
    usage: info.usage ?? "",
    excludeFromCommands: info.excludeFromCommands ?? false,
    warn: info.warn ?? "",
    use: info.use ?? "",
    function: func,
  };

  if (info.on === undefined && info.pattern === undefined) {
    commandInfo.on = "message";
    commandInfo.fromMe = false;
  } else if (info.on !== undefined && VALID_EVENTS.includes(info.on)) {
    commandInfo.on = info.on;
    if (info.pattern !== undefined) commandInfo.pattern = compilePattern(info);
  } else if (info.pattern !== undefined) {
    commandInfo.pattern = compilePattern(info);
  }

  // non-enumerable, so the command's Object.keys shape stays what plugins have always seen:
  // which file registered it, and what patternFor needs to rebuild its pattern per session
  const hidden = (name, value) =>
    Object.defineProperty(commandInfo, name, { value, enumerable: false, writable: true });
  hidden("source", currentSource);
  if (commandInfo.pattern !== undefined) {
    hidden("rawPattern", info.pattern);
    hidden("useHandler", info.handler ?? true);
  }

  commands.push(commandInfo);
  return commandInfo;
}

// the loader sets this around each plugin require (requires are synchronous)
function setCurrentSource(file) {
  currentSource = file;
}

function withSource(file, fn) {
  const previous = currentSource;
  currentSource = file;
  try {
    return fn();
  } finally {
    currentSource = previous;
  }
}

// forget a plugin file: its commands leave the live list (in place, plugins hold a
// reference to it) and the next require() of the file runs it again. returns how many
// commands went. `file` is the absolute path the loader recorded as `source`
function unload(file) {
  const abs = path.resolve(file);
  let removed = 0;
  for (let i = commands.length - 1; i >= 0; i--) {
    if (commands[i].source === abs) {
      commands.splice(i, 1);
      removed++;
    }
  }
  try {
    delete require.cache[require.resolve(abs)];
  } catch (_) {
    // the file is gone already; nothing cached under a path that no longer resolves
    delete require.cache[abs];
  }
  return removed;
}

module.exports = {
  Module,
  commands,
  buildHandlerPrefix,
  currentHandlerPrefix,
  helpPrefix,
  patternFor,
  commandName,
  setCurrentSource,
  withSource,
  unload,
};
