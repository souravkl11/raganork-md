const config = require("../config");
const context = require("./context");
const { DataTypes, Op } = require("sequelize");
const { scoped, accountColumn } = require("./db/scoped");
const logger = config.logger;

const Chat = config.sequelize.define(
  "Chat",
  {
    jid: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      primaryKey: true,
    },
    type: {
      type: DataTypes.ENUM("private", "group"),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    timestamps: true,
    indexes: [
      { fields: ["jid"] },
      { fields: ["type"] },
      { fields: ["isActive"] },
    ],
  },
);

const User = config.sequelize.define(
  "User",
  {
    jid: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    lastSeen: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    indexes: [{ fields: ["jid"] }, { fields: ["lastSeen"] }],
  },
);

// Temporary storage for anti-delete functionality (2 days only)
const AntiDeleteCache = config.sequelize.define(
  "AntiDeleteCache",
  {
    accountId: accountColumn,
    // <accountId>:<id>_<timestamp>; rows from before accounts are <id>_<timestamp>
    messageId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      primaryKey: true,
    },
    chatJid: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    senderJid: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    fullContent: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    // raw whatsapp message id, exact-match lookups (messageId is id_timestamp)
    msgId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    timestamps: false,
    indexes: [
      { fields: ["messageId"] },
      { fields: ["timestamp"] },
      { fields: ["chatJid"] },
      { fields: ["msgId"] },
      { name: "anti_delete_caches_account_id", fields: ["accountId"] },
    ],
  },
);

const UserStats = config.sequelize.define(
  "UserStats",
  {
    accountId: accountColumn,
    userJid: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: User,
        key: "jid",
      },
    },
    chatJid: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: Chat,
        key: "jid",
      },
    },
    totalMessages: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    textMessages: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    imageMessages: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    videoMessages: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    audioMessages: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    stickerMessages: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    otherMessages: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    lastMessageAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    indexes: [
      // the name is the one the two-column index always had (see migration 004)
      { name: "user_stats_user_jid_chat_jid", fields: ["accountId", "userJid", "chatJid"], unique: true },
      { fields: ["chatJid"] },
      { fields: ["totalMessages"] },
      { fields: ["lastMessageAt"] },
    ],
  },
);

scoped(UserStats);
scoped(AntiDeleteCache);

// SpamTracker is now in-memory
const SpamTracker = null;

Chat.hasMany(AntiDeleteCache, { foreignKey: "chatJid" });
User.hasMany(AntiDeleteCache, { foreignKey: "senderJid" });
AntiDeleteCache.belongsTo(Chat, { foreignKey: "chatJid" });
AntiDeleteCache.belongsTo(User, { foreignKey: "senderJid" });

User.hasMany(UserStats, { foreignKey: "userJid" });
Chat.hasMany(UserStats, { foreignKey: "chatJid" });
UserStats.belongsTo(User, { foreignKey: "userJid" });
UserStats.belongsTo(Chat, { foreignKey: "chatJid" });

const messageTypeMap = {
  videoMessage: "video",
  imageMessage: "image",
  conversation: "text",
  buttonsResponseMessage: "text",
  locationMessage: "location",
  templateButtonReplyMessage: "text",
  listResponseMessage: "text",
  extendedTextMessage: "text",
  stickerMessage: "sticker",
  contactMessage: "contact",
  audioMessage: "audio",
  documentMessage: "document",
  documentWithCaptionMessage: "document",
  albumMessage: "album",
};

// NEW: Queue system
const messageQueue = [];
const FLUSH_INTERVAL = 5000; // 5 seconds
let flushTimer = null;

// NEW: In-memory SpamTracker
const spamTracker = new Map(); // Key: 'accountId:userJid_chatJid', Value: Array of timestamps

const STAT_FIELDS = [
  "textMessages",
  "imageMessages",
  "videoMessages",
  "audioMessages",
  "stickerMessages",
];
let flushing = false;
let statsUpsertSupported = true;

// thumbnails are the bulk of a stored message and nothing reads them back
function stripForStorage(key, value) {
  if (key === "jpegThumbnail" || key === "_mappedType" || key === "_accountId") return undefined;
  return value;
}

