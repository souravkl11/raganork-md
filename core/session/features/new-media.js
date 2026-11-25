// senders for message types baileys can't build itself; the wire mapping lives in proto-ext.js
const { loadBaileys, convertToOgg, toBuffer } = require("../../helpers");

const DEFAULT_EMOJI = "🔊";
const sentStickerAudio = new Map();

async function relay(sock, baileys, jid, content, options) {
  const msg = baileys.generateWAMessageFromContent(jid, content, {
    userJid: sock.user.id,
    quoted: options.quoted,
    ephemeralExpiration: options.ephemeralExpiration,
  });
  await sock.relayMessage(jid, msg.message, { messageId: msg.key.id });
  return msg;
}

const uploadOpts = (sock) => ({ upload: sock.waUploadToServer, logger: sock.logger });

async function uploadStickerAudio(baileys, audio, opts) {
  const ogg = await convertToOgg(await toBuffer(audio), { voice: true });
  const { audioMessage } = await baileys.prepareWAMessageMedia(
    { audio: ogg, mimetype: "audio/ogg; codecs=opus", ptt: true },
    opts,
  );
  delete audioMessage.ptt;
  audioMessage.contextInfo = {};
  return audioMessage;
}

// audio: media to upload, or an already uploaded audioMessage to reuse
async function sendStickerAudio(sock, jid, sticker, audio, options = {}) {
  const baileys = await loadBaileys();
  const opts = uploadOpts(sock);
  const { stickerMessage } = await baileys.generateWAMessageContent({ sticker }, opts);
  const audioMessage = audio?.directPath ? { ...audio } : await uploadStickerAudio(baileys, audio, opts);
  stickerMessage.premium = 0;
  stickerMessage.isAnimated = Buffer.isBuffer(sticker) && sticker.includes("ANIM");
  stickerMessage.emojis = options.emojis || DEFAULT_EMOJI;
  stickerMessage.audioMessage = audioMessage;
  const msg = await relay(sock, baileys, jid, { stickerMessage }, options);
  sentStickerAudio.set(msg.key.id, audioMessage);
  if (sentStickerAudio.size > 200) sentStickerAudio.delete(sentStickerAudio.keys().next().value);
  require("../../store").storeMessage({ ...msg, key: { ...msg.key, remoteJid: jid, fromMe: true } }).catch(() => {});
  return msg;
}

async function sendZap(sock, jid, media, type, options = {}) {
  const baileys = await loadBaileys();
  const key = type === "video" ? "videoMessage" : "imageMessage";
  const content = await baileys.generateWAMessageContent(
    { [type === "video" ? "video" : "image"]: media, caption: options.caption },
    uploadOpts(sock),
  );
  content[key].instant = true;
  return relay(sock, baileys, jid, { [key]: content[key] }, options);
}

// type: "text" | "image" | "video"; any inner message works, wa only rejects a spoiler inside a spoiler
async function sendSpoiler(sock, jid, content, type, options = {}) {
  const baileys = await loadBaileys();
  const input = type === "text" ? { text: content } : { [type]: content, caption: options.caption };
  const message = await baileys.generateWAMessageContent(input, uploadOpts(sock));
  message.spoiler = true;
  return relay(sock, baileys, jid, message, options);
}

const isStickerAudio = (message) => !!message?.stickerMessage?.audioMessage;
const isZap = (message) => !!(message?.imageMessage?.instant || message?.videoMessage?.instant);

const isSpoiler = (message) => !!message?.spoiler;
const sentStickerAudioFor = (id) => sentStickerAudio.get(id);

// a quoted audio sticker arrives without its audioMessage; recover it from what we sent or the store
async function findStickerAudio(reply) {
  const quoted = reply.data.message?.stickerMessage?.audioMessage;
  if (quoted?.directPath) return { audioMessage: quoted, key: reply.data.key };
  const sent = reply.id && sentStickerAudioFor(reply.id);
  if (sent) return { audioMessage: sent, key: reply.data.key };
  const stored = reply.id ? await require("../../store").getFullMessage(reply.id) : null;
  const audioMessage = stored?.found && stored.messageData.message?.stickerMessage?.audioMessage;
  return audioMessage ? { audioMessage, key: stored.messageData.key } : null;
}

module.exports = {
  sendStickerAudio,
  sendZap,
  sendSpoiler,
  isStickerAudio,
  isZap,
  isSpoiler,
  sentStickerAudioFor,
  findStickerAudio,
};
