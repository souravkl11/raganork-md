// chat filters: an auto-reply when someone else's text matches a trigger. commands
// still run afterwards.
const { filter } = require("../../db/functions");

module.exports = async function filters(env, next) {
  if (env.text && !env.fromMe) {
    try {
      const matched = await filter.checkMatch(env.text, env.jid);
      if (matched) {
        await env.sock.sendMessage(env.jid, { text: matched.response }, { quoted: env.msg });
      }
    } catch (error) {
      console.error("Filter matching error:", error);
    }
  }
  await next();
};
