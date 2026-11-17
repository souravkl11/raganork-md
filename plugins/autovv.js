const { Module } = require("../main");
const config = require("../config");
const { setVar, delVar } = require("./manage");
const context = require("../core/context");
const { isAndroidBrowser } = require("../core/session/socket-options");

/**
 * Auto anti view-once.
 *
 * Every view once message the bot's number receives is forwarded, as a normal message,
 * to the chat set in VV_AUTO_JID the moment it arrives. This needs the android browser
 * (the default; not WA_BROWSER=chrome): a browser companion is never sent view once media. Messages the
 * bot's own number sends are not forwarded.
 */

const VV_WRAPPERS = [
  "viewOnceMessage",
  "viewOnceMessageV2",
  "viewOnceMessageV2Extension",
];
const MEDIA_TYPES = ["imageMessage", "videoMessage", "audioMessage"];

// android is the default; only WA_BROWSER=chrome turns it off
const isAndroid = isAndroidBrowser;
// the reply listener below finds the prompt by this phrase
const ANDROID_PROMPT_MARK = "reply *yes* to this message";
const ANDROID_NOTICE =
  `_Auto view once only works with the android browser, and it is not set now, so nothing will be saved yet._\n\n_To switch, ${ANDROID_PROMPT_MARK}, then restart the bot._`;

// <account>:<id> of recently forwarded messages, so a message delivered twice (a retry,
// a reconnect) is forwarded once. in memory only: oldest entries go first
const recent = new Set();
const RECENT_MAX = 2000;
function firstTime(key) {
  if (recent.has(key)) return false;
  recent.add(key);
  if (recent.size > RECENT_MAX) recent.delete(recent.values().next().value);
  return true;
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
    desc: "Saves every view once message the moment it arrives, to a chosen chat",
    usage: ".autovv here | <jid/number> | off | status",
    use: "utility",
  },
  async (m, match) => {
    const arg = (match[1] || "").trim();
    const current = config.VV_AUTO_JID || "";

    if (!arg || arg.toLowerCase() === "status") {
      return await m.sendReply(
        `_*Auto view once*_\n\n_Every view once message you receive is sent to a chosen chat the moment it arrives. This needs the android browser._\n\n_Status: ${
          current ? `on ✅ → ${current}` : "off ❌"
        }_\n_Browser: ${isAndroid() ? "android ✅" : "not android ⚠️ (nothing is saved)"}_\n\n_Usage:_\n\`.autovv here\` - _use this chat_\n\`.autovv <jid/number>\` - _use a custom chat_\n\`.autovv off\` - _disable_`
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

// "yes" to the prompt above sets the browser to android for this session
Module({ on: "text", fromMe: true }, async (m) => {
  if (!m.fromOwner || !/^(yes|y)$/i.test((m.text || "").trim())) return;
  if (!m.quoted?.key?.fromMe) return;
  if (!String(m.reply_message?.text || "").toLowerCase().includes(ANDROID_PROMPT_MARK)) return;
  if (isAndroid()) return await m.sendReply("_The browser is already set to android ✅_");
  await setVar("WA_BROWSER", "android");
  return await m.sendReply(
    "_Browser set to android ✅_\n_Restart the bot to apply it (_`.restart`_). No need to link the number again._"
  );
});

async function forward(m, target, vv, msgId, origSender) {
  const sourceChat = m.jid;
  const info = `_Auto view once_\n_From:_ @${origSender.split("@")[0]}\n_Chat:_ ${
    sourceChat.endsWith("@g.us") ? "group " : ""
  }${sourceChat.split("@")[0]}`;

  const options = {
    contextInfo: { isForwarded: false, mentionedJid: [origSender] },
  };
  const fake = { key: { remoteJid: sourceChat, id: msgId }, message: vv.message };

  if (vv.type === "audioMessage") {
    await m.client.sendMessage(target, { text: info, mentions: [origSender] });
  } else {
    const original = vv.message[vv.type].caption;
    options.caption = original ? `${original}\n\n${info}` : info;
  }
  await m.forwardMessage(target, fake, options);
}

Module({ on: "message", fromMe: false }, async (m) => {
  const target = config.VV_AUTO_JID;
  if (!target || typeof target !== "string") return;

  const key = m.data?.key;
  // the bot's own view once messages (sent from this number) are not saved
  if (!key?.id || key.fromMe) return;
  const vv = extractViewOnce(m.data.message);
  if (!vv) return;

  // two sessions in the same chat each forward to their own target
  const sentKey = `${context.accountId() || "_"}:${key.id}`;
  if (!firstTime(sentKey)) return;
  try {
    await forward(m, target, vv, key.id, key.participant || m.sender || m.jid);
  } catch (e) {
    recent.delete(sentKey); // a later delivery of the same message may try again
    console.warn(`autovv: could not forward ${key.id} to ${target}: ${e?.message || e}`);
    if (config.DEBUG) console.error(e);
  }
});
