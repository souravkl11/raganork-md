const { Module } = require("../main");
const lifecycle = require("../core/lifecycle");
const { hostOnly } = require("./utils/guards");
const { getString } = require("./utils/lang");
const Lang = getString("restart");

Module(
  {
    pattern: "reload",
    fromMe: true,
    bypassQueue: true,
    excludeFromCommands: true,
  },
  async (m) => {
    if (!(await hostOnly(m))) return;
    await m.sendReply(Lang.RELOADING);
    await lifecycle.restart("reload command");
  }
);

Module(
  {
    pattern: "reboot",
    fromMe: true,
    bypassQueue: true,
    excludeFromCommands: true,
  },
  async (m) => {
    if (!(await hostOnly(m))) return;
    await m.sendReply(Lang.RELOADING);
    await lifecycle.restart("reboot command");
  }
);

Module(
  {
    pattern: "restart",
    fromMe: true,
    bypassQueue: true,
    desc: Lang.RESTART_DESC,
    use: "system",
  },
  async (m) => {
    if (!(await hostOnly(m))) return;
    await m.sendReply(Lang.RESTARTING);
    await lifecycle.restart("restart command");
  }
);

Module(
  {
    pattern: "log(?: |$)(.*)",
    fromMe: true,
    bypassQueue: true,
    desc: Lang.LOG_DESC,
    use: "system",
  },
  async (m, match) => {
    if (!(await hostOnly(m))) return;
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
        caption: Lang.LOG_CAPTION.format(label === "error" ? Lang.ERROR : Lang.OUTPUT, lines, source),
        quoted: m.data,
      });
      sent.push(label);
    }
    if (!sent.length) return await m.sendReply(Lang.NO_LOGS);
  }
);
