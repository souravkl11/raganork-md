const { Module } = require("../main");
const { cooldown, accountKey, timeSince } = require("./utils");
const config = require("../config");
const { setVar } = require("./manage");
const { getString } = require("./utils/lang");
const Lang = getString("afk");

const NOTICE_COOLDOWN_MS = 5 * 60 * 1000;

// per account; falls back to the shared pre-multi-session row until the session saves its own
const afkCaches = new Map();

function loadAFKCache() {
  const cache = new Map();
  try {
    const afkUsers = JSON.parse(config.AFK_DATA || "{}");
    for (const [userJid, userData] of Object.entries(afkUsers)) {
      cache.set(userJid, {
        reason: userData.reason,
        setAt: new Date(userData.setAt),
        lastSeen: new Date(userData.lastSeen),
        messageCount: userData.messageCount || 0,
      });
    }
  } catch (error) {
    console.error("Error initializing AFK cache:", error);
  }
  return cache;
}

function afkCache() {
  const key = accountKey();
  let cache = afkCaches.get(key);
  if (!cache) {
    cache = loadAFKCache();
    afkCaches.set(key, cache);
  }
  return cache;
}

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

async function saveAFKData() {
  try {
    const afkData = {};
    for (const [userJid, userData] of afkCache().entries()) {
      afkData[userJid] = {
        reason: userData.reason,
        setAt: userData.setAt.toISOString(),
        lastSeen: userData.lastSeen.toISOString(),
        messageCount: userData.messageCount,
      };
    }
    await setVar("AFK_DATA", JSON.stringify(afkData));
  } catch (error) {
    console.error("Error saving AFK data:", error);
  }
}

async function setAFK(userJid, reason = Lang.DEFAULT_REASON) {
  const now = new Date();
  const afkData = {
    reason: reason,
    setAt: now,
    lastSeen: now,
    messageCount: 0,
  };

  afkCache().set(userJid, afkData);

  await saveAFKData();
}

async function removeAFK(userJid) {
  const cache = afkCache();
  const afkData = cache.get(userJid);
  cache.delete(userJid);

  await saveAFKData();

  return afkData;
}

// batch counter/last-seen writes, one timer per account
const afkSaveTimers = new Map();
function scheduleAFKSave() {
  const key = accountKey();
  if (afkSaveTimers.has(key)) return;
  const timer = setTimeout(() => {
    afkSaveTimers.delete(key);
    saveAFKData();
  }, 30000);
  timer.unref?.();
  afkSaveTimers.set(key, timer);
}

async function updateLastSeen(userJid) {
  const afkData = afkCache().get(userJid);
  if (afkData) {
    afkData.lastSeen = new Date();
    scheduleAFKSave();
  }
}

async function incrementMessageCount(userJid) {
  const afkData = afkCache().get(userJid);
  if (afkData) {
    afkData.messageCount++;
    scheduleAFKSave();
  }
}

function shouldNotify(chatJid, afkJid) {
  return cooldown(accountKey("afk", chatJid, afkJid), NOTICE_COOLDOWN_MS);
}

function isAFK(userJid) {
  return afkCache().has(userJid);
}

function getAFKData(userJid) {
  return afkCache().get(userJid);
}

Module(
  {
    pattern: "afk ?(.*)",
    fromMe: true,
    desc: Lang.CMD_DESC,
    usage: Lang.CMD_USAGE,
  },
  async (message, match) => {
    const userJid = message.sender;
    const input = match[1]?.trim();

    if (input?.toLowerCase() === "list") {
      const cache = afkCache();
      if (cache.size === 0) {
        return await message.sendReply(Lang.NO_AFK_USERS);
      }

      let afkList = Lang.LIST_HEADER.format(cache.size);
      let count = 1;

      for (const [jid, data] of cache.entries()) {
        const timeAFK = formatDuration(
          Date.now() - new Date(data.setAt).getTime()
        );
        const lastSeen = timeSince(data.lastSeen);
        afkList += Lang.LIST_ITEM.format(count, jid.split("@")[0], data.reason, timeAFK, lastSeen, data.messageCount);
        count++;
      }

      return await message.sendMessage(afkList, "text", {
        mentions: Array.from(cache.keys()),
      });
    }

    if (isAFK(userJid)) {
      if (!input) {
        const afkData = getAFKData(userJid);
        const timeAFK = formatDuration(
          Date.now() - new Date(afkData.setAt).getTime()
        );
        const lastSeen = timeSince(afkData.lastSeen);

        return await message.sendReply(
          Lang.STATUS_SELF.format(afkData.reason, timeAFK, lastSeen, afkData.messageCount)
        );
      } else {
        await setAFK(userJid, input);
        return await message.sendReply(Lang.REASON_UPDATED.format(input));
      }
    } else {
      const reason = input || Lang.DEFAULT_REASON;
      await setAFK(userJid, reason);

      return await message.sendReply(
        Lang.NOW_AFK.format(reason, new Date().toLocaleTimeString())
      );
    }
  }
);

