const { Module } = require("../main");
const config = require("../config");
const { setVar } = require("./manage");
const { helpPrefix } = require("../core/plugins/registry");
const { likeEmojis } = require("../core/pipeline/middleware/receipts");

const onOff = (value) => (value ? "on ✅" : "off ❌");
const ON = new Set(["on", "true", "enable", "yes"]);
const OFF = new Set(["off", "false", "disable", "no"]);

function cleanEmojis(text) {
  const list = String(text || "")
    .split(/[,\s]+/)
    .filter(Boolean);
  const isEmoji = (e) => /[\p{Extended_Pictographic}\p{Regional_Indicator}]/u.test(e) && !/[\p{L}\p{N}]/u.test(e);
  if (!list.length || !list.every(isEmoji)) return null;
  return list.join(",");
}

const emojiLine = () => {
  const list = likeEmojis();
  return `${list.join(" ")}${list.length > 1 ? " _(one picked at random)_" : ""}`;
};

function statusText() {
  const p = helpPrefix();
  return (
    `_*Auto status*_\n\n` +
    `_View statuses:_ ${onOff(config.AUTO_READ_STATUS || config.AUTO_LIKE_STATUS)}\n` +
    `_Like statuses:_ ${onOff(config.AUTO_LIKE_STATUS)}\n` +
    `_Like emoji:_ ${emojiLine()}\n\n` +
    `_Usage:_\n` +
    `\`${p}autostatus view on/off\`\n` +
    `\`${p}autostatus like on/off\`\n` +
    `\`${p}autostatus like ❤️\` - _like with this emoji_\n` +
    `\`${p}autostatus like ❤️,🤍\` - _pick one at random each time_\n\n` +
    `_Liking a status also views it. Your own statuses are never viewed or liked._`
  );
}

Module(
  {
    pattern: "autostatus ?(.*)",
    fromMe: true,
    desc: "Automatically view and like status updates",
    usage: ".autostatus view on/off | like on/off | like ❤️,🤍",
    use: "owner",
  },
  async (m, match) => {
    const [rawWhat = "", ...rest] = (match[1] || "").trim().split(/\s+/);
    const what = rawWhat.toLowerCase();
    const arg = rest.join(" ").trim();
    const word = arg.toLowerCase();
    const on = ON.has(word);
    const isSwitch = on || OFF.has(word);

    if (what === "view") {
      if (!isSwitch) return await m.sendReply(statusText());
      await setVar("AUTO_READ_STATUS", on ? "true" : "false");
      // liking views, so viewing off means liking off too
      if (!on && config.AUTO_LIKE_STATUS) {
        await setVar("AUTO_LIKE_STATUS", "false");
        return await m.sendReply("_Auto view status off ❌_\n_Auto like status turned off too ❌_");
      }
      return await m.sendReply(`_Auto view status ${onOff(on)}_`);
    }

    if (what === "like") {
      if (!arg) return await m.sendReply(statusText());
      if (isSwitch) {
        await setVar("AUTO_LIKE_STATUS", on ? "true" : "false");
        if (on) await setVar("AUTO_READ_STATUS", "true");
        return await m.sendReply(
          on
            ? `_Auto like status on ✅_\n_Emoji:_ ${emojiLine()}\n_Statuses are viewed too._`
            : "_Auto like status off ❌_"
        );
      }
      const emojis = cleanEmojis(arg);
      if (!emojis) {
        return await m.sendReply(
          `_Give an emoji, or several separated by commas. Example:_ \`${helpPrefix()}autostatus like ❤️,🤍\``
        );
      }
      await setVar("STATUS_LIKE_EMOJI", emojis);
      await setVar("AUTO_LIKE_STATUS", "true");
      await setVar("AUTO_READ_STATUS", "true");
      return await m.sendReply(`_Auto like status on ✅_\n_Emoji:_ ${emojiLine()}\n_Statuses are viewed too._`);
    }

    return await m.sendReply(statusText());
  }
);
