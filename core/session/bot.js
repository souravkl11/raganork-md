const { logger } = require("../../config");
const config = require("../../config");
const { CustomAuthState } = require("../auth");
const context = require("../context");
const { bindings, ready: baileysPromise, resolveWaVersion } = require("./baileys");
const { createSessionCaches, wireCacheEvents } = require("./caches");
const { buildSocketOptions } = require("./socket-options");
const { handleConnectionUpdate } = require("./connection");
const { wireEvents } = require("./events");
const { planReconnect, SLOW_RETRY_MS, SLOW_RETRY_LOG_EVERY_MS } = require("./reconnect");
const { attachSocketFeatures } = require("./features");
const { handleAntiDelete } = require("./features/antidelete");
const { isLocalSession, chooseLoginMethod } = require("./terminal-login");
const { isHatchedId } = require("./hatchery");

class WhatsAppBot {
  get maxReconnectAttempts() {
    return this._maxReconnectAttempts ?? config.MAX_RECONNECT_ATTEMPTS;
  }

  set maxReconnectAttempts(value) {
    this._maxReconnectAttempts = value;
  }

  constructor(sessionId) {
    this.sessionId = sessionId;
    this.accountId = sessionId;
    this.accountResolved = false;
    this.sock = null;
    this.authState = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.initialConnectMessageSent = false;
    this.reconnectTimer = null;
    this.stableTimer = null;
    this.stopped = false;
    this.lastOpenAt = null;
    this.loggedOut = false;
    this.stopReason = null;
    this.lastSlowRetryLogAt = 0;
    this.loginMethod = null;
    // set by core/session/hatchery.js while a chat-started link is running
    this.hatch = null;

    const caches = createSessionCaches();
    this.groupCache = caches.groupCache;
    this.contactCache = caches.contactCache;
    this.messageCache = caches.messageCache;
    this.revokedIds = caches.revokedIds;
  }

  _teardownSocket() {
    const sock = this.sock;
    if (!sock) return;
    try {
      sock.ev.removeAllListeners();
    } catch (_) {}
    try {
      sock.end(undefined);
    } catch (_) {}
  }

