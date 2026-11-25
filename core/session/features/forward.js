const { loadBaileys } = require("../../helpers");

// re-sends a stored message. { legacy: true } keeps the deprecated Message#forwardMessage
// contextInfo behaviour (options replace the generated contextInfo instead of merging).
async function forwardMessage(client, jid, message, options = {}, { legacy = false } = {}) {
  const { generateForwardMessageContent, getContentType, generateWAMessageFromContent } =
    await loadBaileys();
  let vtype;
  let mtype = getContentType(message.message);

  if (options.readViewOnce) {
    message.message =
      message.message &&
      message.message.ephemeralMessage &&
      message.message.ephemeralMessage.message
        ? message.message.ephemeralMessage.message
        : message.message || undefined;
    vtype = Object.keys(message.message.viewOnceMessage.message)[0];
    delete (message.message && message.message.ignore
      ? message.message.ignore
      : message.message || undefined);
    delete message.message.viewOnceMessage.message[vtype].viewOnce;
    message.message = {
      ...message.message.viewOnceMessage.message,
    };
  }

  if (options.mentions && message.message[mtype] && typeof message.message[mtype] === "object") {
    message.message[mtype].contextInfo = {
      ...message.message[mtype].contextInfo,
      mentionedJid: options.mentions,
    };
  }

  let content = generateForwardMessageContent(message, false);
  let content_type = getContentType(content);

  if (options.ptt) content[content_type].ptt = options.ptt;
  if (options.audiowave) content[content_type].waveform = options.audiowave;
  if (options.seconds) content[content_type].seconds = options.seconds;
  if (options.fileLength) content[content_type].fileLength = options.fileLength;
  if (options.caption) content[content_type].caption = options.caption;

  if (legacy) {
    if (options.contextInfo) {
      content[content_type].contextInfo = options.contextInfo;
    }
    if (options.mentions) {
      content[content_type].contextInfo = {
        ...content[content_type].contextInfo,
        mentionedJid: options.mentions,
      };
    }
    let context = {};
    if (mtype != "conversation") context = message.message[mtype].contextInfo;
    content[content_type].contextInfo = {
      ...context,
      ...content[content_type].contextInfo,
    };
  } else {
    if (options.contextInfo) {
      content[content_type].contextInfo = {
        ...(content[content_type].contextInfo || {}),
        ...options.contextInfo,
      };
    } else if (message.message[mtype] && message.message[mtype].contextInfo) {
      content[content_type].contextInfo = message.message[mtype].contextInfo;
    }

    if (options.mentions) {
      if (!content[content_type].contextInfo) {
        content[content_type].contextInfo = {};
      }
      content[content_type].contextInfo.mentionedJid = options.mentions;
    }
  }

  const waMessage = generateWAMessageFromContent(
    jid,
    content,
    options
      ? {
          ...content[content_type],
          ...options,
          ...(options.contextInfo
            ? {
                contextInfo: {
                  ...content[content_type].contextInfo,
                  ...options.contextInfo,
                },
              }
            : {}),
        }
      : {},
  );

  await client.relayMessage(jid, waMessage.message, {
    messageId: waMessage.key.id,
  });
  return waMessage;
}

module.exports = { forwardMessage };
