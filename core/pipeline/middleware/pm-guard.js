const config = require("../../../config");
const { isSudo } = require("../../identity");
const { isControlMessage } = require("../normalize");

module.exports = async function pmGuard(env, next) {
  const { msg, sock, jid } = env;
  if (isControlMessage(msg.message)) return await next();
  const stranger = () =>
    env.isPM && !env.fromMe && ![jid, msg.key.remoteJidAlt, env.sender].some((j) => isSudo(j));
  if (config.PMB_VAR && stranger()) {
    await sock.sendMessage(jid, { text: config.PMB });
    await sock.updateBlockStatus(jid, "block");
  }
  if (config.DIS_PM && stranger()) return;
  await next();
};