// folds a batch of messages into one row set per table
function aggregateBatch(batch) {
  const chats = new Map();
  const users = new Map();
  const cacheRows = new Map();
  const stats = new Map();

  for (const msgData of batch) {
    const { id, participant, remoteJid } = msgData.key;
    const isGroup = remoteJid.endsWith("@g.us");
    const sender = isGroup ? participant || remoteJid : remoteJid;
    const ts = new Date(msgData.messageTimestamp * 1000);

    if (!chats.has(remoteJid)) {
      chats.set(remoteJid, {
        jid: remoteJid,
        type: isGroup ? "group" : "private",
        name: null,
      });
    }
    if (!users.has(sender)) {
      users.set(sender, {
        jid: sender,
        name: msgData.pushName || null,
        lastSeen: new Date(),
      });
    }

    // the primary key stays unique per account: two sessions in one group both store the message
    const accountId = msgData._accountId || null;
    const messageId = (accountId ? accountId + ":" : "") + id + "_" + ts.getTime();
    if (!cacheRows.has(messageId)) {
      cacheRows.set(messageId, {
        messageId,
        accountId,
        msgId: id,
        chatJid: remoteJid,
        senderJid: sender,
        fullContent: JSON.parse(JSON.stringify(msgData, stripForStorage)),
        timestamp: ts,
      });
    }

    // the same user in the same group counts once per account that received the message
    const statKey = (accountId || "") + "\u0000" + sender + "\u0000" + remoteJid;
    let stat = stats.get(statKey);
    if (!stat) {
      stat = { accountId, userJid: sender, chatJid: remoteJid, totalMessages: 0, otherMessages: 0, lastMessageAt: null };
      for (const f of STAT_FIELDS) stat[f] = 0;
      stats.set(statKey, stat);
    }
    stat.totalMessages++;
    const typeField = msgData._mappedType + "Messages";
    if (STAT_FIELDS.includes(typeField)) stat[typeField]++;
    else stat.otherMessages++;
    stat.lastMessageAt = new Date();
  }

  return {
    chats: [...chats.values()],
    users: [...users.values()],
    cacheRows: [...cacheRows.values()],
    stats: [...stats.values()],
  };
}

// one multi-row INSERT ... ON CONFLICT DO UPDATE (sqlite >= 3.24 and postgres).
// every row needs an accountId: a NULL never conflicts, so it would insert again on every flush
async function upsertStats(stats, transaction) {
  const qg = config.sequelize.getQueryInterface().queryGenerator;
  const q = (name) => qg.quoteIdentifier(name);
  const table = qg.quoteTable(UserStats.getTableName());
  const counters = ["totalMessages", ...STAT_FIELDS, "otherMessages"];
  const cols = ["accountId", "userJid", "chatJid", ...counters, "lastMessageAt", "createdAt", "updatedAt"];
  const replacements = [];
  const now = new Date();
  const values = stats.map((s) => {
    replacements.push(s.accountId, s.userJid, s.chatJid, ...counters.map((c) => s[c]), s.lastMessageAt, now, now);
    return `(${cols.map(() => "?").join(",")})`;
  });
  const updates = [
    ...counters.map((c) => `${q(c)} = ${table}.${q(c)} + excluded.${q(c)}`),
    `${q("lastMessageAt")} = excluded.${q("lastMessageAt")}`,
    `${q("updatedAt")} = excluded.${q("updatedAt")}`,
  ];
  await config.sequelize.query(
    `INSERT INTO ${table} (${cols.map(q).join(",")}) VALUES ${values.join(",")} ` +
      `ON CONFLICT (${q("accountId")}, ${q("userJid")}, ${q("chatJid")}) DO UPDATE SET ${updates.join(", ")}`,
    { replacements, transaction },
  );
}

// fallback for databases without the unique index, and the path for rows with no account
// (a message stored outside any session): those are the legacy NULL rows. the flush runs
// unscoped, so the account goes into the where clause by hand
async function upsertStatsSlow(stats, transaction) {
  for (const s of stats) {
    const [row] = await UserStats.findOrCreate({
      where: { accountId: s.accountId, userJid: s.userJid, chatJid: s.chatJid },
      defaults: { accountId: s.accountId, userJid: s.userJid, chatJid: s.chatJid },
      transaction,
    });
    const by = { totalMessages: s.totalMessages, otherMessages: s.otherMessages };
    for (const f of STAT_FIELDS) by[f] = s[f];
    await row.increment(by, { transaction });
    await row.update({ lastMessageAt: s.lastMessageAt }, { transaction });
  }
}

