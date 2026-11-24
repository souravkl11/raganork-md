const fs = require("fs");
const { loadBaileys, convertToOgg, toBuffer } = require("../../helpers");

// baileys keeps fromMe false for channel posts; the stanza's is_sender says who posted
const ownPosts = new Set();

function trackOwnChannelPosts(sock) {
  sock?.ws?.on?.("CB:message", (node) => {
    const a = node?.attrs;
    if (!a?.id || a.is_sender !== "true" || !a.from?.endsWith("@newsletter")) return;
    ownPosts.add(a.id);
    if (ownPosts.size > 500) ownPosts.delete(ownPosts.values().next().value);
  });
}

function markOwnChannelPost(msg) {
  const key = msg?.key;
  if (key?.remoteJid?.endsWith("@newsletter") && ownPosts.delete(key.id)) key.fromMe = true;
  return msg;
}

const MEDIA_KEYS = ["image", "video", "audio", "document", "sticker"];
const MMS = { image: "image", sticker: "image", video: "video", ptv: "video", audio: "audio", document: "document" };

// channel media is uploaded unencrypted under /newsletter and sent with the upload handle as media_id
function channelUploader(sock, handles) {
  return async (filePath, { mediaType, fileEncSha256B64 }) => {
    const conn = await sock.refreshMediaConn(false);
    const token = fileEncSha256B64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const body = fs.readFileSync(filePath);
    let lastErr;
    for (const { hostname } of conn.hosts) {
      try {
        const url = `https://${hostname}/newsletter/newsletter-${MMS[mediaType] || mediaType}/${token}?auth=${encodeURIComponent(conn.auth)}&token=${token}`;
        const res = await fetch(url, {
          method: "POST",
          body,
          headers: { "Content-Type": "application/octet-stream", Origin: "https://web.whatsapp.com" },
        });
        const json = await res.json();
        if (!json.direct_path) throw new Error(`channel upload failed: ${JSON.stringify(json)}`);
        handles.push(json.handle);
        return { mediaUrl: json.url, directPath: json.direct_path };
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr;
  };
}

function plaintextMediaType(m) {
  if (m.imageMessage) return "image";
  if (m.videoMessage) return m.videoMessage.gifPlayback ? "gif" : "video";
  if (m.ptvMessage) return "ptv";
  if (m.audioMessage) return m.audioMessage.ptt ? "ptt" : "audio";
  if (m.documentMessage) return "document";
  if (m.stickerMessage) return "sticker";
}

async function sendChannelMedia(sock, jid, content, options = {}) {
  const b = await loadBaileys();
  // channels only take voice notes; plain audio shows as "update whatsapp"
  if (content.audio) {
    const ogg = await convertToOgg(await toBuffer(content.audio), { voice: true });
    content = {
      ...content,
      audio: ogg,
      ptt: true,
      mimetype: "audio/ogg; codecs=opus",
      seconds: content.seconds ?? Math.round((await b.getAudioDuration(ogg).catch(() => 0)) || 0),
      waveform: content.waveform ?? (await b.getAudioWaveform(ogg).catch(() => undefined)),
    };
  }
  const handles = [];
  const media = await b.generateWAMessageContent(content, {
    upload: channelUploader(sock, handles),
    jid,
    logger: sock.logger,
  });
  const msg = b.generateWAMessageFromContent(jid, media, { userJid: sock.user.id, quoted: options.quoted });
  const mediatype = plaintextMediaType(msg.message);
  await sock.sendNode({
    tag: "message",
    attrs: { to: jid, id: msg.key.id, type: "media", ...(handles[0] ? { media_id: handles[0] } : {}) },
    content: [{ tag: "plaintext", attrs: mediatype ? { mediatype } : {}, content: b.proto.Message.encode(msg.message).finish() }],
  });
  return msg;
}

// channels take edits/deletes under the original id with plain content, not a protocolMessage
function patchChannelSend(sock) {
  const send = sock?.sendMessage;
  if (!send) return;
  sock.sendMessage = async (jid, content, options) => {
    if (!jid?.endsWith("@newsletter")) return send(jid, content, options);
    const key = content?.edit || content?.delete;
    if (!key?.id) {
      if (MEDIA_KEYS.some((k) => content?.[k])) return sendChannelMedia(sock, jid, content, options);
      return send(jid, content, options);
    }
    let message = {};
    if (content.edit) {
      const { edit, ...rest } = content;
      const { generateWAMessageContent } = await loadBaileys();
      message = await generateWAMessageContent(rest, { upload: sock.waUploadToServer, logger: sock.logger });
      delete message.messageContextInfo;
    }
    // 3 admin edit, 8 admin revoke
    await sock.relayMessage(jid, message, { messageId: key.id, additionalAttributes: { edit: content.edit ? "3" : "8" } });
    return { key: { remoteJid: jid, fromMe: true, id: key.id }, message };
  };
}

module.exports = { trackOwnChannelPosts, markOwnChannelPost, patchChannelSend };
