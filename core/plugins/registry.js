// the command registry. main.js re-exports Module and commands from here, so
// `require("../main")` in plugins keeps working unchanged.
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

  // which file registered this command; non-enumerable so the command shape is unchanged
  Object.defineProperty(commandInfo, "source", {
    value: currentSource,
    enumerable: false,
    writable: true,
  });

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

module.exports = {
  Module,
  commands,
  buildHandlerPrefix,
  currentHandlerPrefix,
  helpPrefix,
  setCurrentSource,
  withSource,
};
