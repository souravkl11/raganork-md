let makeWASocket,
  DisconnectReason,
  generateForwardMessageContent,
  getContentType,
  generateWAMessageFromContent,
  jidNormalizedUser,
  useMultiFileAuthState,
  fetchLatestBaileysVersion;

const { loadBaileys } = require("./helpers");

const baileysPromise = loadBaileys()
  .then((baileys) => {
    ({
      default: makeWASocket,
      DisconnectReason,
      generateForwardMessageContent,
      getContentType,
      generateWAMessageFromContent,
      jidNormalizedUser,
      useMultiFileAuthState,
      fetchLatestBaileysVersion,
    } = baileys);
  })
  .catch((err) => {
    console.error("Failed to load baileys:", err.message);
    process.exit(1);
  });
const NodeCache = require("node-cache");
const { logger, MAX_RECONNECT_ATTEMPTS } = require("../config");
const { CustomAuthState } = require("./auth");
const { handler, groupUpdate, startEvent } = require("./handler");
const { getFullMessage, AntiDeleteCache, storeMessage } = require("./store");
const config = require("../config");
const Schedule = require("./schedulers");
const Jimp = require("jimp");
const qrcode = require("qrcode-terminal");
const fs = require("fs");
const crypto = require("crypto");
const { getBuffer } = require("../plugins/utils/misc");

async function generateProfilePicture(mediaUpload) {
  let bufferOrFilePath;

  if (Buffer.isBuffer(mediaUpload)) {
    bufferOrFilePath = mediaUpload;
  } else if (
    typeof mediaUpload === "object" &&
    "url" in mediaUpload &&
    typeof mediaUpload.url === "string"
  ) {
    bufferOrFilePath = mediaUpload.url;
  } else if (typeof mediaUpload === "object" && "stream" in mediaUpload) {
    try {
      bufferOrFilePath = await toBuffer(mediaUpload.stream);
    } catch (streamErr) {
      throw new Error(
        `Failed to convert stream to buffer: ${streamErr.message}`,
      );
    }
  } else {
    throw new Error(
      "Invalid mediaUpload format. Expected Buffer, { url: string }, or { stream: ReadableStream }.",
    );
  }

  try {
    const jimp = await Jimp.read(bufferOrFilePath);

    const maxWidth = 720;
    const maxHeight = 720;

    let width = jimp.bitmap.width;
    let height = jimp.bitmap.height;

    const widthRatio = maxWidth / width;
    const heightRatio = maxHeight / height;

    const ratio = Math.min(widthRatio, heightRatio);

    if (ratio < 1) {
      width = width * ratio;
      height = height * ratio;
    }

    const finalWidth = parseInt(width);
    const finalHeight = parseInt(height);

    console.log(
      `Engine: Resizing image from ${jimp.bitmap.width}x${jimp.bitmap.height} to ${finalWidth}x${finalHeight}`,
    );
    return await jimp
      .resize(finalWidth, finalHeight)
      .getBufferAsync("image/jpeg");
  } catch (error) {
    console.error("Error processing image for profile picture:", error);
    throw new Error(`Could not generate profile picture: ${error.message}`);
  }
}

async function forwardMessage(client, jid, message, options = {}) {
  let vtype;
  let mtype = getContentType(message.message);

  if (options.readViewOnce) {
    message.message =
      message.message &&
      message.message.ephemeralMessage &&
      message.message.ephemeralMessage.message
        ? message.message.ephemeralMessage.message
        : message.message || undefined;
    vtype = Object.keys(message.message.viewOnceMessage.message)[0];
    delete (message.message && message.message.ignore
      ? message.message.ignore
      : message.message || undefined);
    delete message.message.viewOnceMessage.message[vtype].viewOnce;
    message.message = {
      ...message.message.viewOnceMessage.message,
    };
  }

  if (options.mentions) {
    // Ensure contextInfo exists before trying to add mentions
    if (!message.message[mtype].contextInfo) {
      message.message[mtype].contextInfo = {};
    }
    message.message[mtype].contextInfo.mentionedJid = options.mentions;
  }

  let content = generateForwardMessageContent(message, false);
  let content_type = getContentType(content);

  // Apply specific options based on content type
  if (options.ptt) content[content_type].ptt = options.ptt;
  if (options.audiowave) content[content_type].waveform = options.audiowave;
  if (options.seconds) content[content_type].seconds = options.seconds;
  if (options.fileLength) content[content_type].fileLength = options.fileLength;
  if (options.caption) content[content_type].caption = options.caption;

  // Merge or set contextInfo carefully
  if (options.contextInfo) {
    content[content_type].contextInfo = {
      ...(content[content_type].contextInfo || {}),
      ...options.contextInfo,
    };
  } else if (message.message[mtype] && message.message[mtype].contextInfo) {
    content[content_type].contextInfo = message.message[mtype].contextInfo;
  }

  // Re-apply mentions if they were set
  if (options.mentions) {
    if (!content[content_type].contextInfo) {
      content[content_type].contextInfo = {};
    }
    content[content_type].contextInfo.mentionedJid = options.mentions;
  }

  const waMessage = generateWAMessageFromContent(
    jid,
    content,
    options
      ? {
          ...content[content_type],
          ...options,
          ...(options.contextInfo
            ? {
                contextInfo: {
                  ...content[content_type].contextInfo,
                  ...options.contextInfo,
                },
              }
            : {}),
        }
      : {},
  );

  await client.relayMessage(jid, waMessage.message, {
    messageId: waMessage.key.id,
  });
  return waMessage;
}

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

