// chats the owner switched off (BLOCK_CHAT, RG): nothing after this runs for them
const { derived } = require("../../config/derived");

const blockedChatList = derived("BLOCK_CHAT", (raw) => (raw || "")?.split(","));
const blockedJidList = derived("RG", (raw) => (raw || "")?.split(","));

module.exports = async function blocklist(env, next) {
  if (blockedChatList().includes(env.jid) || blockedJidList().includes(env.jid)) return;
  await next();
};