Module(
  {
    on: "message",
    fromMe: false,
  },
  async (message) => {
    try {
      if (message.fromBot) return;
      const senderJid = message.sender;
      const chatJid = message.jid;
      const isGroup = message.isGroup;
      const isDM = !isGroup;

      if (isAFK(senderJid)) {
        const afkData = await removeAFK(senderJid);
        if (afkData) {
          const timeAFK = formatDuration(
            Date.now() - new Date(afkData.setAt).getTime()
          );
          const welcomeBack = Lang.WELCOME_BACK.format(timeAFK, afkData.messageCount, afkData.reason);

          await message.sendReply(welcomeBack);
        }
        return;
      }

      if (message.reply_message && message.reply_message.text) {
        const repliedText = message.reply_message.text.toLowerCase();
        if (
          repliedText.includes("is currently afk") ||
          repliedText.includes("🌙")
        ) {
          return;
        }
      }

      if (isGroup && message.mention && message.mention.length > 0) {
        for (const mentionedJid of message.mention) {
          if (isAFK(mentionedJid)) {
            const afkData = getAFKData(mentionedJid);
            await incrementMessageCount(mentionedJid);
            if (!shouldNotify(chatJid, mentionedJid)) continue;
            const timeAFK = formatDuration(
              Date.now() - new Date(afkData.setAt).getTime()
            );
            const lastSeen = timeSince(afkData.lastSeen);

            const afkReply = Lang.USER_AFK.format(mentionedJid.split("@")[0], afkData.reason, timeAFK, lastSeen, afkData.messageCount);

            await message.sendMessage(afkReply, "text", {
              quoted: message.data,
              mentions: [mentionedJid],
            });
          }
        }
      }

      if (isDM) {
        const botOwnerJid = message.client.user?.lid?.split(":")[0] + "@lid";
        if (botOwnerJid && isAFK(botOwnerJid)) {
          const afkData = getAFKData(botOwnerJid);
          await incrementMessageCount(botOwnerJid);
          if (!shouldNotify(chatJid, botOwnerJid)) return;
          const timeAFK = formatDuration(
            Date.now() - new Date(afkData.setAt).getTime()
          );
          const lastSeen = timeSince(afkData.lastSeen);

          const afkReply = Lang.OWNER_AFK.format(afkData.reason, timeAFK, lastSeen, afkData.messageCount);

          await message.sendReply(afkReply);
        }
      }

      if (isGroup && message.reply_message && message.reply_message.jid) {
        const repliedToJid = message.reply_message.jid;
        if (isAFK(repliedToJid)) {
          const afkData = getAFKData(repliedToJid);
          await incrementMessageCount(repliedToJid);
          if (!shouldNotify(chatJid, repliedToJid)) return;
          const timeAFK = formatDuration(
            Date.now() - new Date(afkData.setAt).getTime()
          );
          const lastSeen = timeSince(afkData.lastSeen);

          const afkReply = Lang.USER_AFK.format(repliedToJid.split("@")[0], afkData.reason, timeAFK, lastSeen, afkData.messageCount);

          await message.sendMessage(afkReply, "text", {
            quoted: message.data,
            mentions: [repliedToJid],
          });
        }
      }
    } catch (error) {
      console.error("Error in AFK auto-reply handler:", error);
    }
  }
);

module.exports = {
  setAFK,
  removeAFK,
  isAFK,
  getAFKData,
  updateLastSeen,
  incrementMessageCount,
  saveAFKData,
};