async function persistBatch(batch) {
  const { chats, users, cacheRows, stats } = aggregateBatch(batch);
  await config.sequelize.transaction(async (transaction) => {
    await Chat.bulkCreate(chats, { ignoreDuplicates: true, transaction });
    await User.bulkCreate(users, { ignoreDuplicates: true, transaction });
    await AntiDeleteCache.bulkCreate(cacheRows, { ignoreDuplicates: true, transaction });
    const withAccount = stats.filter((s) => s.accountId);
    const withoutAccount = stats.filter((s) => !s.accountId);
    if (withAccount.length) {
      if (statsUpsertSupported) {
        try {
          await upsertStats(withAccount, transaction);
        } catch (err) {
          if (!/ON CONFLICT|conflict|unique|constraint/i.test(err.message || "")) throw err;
          statsUpsertSupported = false;
          logger.warn({ err: err.message }, "UserStats upsert unsupported, using slow path");
          throw err; // abort this transaction; the retry below runs the slow path
        }
      } else {
        await upsertStatsSlow(withAccount, transaction);
      }
    }
    if (withoutAccount.length) await upsertStatsSlow(withoutAccount, transaction);
  });
}

// runs for every account's messages at once, so never as one session
function flushMessageQueue() {
  return context.runUnscoped(flushQueued);
}

async function flushQueued() {
  // never run two flushes at once: overlapping transactions fight over the sqlite lock
  if (flushing || messageQueue.length === 0) return;
  flushing = true;
  try {
    while (messageQueue.length > 0) {
      const batch = messageQueue.splice(0, 200);
      let attempt = 0;
      while (true) {
        try {
          await persistBatch(batch);
          break;
        } catch (error) {
          attempt++;
          const retryable =
            /BUSY|locked/.test(error.message || "") ||
            (!statsUpsertSupported && attempt === 1);
          if (retryable && attempt < 3) {
            await new Promise((r) => setTimeout(r, 100 * 2 ** attempt));
            continue;
          }
          logger.error({ err: error }, "Batch flush failed to persist message batch");
          break;
        }
      }
    }
  } finally {
    flushing = false;
  }
}

if (!flushTimer) {
  flushTimer = setInterval(flushMessageQueue, FLUSH_INTERVAL);
  flushTimer.unref?.();
}

async function storeMessage(msgData) {
  if (!msgData || !msgData.key || !msgData.message) return;
  const { id, remoteJid, messageTimestamp } = msgData.key; // Fixed destructuring
  if (
    !msgData.key.id ||
    !msgData.key.remoteJid ||
    msgData.messageTimestamp === undefined
  )
    return;
  if (msgData.key.remoteJid === "status@broadcast") return;

  const knownMessageTypes = Object.keys(messageTypeMap);
  // disappearing-chat and view once messages wrap the real content
  let content = msgData.message;
  for (let i = 0; i < 3; i++) {
    const inner =
      content.ephemeralMessage?.message ||
      content.viewOnceMessage?.message ||
      content.viewOnceMessageV2?.message ||
      content.viewOnceMessageV2Extension?.message;
    if (!inner) break;
    content = inner;
  }
  const messageType = Object.keys(content).find((key) =>
    knownMessageTypes.includes(key),
  );
  const mappedType = messageType ? messageTypeMap[messageType] : "unknown";
  if (mappedType === "unknown") return;

  // Add mappedType to msgData for use in saveMessageToDB
  msgData._mappedType = mappedType;
  // the flush runs outside any session, so remember whose message this is now
  msgData._accountId = context.accountId();

  // Safety bound: prevent unbounded memory growth if database writes are delayed
  if (messageQueue.length > 5000) {
    messageQueue.splice(0, messageQueue.length - 5000);
  }

  messageQueue.push(msgData);
}

// per account: the same user in the same group is tracked separately for each session
const spamKey = (userJid, chatJid) => `${context.accountId() || "_"}:${userJid}_${chatJid}`;

