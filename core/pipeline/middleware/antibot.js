// kicks non-admin accounts that send with a known bot message id prefix
const { antibot } = require("../../db/functions");
const { inSpamScope } = require("./scope");

const BOT_ID_PREFIXES = ["RGNK", "BAE5", "QUEEN"];

module.exports = async function antibotGuard(env, next) {
  if (inSpamScope(env)) {
    const { msg, sock, jid } = env;
    const antibotDb = await antibot.get();
    const antibotJids = antibotDb.map((data) => data.jid);
    if (
      antibotJids.includes(jid) &&
      !msg.key.fromMe &&
      BOT_ID_PREFIXES.some((prefix) => msg.key.id.startsWith(prefix))
    ) {
      const metadata = await sock.groupMetadata(jid);
      const admins = metadata.participants.filter((v) => v.admin).map((x) => x.id);
      const senderJid = msg.key.participant || msg.key.participantAlt;
      if (!admins.includes(senderJid)) {
        await sock.sendMessage(
          jid,
          { text: `_Bot detected!_`, mentions: [senderJid] },
          { quoted: msg },
        );
        await sock.groupParticipantsUpdate(jid, [senderJid], "remove");
      }
    }
  }
  await next();
};
