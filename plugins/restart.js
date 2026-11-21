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

Module(
  {
    pattern: "log(?: |$)(.*)",
    fromMe: true,
    desc: "Sends recent error and output logs as txt files. Usage: .log [lines]",
    use: "system",
  },
  async (m, match) => {
    const { getLogs } = require("../core/logbuffer");
    const lines = Math.min(Math.max(parseInt(match[1]) || 300, 10), 5000);
    const sent = [];
    // error log is the one that matters, so it goes first
    for (const [kind, label] of [
      ["err", "error"],
      ["out", "out"],
    ]) {
      const { text, source } = getLogs(kind, lines);
      if (!text.trim()) continue;
      await m.sendMessage(Buffer.from(text, "utf8"), "document", {
        fileName: `raganork-${label}-${Date.now()}.txt`,
        mimetype: "text/plain",
        caption: `_${label === "error" ? "Error" : "Output"} log · last ${lines} lines · ${source}_`,
        quoted: m.data,
      });
      sent.push(label);
    }
    if (!sent.length) return await m.sendReply("_No logs yet_");
  }
);