async function trackSpamMessage(userJid, chatJid, messageId) {
  if (!userJid || !chatJid || !messageId) return;
  const key = spamKey(userJid, chatJid);
  const now = Date.now();
  if (!spamTracker.has(key)) spamTracker.set(key, []);
  const entries = spamTracker.get(key);
  entries.push(now);
  if (entries.length > 100) entries.shift();
}

async function getRecentMessageCount(userJid, chatJid, timeWindowMs) {
  const key = spamKey(userJid, chatJid);
  const cutoff = Date.now() - timeWindowMs;
  const entries = spamTracker.get(key) || [];
  return entries.filter((ts) => ts >= cutoff).length;
}

async function cleanupSpamTracker(olderThanMs = 5 * 60 * 1000) {
  const cutoff = Date.now() - olderThanMs;
  for (const [key, timestamps] of spamTracker.entries()) {
    const filtered = timestamps.filter((ts) => ts >= cutoff);
    if (filtered.length === 0) spamTracker.delete(key);
    else spamTracker.set(key, filtered);
  }
}

async function cleanupAntiDeleteCache(olderThanMs = 48 * 60 * 60 * 1000) {
  try {
    const cutoffTime = new Date(Date.now() - olderThanMs);
    const deleted = await AntiDeleteCache.destroy({
      where: {
        timestamp: {
          [Op.lt]: cutoffTime,
        },
      },
    });
    return deleted;
  } catch (error) {
    console.error("Error cleaning up anti-delete cache:", error);
    return 0;
  }
}

// getChatStats functionality replaced with UserStats-based implementation
async function getChatStats(chatJid, days = 7) {
  try {
    // Get stats from UserStats table instead of Messages table
    const userStats = await UserStats.findAll({
      where: { chatJid },
    });

    if (!userStats.length) {
      return [];
    }

    // Aggregate message types from all users in the chat
    const stats = {};
    userStats.forEach((stat) => {
      if (stat.textMessages > 0) {
        stats.text = (stats.text || 0) + stat.textMessages;
      }
      if (stat.imageMessages > 0) {
        stats.image = (stats.image || 0) + stat.imageMessages;
      }
      if (stat.videoMessages > 0) {
        stats.video = (stats.video || 0) + stat.videoMessages;
      }
      if (stat.audioMessages > 0) {
        stats.audio = (stats.audio || 0) + stat.audioMessages;
      }
      if (stat.stickerMessages > 0) {
        stats.sticker = (stats.sticker || 0) + stat.stickerMessages;
      }
      if (stat.otherMessages > 0) {
        stats.other = (stats.other || 0) + stat.otherMessages;
      }
    });

    return Object.entries(stats).map(([type, count]) => ({
      type,
      count,
    }));
  } catch (error) {
    console.error("Error getting chat stats:", error);
    return [];
  }
}

async function getTopUsers(chatJid, limit = 10) {
  try {
    const topUsers = await UserStats.findAll({
      where: { chatJid },
      include: [
        {
          model: User,
          attributes: ["name"],
        },
      ],
      order: [["totalMessages", "DESC"]],
      limit,
    });
    return topUsers.map((stat) => ({
      jid: stat.userJid,
      name: stat.User?.name,
      totalMessages: stat.totalMessages,
      lastMessageAt: stat.lastMessageAt,
    }));
  } catch (error) {
    console.error("Error getting top users:", error);
    return [];
  }
}

// users this account has seen (Users itself is shared by every account)
async function getTotalUserCount() {
  try {
    const count = await UserStats.count({ distinct: true, col: "userJid" });
    return count;
  } catch (error) {
    console.error("Error getting total user count:", error);
    return 0;
  }
}

async function getGlobalTopUsers(limit = 10) {
  try {
    const topUsers = await UserStats.findAll({
      attributes: [
        "userJid",
        [
          config.sequelize.fn("SUM", config.sequelize.col("totalMessages")),
          "totalMessages",
        ],
        [
          config.sequelize.fn("MAX", config.sequelize.col("lastMessageAt")),
          "lastMessageAt",
        ],
      ],
      include: [
        {
          model: User,
          attributes: ["name"],
        },
      ],
      group: ["userJid", "User.jid"],
      order: [
        [
          config.sequelize.fn("SUM", config.sequelize.col("totalMessages")),
          "DESC",
        ],
      ],
      limit,
    });
    return topUsers.map((stat) => ({
      jid: stat.userJid,
      name: stat.User?.name,
      totalMessages: parseInt(stat.getDataValue("totalMessages")),
      lastMessageAt: stat.getDataValue("lastMessageAt"),
    }));
  } catch (error) {
    console.error("Error getting global top users:", error);
    return [];
  }
}

