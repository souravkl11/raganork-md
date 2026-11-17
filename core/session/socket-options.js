const config = require("../../config");

const { logger, baileysLogger } = config;

// WA_BROWSER=android registers the session as an Android companion (experimental,
// the only mode that receives view-once). anything else keeps the Chrome identity.
const browserFor = () =>
  String(config.WA_BROWSER || "").toLowerCase() === "android"
    ? ["13", "Android", ""]
    : ["Raganork", "Chrome", "1.0.0"];

// what baileys gets when a session opens its socket. the cache lookups read the bot's
// caches at call time
function buildSocketOptions(bot, version) {
  return {
    auth: {
      creds: bot.authState.creds,
      keys: bot.authState.getBaileysKeysInterface(),
    },
    ...(version ? { version } : {}),
    logger: baileysLogger.child({ session: bot.sessionId }),
    // read inside the session: a .setvar value is only visible there
    browser: bot.inSession(browserFor),
    cachedGroupMetadata: (jid) => {
      const cached = bot.groupCache.get(jid);
      if (cached) {
        logger.debug(
          { session: bot.sessionId, jid },
          `Group metadata served from cache`,
        );
      }
      return cached;
    },
    getMessage: async (key) => {
      if (!key || !key.remoteJid || !key.id) {
        return undefined;
      }
      const cacheKey = `${key.remoteJid}_${key.id}`;
      const message = bot.messageCache.get(cacheKey)?.message;
      if (!message) {
        logger.debug(
          { session: bot.sessionId, key },
          `Message not in cache, will fetch from server`,
        );
        return undefined;
      }
      logger.debug(
        { session: bot.sessionId, key },
        `Message served from cache`,
      );
      return message;
    },
    syncFullHistory: false,
    // skip decoding history blobs on connect, big memory/cpu saver
    shouldSyncHistoryMessage: () => false,
    markOnlineOnConnect: true,
    retryRequestDelayMs: 250,
    maxMsgRetryCount: 5,
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
    patchMessageBeforeSending: (msg) => {
      const timestamp = Date.now();
      return {
        ...msg,
        messageTimestamp: timestamp,
      };
    },
  
  };
}

module.exports = { buildSocketOptions, browserFor };
