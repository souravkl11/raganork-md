const VV_WRAPPERS = [
  "viewOnceMessage",
  "viewOnceMessageV2",
  "viewOnceMessageV2Extension",
];
const MEDIA_TYPES = ["imageMessage", "videoMessage", "audioMessage"];
const TEXT_TYPES = ["extendedTextMessage", "conversation"];

// returns a clean (non view once) copy of a view once message, or null. covers the wrapped
function extractViewOnce(message) {
  if (!message) return null;
  const root = message.ephemeralMessage?.message || message;
  const wrapperKey = VV_WRAPPERS.find((key) => root[key]);
  const inner = wrapperKey ? root[wrapperKey].message : root;
  if (!inner) return null;

  const type = [...MEDIA_TYPES, ...TEXT_TYPES].find((t) => inner[t]);
  if (!type) return null;
  if (typeof inner[type] === "string") {
    return wrapperKey ? { type, isText: true, text: inner[type], message: { [type]: inner[type] } } : null;
  }
  if (!wrapperKey && !inner[type].viewOnce) return null;

  const node = { ...inner[type] };
  delete node.viewOnce;
  const isText = TEXT_TYPES.includes(type);
  return { type, isText, text: isText ? node.text || "" : undefined, message: { ...inner, [type]: node } };
}

// whether the copy is usable: text present, or media that can still be downloaded
// (newer WhatsApp quotes view once as a stub without either)
function hasViewOnceContent(vv) {
  if (!vv) return false;
  if (vv.isText) return Boolean(vv.text);
  const node = vv.message[vv.type];
  return Boolean(node && (node.mediaKey || node.url || node.directPath));
}

module.exports = { extractViewOnce, hasViewOnceContent };