async function getFullMessage(messageKeyIdOnly) {
  try {
    const attributes = ["fullContent", "timestamp", "senderJid", "chatJid"];
    let message = await AntiDeleteCache.findOne({
      where: { msgId: messageKeyIdOnly },
      attributes,
    });
    // rows written before the msgId column existed (gone after the 48h cleanup)
    if (!message) {
      message = await AntiDeleteCache.findOne({
        where: {
          msgId: null,
          messageId: { [Op.startsWith]: messageKeyIdOnly + "_" },
        },
        attributes,
      });
    }
    if (message) {
      return {
        found: true,
        messageData: message.fullContent,
        storedAt: message.timestamp,
        sender: message.senderJid,
        chat: message.chatJid,
      };
    } else {
      return { found: false, messageData: null };
    }
  } catch (error) {
    console.error("Error fetching full message:", error);
    return { found: false, messageData: null, error: error.message };
  }
}

async function fetchRecentChats(limit = 10) {
  try {
    // Get recent chats based on UserStats lastMessageAt instead of Messages table
    const recentChats = await UserStats.findAll({
      attributes: [
        "chatJid",
        [
          config.sequelize.fn("MAX", config.sequelize.col("lastMessageAt")),
          "lastMessageTime",
        ],
      ],
      include: [
        {
          model: Chat,
          attributes: ["type", "name", "isActive"],
        },
      ],
      where: {
        "$Chat.isActive$": true, // Only include active chats
        lastMessageAt: {
          [Op.ne]: null, // Only chats with actual messages
        },
      },
      group: ["chatJid", "Chat.jid", "Chat.type", "Chat.name", "Chat.isActive"],
      order: [
        [
          config.sequelize.fn("MAX", config.sequelize.col("lastMessageAt")),
          "DESC",
        ],
      ],
      limit: limit,
    });

    if (!recentChats.length) {
      return [];
    }

    // Get all private chat JIDs that need user name lookup
    const privateChatJids = recentChats
      .filter((chat) => chat.Chat?.type === "private" && !chat.Chat?.name)
      .map((chat) => chat.chatJid);

    // Load all users at once (single query instead of N queries)
    let usersMap = new Map();
    if (privateChatJids.length > 0) {
      try {
        const users = await User.findAll({
          where: {
            jid: {
              [Op.in]: privateChatJids,
            },
          },
          attributes: ["jid", "name"],
        });

        // Create a Map for O(1) lookup
        users.forEach((user) => {
          usersMap.set(user.jid, user.name);
        });
      } catch (error) {
        console.error("Error fetching user names for private chats:", error);
      }
    }

    // Process results using the loaded users map
    const processedChats = [];
    for (const chat of recentChats) {
      let chatName = chat.Chat?.name;

      // If it's a private chat and no name is stored in Chat table, get from users map
      if (chat.Chat?.type === "private" && !chatName) {
        chatName = usersMap.get(chat.chatJid) || null;
      }

      processedChats.push({
        jid: chat.chatJid,
        type: chat.Chat?.type,
        name: chatName,
        lastMessageTime: chat.dataValues.lastMessageTime,
        isActive: chat.Chat?.isActive,
      });
    }

    return processedChats;
  } catch (error) {
    console.error("Error fetching recent chats:", error);
    return [];
  }
}

