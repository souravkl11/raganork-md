const NodeCache = require("node-cache");
const { logger } = require("../../config");

/**
 * Enhanced caching setup for Baileys
 *
 * SafeNodeCache extends NodeCache to prevent fatal ECACHEFULL errors.
 * Standard node-cache throws Error("ECACHEFULL: Cache max keys amount exceeded")
 * when maxKeys is reached instead of evicting. SafeNodeCache sets maxKeys to -1
 * natively (no throwing), while enforcing an optional maxLimit through graceful
 * batch FIFO eviction of the oldest keys, and wrapping .set() in safe error handling.
 */
class SafeNodeCache extends NodeCache {
  constructor(options = {}) {
    const { maxLimit, ...nodeCacheOptions } = options;
    super({
      useClones: false,
      deleteOnExpire: true,
      ...nodeCacheOptions,
      maxKeys: -1, // Ensure node-cache never throws ECACHEFULL natively
    });
    this.maxLimit = typeof maxLimit === "number" ? maxLimit : -1;
  }

  set(key, val, ttl) {
    try {
      // Proactively evict oldest keys if maxLimit is reached
      if (this.maxLimit > 0 && this.getStats().keys >= this.maxLimit) {
        this.evictOldest(Math.max(1, Math.floor(this.maxLimit * 0.1)));
      }
      return typeof ttl !== "undefined"
        ? super.set(key, val, ttl)
        : super.set(key, val);
    } catch (err) {
      if (
        err &&
        (err.name === "ECACHEFULL" ||
          err.code === "ECACHEFULL" ||
          (typeof err.message === "string" &&
            err.message.includes("ECACHEFULL")))
      ) {
        this.evictOldest(
          Math.max(1, Math.floor((this.getStats().keys || 10) * 0.1)),
        );
        try {
          return typeof ttl !== "undefined"
            ? super.set(key, val, ttl)
            : super.set(key, val);
        } catch {
          return false;
        }
      }
      logger.error({ err, key }, "Failed to cache key in SafeNodeCache");
      return false;
    }
  }

  evictOldest(count = 1) {
    try {
      const keys = this.keys();
      const numToEvict = Math.min(count, keys.length);
      for (let i = 0; i < numToEvict; i++) {
        this.del(keys[i]);
      }
    } catch (e) {
      // Ignore eviction errors
    }
  }
}

// per session: two sessions can share a group or a contact, and their metadata and
// push names are not the same
function createSessionCaches() {
  return {
    groupCache: new SafeNodeCache({
      stdTTL: 5 * 60,
      maxLimit: 2000, // soft limit with graceful batch FIFO eviction
      useClones: false,
      checkperiod: 60,
      deleteOnExpire: true,
    }),
    contactCache: new SafeNodeCache({
      stdTTL: 10 * 60,
      maxLimit: 5000,
      useClones: false,
      checkperiod: 60,
      deleteOnExpire: true,
    }),
    // short ttl cache used by getMessage retries, anti-delete and albums
    messageCache: new SafeNodeCache({
      stdTTL: 2 * 60,
      maxLimit: 3000,
      useClones: false,
      checkperiod: 30,
      deleteOnExpire: true,
    }),
  };
}

// keeps groupCache and contactCache fresh from socket events
function wireCacheEvents(bot) {
  bot._on("groups.update", (updates) => {
    for (const update of updates) {
      if (update.id) {
        bot.sock
          .groupMetadata(update.id)
          .then((metadata) => {
            bot.groupCache.set(update.id, metadata);
            logger.debug(
              { session: bot.sessionId, jid: update.id },
              `Group metadata updated in cache`,
            );
          })
          .catch((err) => {
            logger.warn(
              { session: bot.sessionId, jid: update.id, err },
              `Failed to update group metadata in cache`,
            );
          });
      }
    }
  });

  bot._on("contacts.update", (updates) => {
    for (const contact of updates) {
      if (contact.id) {
        bot.contactCache.set(contact.id, contact);
        logger.debug(
          { session: bot.sessionId, jid: contact.id },
          `Contact updated in cache`,
        );
      }
    }
  });

  bot._on("contacts.upsert", (contacts) => {
    for (const contact of contacts) {
      if (contact.id) {
        bot.contactCache.set(contact.id, contact);
      }
    }
  });
}

module.exports = { SafeNodeCache, createSessionCaches, wireCacheEvents };
