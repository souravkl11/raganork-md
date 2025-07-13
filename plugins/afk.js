const { Module } = require("../main");
const { isAdmin } = require("./utils");
const { ADMIN_ACCESS } = require("../config");
const config = require("../config");
const { setVar, getVar, delVar } = require("./manage");

const afkCache = new Map();

async function initAFKCache() {
  try {
    const afkData = config.AFK_DATA || "{}";
    const afkUsers = JSON.parse(afkData);

    for (const [userJid, userData] of Object.entries(afkUsers)) {
      afkCache.set(userJid, {
        reason: userData.reason,
        setAt: new Date(userData.setAt),
        lastSeen: new Date(userData.lastSeen),
        messageCount: userData.messageCount || 0,
      });
    }
    
  } catch (error) {
    console.error("Error initializing AFK cache:", error);

    if (!config.AFK_DATA) {
      await setVar("AFK_DATA", "{}");
    }
  }
}

initAFKCache();

function timeSince(date) {
  if (!date) return "Never";
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) {
    return (
      Math.floor(interval) +
      " year" +
      (Math.floor(interval) > 1 ? "s" : "") +
      " ago"
    );
  }
  interval = seconds / 2592000;
  if (interval > 1) {
    return (
      Math.floor(interval) +
      " month" +
      (Math.floor(interval) > 1 ? "s" : "") +
      " ago"
    );
  }
  interval = seconds / 86400;
  if (interval > 1) {
    return (
      Math.floor(interval) +
      " day" +
      (Math.floor(interval) > 1 ? "s" : "") +
      " ago"
    );
  }
  interval = seconds / 3600;
  if (interval > 1) {
    return (
      Math.floor(interval) +
      " hour" +
      (Math.floor(interval) > 1 ? "s" : "") +
      " ago"
    );
  }
  interval = seconds / 60;
  if (interval > 1) {
    return (
      Math.floor(interval) +
      " minute" +
      (Math.floor(interval) > 1 ? "s" : "") +
      " ago"
    );
  }
  return (
    Math.floor(seconds) +
    " second" +
    (Math.floor(seconds) > 1 ? "s" : "") +
    " ago"
  );
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
    for (const [userJid, userData] of afkCache.entries()) {
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

async function setAFK(userJid, reason = "I am currently away from keyboard") {
  const now = new Date();
  const afkData = {
    reason: reason,
    setAt: now,
    lastSeen: now,
    messageCount: 0,
  };

  afkCache.set(userJid, afkData);

  await saveAFKData();
}

async function removeAFK(userJid) {
  const afkData = afkCache.get(userJid);
  afkCache.delete(userJid);

  await saveAFKData();

  return afkData;
}

async function updateLastSeen(userJid) {
  const afkData = afkCache.get(userJid);
  if (afkData) {
    afkData.lastSeen = new Date();

    await saveAFKData();
  }
}

async function incrementMessageCount(userJid) {
  const afkData = afkCache.get(userJid);
  if (afkData) {
    afkData.messageCount++;

    await saveAFKData();
  }
}

function isAFK(userJid) {
  return afkCache.has(userJid);
}

function getAFKData(userJid) {
  return afkCache.get(userJid);
}

Module(
  {
    pattern: "afk ?(.*)",
    fromMe: true,
    desc: "Set yourself as Away From Keyboard",
    usage:
      ".afk [reason] - _Set AFK with optional reason_\n.afk - _Check current status_\n.afk list - _Show all AFK users_",
  },
  async (message, match) => {
    const userJid = message.sender;
    const input = match[1]?.trim();

    if (input?.toLowerCase() === "list") {
      if (afkCache.size === 0) {
        return await message.sendReply("_No users are currently AFK._");
      }

      let afkList = `*_🌙 AFK Users List (${afkCache.size})_*\n\n`;
      let count = 1;

      for (const [jid, data] of afkCache.entries()) {
        const timeAFK = formatDuration(
          Date.now() - new Date(data.setAt).getTime()
        );
        const lastSeen = timeSince(data.lastSeen);
        afkList += `${count}. @${jid.split("@")[0]}\n`;
        afkList += `   📝 _Reason:_ \`${data.reason}\`\n`;
        afkList += `   ⏰ _AFK for:_ \`${timeAFK}\`\n`;
        afkList += `   👁️ _Last seen:_ \`${lastSeen}\`\n`;
        afkList += `   💬 _Messages received:_ \`${data.messageCount}\`\n\n`;
        count++;
      }

      return await message.sendMessage(afkList, "text", {
        mentions: Array.from(afkCache.keys()),
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
          `*_🌙 You are currently AFK_*\n\n` +
            `📝 _Reason:_ \`${afkData.reason}\`\n` +
            `⏰ _AFK for:_ \`${timeAFK}\`\n` +
            `👁️ _Last seen:_ \`${lastSeen}\`\n` +
            `💬 _Messages received:_ \`${afkData.messageCount}\`\n\n` +
            `_Type any message to go back online._`
        );
      } else {
        await setAFK(userJid, input);
        return await message.sendReply(
          `*_🌙 AFK reason updated_*\n\n` +
            `📝 _New reason:_ \`${input}\`\n\n` +
            `_I'll auto-reply when someone messages or mentions you._`
        );
      }
    } else {
      const reason = input || "I am currently away from keyboard";
      await setAFK(userJid, reason);

      return await message.sendReply(
        `*_🌙 You're now AFK_*\n\n` +
          `📝 _Reason:_ \`${reason}\`\n` +
          `⏰ _Since:_ \`${new Date().toLocaleTimeString()}\`\n\n` +
          `_I'll auto-reply when someone messages or mentions you._\n` +
          `_Type any message to go back online._`
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
          const welcomeBack =
            `*_🌅 Welcome back!_*\n\n` +
            `⏰ _You were AFK for:_ \`${timeAFK}\`\n` +
            `💬 _Messages received:_ \`${afkData.messageCount}\`\n` +
            `📝 _Your reason:_ ${afkData.reason}`;

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
            const timeAFK = formatDuration(
              Date.now() - new Date(afkData.setAt).getTime()
            );
            const lastSeen = timeSince(afkData.lastSeen);

            await incrementMessageCount(mentionedJid);

            const afkReply =
              `*_🌙 @${mentionedJid.split("@")[0]} is currently AFK_*\n\n` +
              `📝 _Reason:_ \`${afkData.reason}\`\n` +
              `⏰ _AFK for:_ \`${timeAFK}\`\n` +
              `👁️ _Last seen:_ \`${lastSeen}\`\n` +
              `💬 _Messages received:_ \`${afkData.messageCount + 1}\``;

            await message.sendMessage(afkReply, "text", {
              quoted: message.data,
              mentions: [mentionedJid],
            });
          }
        }
      }

      if (isDM) {
        const botOwnerJid = message.client.user?.id;
        if (botOwnerJid && isAFK(botOwnerJid)) {
          const afkData = getAFKData(botOwnerJid);
          const timeAFK = formatDuration(
            Date.now() - new Date(afkData.setAt).getTime()
          );
          const lastSeen = timeSince(afkData.lastSeen);

          await incrementMessageCount(botOwnerJid);

          const afkReply =
            `*_🌙 Bot owner is currently AFK_*\n\n` +
            `📝 _Reason:_ \`${afkData.reason}\`\n` +
            `⏰ _AFK for:_ \`${timeAFK}\`\n` +
            `👁️ _Last seen:_ \`${lastSeen}\`\n` +
            `💬 _Messages received:_ \`${afkData.messageCount + 1}\`\n\n` +
            `_Your message has been noted. They'll get back to you when available._`;

          await message.sendReply(afkReply);
        }
      }

      if (isGroup && message.reply_message && message.reply_message.jid) {
        const repliedToJid = message.reply_message.jid;
        if (isAFK(repliedToJid)) {
          const afkData = getAFKData(repliedToJid);
          const timeAFK = formatDuration(
            Date.now() - new Date(afkData.setAt).getTime()
          );
          const lastSeen = timeSince(afkData.lastSeen);

          await incrementMessageCount(repliedToJid);

          const afkReply =
            `*_🌙 @${repliedToJid.split("@")[0]} is currently AFK_*\n\n` +
            `📝 _Reason:_ \`${afkData.reason}\`\n` +
            `⏰ _AFK for:_ \`${timeAFK}\`\n` +
            `👁️ _Last seen:_ \`${lastSeen}\`\n` +
            `💬 _Messages received:_ \`${afkData.messageCount + 1}\``;

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

Module(
  {
    on: "message",
    fromMe: false,
  },
  async (message) => {
    try {
      const senderJid = message.sender;

      if (isAFK(senderJid)) {
        await updateLastSeen(senderJid);
      }
    } catch (error) {
      console.error("Error updating AFK last seen:", error);
    }
  }
);

Module(
  {
    pattern: "afkadmin ?(.*)",
    fromMe: true,
    desc: "Admin AFK management commands",
    usage:
      ".afkadmin list - _Show all AFK users_\n.afkadmin remove @user - _Remove user from AFK_\n.afkadmin clear - _Clear all AFK users_",
  },
  async (message, match) => {
    let adminAccesValidated = ADMIN_ACCESS
      ? await isAdmin(message, message.sender)
      : false;
    if (!message.fromOwner && !adminAccesValidated) {
      return await message.sendReply(
        "_This command requires admin privileges._"
      );
    }

    const input = match[1]?.trim();
    if (!input) {
      return await message.sendReply(
        "*_🔧 AFK Admin Commands_*\n\n" +
          "- `.afkadmin list` - _Show all AFK users_\n" +
          "- `.afkadmin remove @user` - _Remove user from AFK_\n" +
          "- `.afkadmin clear` - _Clear all AFK users_\n" +
          "- `.afkadmin stats` - _Show AFK statistics_"
      );
    }

    const args = input.split(" ");
    const command = args[0].toLowerCase();

    switch (command) {
      case "list":
        if (afkCache.size === 0) {
          return await message.sendReply("_No users are currently AFK._");
        }

        let afkList = `*_🔧 AFK Admin List (${afkCache.size})_*\n\n`;
        let count = 1;

        for (const [jid, data] of afkCache.entries()) {
          const timeAFK = formatDuration(
            Date.now() - new Date(data.setAt).getTime()
          );
          afkList += `${count}. @${jid.split("@")[0]}\n`;
          afkList += `   📝 \`${data.reason.substring(0, 50)}${
            data.reason.length > 50 ? "..." : ""
          }\`\n`;
          afkList += `   ⏰ \`${timeAFK}\` | 💬 \`${data.messageCount}\`\n\n`;
          count++;
        }

        return await message.sendMessage(afkList, "text", {
          mentions: Array.from(afkCache.keys()),
        });

      case "remove":
        if (!message.mention || message.mention.length === 0) {
          return await message.sendReply(
            "_Please mention a user to remove from AFK._"
          );
        }

        let removedUsers = [];
        for (const userJid of message.mention) {
          if (isAFK(userJid)) {
            await removeAFK(userJid);
            removedUsers.push(userJid);
          }
        }

        if (removedUsers.length === 0) {
          return await message.sendReply(
            "_None of the mentioned users are AFK._"
          );
        }

        return await message.sendMessage(
          `*_🔧 Removed ${removedUsers.length} user(s) from AFK_*\n\n` +
            removedUsers.map((jid) => `- @${jid.split("@")[0]}`).join("\n"),
          "text",
          { mentions: removedUsers }
        );

      case "clear":
        const totalCount = afkCache.size;
        if (totalCount === 0) {
          return await message.sendReply("_No users are currently AFK._");
        }

        afkCache.clear();
        await setVar("AFK_DATA", "{}");

        return await message.sendReply(
          `*_🔧 Cleared all AFK users_*\n\n_Removed \`${totalCount}\` user(s) from AFK status._`
        );

      case "stats":
        if (afkCache.size === 0) {
          return await message.sendReply("_No AFK statistics available._");
        }

        let totalMessages = 0;
        let longestAFK = 0;
        let longestAFKUser = "";

        for (const [jid, data] of afkCache.entries()) {
          totalMessages += data.messageCount;
          const afkDuration = Date.now() - new Date(data.setAt).getTime();
          if (afkDuration > longestAFK) {
            longestAFK = afkDuration;
            longestAFKUser = jid;
          }
        }

        const statsText =
          `*_📊 AFK Statistics_*\n\n` +
          `👥 _Total AFK users:_ \`${afkCache.size}\`\n` +
          `💬 _Total messages received:_ \`${totalMessages}\`\n` +
          `⏰ _Longest AFK:_ @${
            longestAFKUser.split("@")[0]
          } (\`${formatDuration(longestAFK)}\`)\n` +
          `📈 _Average messages per user:_ \`${Math.round(
            totalMessages / afkCache.size
          )}\``;

        return await message.sendMessage(statsText, "text", {
          mentions: [longestAFKUser],
        });

      default:
        return await message.sendReply(
          "_Unknown admin command. Use `.afkadmin` to see available options._"
        );
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
