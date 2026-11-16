// read receipts (READ_MESSAGES) and status viewing (AUTO_READ_STATUS)
const config = require("../../../config");
const { isStatus } = require("../../identity");

// status types worth marking as viewed
const READABLE_STATUS = ["audioMessage", "imageMessage", "videoMessage", "extendedTextMessage"];

module.exports = async function receipts(env, next) {
  const { msg, sock } = env;
  const status = isStatus(env.jid);
  if (config.READ_MESSAGES && !status) {
    if (msg.message?.audioMessage) {
      await sock.sendReceipts([msg.key], "played");
    } else {
      await sock.readMessages([msg.key]);
    }
  }
  if (status && config.AUTO_READ_STATUS) {
    const types = Object.keys(msg.message);
    if (READABLE_STATUS.some((type) => types.includes(type))) {
      await sock.readMessages([{ ...msg.key, participant: msg.key.remoteJidAlt }]);
    }
  }
  await next();
};
