const { Module } = require("../main");
const config = require("../config");
const { handleSettingsReply } = require("./manage");

Module(
  {
    pattern: "platform",
    fromMe: true,
    use: "settings",
  },
  async (message, match) => {
    return await message.sendReply(`_Bot is running on ${config.PLATFORM}_`);
  }
);

Module(
  {
    pattern: "uptime",
    fromMe: true,
    use: "utility",
    desc: "Shows system (OS) /process uptime",
  },
  async (message, match) => {
    const formatTime = (seconds) => {
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;

      return `${days} ${days === 1 ? "day" : "days"}, ${hours} ${
        hours === 1 ? "hr" : "hrs"
      }, ${mins} ${mins === 1 ? "min" : "mins"}, ${secs} ${
        secs === 1 ? "sec" : "secs"
      }`;
    };

    const osUptime = formatTime(Math.floor(require("os").uptime()));
    const processUptime = formatTime(Math.floor(process.uptime()));

    return await message.sendReply(
      `                 *[ UPTIME ]*\n\n_System: ${osUptime}_\n\n_Process: ${processUptime}_`
    );
  }
);
Module(
  {
    on: "text",
    fromMe: true,
  },
  async (message) => {
    if (await handleSettingsReply(message)) return;
    // the registration also lets sudo users in; eval is the bot account's alone
    if (message.fromMe && message.message?.startsWith(">")) {
      var m = message;
      const util = require("util");
      const js = (x) => JSON.stringify(x, null, 2);
      try {
        let return_val = await eval(
          `(async () => { ${message.message.replace(">", "")} })()`
        );
        if (return_val && typeof return_val !== "string")
          return_val = util.inspect(return_val);
        if (return_val) {
          await message.sendMessage(return_val, "text");
        } else {
          const reactionMessage = {
            react: {
              text: "✅",
              key: m.data.key,
            },
          };

          await m.client.sendMessage(m.jid, reactionMessage);
        }
      } catch (e) {
        const readMore = String.fromCharCode(8206).repeat(4001);
        if (e)
          await message.sendMessage(
            `_ ❌ Error:_\n${readMore}` + util.format(e),
            "text"
          );
      }
    }
  }
);
