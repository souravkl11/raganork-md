const { Module } = require("../main");
let auto = true;

Module(
  {
    pattern: "reload",
    fromMe: auto,
    excludeFromCommands: true,
  },
  async (m) => {
    await m.sendReply("_Reloading bot..._");
    process.exit(0);
  }
);

Module(
  {
    pattern: "reboot",
    fromMe: auto,
    excludeFromCommands: true,
  },
  async (m) => {
    await m.sendReply("_Reloading bot..._");
    process.exit(0);
  }
);

Module(
  {
    pattern: "restart",
    fromMe: auto,
    desc: "Restarts the bot",
    use: "system",
  },
  async (m) => {
    await m.sendReply("_Restarting bot..._");
    process.exit(0);
  }
);
