// counts messages per user and chat; at the limit a PM sender is blocked, a group
// member's messages in the window are deleted and they are kicked (admins only get a
// notice). stragglers from the same burst are deleted without a second kick. a blocked
// PM ends the message; group messages carry on. a failing check is logged and the
// message carries on.
const { antispam } = require("../../db/functions");
const {
  trackSpamMessage,
  getRecentMessageCount,
  getRecentSpamIds,
  clearSpamTracker,
} = require("../../store");
const { derived } = require("../../config/derived");
const { ownerTarget } = require("../../identity");
const config = require("../../../config");
const { inSpamScope } = require("./scope");

const antispamLimits = derived("ANTISPAM_COUNT", (raw) => {
  const [count, seconds] = String(raw || "5/60").split("/");
  return { msgCount: parseInt(count), msgTime: parseInt(seconds + "000") };
});

const COUNTED_TYPES = [
  "videoMessage",
  "imageMessage",
  "conversation",
  "buttonsResponseMessage",
  "locationMessage",
  "templateButtonReplyMessage",
  "listResponseMessage",
  "extendedTextMessage",
  "stickerMessage",
  "contactMessage",
  "productMessage",
  "audioMessage",
];

// "chat|user" -> expiry; set once a member is punished so the rest of the burst is just deleted
const punished = new Map();

async function deleteMessages(sock, jid, participant, ids) {
  await Promise.all(
    ids.map((id) =>
      sock
        .sendMessage(jid, { delete: { remoteJid: jid, fromMe: false, id, participant } })
        .catch(() => {}),
    ),
  );
}

async function check(env) {
  const { msg, sock, jid, isPM, isGroup, type } = env;
  const { msgCount, msgTime } = antispamLimits();
  try {
    const antispamDb = await antispam.get();
    const antispamJids = antispamDb.map((data) => data.jid);
    if (!(antispamJids.includes(jid) || (isPM && config.PM_ANTISPAM))) return false;
    if (!COUNTED_TYPES.includes(type)) return false;

    const userJid = isGroup ? msg.key.participant || msg.key.participantAlt : jid;

    const punishKey = `${jid}|${userJid}`;
    if (isGroup && punished.has(punishKey)) {
      if (punished.get(punishKey) > Date.now()) {
        await deleteMessages(sock, jid, userJid, [msg.key.id]);
        return false;
      }
      punished.delete(punishKey);
    }

    await trackSpamMessage(userJid, jid, msg.key.id);
    const recentCount = await getRecentMessageCount(userJid, jid, msgTime);
    if (recentCount < msgCount) return false;

    if (isPM) {
      await sock.sendMessage(
        jid,
        { text: `_Spam detected, you have been blocked!_` },
        { quoted: msg },
      );
      await sock.updateBlockStatus(jid, "block");
      await sock.sendMessage(
        ownerTarget(sock),
        {
          text: `_*=== Spam block report ===*_\n\n_User:_ @${
            userJid?.split("@")[0]
          }\n_MessageType: ${type}_\n_Time: ${new Date().toLocaleTimeString()}_`,
          mentions: [userJid],
        },
        { quoted: msg },
      );
      return true;
    }
    const metadata = await sock.groupMetadata(jid);
    const admins = metadata.participants.filter((v) => v.admin).map((x) => x.id);
    if (!admins.includes(userJid)) {
      punished.set(punishKey, Date.now() + msgTime);
      const ids = await getRecentSpamIds(userJid, jid, msgTime);
      clearSpamTracker(userJid, jid);
      await deleteMessages(sock, jid, userJid, ids);
      await sock.sendMessage(
        jid,
        { text: `_Spam detected! @${userJid?.split("@")[0]} kicked!_`, mentions: [userJid] },
      );
      await sock.groupParticipantsUpdate(jid, [userJid], "remove");
    } else {
      await sock.sendMessage(
        jid,
        { text: `_Spam detected! @${userJid?.split("@")[0]} is an admin!_`, mentions: [userJid] },
        { quoted: msg },
      );
    }
  } catch (error) {
    console.error(error);
  }
  return false;
}

module.exports = async function antispamGuard(env, next) {
  if (inSpamScope(env) && (await check(env))) return;
  await next();
};
