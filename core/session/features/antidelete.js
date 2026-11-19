const config = require("../../../config");
const { getFullMessage } = require("../../store");
const { ownerTarget } = require("../../identity");
const { forwardMessage } = require("./forward");
const { isOwnStatus } = require("../../pipeline/middleware/receipts");

const STATUS_JID = "status@broadcast";

const ANTI_DELETE_MODES = ["chat", "sudo", "custom"];
const ANTI_DELETE_DEDUPE_MS = 10 * 60 * 1000;
const recentlyRecovered = new Map();

function seenRecently(cacheKey) {
  const now = Date.now();
  for (const [key, at] of recentlyRecovered) {
    if (now - at > ANTI_DELETE_DEDUPE_MS) recentlyRecovered.delete(key);
    else break;
  }
  if (recentlyRecovered.has(cacheKey)) return true;
  recentlyRecovered.set(cacheKey, now);
  return false;
}

// a deleted status can't go back to the feed, so "chat" mode sends it to the owner
function resolveAntiDeleteTarget(originalChat, botUser) {
  if (config.ANTI_DELETE === "custom" && config.ANTI_DELETE_JID) {
    return config.ANTI_DELETE_JID;
  }
  if (config.ANTI_DELETE === "chat" && originalChat !== STATUS_JID) return originalChat;
  return ownerTarget({ user: botUser });
}

async function handleAntiDelete(bot, update) {
  const { remoteJid, id } = update.key;
  if (remoteJid.endsWith("@newsletter")) return;
  const isStatus = remoteJid === STATUS_JID;

  const cacheKey = `${remoteJid}_${id}`;
  const dedupeKey = `${bot.accountId}:${cacheKey}`;
  if (seenRecently(dedupeKey)) return;

  try {
    let recovered = bot.messageCache.get(cacheKey);
    if (!recovered) {
      const full = await getFullMessage(id);
      if (full?.found) recovered = full.messageData;
    }
    if (!recovered || !bot.isConnected) {
      recentlyRecovered.delete(dedupeKey);
      return;
    }

    // a status posted from the bot's phone carries our lid without fromMe
    const own = recovered.key?.fromMe || (isStatus && isOwnStatus(recovered.key, bot.sock));
    if (own && String(config.ANTI_DELETE_OWN) !== "true") {
      recentlyRecovered.delete(dedupeKey);
      return;
    }

    const targetJid = resolveAntiDeleteTarget(remoteJid, bot.sock.user);
    const isGroup = remoteJid.endsWith("@g.us");
    const participantJid =
      recovered.key.participant ||
      recovered.key.participantAlt ||
      recovered.key.remoteJid;
    const sameChat = targetJid === remoteJid;

    let chatLabel = remoteJid.split("@")[0];
    if (isStatus) {
      chatLabel = "Status";
    } else if (!sameChat && isGroup) {
      try {
        chatLabel = (await bot.sock.groupMetadata(remoteJid)).subject;
      } catch (_) {}
    } else if (!sameChat && recovered.pushName) {
      chatLabel = `${recovered.pushName} (${chatLabel})`;
    }

    const senderLabel = recovered.pushName
      ? `${recovered.pushName} (${participantJid.split("@")[0]})`
      : participantJid.split("@")[0];
    const header = [
      "Anti-delete 🛡️",
      ...(sameChat ? [] : [`Chat: ${chatLabel}`]),
      `Sender: ${senderLabel}`,
      ...(recovered.messageTimestamp
        ? [
            `Sent: ${new Date(
              Number(recovered.messageTimestamp) * 1000,
            ).toLocaleString()}`,
          ]
        : []),
    ].join("\n");

    try {
      await forwardMessage(bot.sock, targetJid, recovered, {
        contextInfo: {
          quotedMessage: { conversation: header },
          stanzaId: recovered.key.id,
          participant: participantJid,
          remoteJid: recovered.key.remoteJid,
        },
      });
    } catch (error) {
      await bot.sock.sendMessage(targetJid, {
        text: `_Anti-delete 🛡️: a message was deleted but could not be recovered_\n\n${header}\n_Reason: ${error.message}_`,
      });
      throw error;
    }
  } catch (error) {
    recentlyRecovered.delete(dedupeKey);
    throw error;
  }
}

module.exports = { ANTI_DELETE_MODES, handleAntiDelete, resolveAntiDeleteTarget };
