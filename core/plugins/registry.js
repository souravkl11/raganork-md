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

// read at call time so plugins see db-loaded HANDLERS
function currentHandlerPrefix() {
  const raw = config.HANDLERS === "false" ? "^" : config.HANDLERS;
  return buildHandlerPrefix(raw, Boolean(config.MULTI_HANDLERS));
}

function helpPrefix() {
  return config.HANDLERS !== "false" ? config.HANDLERS.split("")[0] : "";
}

function compilePattern(info) {
  const prefix = (info.handler ?? true) ? currentHandlerPrefix() : "";
  return new RegExp(`${prefix}${info.pattern}`, "s");
}

// cached per (prefix, pattern); no g flag so sharing across sessions is safe
const MAX_CACHED_PREFIXES = 16;
const patternCache = new Map();

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
  // without an explicit fromMe, follow MODE at dispatch time (enumerable getter so plugins
  // listing commands still see it)
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

  const hidden = (name, value) =>
    Object.defineProperty(commandInfo, name, { value, enumerable: false, writable: true });
  hidden("source", currentSource);
  if (typeof info.name === "string" && info.name.trim()) hidden("name", info.name.trim());
  if (info.bypassQueue) hidden("bypassQueue", true);
  if (commandInfo.pattern !== undefined) {
    hidden("rawPattern", info.pattern);
    hidden("useHandler", info.handler ?? true);
  }

  commands.push(commandInfo);
  return commandInfo;
}

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