const groupCache = new SafeNodeCache({
  stdTTL: 5 * 60, // 5 minutes
  maxLimit: 2000, // soft limit with graceful batch FIFO eviction
  useClones: false,
  checkperiod: 60,
  deleteOnExpire: true,
});

const contactCache = new SafeNodeCache({
  stdTTL: 10 * 60, // 10 minutes
  maxLimit: 5000, // soft limit with graceful batch FIFO eviction
  useClones: false,
  checkperiod: 60, // expire keys every minute
  deleteOnExpire: true,
});

// resolved once per process: WA_VERSION env ("2.3000.x") > latest published > baileys default
let waVersionPromise = null;
function resolveWaVersion() {
  if (!waVersionPromise) {
    waVersionPromise = (async () => {
      if (process.env.WA_VERSION) {
        const parts = process.env.WA_VERSION.split(/[.,]/).map(Number);
        if (parts.length === 3 && parts.every(Number.isFinite)) return parts;
      }
      try {
        const latest = await Promise.race([
          fetchLatestBaileysVersion(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("timeout")), 5000).unref?.(),
          ),
        ]);
        if (Array.isArray(latest?.version)) return latest.version;
      } catch (_) {}
      return undefined; // let baileys use its bundled version
    })();
  }
  return waVersionPromise;
}

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 60000;
const STABLE_CONNECTION_MS = 60000;

class WhatsAppBot {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.sock = null;
    this.authState = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = MAX_RECONNECT_ATTEMPTS;
    this.initialConnectMessageSent = false;
    this.reconnectTimer = null;
    this.stableTimer = null;
    this.stopped = false;

