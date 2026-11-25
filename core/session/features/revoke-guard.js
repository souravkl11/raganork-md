const REVOKE = 0;

function revokedKey(message) {
  const proto = message?.message?.protocolMessage;
  return proto && proto.type === REVOKE && proto.key?.id ? proto.key : null;
}

function forgetRevoked(bot, message) {
  const key = revokedKey(message);
  if (!key) return false;
  bot.revokedIds.set(key.id, true);
  bot.sock?.messageRetryManager?.removeRecentMessage?.(key.id);
  return true;
}

const isRevoked = (bot, id) => Boolean(id && bot.revokedIds?.has(id));

module.exports = { revokedKey, forgetRevoked, isRevoked };
