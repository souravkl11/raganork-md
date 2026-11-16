// a sticker bound to a command (.setcmd) stands in for that command's text
const { stickcmd } = require("../../db/models/schedules");

module.exports = async function stickerCmd(env, next) {
  if (env.stickerPending) {
    const stickers = await stickcmd.get();
    const inside = env.msg.message.stickerMessage.fileSha256.toString();
    const found = stickers.find((e) => e.dataValues.file === inside);
    if (found) env.text = found.command;
  }
  await next();
};
