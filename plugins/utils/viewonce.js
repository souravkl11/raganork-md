const VV_WRAPPERS = [
  "viewOnceMessage",
  "viewOnceMessageV2",
  "viewOnceMessageV2Extension",
];
const MEDIA_TYPES = ["imageMessage", "videoMessage", "audioMessage"];

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

module.exports = { extractViewOnce };
