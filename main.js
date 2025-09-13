const config = require("./config");

const Commands = [];
let commandPrefix;
let handlerPrefix;

if (config.HANDLERS === "false") {
  commandPrefix = "^";
} else {
  commandPrefix = config.HANDLERS;
}

if (typeof commandPrefix === "string") {
  if (commandPrefix.length > 1 && commandPrefix[0] === commandPrefix[1]) {
    handlerPrefix = commandPrefix;
  } else if (
    /[-!$%^&*()_+|~=`{}\[\]:";'<>?,./]/.test(commandPrefix) &&
    commandPrefix !== "^"
  ) {
    handlerPrefix = `^[${commandPrefix}]`;
  } else {
    handlerPrefix = commandPrefix;
  }
}
if (config.MULTI_HANDLERS && handlerPrefix.includes("^[")) {
  handlerPrefix = handlerPrefix + "?";
}

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
    fromMe: info.fromMe ?? true,
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
      const prefix = info.handler ?? true ? handlerPrefix : "";
      const patternStr = `${prefix}${info.pattern}`;
      commandInfo.pattern = new RegExp(patternStr, "s");
    }
  } else if (info.pattern !== undefined) {
    const prefix = info.handler ?? true ? handlerPrefix : "";
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
