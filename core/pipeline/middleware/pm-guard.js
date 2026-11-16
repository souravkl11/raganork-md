// PMB_VAR blocker (replies and blocks strangers) and DIS_PM (ignores their PMs)
const config = require("../../../config");
const { isSudo } = require("../../identity");

module.exports = async function pmGuard(env, next) {
  const { msg, sock, jid } = env;
  const stranger = () => env.isPM && !env.fromMe && !isSudo(msg.key.remoteJidAlt || jid);
  if (config.PMB_VAR && stranger()) {
    await sock.sendMessage(jid, { text: config.PMB });
    await sock.updateBlockStatus(jid, "block");
  }
  if (config.DIS_PM && stranger()) return;
  await next();
};
