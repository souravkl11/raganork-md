// chat filters: an auto-reply when someone else's text matches a trigger. commands
// still run afterwards.
const { filter } = require("../../db/functions");
const context = require("../../context");

const FILTER_COOLDOWN_MS = 3000;
const lastRepliedAt = new Map();

function inCooldown(key) {
  const now = Date.now();
  if (lastRepliedAt.size > 1000) {
    for (const [k, until] of lastRepliedAt) if (until <= now) lastRepliedAt.delete(k);
  }
  return (lastRepliedAt.get(key) ?? 0) > now;
}

module.exports = async function filters(env, next) {
  if (env.text && !env.fromMe && (env.isGroup || env.isPM)) {
    const key = `${context.accountId() || "_"}:${env.jid}`;
    if (!inCooldown(key)) {
      try {
        const matched = await filter.checkMatch(env.text, env.jid);
        if (matched) {
          await env.sock.sendMessage(env.jid, { text: matched.response }, { quoted: env.msg });
          lastRepliedAt.set(key, Date.now() + FILTER_COOLDOWN_MS);
        }
      } catch (error) {
        console.error("Filter matching error:", error);
      }
    }
  }
  await next();
};

module.exports.clearCooldowns = () => lastRepliedAt.clear();
