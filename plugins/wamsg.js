const { Module } = require("../main");
const { isAdmin } = require("./utils");
const { ownerTarget } = require("../core/identity");
const { getFullMessage, hasPendingWrites, flushPendingWrites } = require("../core/store");
const { extractViewOnce, hasViewOnceContent } = require("./utils/viewonce");
const { findStickerAudio, sendStickerAudio } = require("../core/session/features/new-media");
const { getString } = require("./utils/lang");
const Lang = getString("wamsg");

// newer WhatsApp quotes view-once as a stub with no key/link to download from
const hasMediaDetails = (node) => Boolean(node && (node.mediaKey || node.url || node.directPath));

async function reportVVFailure(m, reason) {
  const where = m.isGroup ? Lang.GROUP.format(m.jid.split("@")[0]) : m.jid.split("@")[0];
  try {
    await m.client.sendMessage(ownerTarget(m.client), {
      text: Lang.VV_FAILED.format(where, reason),
    });
  } catch (_) {
  }
}

// the stub has no media, so look the message up in the store, flushing pending writes once
const STORE_WAIT_MS = 6000;
async function recoverFromStore(id) {
  if (!id) return null;
  const deadline = Date.now() + STORE_WAIT_MS;
  try {
    while (true) {
      const full = await getFullMessage(id);
      if (full?.found) {
        const vv = extractViewOnce(full.messageData?.message);
        return hasViewOnceContent(vv) ? vv : null;
      }
      if (!hasPendingWrites() || Date.now() >= deadline) return null;
      await flushPendingWrites();
      await new Promise((r) => setTimeout(r, 300));
    }
  } catch (_) {
    return null;
  }
}

const TEXT_STUB_REASON = Lang.TEXT_STUB_REASON;
const STUB_REASON = Lang.STUB_REASON;
Module(
  {
    pattern: "react ?(.*)",
    fromMe: true,
    use: "whatsapp",
  },
  async (m, t) => {
    if (!m.quoted) return await m.sendReply(Lang.NEED_REPLY);
    await m.client.sendMessage(m.jid, {
      react: { text: t[1], key: m.quoted.key },
    });
  }
);
Module(
  {
    pattern: "edit ?(.*)",
    fromMe: true,
    use: "whatsapp",
  },
  async (m, t) => {
    if (t[1] && m.reply_message?.text && m.quoted.key.fromMe) {
      await m.edit(t[1], m.jid, m.quoted.key);
    }
  }
);
const forwardTo = (command, forwarded) => async (m, t) => {
  if (!m.reply_message) return await m.sendReply(Lang.NEED_REPLY);
  const query = t[1] || m.jid;
  const jidMap = query.split(" ").filter((x) => x.includes("@"));
  if (!jidMap.length) {
    return await m.sendReply(
      Lang.NO_JID.format(command)
    );
  }
  const contextInfo = forwarded
    ? { isForwarded: true, forwardingScore: 2 }
    : { isForwarded: false };
  // a forwarded copy of the quote would lose the audio, so audio stickers are sent again
  const audio = m.reply_message.sticker && (await findStickerAudio(m.reply_message));
  if (audio) {
    const sticker = await m.reply_message.download("buffer");
    const emojis = m.reply_message.data.message?.stickerMessage?.emojis;
    for (const jid of jidMap) await sendStickerAudio(m.client, jid, sticker, audio.audioMessage, { emojis });
    return;
  }
  for (const jid of jidMap) {
    await m.forwardMessage(jid, m.quoted, { contextInfo });
  }
};
Module(
  {
    pattern: "send ?(.*)",
    fromMe: true,
    desc: Lang.FORWARD_DESC,
    use: "whatsapp",
  },
  forwardTo("send", false)
);
Module(
  {
    pattern: "forward ?(.*)",
    fromMe: true,
    desc: Lang.FORWARD_DESC,
    use: "whatsapp",
  },
  forwardTo("forward", true)
);
Module(
  {
    pattern: "retry ?(.*)",
    fromMe: true,
    desc: Lang.RETRY_DESC,
    use: "misc",
  },
  async (m, t) => {
    if (!m.reply_message)
      return await m.sendReply(Lang.RETRY_NEED_REPLY);
    const { key, message } = m.quoted;
    if (key.fromMe && !m.fromMe) {
      return await m.sendReply(Lang.RETRY_OWNER_ONLY);
    }
    // the quoted key carries the original sender; remoteJidAlt keeps a phone-jid DM resolvable
    const original = {
      key: { ...key, remoteJidAlt: m.data.key.remoteJidAlt },
      message,
    };
    await m.client.ev.emit("messages.upsert", {
      messages: [original],
      type: "notify",
    });
  }
);
Module(
  {
    pattern: "vv ?(.*)",
    fromMe: true,
    desc: Lang.VV_DESC,
    use: "utility",
  },
  async (m, match) => {
    const quoted = m.quoted?.message,
      realQuoted = m.quoted;

    if (!m.reply_message || !quoted) {
      return await m.sendReply(Lang.NOT_VV);
    }

    if (match[1] && match[1].includes("@")) m.jid = match[1];

    const textVV = extractViewOnce(quoted);
    if (textVV?.isText) {
      const text = textVV.text || (await recoverFromStore(m.quoted?.key?.id))?.text;
      if (!text) return await reportVVFailure(m, TEXT_STUB_REASON);
      try {
        return await m.client.sendMessage(m.jid, { text });
      } catch (error) {
        return await reportVVFailure(m, String(error?.message || error));
      }
    }

    const viewOnceKey = [
      "viewOnceMessage",
      "viewOnceMessageV2",
      "viewOnceMessageV2Extension",
    ].find((key) => quoted.hasOwnProperty(key));

    const forward = async (node) => {
      let source = m.quoted;
      if (!hasMediaDetails(node)) {
        const stored = await recoverFromStore(m.quoted?.key?.id);
        if (!stored) return await reportVVFailure(m, STUB_REASON);
        source = { key: m.quoted.key, message: stored.message };
      }
      try {
        return await m.forwardMessage(m.jid, source, {
          contextInfo: { isForwarded: false },
        });
      } catch (error) {
        return await reportVVFailure(m, String(error?.message || error));
      }
    };

    if (viewOnceKey) {
      const realMessage = quoted[viewOnceKey].message;
      const msgType = Object.keys(realMessage)[0];
      if (realMessage[msgType]?.viewOnce) realMessage[msgType].viewOnce = false;
      m.quoted.message = realMessage;
      return await forward(realMessage[msgType]);
    }

    const directType = quoted.imageMessage
      ? "imageMessage"
      : quoted.audioMessage
      ? "audioMessage"
      : quoted.videoMessage
      ? "videoMessage"
      : null;

    if (directType && quoted[directType]?.viewOnce) {
      quoted[directType].viewOnce = false;
      return await forward(quoted[directType]);
    }

    await m.sendReply(Lang.NOT_VV);
  }
);
Module(
  {
    pattern: "delete",
    fromMe: true,
    desc: Lang.DELETE_DESC,
  },
  async (m, t) => {
    if (!m.reply_message) return;
    m.jid = m.quoted.key.remoteJid;
    if (!m.quoted.key.fromMe && !(await isAdmin(m))) {
      return await m.sendReply(Lang.NOT_ADMIN);
    }
    return await m.client.sendMessage(m.jid, { delete: m.quoted.key });
  }
);
