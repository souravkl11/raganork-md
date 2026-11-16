// who is who: sender, bot ids, owner and sudo. every other file asks here instead of
// slicing jids itself. sudo lists are read through config at call time, so inside a
// session context they are that session's lists.
const config = require("../config");

let lastSudoMapValue;
let sudoMap = [];
let lastSudoValue;
let sudoList = [];

// SUDO_MAP: JSON array of LIDs, re-parsed only when the config value changes
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

// SUDO: legacy comma separated phone numbers
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

// the bot's own ids. `<digits>:<device>@lid` and `<digits>:<device>@s.whatsapp.net`
// reduced to the digits and rebuilt as plain jids; `rawLid` keeps the device suffix
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

// true when the jid carries the bot's own lid number
function isBot(jid, sock) {
  const { lidNumber } = botIds(sock);
  return Boolean(jid) && jid.includes(lidNumber);
}

// the account owner: the bot itself or a sudo
function isOwner(jid, sock) {
  return isBot(jid, sock) || isSudo(jid);
}

// who sent a message, as the pipeline gates permissions on it: group messages carry
// the participant, our own PM messages are the bot's lid, others are the chat (or its
// phone jid when the chat is addressed by phone number)
function senderOf(msg, sock) {
  const key = msg.key;
  if (isGroup(key.remoteJid)) return key.participant || key.participantAlt;
  if (key.fromMe) return botIds(sock).lid;
  return key.addressingMode === "pn" ? key.remoteJidAlt : key.remoteJid;
}

// the `sender` field of a Message object (contract): unlike senderOf, a fromMe PM
// gives the other party, not the bot
function messageSender(key) {
  if (isGroup(key.remoteJid)) return key.participant || key.participantAlt;
  return key.remoteJid.endsWith("lid") ? key.remoteJid : key.remoteJidAlt;
}

// where owner notices go. a notice site picks which lists it has always read:
//   map     first SUDO_MAP entry (a LID)
//   legacy  first number of SUDO
//   self    "lid": the bot's own lid, with its device suffix; "pn": its phone jid
function ownerTarget(sock, { map = true, legacy = true, self = "lid" } = {}) {
  if (map) {
    const first = getSudoMap()[0];
    if (first) return first;
  }
  if (legacy) {
    const first = config.SUDO && config.SUDO.split(",")[0].trim();
    if (first) return first.includes("@") ? first : `${first}@s.whatsapp.net`;
  }
  const ids = botIds(sock);
  return self === "lid" ? sock?.user?.lid || ids.pn : ids.pn;
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
