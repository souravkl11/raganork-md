// opt-in interactive messages (legacy lists, native flow buttons) with a plain-text fallback.
// a tap comes back as the row/button id, which normalize.js turns into command text,
// so every id here is a real, typeable command.
const config = require("../config");
const {
  loadBaileys,
  toBuffer,
  buildInteractiveButtons,
  validateAuthoringButtons,
  validateInteractiveMessageContent,
  getButtonType,
  getButtonArgs,
} = require("./helpers");

const LIMITS = { rowTitle: 72, rowDesc: 72, sectionTitle: 24, buttonText: 20, listButton: 20 };

const clip = (s, n) => {
  const str = String(s ?? "").replace(/\s+/g, " ").trim();
  return str.length > n ? str.slice(0, n - 1) + "…" : str;
};

const enabled = () => config.BUTTONS === true;

// command text for an id; uses the first handler, or none when handlers are off
function cmd(name, ...args) {
  const { helpPrefix } = require("./plugins/registry");
  return [`${helpPrefix()}${name}`, ...args.filter((a) => a !== undefined && a !== null && a !== "")]
    .join(" ")
    .trim();
}

const isUrl = (v) => typeof v === "string" && /^https?:\/\//.test(v);

async function prepareHeaderMedia(client, { image, video, document, fileName, mimetype, jpegThumbnail }) {
  const { prepareWAMessageMedia } = await loadBaileys();
  const upload = { upload: client.waUploadToServer };
  try {
    if (image) {
      const prepared = await prepareWAMessageMedia({ image: isUrl(image) ? { url: image } : await toBuffer(image) }, upload);
      return prepared.imageMessage ? prepared : null;
    }
    if (video) {
      const prepared = await prepareWAMessageMedia({ video: isUrl(video) ? { url: video } : await toBuffer(video) }, upload);
      return prepared.videoMessage ? prepared : null;
    }
    if (document) {
      const payload = { document: isUrl(document) ? { url: document } : await toBuffer(document) };
      if (jpegThumbnail) payload.jpegThumbnail = jpegThumbnail;
      const prepared = await prepareWAMessageMedia(payload, upload);
      if (!prepared.documentMessage) return null;
      if (fileName) prepared.documentMessage.fileName = fileName;
      if (mimetype) prepared.documentMessage.mimetype = mimetype;
      return prepared;
    }
  } catch (err) {
    console.error("Error preparing media for interactive message:", err.message);
  }
  return null;
}

// low level: native flow interactiveMessage, relayed with the biz node. throws on failure.
async function sendInteractive(client, jid, content, { quoted = null, ephemeralExpiration = null } = {}) {
  const { generateWAMessageFromContent } = await loadBaileys();
  const { title = "", footer = "", header = "", buttons = [], contextInfo = {}, externalAdReply = null } = content;

  if (!buttons || buttons.length === 0) throw new Error("At least one button is required");
  const { errors, warnings, cleaned } = validateAuthoringButtons(buttons);
  if (errors.length > 0) throw new Error("Button validation failed: " + errors.join("; "));
  if (warnings.length > 0) console.warn("Button warnings:", warnings);

  const media = await prepareHeaderMedia(client, content);
  const body = {
    body: { text: title || "" },
    footer: { text: footer || "" },
    header: media
      ? { title: header || "", hasMediaAttachment: true, ...media }
      : { title: header || "", hasMediaAttachment: false },
    nativeFlowMessage: { buttons: buildInteractiveButtons(cleaned) },
  };

  const ctx = {
    mentionedJid: contextInfo.mentionedJid || [],
    forwardingScore: contextInfo.forwardingScore || 0,
    isForwarded: contextInfo.isForwarded || false,
    ...contextInfo,
  };
  if (externalAdReply) {
    ctx.externalAdReply = {
      title: "",
      body: "",
      mediaType: 1,
      thumbnailUrl: "",
      mediaUrl: "",
      sourceUrl: "",
      showAdAttribution: false,
      renderLargerThumbnail: false,
      ...externalAdReply,
    };
  }
  body.contextInfo = ctx;

  const messageContent = { interactiveMessage: body };
  const check = validateInteractiveMessageContent(messageContent);
  if (!check.valid) throw new Error("Interactive message validation failed: " + check.errors.join("; "));
  if (check.warnings.length > 0) console.warn("Interactive message warnings:", check.warnings);

  const userJid = client.user?.id || client.user?.jid;
  const genOpts = { quoted: quoted || undefined, userJid };
  if (ephemeralExpiration) genOpts.ephemeralExpiration = ephemeralExpiration;
  const waMessage = generateWAMessageFromContent(jid, messageContent, genOpts);

  const additionalNodes = getButtonType(messageContent) ? [getButtonArgs(messageContent)] : [];
  await client.relayMessage(jid, waMessage.message, { messageId: waMessage.key.id, additionalNodes });
  return waMessage;
}

