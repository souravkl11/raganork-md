const { Module, commands } = require("../main");
const config = require("../config");
const { DataTypes } = require("sequelize");
const { sequelize } = require("../core/database");
const { setVar, delVar } = require("./manage");
const context = require("../core/context");
const { patternFor } = require("../core/plugins/registry");

/**
 * Auto anti view-once.
 *
 * A view once message that arrives in any chat, or that anyone replies to, is
 * forwarded (as a normal message) to the chat configured in VV_AUTO_JID. Every view
 * once message is forwarded at most once, tracked by its message id in the database
 * so restarts don't cause duplicates.
 */

const VV_WRAPPERS = [
  "viewOnceMessage",
  "viewOnceMessageV2",
  "viewOnceMessageV2Extension",
];
const MEDIA_TYPES = ["imageMessage", "videoMessage", "audioMessage"];

const isAndroid = () => String(config.WA_BROWSER || "").toLowerCase() === "android";
const ANDROID_NOTICE =
  "_To catch view once messages the moment they arrive, set the browser to android first:_\n`.setvar WA_BROWSER=android`\n_then restart and link the number again. Until then only view once messages that someone replies to are saved._";

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

// the .vv command, looked up lazily because plugins load alphabetically. its pattern is
// taken per call (patternFor) so it follows the session's current prefix
let vvCommand;
function isVVCommand(text) {
  if (!text) return false;
  if (vvCommand === undefined) {
    vvCommand =
      commands.find(
        (c) =>
          c.pattern &&
          c.pattern.source.endsWith("vv ?(.*)") &&
          !c.pattern.source.endsWith("autovv ?(.*)")
      ) || null;
  }
  return (
    Boolean(vvCommand) &&
    patternFor(vvCommand).test(text.charAt(0).toLowerCase() + text.slice(1))
  );
}

// <account>:<id> currently being forwarded (guards against concurrent duplicate replies)
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

// returns a clean (non view once) copy of a view once message, or null. covers the wrapped
// forms and a bare media message carrying viewOnce: true (what an Android companion receives)
function extractViewOnce(message) {
  if (!message) return null;
  const root = message.ephemeralMessage?.message || message;
  const wrapperKey = VV_WRAPPERS.find((key) => root[key]);
  const inner = wrapperKey ? root[wrapperKey].message : root;
  if (!inner) return null;

  const type = MEDIA_TYPES.find((t) => inner[t]);
  if (!type) return null;
  if (!wrapperKey && !inner[type].viewOnce) return null;

  const media = { ...inner[type] };
  delete media.viewOnce;
  return { type, message: { ...inner, [type]: media } };
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
        }_\n_Browser: ${isAndroid() ? "android ✅" : "not android ⚠️"}_\n\n_Usage:_\n\`.autovv here\` - _use this chat_\n\`.autovv <jid/number>\` - _use a custom chat_\n\`.autovv off\` - _disable_`
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
      `_Auto view once activated ✅_\n\n_View once media will be sent to:_ ${target}${
        isAndroid() ? "" : `\n\n⚠️ ${ANDROID_NOTICE}`
      }`
    );
  }
);

async function forwardOnce(m, target, vv, msgId, origSender) {
  // once per message and per session: two sessions in the same chat each forward to their own target.
  // rows written before accounts exist are the bare message id and still count for every session
  const sentKey = `${context.accountId() || "_"}:${msgId}`;
  if (inFlight.has(sentKey)) return;
  inFlight.add(sentKey);
  try {
    await tableReady;
    if ((await VVSent.findByPk(sentKey)) || (await VVSent.findByPk(msgId))) return;

    const sourceChat = m.jid;
    const info = `_Auto view once_\n_From:_ @${origSender.split("@")[0]}\n_Chat:_ ${
      sourceChat.endsWith("@g.us") ? "group " : ""
    }${sourceChat.split("@")[0]}`;

    const options = {
      contextInfo: { isForwarded: false, mentionedJid: [origSender] },
    };
    const fake = { key: { remoteJid: sourceChat, id: msgId }, message: vv.message };

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
    await VVSent.create({ msgId: sentKey, chat: sourceChat });
  } catch (e) {
    if (config.DEBUG) console.error("autovv error:", e);
  } finally {
    inFlight.delete(sentKey);
  }
}

Module({ on: "message", fromMe: false }, async (m) => {
  const target = config.VV_AUTO_JID;
  if (!target || typeof target !== "string") return;

  const message = m.data?.message;

  // the message itself is view once
  const direct = extractViewOnce(message);
  if (direct) {
    const id = m.data.key?.id;
    if (!id || m.jid === target) return;
    return await forwardOnce(m, target, direct, id, m.data.key.participant || m.sender || m.jid);
  }

  // an explicit .vv reply already handles the message itself
  if (isVVCommand(m.text)) return;

  // someone replied to a view once message
  const ctx = getReplyContext(message);
  if (!ctx?.stanzaId) return;
  const vv = extractViewOnce(ctx.quotedMessage);
  if (!vv) return;
  await forwardOnce(m, target, vv, ctx.stanzaId, ctx.participant || m.jid);
});
