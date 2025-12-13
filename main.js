const config = require("./config");

const Commands = [];
let commandPrefix;
let handlerPrefix;

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

if (config.HANDLERS === "false") {
  commandPrefix = "^";
} else {
  commandPrefix = config.HANDLERS;
}

handlerPrefix = buildHandlerPrefix(commandPrefix, Boolean(config.MULTI_HANDLERS));

function Module(info, func) {
  const validEventTypes = [
    "photo",
    "image",
    "text",
    "button",
    "group-update",
    "message",
    "start",
  ];

  const commandInfo = {
    fromMe: info.fromMe ?? config.isPrivate,
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
  } else if (info.on !== undefined && validEventTypes.includes(info.on)) {
    commandInfo.on = info.on;
    if (info.pattern !== undefined) {
      const prefix = (info.handler ?? true) ? handlerPrefix : "";
      const patternStr = `${prefix}${info.pattern}`;
      commandInfo.pattern = new RegExp(patternStr, "s");
    }
  } else if (info.pattern !== undefined) {
    const prefix = (info.handler ?? true) ? handlerPrefix : "";
    const patternStr = `${prefix}${info.pattern}`;
    commandInfo.pattern = new RegExp(patternStr, "s");
  }

  Commands.push(commandInfo);
  return commandInfo;
}

module.exports = {
  Module,
  commands: Commands,
};
