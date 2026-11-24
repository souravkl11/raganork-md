// senders for message types baileys can't build itself; the wire mapping lives in proto-ext.js
const { loadBaileys, convertToOgg, toBuffer } = require("../../helpers");

const DEFAULT_EMOJI = "🔊";

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

async function sendStickerAudio(sock, jid, sticker, audio, options = {}) {
  const baileys = await loadBaileys();
  const opts = uploadOpts(sock);
  const ogg = await convertToOgg(await toBuffer(audio), { voice: true });
  const { stickerMessage } = await baileys.generateWAMessageContent({ sticker }, opts);
  const { audioMessage } = await baileys.prepareWAMessageMedia(
    { audio: ogg, mimetype: "audio/ogg; codecs=opus", ptt: true },
    opts,
  );
  delete audioMessage.ptt;
  audioMessage.contextInfo = {};
  stickerMessage.premium = 0;
  stickerMessage.emojis = options.emojis || DEFAULT_EMOJI;
  stickerMessage.audioMessage = audioMessage;
  return relay(sock, baileys, jid, { stickerMessage }, options);
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

module.exports = {
  sendStickerAudio,
  sendZap,
  sendSpoiler,
  isStickerAudio,
  isZap,
  isSpoiler,
};
