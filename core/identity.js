// sender, bot ids, owner and sudo checks. use these instead of slicing jids.
const config = require("../config");

let lastSudoMapValue;
let sudoMap = [];
let lastSudoValue;
let sudoList = [];

function getSudoMap() {
  const raw = config.SUDO_MAP;
  if (raw !== lastSudoMapValue) {
    lastSudoMapValue = raw;
    try {
      const parsed = raw ? JSON.parse(raw) : [];
      sudoMap = Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      sudoMap = [];
    }
  }
  return sudoMap;
}

function getSudoList() {
  const raw = config.SUDO;
  if (raw !== lastSudoValue) {
    lastSudoValue = raw;
    sudoList = raw ? raw.split(",").map((s) => s.trim()) : [];
  }
  return sudoList;
}

function isSudo(jid) {
  return Boolean(jid) && getSudoMap().includes(jid);
}

const isGroup = (jid) => Boolean(jid) && jid.endsWith("@g.us");
const isStatus = (jid) => jid === "status@broadcast";

function botIds(sock) {
  const user = sock?.user;
  const lidNumber = user?.lid?.split(":")[0];
  const pnNumber = user?.id?.split(":")[0];
  return {
    lidNumber,
    pnNumber,
    lid: `${lidNumber}@lid`,
    pn: `${pnNumber}@s.whatsapp.net`,
    rawLid: user?.lid,
  };
}

function isBot(jid, sock) {
  const { lidNumber } = botIds(sock);
  return Boolean(jid) && jid.includes(lidNumber);
}

function isOwner(jid, sock) {
  return isBot(jid, sock) || isSudo(jid);
}

function senderOf(msg, sock) {
  const key = msg.key;
  if (isGroup(key.remoteJid)) return key.participant || key.participantAlt;
  if (key.fromMe) return botIds(sock).lid;
  return key.addressingMode === "pn" ? key.remoteJidAlt : key.remoteJid;
}

// unlike senderOf, a fromMe PM gives the other party, not the bot
function messageSender(key) {
  if (isGroup(key.remoteJid)) return key.participant || key.participantAlt;
  return key.remoteJid.endsWith("lid") ? key.remoteJid : key.remoteJidAlt;
}

// where owner notices go: the first SUDO_MAP entry (a LID, set by .setsudo), else the bot's own lid.
// legacy SUDO numbers are migrated into SUDO_MAP on connect, so they are never read here.
function ownerTarget(sock) {
  const first = getSudoMap()[0];
  if (first) return first;
  // sock.user.lid carries a device suffix ("123:7@lid"); messages must go to the bare account lid.
  // phone jid only when the socket has no lid at all (never on a live connection)
  const ids = botIds(sock);
  return ids.rawLid ? ids.lid : ids.pn;
}

module.exports = {
  getSudoMap,
  getSudoList,
  isSudo,
  isGroup,
  isStatus,
  botIds,
  isBot,
  isOwner,
  senderOf,
  messageSender,
  ownerTarget,
};
