const config = require("../../../config");
const { isStatus, botIds } = require("../../identity");
const { loadBaileys, debugOn } = require("../../helpers");

const READABLE_STATUS = ["audioMessage", "imageMessage", "videoMessage", "extendedTextMessage"];

const LIKE_EMOJI = "💚";


const posterOf = (key) => key.participant || key.participantAlt || key.remoteJidAlt;

// Baileys only sets key.fromMe for our phone jid, not our lid
function isOwnStatus(key, sock) {
  if (key.fromMe) return true;
  const { lidNumber, pnNumber } = botIds(sock);
  return [key.participant, key.participantAlt, key.remoteJidAlt].some((jid) => {
    const user = String(jid || "").split("@")[0].split(":")[0];
    return Boolean(user) && (user === lidNumber || user === pnNumber);
  });
}

// without statusJidList Baileys encrypts for nobody and the like never arrives
async function likeStatus(sock, msg, emoji) {
  const { jidNormalizedUser } = await loadBaileys();
  const poster = posterOf(msg.key);
  // all recipients must be lids: mixing our phone jid with a lid gets ack error 400
  const ownJid = sock.user?.lid || sock.user?.id;
  const own = ownJid ? jidNormalizedUser(ownJid) : null;
  const statusJidList = [...new Set([poster, own].filter(Boolean))];
  const key = { remoteJid: "status@broadcast", fromMe: false, id: msg.key.id, participant: poster };
  const sent = await sock.sendMessage("status@broadcast", { react: { text: emoji, key } }, { statusJidList });
  if (debugOn()) {
    console.log(`[status] liked ${poster} ${msg.key.id} with ${emoji} (sent ${sent?.key?.id}, to ${statusJidList.join(", ")})`);
  }
}

const LIKE_DELAY_MS = () => 1000 + Math.floor(Math.random() * 2000);

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
  if (status && !isOwnStatus(msg.key, sock)) {
    const types = Object.keys(msg.message);
    const readable = READABLE_STATUS.some((type) => types.includes(type));
    const like = readable && config.AUTO_LIKE_STATUS;
    // a like without a view would look odd to the poster, so liking also views
    if (readable && (config.AUTO_READ_STATUS || like)) {
      await sock.readMessages([{ ...msg.key, participant: posterOf(msg.key) }]);
    }
    if (like) {
      const emoji = LIKE_EMOJI;
      const delay = module.exports.likeDelay();
      if (debugOn()) console.log(`[status] liking ${posterOf(msg.key)} ${msg.key.id} with ${emoji} in ${delay}ms`);
      const timer = setTimeout(() => {
        likeStatus(sock, msg, emoji).catch((error) => {
          console.warn(`status like failed for ${posterOf(msg.key)}: ${error?.message || error}`);
          if (debugOn()) console.error(error);
        });
      }, delay);
      timer.unref?.();
    }
  }
  await next();
};

module.exports.likeDelay = LIKE_DELAY_MS;
module.exports.LIKE_EMOJI = LIKE_EMOJI;
module.exports.likeStatus = likeStatus;
module.exports.isOwnStatus = isOwnStatus;