function toNativeButton(b) {
  if (b.name && b.buttonParamsJson) return b;
  const display_text = clip(b.text, LIMITS.buttonText);
  if (b.url) return { name: "cta_url", buttonParamsJson: JSON.stringify({ display_text, url: b.url, merchant_url: b.url }) };
  if (b.copy !== undefined) return { name: "cta_copy", buttonParamsJson: JSON.stringify({ display_text, copy_code: b.copy }) };
  return { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text, id: b.id }) };
}

let warnedFailure = false;

async function fallback(client, jid, opts, quoted) {
  const options = quoted ? { quoted } : {};
  if (opts.image && !isUrl(opts.image)) {
    return client.sendMessage(jid, { image: await toBuffer(opts.image), caption: opts.text }, options);
  }
  if (opts.image) return client.sendMessage(jid, { image: { url: opts.image }, caption: opts.text }, options);
  return client.sendMessage(jid, { text: opts.text }, options);
}

async function send(client, jid, opts, nativeButtons, { quoted = null, force = false } = {}, sender = null) {
  if (!force && !enabled()) return fallback(client, jid, opts, quoted);
  try {
    if (sender) return await sender(client, jid, opts, { quoted });
    return await sendInteractive(
      client,
      jid,
      { title: opts.body ?? opts.text, footer: opts.footer, header: opts.header, image: opts.image, buttons: nativeButtons },
      { quoted },
    );
  } catch (err) {
    if (!warnedFailure) {
      warnedFailure = true;
      console.error("[ui] interactive send failed, falling back to text:", err.message);
    }
    return fallback(client, jid, opts, quoted);
  }
}

// lists use the legacy listMessage: native flow single_select doesn't render on iOS,
// while listMessage renders (multi-section, 30+ rows) on both iOS and Android.
// taps come back as listResponseMessage.singleSelectReply.selectedRowId (see normalize.js)
async function sendLegacyList(client, jid, opts, { quoted = null } = {}) {
  const { generateWAMessageFromContent } = await loadBaileys();
  const sections = [...(opts.sections || [])];
  // a listMessage can't carry extra buttons; quick-reply style extras become a last section
  const extras = (opts.extraButtons || []).filter((b) => b.id);
  if (extras.length) sections.push({ title: "More", rows: extras.map((b) => ({ title: b.text, id: b.id })) });
  const listMessage = {
    title: opts.header || "",
    description: opts.body ?? opts.text,
    buttonText: clip(opts.button || "Select", LIMITS.listButton),
    footerText: opts.footer || "",
    listType: 1, // SINGLE_SELECT
    sections: sections
      .filter((sec) => sec.rows?.length)
      .map((sec) => ({
        title: clip(sec.title || "", LIMITS.sectionTitle),
        rows: sec.rows.map((r) => ({
          title: clip(r.title, LIMITS.rowTitle),
          ...(r.description ? { description: clip(r.description, LIMITS.rowDesc) } : {}),
          rowId: r.id,
        })),
      })),
  };
  if (!listMessage.sections.length) throw new Error("A list needs at least one row");
  const userJid = client.user?.id || client.user?.jid;
  const waMessage = generateWAMessageFromContent(jid, { listMessage }, { quoted: quoted || undefined, userJid });
  await client.relayMessage(jid, waMessage.message, {
    messageId: waMessage.key.id,
    additionalNodes: [getButtonArgs({ listMessage: true })],
  });
  return waMessage;
}

// opts: { text (fallback), header?, body?, footer?, button, sections: [{ title, rows: [{ title, description?, id }] }], extraButtons? }
const sendList = (client, jid, opts, sendOpts) => send(client, jid, opts, null, sendOpts, sendLegacyList);

// opts: { text (fallback), body?, header?, footer?, buttons: [{ text, id } | { text, url } | { text, copy }], image? }
const sendButtons = (client, jid, opts, sendOpts) => send(client, jid, opts, opts.buttons.map(toNativeButton), sendOpts);

module.exports = { enabled, cmd, clip, sendInteractive, sendLegacyList, sendList, sendButtons, LIMITS };
