const { Module } = require("../main");
const config = require("../config");
const { setVar } = require("./manage");
const { helpPrefix } = require("../core/plugins/registry");
const { likeEmojis } = require("../core/pipeline/middleware/receipts");
const { getString } = require("./utils/lang");
const Lang = getString("autostatus");

const onOff = (value) => (value ? Lang.ON : Lang.OFF);
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
  return `${list.join(" ")}${list.length > 1 ? Lang.RANDOM : ""}`;
};

function statusText() {
  const p = helpPrefix();
  return Lang.STATUS.format(onOff(config.AUTO_READ_STATUS || config.AUTO_LIKE_STATUS), onOff(config.AUTO_LIKE_STATUS), emojiLine(), p, p, p, p);
}

Module(
  {
    pattern: "autostatus ?(.*)",
    fromMe: true,
    desc: Lang.DESC,
    usage: Lang.USAGE,
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
        return await m.sendReply(Lang.VIEW_OFF_LIKE_OFF);
      }
      return await m.sendReply(Lang.VIEW_SET.format(onOff(on)));
    }

    if (what === "like") {
      if (!arg) return await m.sendReply(statusText());
      if (isSwitch) {
        await setVar("AUTO_LIKE_STATUS", on ? "true" : "false");
        if (on) await setVar("AUTO_READ_STATUS", "true");
        return await m.sendReply(
          on
            ? Lang.LIKE_ON.format(emojiLine())
            : Lang.LIKE_OFF
        );
      }
      const emojis = cleanEmojis(arg);
      if (!emojis) {
        return await m.sendReply(
          Lang.NEED_EMOJI.format(helpPrefix())
        );
      }
      await setVar("STATUS_LIKE_EMOJI", emojis);
      await setVar("AUTO_LIKE_STATUS", "true");
      await setVar("AUTO_READ_STATUS", "true");
      return await m.sendReply(Lang.LIKE_ON.format(emojiLine()));
    }

    return await m.sendReply(statusText());
  }
);
