const { Module } = require("../main");
const config = require("../config");
const { setVar } = require("./manage");
const { helpPrefix } = require("../core/plugins/registry");
const { LIKE_EMOJI } = require("../core/pipeline/middleware/receipts");

const onOff = (value) => (value ? "on ✅" : "off ❌");
const ON = new Set(["on", "true", "enable", "yes"]);
const OFF = new Set(["off", "false", "disable", "no"]);

function statusText() {
  const p = helpPrefix();
  return (
    `_*Auto status*_\n\n` +
    `_View statuses:_ ${onOff(config.AUTO_READ_STATUS || config.AUTO_LIKE_STATUS)}\n` +
    `_Like statuses (${LIKE_EMOJI}):_ ${onOff(config.AUTO_LIKE_STATUS)}\n\n` +
    `_Usage:_\n` +
    `\`${p}autostatus view on/off\`\n` +
    `\`${p}autostatus like on/off\`\n\n` +
    `_Liking a status also views it. Your own statuses are never viewed or liked._`
  );
}

Module(
  {
    pattern: "autostatus ?(.*)",
    fromMe: true,
    desc: "Automatically view and like status updates",
    usage: ".autostatus view on/off | like on/off",
    use: "owner",
  },
  async (m, match) => {
    const [what = "", ...rest] = (match[1] || "").trim().toLowerCase().split(/\s+/);
    const word = rest.join(" ");
    const on = ON.has(word);
    if (!on && !OFF.has(word)) return await m.sendReply(statusText());

    if (what === "view") {
      await setVar("AUTO_READ_STATUS", on ? "true" : "false");
      // liking views, so viewing off means liking off too
      if (!on && config.AUTO_LIKE_STATUS) {
        await setVar("AUTO_LIKE_STATUS", "false");
        return await m.sendReply("_Auto view status off ❌_\n_Auto like status turned off too ❌_");
      }
      return await m.sendReply(`_Auto view status ${onOff(on)}_`);
    }

    if (what === "like") {
      await setVar("AUTO_LIKE_STATUS", on ? "true" : "false");
      if (on) await setVar("AUTO_READ_STATUS", "true");
      return await m.sendReply(
        on ? `_Auto like status on ✅ (${LIKE_EMOJI})_\n_Statuses are viewed too._` : "_Auto like status off ❌_"
      );
    }

    return await m.sendReply(statusText());
  }
);
