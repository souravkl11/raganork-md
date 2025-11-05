const { Module } = require("../main");
const { isAdmin } = require("./utils");
const { ADMIN_ACCESS, MODE } = require("../config");
const isPrivateMode = MODE !== "public";
Module(
  {
    pattern: "react ?(.*)",
    fromMe: true,
    use: "whatsapp",
  },
  async (m, t) => {
    let msg = {
      remoteJid: m.reply_message?.jid,
      id: m.reply_message.id,
    };
    const reactionMessage = {
      react: {
        text: t[1],
        key: msg,
      },
    };

    await m.client.sendMessage(m.jid, reactionMessage);
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
Module(
  {
    pattern: "send ?(.*)",
    fromMe: true,
    desc: "Forwards replied message to the given jid",
    use: "whatsapp",
  },
  async (m, t) => {
    if (!m.reply_message) return await m.sendReply("_Reply to a message_");
    const query = t[1] || m.jid;
    const jidMap = query.split(" ").filter((x) => x.includes("@"));
    if (!jidMap.length) {
      return await m.sendReply(
        "_No valid JID found in the query, use `send jid1 jid2 ...`_"
      );
    }
    for (const jid of jidMap) {
      await m.forwardMessage(jid, m.quoted, {
        contextInfo: { isForwarded: false },
      });
    }
  }
);
Module(
  {
    pattern: "forward ?(.*)",
    fromMe: true,
    desc: "Forwards replied message to the given jid",
    use: "whatsapp",
  },
  async (m, t) => {
    if (!m.reply_message) return await m.sendReply("_Reply to a message_");
    const query = t[1] || m.jid;
    const jidMap = query.split(" ").filter((x) => x.includes("@"));
    if (!jidMap.length) {
      return await m.sendReply(
        "_No valid JID found in the query, use `forward jid1 jid2 ...`_"
      );
    }
    for (const jid of jidMap) {
      await m.forwardMessage(jid, m.quoted, {
        contextInfo: { isForwarded: true, forwardingScore: 2 },
      });
    }
  }
);
Module(
  {
    pattern: "retry ?(.*)",
    fromMe: isPrivateMode,
    desc: "Retries replied command to run the command again",
    use: "misc",
  },
  async (m, t) => {
    if (!m.reply_message)
      return await m.sendReply("_Reply to a command message_");
    await m.client.ev.emit("messages.upsert", {
      messages: [m.quoted],
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

    const viewOnceKey = [
      "viewOnceMessage",
      "viewOnceMessageV2",
      "viewOnceMessageV2Extension",
    ].find((key) => quoted.hasOwnProperty(key));

    if (viewOnceKey) {
      const realMessage = quoted[viewOnceKey].message;
      const msgType = Object.keys(realMessage)[0];
      if (realMessage[msgType]?.viewOnce) realMessage[msgType].viewOnce = false;
      m.quoted.message = realMessage;
      return await m.forwardMessage(m.jid, m.quoted, {
        contextInfo: { isForwarded: false },
      });
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
      return await m.forwardMessage(m.jid, m.quoted, {
        contextInfo: { isForwarded: false },
      });
    }

    await m.sendReply("_Not a view once msg!_");
  }
);
Module(
  {
    pattern: "delete",
    fromMe: true,
    desc: "Deletes message for everyone. Supports admin deletion",
  },
  async (m, t) => {
    let adminAccesValidated = ADMIN_ACCESS ? await isAdmin(m, m.sender) : false;
    if (!m.reply_message) return;
    if (m.fromOwner || adminAccesValidated) {
      m.jid = m.quoted.key.remoteJid;
      if (m.quoted.key.fromMe)
        return await m.client.sendMessage(m.jid, { delete: m.quoted.key });
      if (!m.quoted.key.fromMe) {
        var admin = await isAdmin(m);
        if (!admin) return await m.sendReply("_I'm not an admin!_");
        return await m.client.sendMessage(m.jid, { delete: m.quoted.key });
      }
    }
  }
);
