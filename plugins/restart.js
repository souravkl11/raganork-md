const { Module } = require("../main");
const lifecycle = require("../core/lifecycle");

Module(
  {
    pattern: "reload",
    fromMe: true,
    excludeFromCommands: true,
  },
  async (m) => {
    await m.sendReply("_Reloading bot..._");
    await lifecycle.restart("reload command");
  }
);

Module(
  {
    pattern: "reboot",
    fromMe: true,
    excludeFromCommands: true,
  },
  async (m) => {
    await m.sendReply("_Reloading bot..._");
    await lifecycle.restart("reboot command");
  }
);

Module(
  {
    pattern: "restart",
    fromMe: true,
    desc: "Restarts the bot",
    use: "system",
  },
  async (m) => {
    await m.sendReply("_Restarting bot..._");
    await lifecycle.restart("restart command");
  }
);
