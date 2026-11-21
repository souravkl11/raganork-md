const { Module } = require("../main");
const { isAdmin } = require("./utils");
const { ownerTarget } = require("../core/identity");
const { getFullMessage, hasPendingWrites, flushPendingWrites } = require("../core/store");
const { extractViewOnce, hasViewOnceContent } = require("./utils/viewonce");

// newer WhatsApp quotes view-once as a stub with no key/link to download from
const hasMediaDetails = (node) => Boolean(node && (node.mediaKey || node.url || node.directPath));

async function reportVVFailure(m, reason) {
  const where = m.isGroup ? `group ${m.jid.split("@")[0]}` : m.jid.split("@")[0];
  try {
    await m.client.sendMessage(ownerTarget(m.client), {
      text: `*_.vv could not save a view once message_*\n\n_Chat:_ ${where}\n_Reason:_ ${reason}`,
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

const TEXT_STUB_REASON =
  "WhatsApp quoted the view once text without its content, and the original was not found in the saved messages (it may be older than 48 hours). Turn on `.autovv` to save view once messages as soon as they arrive.";
const STUB_REASON =
  "WhatsApp quoted the message without its media details, and the original was not found in the saved messages (it may be older than 48 hours, or it never arrived with its media). Set the browser to android (`.autovv here` offers to do it), and view once messages are saved as soon as they arrive.";
Module(
  {
    pattern: "react ?(.*)",
    fromMe: true,
    use: "whatsapp",
  },
  async (m, t) => {
    if (!m.quoted) return await m.sendReply("_Reply to a message_");
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
  if (!m.reply_message) return await m.sendReply("_Reply to a message_");
  const query = t[1] || m.jid;
  const jidMap = query.split(" ").filter((x) => x.includes("@"));
  if (!jidMap.length) {
    return await m.sendReply(
      `_No valid JID found in the query, use \`${command} jid1 jid2 ...\`_`
    );
  }
  const contextInfo = forwarded
    ? { isForwarded: true, forwardingScore: 2 }
    : { isForwarded: false };
  for (const jid of jidMap) {
    await m.forwardMessage(jid, m.quoted, { contextInfo });
  }
};
Module(
  {
    pattern: "send ?(.*)",
    fromMe: true,
    desc: "Forwards replied message to the given jid",
    use: "whatsapp",
  },
  forwardTo("send", false)
);
Module(
  {
    pattern: "forward ?(.*)",
    fromMe: true,
    desc: "Forwards replied message to the given jid",
    use: "whatsapp",
  },
  forwardTo("forward", true)
);
Module(
  {
    pattern: "retry ?(.*)",
    fromMe: true,
    desc: "Retries replied command to run the command again",
    use: "misc",
  },
  async (m, t) => {
    if (!m.reply_message)
      return await m.sendReply("_Reply to a command message_");
    const { key, message } = m.quoted;
    if (key.fromMe && !m.fromMe) {
      return await m.sendReply("_Only the owner can retry the bot's own messages_");
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
    desc: "Anti view once",
    use: "utility",
  },
  async (m, match) => {
    const quoted = m.quoted?.message,
      realQuoted = m.quoted;

    if (!m.reply_message || !quoted) {
      return await m.sendReply("_Not a view once msg!_");
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

    await m.sendReply("_Not a view once msg!_");
  }
);
Module(
  {
    pattern: "delete",
    fromMe: true,
    desc: "Deletes message for everyone",
  },
  async (m, t) => {
    if (!m.reply_message) return;
    m.jid = m.quoted.key.remoteJid;
    if (!m.quoted.key.fromMe && !(await isAdmin(m))) {
      return await m.sendReply("_I'm not an admin!_");
    }
    return await m.client.sendMessage(m.jid, { delete: m.quoted.key });
  }
);