    this.groupCache = groupCache;
    this.contactCache = contactCache;
    // per session: short ttl cache used by getMessage retries, anti-delete and albums
    this.messageCache = new SafeNodeCache({
      stdTTL: 2 * 60,
      maxLimit: 3000,
      useClones: false,
      checkperiod: 30,
      deleteOnExpire: true,
    });
  }

  // drop every listener and close the old socket so it can be garbage collected
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
    const attempt = this.reconnectAttempts++;
    let delay;
    if (statusCode === DisconnectReason.restartRequired) {
      delay = 0; // expected right after pairing
    } else if (statusCode === DisconnectReason.connectionReplaced) {
      // another instance took over this session (e.g. deploy overlap); back off hard
      delay = 2 * 60000 + Math.random() * 3 * 60000;
    } else {
      delay = Math.min(RECONNECT_MAX_MS, RECONNECT_BASE_MS * 2 ** attempt);
      delay = delay / 2 + Math.random() * (delay / 2);
    }
    logger.info(
      { session: this.sessionId, attempt: attempt + 1, delayMs: Math.round(delay), statusCode },
      "Scheduling reconnect",
    );
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.initialize().catch((err) => {
        logger.error(
          { session: this.sessionId, attempt: this.reconnectAttempts, err },
          "Reconnect failed",
        );
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this._scheduleReconnect();
        }
      });
    }, delay);
  }
  async initialize() {
    try {
      // Wait for baileys to be loaded first
      await baileysPromise;

      logger.info(
        { session: this.sessionId },
        `Initializing bot with enhanced caching`,
      );
      if (!this.initialConnectMessageSent) {
        console.log(`- [${this.sessionId}] Initializing bot...`);
      }
      this.authState = new CustomAuthState(this.sessionId);
      let sessionLoaded = false;
      // Only try DB/backup, never file
      try {
        await this.authState.loadSession();
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
      if (!sessionLoaded) {
        throw new Error(
          `No valid session found for ${this.sessionId}. Please use a supported login method.`,
        );
      }
      const version = await resolveWaVersion();
      this._teardownSocket();
      this.sock = makeWASocket({
        auth: {
          creds: this.authState.creds,
          keys: this.authState.getBaileysKeysInterface(),
        },
        ...(version ? { version } : {}),
        logger: logger.child({ session: this.sessionId }),
        browser: ["Raganork", "Chrome", "1.0.0"],
        cachedGroupMetadata: (jid) => {
          const cached = this.groupCache.get(jid);
          if (cached) {
            logger.debug(
              { session: this.sessionId, jid },
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
          const message = this.messageCache.get(cacheKey)?.message;
          if (!message) {
            logger.debug(
              { session: this.sessionId, key },
              `Message not in cache, will fetch from server`,
            );
            return undefined;
          }
          logger.debug(
            { session: this.sessionId, key },
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
      });
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

  setupEventHandlers() {
    // Connection updates
    this.sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;
      if (qr) {
        logger.info(
          { session: this.sessionId },
          `QR code received, generating terminal QR...`,
        );
        console.log(
          `\n🔗 [${this.sessionId}] Scan this QR code with WhatsApp:`,
        );
        console.log(`┌${"─".repeat(50)}┐`);
        qrcode.generate(qr, { small: true }, (qrcode) => {
          // Add border to QR code for better visibility
          const lines = qrcode.split("\n");
          lines.forEach((line) => {
            console.log(`│${line.padEnd(48)}│`);
          });
        });
        console.log(`└${"─".repeat(50)}┘`);
        console.log(
          `📱 Open WhatsApp → Settings → Linked Devices → Link a Device`,
        );
        console.log(`⏰ QR code expires in 20 seconds. Get ready to scan!\n`);
      }
      const sessionLogger = logger.child({ session: this.sessionId });

      if (connection === "close") {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        sessionLogger.info(
          { status: statusCode, reconnect: shouldReconnect },
          `Connection closed.`,
        );

        this.isConnected = false;
        this._clearConnectionTimers();
        await Schedule.cleanup(this.sessionId);
        this.manager?.onSessionStateChange?.();

        if (statusCode === DisconnectReason.loggedOut) {
          sessionLogger.error(
            `Logged out. Please delete session data and rescan QR.`,
          );
          console.log(
            `❌ [${this.sessionId}] SESSION LOGGED OUT. Please rescan QR and update SESSION.`,
          );
          this._teardownSocket();
          await CustomAuthState.deleteSessionById(this.sessionId);
        } else if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this._teardownSocket();
          this._scheduleReconnect(statusCode);
        } else {
          sessionLogger.error(
            { attempts: this.reconnectAttempts },
            `Max reconnection attempts reached.`,
          );
          console.error(
            `[${this.sessionId}] ERROR: Max reconnection attempts reached. Stopping reconnection.`,
          );
          this._teardownSocket();
        }
      } else if (connection === "open") {
        sessionLogger.info(
          { botId: this.sock.user?.id },
          `Connection established.`,
        );
        this.isConnected = true;
        // only forgive past failures once the link has stayed up for a while
        if (this.stableTimer) clearTimeout(this.stableTimer);
        this.stableTimer = setTimeout(() => {
          this.stableTimer = null;
          this.reconnectAttempts = 0;
        }, STABLE_CONNECTION_MS);
        this.stableTimer.unref?.();

        // Only send start message on initial connection, not on reconnects
        if (!this.initialConnectMessageSent) {
          console.log(
            `- ✅ [${this.sessionId}] Bot started: +${
              this.sock.user?.id.split(":")[0]
            }`,
          );
          if (!config.DISABLE_START_MESSAGE) {
            try {
              const sudoOrMe = config.SUDO
                ? config.SUDO.split(",")[0].trim() + "@s.whatsapp.net"
                : this.sock.user?.id?.split(":")[0] + "@s.whatsapp.net";
              function capitalizeFirstLetter(s) {
                return typeof s !== "string" || s.length === 0
                  ? s
                  : s[0].toUpperCase() + s.slice(1);
              }

              function convertToNumberEmoji(n) {
                const str = n.toString();
                const emojiMap = {
                  0: "0️⃣",
                  1: "1️⃣",
                  2: "2️⃣",
                  3: "3️⃣",
                  4: "4️⃣",
                  5: "5️⃣",
                  6: "6️⃣",
                  7: "7️⃣",
                  8: "8️⃣",
                  9: "9️⃣",
                };
                let result = "";
                for (let i = 0; i < str.length; i++) {
                  const char = str[i];
                  result += emojiMap[char] || char;
                }
                return result;
              }

              const readMore = String.fromCharCode(8206).repeat(4001);
              const check = "✅";
              const cross = "❌";
              const started = `*_Raganork started!_*${readMore}\n\n_Mode         :_ *${capitalizeFirstLetter(
                config.MODE,
              )}*\n_Language :_ *${capitalizeFirstLetter(
                config.LANGUAGE,
              )}*\n_Sudo_         _: *${config.SUDO}*_\n_Handlers_  _: *${
                config.HANDLERS
              }*_\n\n*_Extra Configurations_*\n\n_Always online_ ${
                config.ALWAYS_ONLINE ? check : cross
              }\n_Auto status viewer_ ${
                config.AUTO_READ_STATUS ? check : cross
              }\n_Auto reject calls_ ${
                config.REJECT_CALLS ? check : cross
              }\n_Auto read msgs_ ${
                config.READ_MESSAGES ? check : cross
              }\n_PM disabler_ ${config.DIS_PM ? check : cross}\n_PM blocker_ ${
                config.PMB_VAR ? check : cross
              }\n_Disabled commands:_  ${convertToNumberEmoji(
                config.DISABLED_COMMANDS?.length || 0,
              )}\n_Disabled chats_  ${convertToNumberEmoji(
                config.BLOCK_CHAT ? config.BLOCK_CHAT.split(",").length : 0,
              )}`;

              await this.sock.sendMessage(sudoOrMe, { text: started });
              this.initialConnectMessageSent = true;
              sessionLogger.info(`Initial start message sent`);
            } catch (error) {
              logger.error(
                { session: this.sessionId, err: error },
                `Failed to send start message`,
              );
            }
          }
          this.initialConnectMessageSent = true;
        } else {
          sessionLogger.debug(
            `Reconnection successful, skipping start message.`,
          );
        }

        // CRITICAL: Execute start event handlers immediately after connection is established
        try {
          await startEvent(this.sock);
        } catch (error) {
          logger.error(
            { session: this.sessionId, err: error },
            `Failed to execute start event handlers`,
          );
        }

        try {
          const { migrateSudoToLID } = require("./database");
          await migrateSudoToLID(this.sock);
        } catch (error) {
          logger.error(
            { session: this.sessionId, err: error },
            `Failed to migrate SUDO to LIDs`,
          );
        }

        // Setup additional features after start events
        await Schedule(this.sock, this.sessionId);
        this.manager?.onSessionStateChange?.();

        // Setup profile picture method
        this.sock.setProfilePicture = async (jid, content) => {
          if (!jid) {
            throw new Error("JID is required for profile picture update");
          }

          let targetJid;
          if (jidNormalizedUser(jid) !== jidNormalizedUser(this.sock.user.id)) {
            targetJid = jidNormalizedUser(jid);
          }

          const img = await generateProfilePicture(content);
          await this.sock.query({
            tag: "iq",
            attrs: {
              target: targetJid,
              to: "@s.whatsapp.net",
              type: "set",
              xmlns: "w:profile:picture",
            },
            content: [
              {
                tag: "picture",
                attrs: { type: "image" },
                content: img,
              },
            ],
          });
        };

        // setup album message method
        this.sock.albumMessage = async (jid, array, quoted) => {
          const { generateWAMessage } = await loadBaileys();
          // Helper function to process media input
          const processMedia = async (media) => {
            if (typeof media === "string") {
              if (media.startsWith("http://") || media.startsWith("https://")) {
                return await getBuffer(media);
              } else if (fs.existsSync(media)) {
                return fs.readFileSync(media);
              } else {
                throw new Error(`Invalid media path: ${media}`);
              }
            } else if (Buffer.isBuffer(media)) {
              return media;
            } else {
              throw new Error("Media must be a URL, file path, or Buffer");
            }
          };

          const album = generateWAMessageFromContent(
            jid,
            {
              messageContextInfo: {
                messageSecret: crypto.randomBytes(32),
              },
              albumMessage: {
                expectedImageCount: array.filter((a) =>
                  a.hasOwnProperty("image"),
                ).length,
                expectedVideoCount: array.filter((a) =>
                  a.hasOwnProperty("video"),
                ).length,
              },
            },
            {
              userJid: this.sock.user.jid,
              quoted,
              upload: this.sock.waUploadToServer,
            },
          );

          await this.sock.relayMessage(jid, album.message, {
            messageId: album.key.id,
          });

          // store album parent message to database using storeMessage
          try {
            const botJid = this.sock.user.id.split(":")[0] + "@s.whatsapp.net";
            const albumParentCacheEntry = {
              key: {
                ...album.key,
                fromMe: true,
                participant: botJid,
              },
              message: album.message,
              messageTimestamp: Math.floor(Date.now() / 1000),
              pushName: null,
            };
            await storeMessage(albumParentCacheEntry);
            // also cache in memory for immediate retrieval
            const cacheKey = `${album.key.remoteJid}_${album.key.id}`;
            this.messageCache.set(cacheKey, albumParentCacheEntry);

            logger.debug(
              { session: this.sessionId, albumId: album.key.id },
              `album parent message stored to database`,
            );
          } catch (storeError) {
            logger.error(
              {
                session: this.sessionId,
                albumId: album.key.id,
                err: storeError,
              },
              `failed to store album parent message to database`,
            );
          }

          for (let content of array) {
            // Process media content
            const processedContent = { ...content };
            if (processedContent.image) {
              processedContent.image = await processMedia(
                processedContent.image,
              );
            }
            if (processedContent.video) {
              processedContent.video = await processMedia(
                processedContent.video,
              );
            }

            const img = await generateWAMessage(jid, processedContent, {
              upload: this.sock.waUploadToServer,
            });

            img.message.messageContextInfo = {
              messageSecret: crypto.randomBytes(32),
              messageAssociation: {
                associationType: 1,
                parentMessageKey: album.key,
              },
              participant: "0@s.whatsapp.net",
              remoteJid: "status@broadcast",
              forwardingScore: 99999,
              isForwarded: true,
              mentionedJid: [jid],
              starred: true,
              labels: ["Y", "Important"],
              isHighlighted: true,
              businessMessageForwardInfo: {
                businessOwnerJid: jid,
              },
              dataSharingContext: {
                showMmDisclosure: true,
              },
            };

            img.message.forwardedNewsletterMessageInfo = {
              newsletterJid: "0@newsletter",
              serverMessageId: 1,
              newsletterName: `WhatsApp`,
              contentType: 1,
              timestamp: new Date().toISOString(),
              senderName: "Raganork",
              content: "Album Message",
              priority: "high",
              status: "sent",
            };

            img.message.disappearingMode = {
              initiator: 3,
              trigger: 4,
              initiatorDeviceJid: jid,
              initiatedByExternalService: true,
              initiatedByUserDevice: true,
              initiatedBySystem: true,
              initiatedByServer: true,
              initiatedByAdmin: true,
              initiatedByUser: true,
              initiatedByApp: true,
              initiatedByBot: true,
              initiatedByMe: true,
            };

            await this.sock.relayMessage(jid, img.message, {
              messageId: img.key.id,
              quoted: {
                key: {
                  remoteJid: album.key.remoteJid,
                  id: album.key.id,
                  fromMe: true,
                  participant: this.sock.user.jid,
                },
                message: album.message,
              },
            });

            // store album child message to database using storeMessage
            try {
              const botJid =
                this.sock.user.id.split(":")[0] + "@s.whatsapp.net";
              const albumChildCacheEntry = {
                key: {
                  ...img.key,
                  fromMe: true,
                  participant: botJid,
                },
                message: img.message,
                messageTimestamp: Math.floor(Date.now() / 1000),
                pushName: null,
              };

              // remove relay-only fields before storing
              delete albumChildCacheEntry.message
                .forwardedNewsletterMessageInfo;
              delete albumChildCacheEntry.message.disappearingMode;

              await storeMessage(albumChildCacheEntry);
              const cacheKey = `${img.key.remoteJid}_${img.key.id}`;
              this.messageCache.set(cacheKey, albumChildCacheEntry);

              logger.debug(
                { session: this.sessionId, messageId: img.key.id },
                `album child message stored to database`,
              );
            } catch (storeError) {
              logger.error(
                {
                  session: this.sessionId,
                  messageId: img.key.id,
                  err: storeError,
                },
                `failed to store album child message to database`,
              );
            }
          }
          return album;
        };

        this.sock.getAlbumMessages = async (albumMessageId) => {
          let expectedImageCount = 0;
          let expectedVideoCount = 0;
          let albumTimestamp = 0;
          let parentRemoteJid = null;
          let parentFromMe = false;
          let inCache = false;
          const parentCacheKey = (
            this.messageCache.keys
              ? this.messageCache.keys()
              : Object.keys(this.messageCache.data || {})
          ).find((key) => key.endsWith(`_${albumMessageId}`));
          if (parentCacheKey) {
            const parentMsg = this.messageCache.get(parentCacheKey);
            if (parentMsg?.message?.albumMessage) {
              expectedImageCount =
                parentMsg.message.albumMessage.expectedImageCount || 0;
              expectedVideoCount =
                parentMsg.message.albumMessage.expectedVideoCount || 0;
              albumTimestamp = parentMsg.messageTimestamp || 0;
              parentRemoteJid = parentMsg.key?.remoteJid;
              parentFromMe = parentMsg.key?.fromMe || false;
              inCache = true;
            }
          }
          if (!expectedImageCount && !expectedVideoCount) {
            try {
              const dbResult = await getFullMessage(albumMessageId);
              if (
                dbResult.found &&
                dbResult.messageData?.message?.albumMessage
              ) {
                expectedImageCount =
                  dbResult.messageData.message.albumMessage
                    .expectedImageCount || 0;
                expectedVideoCount =
                  dbResult.messageData.message.albumMessage
                    .expectedVideoCount || 0;
                albumTimestamp = dbResult.messageData.messageTimestamp || 0;
                parentRemoteJid = dbResult.messageData.key?.remoteJid;
                parentFromMe = dbResult.messageData.key?.fromMe || false;
                inCache = false;
              }
            } catch (err) {
              logger.error(
                { session: this.sessionId, albumId: albumMessageId, err },
                "Failed to get album parent from database",
              );
            }
          }
          if (!expectedImageCount && !expectedVideoCount) {
            return {
              images: [],
              videos: [],
              complete: false,
              expectedImageCount: 0,
              expectedVideoCount: 0,
            };
          }

          const childMessages = [];
          const TIMESTAMP_WINDOW = 5; // 3 seconds window for timestamp matching

          if (inCache) {
            const cacheKeys = this.messageCache.keys
              ? this.messageCache.keys()
              : Object.keys(this.messageCache.data || {});
            for (const key of cacheKeys) {
              const msg = this.messageCache.get(key);
              // primary method: check messageContextInfo association
              if (
                msg?.message?.messageContextInfo?.messageAssociation
                  ?.parentMessageKey?.id === albumMessageId
              ) {
                childMessages.push(msg);
              }
            }
          } else {
            try {
              const { Op } = require("sequelize");
              const dbMessages = await AntiDeleteCache.findAll({
                where: {
                  timestamp: { [Op.gte]: new Date(albumTimestamp * 1000) },
                },
                limit: 500,
                order: [["timestamp", "ASC"]],
              });
              for (const dbMsg of dbMessages) {
                const fullContent = dbMsg.fullContent;
                // primary method: check messageContextInfo association
                if (
                  fullContent?.message?.messageContextInfo?.messageAssociation
                    ?.parentMessageKey?.id === albumMessageId &&
                  !childMessages.some((m) => m.key.id === fullContent.key.id)
                ) {
                  childMessages.push(fullContent);
                }
              }
            } catch (err) {
              logger.error(
                { session: this.sessionId, albumId: albumMessageId, err },
                "Failed to fetch album child messages from database",
              );
            }
          }

          const images = [];
          const videos = [];

          for (const msg of childMessages) {
            if (msg.message?.imageMessage) {
              images.push(msg);
            } else if (msg.message?.videoMessage) {
              videos.push(msg);
            }
          }

          const complete =
            images.length === expectedImageCount &&
            videos.length === expectedVideoCount;

          // fallback: if incomplete and we have parent metadata, try timestamp-based matching
          if (!complete && parentRemoteJid && albumTimestamp) {
            logger.debug(
              { session: this.sessionId, albumId: albumMessageId },
              `album children incomplete (${images.length}/${expectedImageCount} images, ${videos.length}/${expectedVideoCount} videos), trying fallback timestamp matching`,
            );

            const fallbackCandidates = [];

            if (inCache) {
              const cacheKeys = this.messageCache.keys
                ? this.messageCache.keys()
                : Object.keys(this.messageCache.data || {});
              for (const key of cacheKeys) {
                const msg = this.messageCache.get(key);
                if (
                  msg &&
                  msg.key?.id !== albumMessageId &&
                  !childMessages.some((m) => m.key.id === msg.key.id)
                ) {
                  const msgTimestamp = msg.messageTimestamp || 0;
                  const timeDiff = Math.abs(msgTimestamp - albumTimestamp);

                  if (
                    msg.key?.remoteJid === parentRemoteJid &&
                    msg.key?.fromMe === parentFromMe &&
                    timeDiff <= TIMESTAMP_WINDOW &&
                    (msg.message?.imageMessage || msg.message?.videoMessage)
                  ) {
                    fallbackCandidates.push({ msg, timeDiff });
                  }
                }
              }
            } else {
              try {
                const { Op } = require("sequelize");
                const startTime = new Date(
                  (albumTimestamp - TIMESTAMP_WINDOW) * 1000,
                );
                const endTime = new Date(
                  (albumTimestamp + TIMESTAMP_WINDOW) * 1000,
                );

                const dbMessages = await AntiDeleteCache.findAll({
                  where: {
                    timestamp: {
                      [Op.between]: [startTime, endTime],
                    },
                  },
                  limit: 100,
                  order: [["timestamp", "ASC"]],
                });

                for (const dbMsg of dbMessages) {
                  const fullContent = dbMsg.fullContent;
                  if (
                    fullContent &&
                    fullContent.key?.id !== albumMessageId &&
                    !childMessages.some((m) => m.key.id === fullContent.key.id)
                  ) {
                    const msgTimestamp = fullContent.messageTimestamp || 0;
                    const timeDiff = Math.abs(msgTimestamp - albumTimestamp);

                    if (
                      fullContent.key?.remoteJid === parentRemoteJid &&
                      fullContent.key?.fromMe === parentFromMe &&
                      (fullContent.message?.imageMessage ||
                        fullContent.message?.videoMessage)
                    ) {
                      fallbackCandidates.push({ msg: fullContent, timeDiff });
                    }
                  }
                }
              } catch (err) {
                logger.error(
                  { session: this.sessionId, albumId: albumMessageId, err },
                  "Failed to fetch fallback candidates from database",
                );
              }
            }

            // sort by timestamp proximity and add to children
            fallbackCandidates.sort((a, b) => a.timeDiff - b.timeDiff);

            const neededImages = expectedImageCount - images.length;
            const neededVideos = expectedVideoCount - videos.length;
            let addedImages = 0;
            let addedVideos = 0;

            for (const { msg } of fallbackCandidates) {
              if (msg.message?.imageMessage && addedImages < neededImages) {
                images.push(msg);
                childMessages.push(msg);
                addedImages++;
                logger.debug(
                  { session: this.sessionId, msgId: msg.key.id },
                  `fallback matched image child for album ${albumMessageId}`,
                );
              } else if (
                msg.message?.videoMessage &&
                addedVideos < neededVideos
              ) {
                videos.push(msg);
                childMessages.push(msg);
                addedVideos++;
                logger.debug(
                  { session: this.sessionId, msgId: msg.key.id },
                  `fallback matched video child for album ${albumMessageId}`,
                );
              }

              // stop if we found everything
              if (addedImages >= neededImages && addedVideos >= neededVideos) {
                break;
              }
            }
          }

          const finalComplete =
            images.length === expectedImageCount &&
            videos.length === expectedVideoCount;

          return {
            images,
            videos,
            complete: finalComplete,
            expectedImageCount,
            expectedVideoCount,
          };
        };
      }
    }); // Credential updates - handle both auth methods properly
    this.sock.ev.on("creds.update", async (newCreds) => {
      try {
        logger.info(
          { session: this.sessionId },
          `Credentials updated by Baileys.`,
        );
        await this.authState.saveCredentials(newCreds);
      } catch (error) {
        logger.error(
          { session: this.sessionId, err: error },
          `Failed to save credentials`,
        );
      }
    });
    logger.info(
      { session: this.sessionId },
      `Using database auth credentials handler`,
    );
    this.sock.ev.on("call", async (callUpdate) => {
      try {
        logger.info({ session: this.sessionId }, `Incoming call.`);
        if (config.REJECT_CALLS === true) {
          const _call = callUpdate[0];
          if (_call && _call.status === "offer") {
            // Check if caller is in allowed list
            const allowedCallers = config.ALLOWED_CALLS
              ? config.ALLOWED_CALLS.split(",").map((num) => num.trim())
              : [];
            const callerNumber = _call.from.split("@")[0];

            const isAllowed = allowedCallers.some((allowed) =>
              callerNumber.includes(allowed),
            );

            if (!isAllowed) {
              await this.sock.rejectCall(_call.id, _call.from);
              logger.info(
                {
                  session: this.sessionId,
                  callId: _call.id,
                  caller: callerNumber,
                },
                `Call rejected from non-allowed caller`,
              );

              // Send rejection message if configured
              if (
                config.CALL_REJECT_MESSAGE &&
                config.CALL_REJECT_MESSAGE.trim()
              ) {
                try {
                  await this.sock.sendMessage(_call.from, {
                    text: config.CALL_REJECT_MESSAGE,
                  });
                  logger.info(
                    { session: this.sessionId, caller: callerNumber },
                    `Sent call rejection message`,
                  );
                } catch (msgError) {
                  logger.error(
                    {
                      session: this.sessionId,
                      caller: callerNumber,
                      err: msgError,
                    },
                    `Failed to send call rejection message`,
                  );
                }
              }
            } else {
              logger.info(
                {
                  session: this.sessionId,
                  callId: _call.id,
                  caller: callerNumber,
                },
                `Call allowed from whitelisted caller`,
              );
            }
          }
        }
      } catch (error) {
        logger.error(
          { session: this.sessionId, err: error },
          `Error handling call`,
        );
      }
    });

    // Enhanced caching event handlers with better error handling
    this.sock.ev.on("groups.update", (updates) => {
      for (const update of updates) {
        if (update.id) {
          this.sock
            .groupMetadata(update.id)
            .then((metadata) => {
              this.groupCache.set(update.id, metadata);
              logger.debug(
                { session: this.sessionId, jid: update.id },
                `Group metadata updated in cache`,
              );
            })
            .catch((err) => {
              logger.warn(
                { session: this.sessionId, jid: update.id, err },
                `Failed to update group metadata in cache`,
              );
            });
        }
      }
    });

    this.sock.ev.on("group-participants.update", async (update) => {
      try {
        await groupUpdate(this.sock, update);
        const metadata = await this.sock.groupMetadata(update.id);
        this.groupCache.set(update.id, metadata);
        logger.debug(
          { session: this.sessionId, jid: update.id, action: update.action },
          `Group participants updated in cache`,
        );
      } catch (err) {
        logger.warn(
          { session: this.sessionId, jid: update.id, err },
          `Failed to update group participants`,
        );
      }
    });

    this.sock.ev.on("contacts.update", (updates) => {
      for (const contact of updates) {
        if (contact.id) {
          this.contactCache.set(contact.id, contact);
          logger.debug(
            { session: this.sessionId, jid: contact.id },
            `Contact updated in cache`,
          );
        }
      }
    });

    this.sock.ev.on("messages.upsert", async (upsert) => {
      // Cache messages with better validation
      for (const message of upsert.messages) {
        if (message.key && message.key.id && message.key.remoteJid) {
          const cacheKey = `${message.key.remoteJid}_${message.key.id}`;
          this.messageCache.set(cacheKey, message);
        }
      }
      if (upsert.type === "notify") {
        try {
          await handler(upsert, this.sock, this);
        } catch (e) {
          logger.error(
            { session: this.sessionId, err: e },
            `Message handler error`,
          );
          console.error(
            `[${this.sessionId}] ERROR: Message handler failed. Details:`,
            e.message,
          );
        }
      }
    });

    this.sock.ev.on("contacts.upsert", (contacts) => {
      for (const contact of contacts) {
        if (contact.id) {
          this.contactCache.set(contact.id, contact);
        }
      }
    });

    // FIXED: Better message update handling with validation
    this.sock.ev.on("messages.update", async (updates) => {
      for (const update of updates) {
        if (!update.key || !update.key.remoteJid || !update.key.id) {
          continue; // Skip invalid updates
        }

        try {
          // Handle message edits
          if (update.update?.message?.editedMessage) {
            const newMessageObject = {
              key: update.key,
              message: update.update.message.editedMessage.message,
            };
            this.sock.ev.emit("messages.upsert", {
              messages: [newMessageObject],
              type: "notify",
            });
            continue;
          }

          // Handle anti-delete functionality
          if (
            (config.ANTI_DELETE === "chat" ||
              config.ANTI_DELETE === "sudo" ||
              config.ANTI_DELETE === "custom") &&
            !update.update.message &&
            update.update?.messageStubType === 1
          ) {
            const cacheKey = `${update.key.remoteJid}_${update.key.id}`;
            const cachedMessage = this.messageCache.get(cacheKey);
            let recoveredMessage = null;
            if (cachedMessage) {
              recoveredMessage = cachedMessage;
              logger.debug(
                { session: this.sessionId, key: update.key },
                `Recovered deleted message from cache`,
              );
            } else {
              const dbMsgKey = update.key.id;
              const fullMessage = await getFullMessage(dbMsgKey);
              if (fullMessage && fullMessage.found) {
                recoveredMessage = fullMessage.messageData;
                logger.debug(
                  { session: this.sessionId, key: update.key },
                  `Recovered deleted message from database`,
                );
              }
            }
            if (recoveredMessage && this.isConnected) {
              const sudoOrMe = config.SUDO
                ? config.SUDO.split(",")[0].trim() + "@s.whatsapp.net"
                : this.sock.user?.id?.split(":")[0] + "@s.whatsapp.net";
              let targetJid;
              if (config.ANTI_DELETE === "custom" && config.ANTI_DELETE_JID) {
                targetJid = config.ANTI_DELETE_JID;
              } else if (config.ANTI_DELETE === "chat") {
                targetJid = update.key.remoteJid;
              } else {
                targetJid = sudoOrMe;
              }

              const isGroup = recoveredMessage.key.remoteJid?.endsWith("@g.us");
              const participantJid =
                recoveredMessage.key.participant ||
                recoveredMessage.key.participantAlt ||
                recoveredMessage.key.remoteJid;
              await forwardMessage(this.sock, targetJid, recoveredMessage, {
                contextInfo: {
                  quotedMessage: { conversation: "Anti-delete 🛡️" },
                  stanzaId: recoveredMessage.key.id,
                  participant: participantJid,
                  remoteJid: recoveredMessage.key.remoteJid,
                },
              });
            }
          }
        } catch (error) {
          logger.error(
            { session: this.sessionId, key: update.key, err: error },
            `Error processing message update`,
          );
        }
      }
    });
  }

  // Utility methods with better error handling
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

      // Cache the sent message
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
      // Ensure these are always reset
      this.sock = null;
      this.isConnected = false;
    }
  }
}

module.exports = { WhatsAppBot };