  _clearConnectionTimers() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.stableTimer) clearTimeout(this.stableTimer);
    this.reconnectTimer = null;
    this.stableTimer = null;
  }

  _scheduleReconnect(statusCode) {
    if (this.stopped || this.reconnectTimer) return;
    const { delay, slow, attempts } = planReconnect({
      statusCode,
      attempts: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts,
    });
    this.reconnectAttempts = attempts;
    const info = {
      session: this.sessionId,
      attempt: this.reconnectAttempts,
      delayMs: Math.round(delay),
      statusCode,
    };
    if (!slow) {
      logger.info(info, "Scheduling reconnect");
    } else if (Date.now() - this.lastSlowRetryLogAt >= SLOW_RETRY_LOG_EVERY_MS) {
      this.lastSlowRetryLogAt = Date.now();
      logger.warn(info, "Fast reconnect attempts used up, retrying slowly");
      console.warn(
        `[${this.sessionId}] Still offline after ${this.reconnectAttempts} attempts, retrying every ~${Math.round(SLOW_RETRY_MS / 60000)} min.`,
      );
    }
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.stopped) return;
      this.initialize().catch((err) => {
        logger.error(
          { session: this.sessionId, attempt: this.reconnectAttempts, err },
          "Reconnect failed",
        );
        this._scheduleReconnect();
      });
    }, delay);
  }
  async initialize() {
    await this.loadAuth();
    await this.connect();
  }

  // no socket yet: data migrations run between loadAuth() and connect()
  async loadAuth() {
    try {
      await baileysPromise;

      logger.info(
        { session: this.sessionId },
        `Initializing bot with enhanced caching`,
      );
      if (!this.initialConnectMessageSent) {
        console.log(`- [${this.sessionId}] Initializing bot...`);
      }
      this.authState = new CustomAuthState(this.sessionId);
      const local = isLocalSession(this.sessionId);
      let sessionLoaded = false;
      try {
        await this.authState.loadSession({ skipBackend: local });
        sessionLoaded = Object.keys(this.authState.creds).length > 0;
      } catch (error) {
        logger.warn(
          { session: this.sessionId, err: error },
          `Failed to load session from database`,
        );
        console.warn(
          `⚠️ Failed to load session from database: ${this.sessionId}`,
        );
      }
      if (local && !this.authState.isLinked()) {
        // a saved hatched bot can only be linked again from chat, never the terminal
        if (isHatchedId(this.sessionId) && !this.hatch) {
          throw new Error(
            `Hatched bot ${this.sessionId} has no stored login. Link it again with the hatch command.`,
          );
        }
        // keep the identity of a link attempt that's still running
        if (!this.loginMethod || !sessionLoaded) {
          this.loginMethod = this.hatch?.method || (await chooseLoginMethod(this.sessionId));
          this.authState.startFresh();
        } else {
          this.authState.dropPairingPlaceholder();
        }
        sessionLoaded = true;
      }
      if (!sessionLoaded) {
        throw new Error(
          `No valid session found for ${this.sessionId}. Please use a supported login method.`,
        );
      }
      this.accountId = this.authState.getAccountId();
      this.accountResolved = this.authState.hasAccountId();
    } catch (error) {
      logger.error(
        { session: this.sessionId, err: error },
        `Failed to initialize bot`,
      );
      console.error(
        `[${this.sessionId}] ERROR: Failed to initialize bot. Details:`,
        error.message,
      );
      throw error;
    }
  }

  async connect() {
    try {
      await baileysPromise;
      if (!this.authState) {
        throw new Error(`Auth for ${this.sessionId} is not loaded, call loadAuth() first`);
      }
      const version = await resolveWaVersion();
      this._teardownSocket();
      this.sock = bindings.makeWASocket(buildSocketOptions(this, version));
      attachSocketFeatures(this.sock, this);
      this.setupEventHandlers();
    } catch (error) {
      logger.error(
        { session: this.sessionId, err: error },
        `Failed to initialize bot`,
      );
      console.error(
        `[${this.sessionId}] ERROR: Failed to initialize bot. Details:`,
        error.message,
      );
      throw error;
    }
  }

  _sessionContext() {
    this.accountId = this.authState?.getAccountId?.() || this.accountId;
    return { sessionId: this.sessionId, accountId: this.accountId, bot: this };
  }

  inSession(fn) {
    return context.run(this._sessionContext(), fn);
  }

  _on(event, listener) {
    this.sock.ev.on(event, (...args) => this.inSession(() => listener(...args)));
  }

  setupEventHandlers() {
    this._on("connection.update", (update) => handleConnectionUpdate(this, update));
    wireEvents(this);
    wireCacheEvents(this);
  }

  async _handleAntiDelete(update) {
    return handleAntiDelete(this, update);
  }

  async getGroupMetadata(jid) {
    try {
      return await this.sock.groupMetadata(jid);
    } catch (error) {
      logger.error(
        { session: this.sessionId, jid, err: error },
        `Failed to get group metadata`,
      );
      throw error;
    }
  }

  async getContact(jid) {
    if (!jid) return null;

    let contact = this.contactCache.get(jid);
    if (!contact) {
      try {
        const contacts = await this.sock.onWhatsApp(jid);
        if (contacts.length > 0) {
          contact = contacts[0];
          this.contactCache.set(jid, contact);
        }
      } catch (error) {
        logger.warn(
          { session: this.sessionId, jid, err: error },
          `Failed to fetch contact`,
        );
      }
    }
    return contact;
  }

  async getProfilePicture(jid) {
    if (!jid) return null;

    const cacheKey = `pp_${jid}`;
    let profilePic = this.contactCache.get(cacheKey);

    if (!profilePic) {
      try {
        profilePic = await this.sock.profilePictureUrl(jid, "image");
        this.contactCache.set(cacheKey, profilePic, 30 * 60);
      } catch (error) {
        logger.debug(
          { session: this.sessionId, jid },
          `No profile picture available`,
        );
        profilePic = null;
      }
    }
    return profilePic;
  }

  async sendMessage(jid, message) {
    if (!this.isConnected || !this.sock) {
      const error = new Error(
        `Bot for session ${this.sessionId} is not connected`,
      );
      logger.error(
        { session: this.sessionId, jid, err: error },
        `Cannot send message - bot not connected`,
      );
      console.error(
        `[${this.sessionId}] ERROR: Bot not connected. Cannot send message to ${jid}.`,
      );
      throw error;
    }

    if (!jid || !message) {
      throw new Error("JID and message are required");
    }

    try {
      logger.info({ session: this.sessionId, to: jid }, `Sending message`);
      const result = await this.sock.sendMessage(jid, message);

      if (result && result.key && result.key.id && result.key.remoteJid) {
        const cacheKey = `${result.key.remoteJid}_${result.key.id}`;
        this.messageCache.set(cacheKey, {
          key: result.key,
          message,
          ...result,
        });
      }

      return result;
    } catch (error) {
      logger.error(
        { session: this.sessionId, jid, err: error },
        `Failed to send message`,
      );
      throw error;
    }
  }

  getCacheStats() {
    return {
      groupMetadata: {
        keys: this.groupCache.keys().length,
        stats: this.groupCache.getStats(),
      },
      contacts: {
        keys: this.contactCache.keys().length,
        stats: this.contactCache.getStats(),
      },
      messages: {
        keys: this.messageCache.keys().length,
        stats: this.messageCache.getStats(),
      },
    };
  }

  async disconnect(logout = true) {
    try {
      this.stopped = true;
      this._clearConnectionTimers();

      if (this.sock) {
        logger.info({ session: this.sessionId, logout }, `Disconnecting bot.`);
        console.log(
          `[${this.sessionId}] Disconnecting bot (logout: ${logout})...`,
        );

        if (logout) {
          await this.sock.logout();
          logger.info({ session: this.sessionId }, "Logged out successfully");
        } else {
          this.sock.end(new Error("Manual disconnect without logout"));
          logger.info(
            { session: this.sessionId },
            "Connection ended without logout",
          );
        }

        this.isConnected = false;
        logger.info({ session: this.sessionId }, `Bot disconnected.`);
        console.log(`[${this.sessionId}] Bot disconnected.`);
      }
    } catch (error) {
      logger.error(
        { session: this.sessionId, err: error },
        "Error during disconnect",
      );
      console.error(
        `[${this.sessionId}] ERROR during disconnect:`,
        error.message,
      );
      throw error;
    } finally {
      this.sock = null;
      this.isConnected = false;
    }
  }
}

module.exports = { WhatsAppBot };
