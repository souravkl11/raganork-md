const { Module, commands } = require("../main");
const config = require("../config");
const { DataTypes } = require("sequelize");
const { sequelize } = require("../core/database");
const { setVar, delVar } = require("./manage");

/**
 * Auto anti view-once.
 *
 * Whenever anyone (including the owner) replies to a view once message in any
 * chat, the media is forwarded (as a normal message) to the chat configured in
 * VV_AUTO_JID. Every view once message is forwarded at most once, tracked by
 * its message id in the database so restarts don't cause duplicates.
 */

const VV_WRAPPERS = [
  "viewOnceMessage",
  "viewOnceMessageV2",
  "viewOnceMessageV2Extension",
];
const MEDIA_TYPES = ["imageMessage", "videoMessage", "audioMessage"];

const VVSent = sequelize.define(
  "autovv_sent",
  {
    msgId: { type: DataTypes.STRING, primaryKey: true, allowNull: false },
    chat: { type: DataTypes.STRING, allowNull: true },
  },
  { tableName: "autovv_sent", timestamps: true }
);
const tableReady = VVSent.sync().catch((e) =>
  console.error("autovv: failed to sync table:", e.message)
);

// the .vv command pattern, looked up lazily because plugins load alphabetically
let vvPattern;
function isVVCommand(text) {
  if (!text) return false;
  if (vvPattern === undefined) {
    vvPattern =
      commands.find(
        (c) =>
          c.pattern &&
          c.pattern.source.endsWith("vv ?(.*)") &&
          !c.pattern.source.endsWith("autovv ?(.*)")
      )?.pattern || null;
  }
  return Boolean(vvPattern) && vvPattern.test(text.charAt(0).toLowerCase() + text.slice(1));
}

// ids currently being forwarded (guards against concurrent duplicate replies)
const inFlight = new Set();

function getReplyContext(message) {
  if (!message) return null;
  // unwrap ephemeral / view once wrappers around the reply itself
  let content = message;
  for (let i = 0; i < 3; i++) {
    const inner =
      content.ephemeralMessage?.message ||
      content.viewOnceMessage?.message ||
      content.viewOnceMessageV2?.message ||
      content.viewOnceMessageV2Extension?.message ||
      content.documentWithCaptionMessage?.message;
    if (!inner) break;
    content = inner;
  }
  for (const value of Object.values(content)) {
    if (value && typeof value === "object" && value.contextInfo?.quotedMessage)
      return value.contextInfo;
  }
  return null;
}

// returns a clean (non view once) copy of the quoted message, or null
function extractViewOnce(quotedMessage) {
  if (!quotedMessage) return null;
  const copy = JSON.parse(JSON.stringify(quotedMessage));
  // the quoted payload may itself be ephemeral wrapped
  const root = copy.ephemeralMessage?.message || copy;

  const wrapperKey = VV_WRAPPERS.find((key) => root[key]);
  const inner = wrapperKey ? root[wrapperKey].message : root;
  if (!inner) return null;

  const type = MEDIA_TYPES.find((t) => inner[t]);
  if (!type) return null;
  if (!wrapperKey && !inner[type].viewOnce) return null;

  delete inner[type].viewOnce;
  return { type, message: inner };
}

function normalizeJid(input, current) {
  const value = (input || "").trim().toLowerCase();
  if (!value) return null;
  if (value === "here") return current;
  if (value.includes("@")) {
    return /^[\w.-]+@(s\.whatsapp\.net|g\.us|lid)$/.test(value) ? value : null;
  }
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7 ? `${digits}@s.whatsapp.net` : null;
}

Module(
  {
    pattern: "autovv ?(.*)",
    fromMe: true,
    desc: "Auto-saves replied view once media to a chosen chat",
    usage: ".autovv here | <jid/number> | off | status",
    use: "utility",
  },
  async (m, match) => {
    const arg = (match[1] || "").trim();
    const current = config.VV_AUTO_JID || "";

    if (!arg || arg.toLowerCase() === "status") {
      return await m.sendReply(
        `_*Auto view once*_\n\n_Whenever someone replies to a view once message, the media is sent to a chosen chat (once per message)._\n\n_Status: ${
          current ? `on ✅ → ${current}` : "off ❌"
        }_\n\n_Usage:_\n\`.autovv here\` - _use this chat_\n\`.autovv <jid/number>\` - _use a custom chat_\n\`.autovv off\` - _disable_`
      );
    }

    if (arg.toLowerCase() === "off") {
      await delVar("VV_AUTO_JID");
      return await m.sendReply("_Auto view once deactivated ❌_");
    }

    const target = normalizeJid(arg, m.jid);
    if (!target) {
      return await m.sendReply(
        "_Invalid chat! Use `here`, a number, or a JID like_ `123456789@s.whatsapp.net` _/_ `123456789@g.us`"
      );
    }
    await setVar("VV_AUTO_JID", target);
    return await m.sendReply(
      `_Auto view once activated ✅_\n\n_View once media from replies will be sent to:_ ${target}`
    );
  }
);

Module({ on: "message", fromMe: false }, async (m) => {
  const target = config.VV_AUTO_JID;
  if (!target || typeof target !== "string") return;

  // an explicit .vv reply already handles the message itself
  if (isVVCommand(m.text)) return;

  const ctx = getReplyContext(m.data?.message);
  if (!ctx) return;

  const quotedId = ctx.stanzaId;
  if (!quotedId) return;

  const vv = extractViewOnce(ctx.quotedMessage);
  if (!vv) return;

  if (inFlight.has(quotedId)) return;
  inFlight.add(quotedId);
  try {
    await tableReady;
    if (await VVSent.findByPk(quotedId)) return;

    const sourceChat = m.jid;
    const origSender = ctx.participant || sourceChat;
    const info = `_Auto view once_\n_From:_ @${origSender.split("@")[0]}\n_Chat:_ ${
      sourceChat.endsWith("@g.us") ? "group " : ""
    }${sourceChat.split("@")[0]}`;

    const options = {
      contextInfo: { isForwarded: false, mentionedJid: [origSender] },
    };
    const fake = { key: { remoteJid: sourceChat, id: quotedId }, message: vv.message };

    if (vv.type === "audioMessage") {
      await m.client.sendMessage(target, {
        text: info,
        mentions: [origSender],
      });
    } else {
      const original = vv.message[vv.type].caption;
      options.caption = original ? `${original}\n\n${info}` : info;
    }

    await m.forwardMessage(target, fake, options);
    // mark as sent only after a successful forward so failures can be retried
    await VVSent.create({ msgId: quotedId, chat: sourceChat });
  } catch (e) {
    if (config.DEBUG) console.error("autovv error:", e);
  } finally {
    inFlight.delete(quotedId);
  }
});
