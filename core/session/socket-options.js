const config = require("../../config");

const { logger, baileysLogger } = config;

// sessions register as an Android companion by default: the only identity that is sent
// view once media (Baileys calls it experimental). WA_BROWSER=chrome (or web) keeps the
// old Chrome identity. read inside the session, so a .setvar value counts
const CHROME_VALUES = new Set(["chrome", "web", "browser"]);
const isAndroidBrowser = () => !CHROME_VALUES.has(String(config.WA_BROWSER || "").trim().toLowerCase());
const browserFor = () => (isAndroidBrowser() ? ["13", "Android", ""] : ["Raganork", "Chrome", "1.0.0"]);

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

module.exports = { buildSocketOptions, browserFor, isAndroidBrowser };
