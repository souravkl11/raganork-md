// builds the envelope object every pipeline stage works on from a messages.upsert batch.
const { isGroup, isStatus, senderOf, botIds } = require("../identity");

function normalize(raw, sock) {
  const msg = raw?.messages?.[0];
  if (!msg || !msg.key.remoteJid || !msg.message) return null;
  const sender = senderOf(msg, sock);
  if (!sender) return null;
  const jid = msg.key.remoteJid;
  return {
    raw,
    msg,
    sock,
    jid,
    sender,
    botNumber: botIds(sock).lidNumber,
    isGroup: isGroup(jid),
    isPM: !isGroup(jid) && !isStatus(jid) && !jid.endsWith("@newsletter"),
    fromMe: msg.key.fromMe,
    type: Object.keys(msg.message)[0],
    text: false,
    parsedText: null,
  };
}

// branch order matches the old handler; first match wins
function extractText(env) {
  const { msg, botNumber } = env;
  const m = msg.message;
  const fromBotButton = (reply) =>
    reply?.contextInfo?.participant &&
    reply.contextInfo.participant.split("@")[0] === botNumber;

  if (m?.conversation) return { text: m.conversation };
  if (m?.extendedTextMessage) return { text: m.extendedTextMessage.text };
  if (m?.imageMessage?.caption) return { text: m.imageMessage.caption };
  if (fromBotButton(m?.interactiveResponseMessage)) {
    return {
      text: JSON.parse(m.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson).id,
    };
  }
  if (fromBotButton(m?.templateButtonReplyMessage)) {
    return { text: m.templateButtonReplyMessage.selectedId };
  }
  // iOS answers a native quick_reply tap with buttonsResponseMessage, Android with templateButtonReplyMessage
  if (fromBotButton(m?.buttonsResponseMessage) && m.buttonsResponseMessage.selectedButtonId) {
    return { text: m.buttonsResponseMessage.selectedButtonId };
  }
  if (fromBotButton(m?.listResponseMessage)) {
    const id = m.listResponseMessage.singleSelectReply?.selectedRowId;
    if (id) return { text: id };
  }
  if (m?.videoMessage?.caption) return { text: m.videoMessage.caption };
  const doc = m?.documentWithCaptionMessage?.message?.documentMessage || m?.documentMessage;
  if (doc?.caption) return { text: doc.caption };
  if (m?.stickerMessage) return { text: false, sticker: true };
  return { text: false };
}

// "A ping" / "a ping" / ".Ping" all normalise to the same prefix
function parseText(text) {
  if (!text) return null;
  const splitText = text.charAt(0).toLowerCase() + text.slice(1);
  const sCorrect =
    splitText.charAt(0) + splitText.charAt(1).replace(" ", "") + splitText.slice(2);
  return splitText.charAt(0) + sCorrect.charAt(1).toLowerCase() + sCorrect.slice(2);
}

module.exports = { normalize, extractText, parseText };
