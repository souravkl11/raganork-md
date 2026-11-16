// fills env.text from the message (see normalize.extractText)
const { extractText } = require("../normalize");

module.exports = async function text(env, next) {
  const { text, sticker } = extractText(env);
  env.text = text;
  env.stickerPending = Boolean(sticker);
  await next();
};