async function ensureFullContentColumnExists() {
  try {
    const queryInterface = config.sequelize.getQueryInterface();
    const tableName = "AntiDeleteCaches";

    let tableDescription;
    try {
      tableDescription = await queryInterface.describeTable(tableName);
    } catch (_) {
      return; // fresh install, sync() creates the table with every column
    }

    if (!tableDescription.fullContent) {
      logger.info(
        `Column 'fullContent' not found in table '${tableName}'. Adding it now.`,
      );
      await queryInterface.addColumn(tableName, "fullContent", {
        type: DataTypes.JSON,
        allowNull: true,
      });
    }
    if (!tableDescription.msgId) {
      logger.info(`Adding indexed column 'msgId' to '${tableName}'.`);
      await queryInterface.addColumn(tableName, "msgId", {
        type: DataTypes.STRING,
        allowNull: true,
      });
    }
    const indexes = await queryInterface.showIndex(tableName);
    if (!indexes.some((i) => (i.fields || []).some((f) => f.attribute === "msgId"))) {
      await queryInterface.addIndex(tableName, ["msgId"]);
    }
  } catch (error) {
    console.error("Error ensuring fullContent column exists:", error);
  }
}

// Global variables to prevent duplicate intervals
let cleanupIntervals = {
  spamTracker: null,
  antiDeleteCache: null,
};

// Graceful shutdown handler
async function flushQueueOnShutdown() {
  if (messageQueue.length === 0) {
    logger.debug("Queue is empty during shutdown flush; nothing to persist.");
    return;
  }

  logger.info(
    `Flushing ${messageQueue.length} pending messages before shutdown.`,
  );

  const flushTimeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Queue flush timeout (5s)")), 5000),
  );

  try {
    await Promise.race([flushMessageQueue(), flushTimeout]);
    logger.info("Queue flushed successfully during shutdown.");
  } catch (err) {
    logger.error(
      { err, pending: messageQueue.length },
      "Queue flush failed during shutdown; pending messages may be lost.",
    );
  }
}

function stopFlushTimer() {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
    logger.debug("Periodic flush timer stopped.");
  }
}

// Initialize cleanup intervals only once
function initializeCleanupIntervals() {
  // Clear existing intervals if they exist
  if (cleanupIntervals.spamTracker) clearInterval(cleanupIntervals.spamTracker);
  if (cleanupIntervals.antiDeleteCache)
    clearInterval(cleanupIntervals.antiDeleteCache);

  // prune spam tracker keys every 5 minutes (entries older than 5 min are useless)
  cleanupIntervals.spamTracker = setInterval(
    async () => {
      try {
        await cleanupSpamTracker();
      } catch (error) {
        console.error("Error in spam tracker cleanup interval:", error);
      }
    },
    5 * 60 * 1000,
  );
  cleanupIntervals.spamTracker.unref?.();

  // Cleanup anti-delete cache every 6 hours (keep for 48 hours)
  cleanupIntervals.antiDeleteCache = setInterval(
    async () => {
      try {
        // expires every account's rows
        await context.runUnscoped(() => cleanupAntiDeleteCache());
      } catch (error) {
        console.error("Error in anti-delete cache cleanup interval:", error);
      }
    },
    6 * 60 * 60 * 1000,
  );
}

// Initialize intervals only once when module is first loaded
if (!global.storeIntervalsInitialized) {
  initializeCleanupIntervals();
  global.storeIntervalsInitialized = true;
}

module.exports = {
  Chat,
  User,
  AntiDeleteCache,
  UserStats,
  SpamTracker,
  storeMessage,
  trackSpamMessage,
  getRecentMessageCount,
  cleanupSpamTracker,
  cleanupAntiDeleteCache,
  getChatStats,
  getTopUsers,
  getTotalUserCount,
  getGlobalTopUsers,
  ensureFullContentColumnExists,
  getFullMessage,
  fetchRecentChats,
  flushQueueOnShutdown,
  stopFlushTimer,
  getQueueLength: () => messageQueue.length,
  fetchFromStore: async (chat) => {
    const stats = await UserStats.findAll({
      where: { chatJid: chat },
      include: [{ model: User, attributes: ["name"] }],
    });
    return stats;
  },
  storeToDB: storeMessage,
  // Cleanup function for store intervals
  cleanup: () => {
    if (cleanupIntervals.spamTracker) {
      clearInterval(cleanupIntervals.spamTracker);
      cleanupIntervals.spamTracker = null;
    }
    if (cleanupIntervals.antiDeleteCache) {
      clearInterval(cleanupIntervals.antiDeleteCache);
      cleanupIntervals.antiDeleteCache = null;
    }
    global.storeIntervalsInitialized = false;
  },
};
