const { isAdmin, mentionjid } = require("./utils");
const { ADMIN_ACCESS } = require("../config");
const { Module } = require("../main");
const {
  fetchFromStore,
  getTopUsers,
  getGlobalTopUsers,
} = require("../core/store");

function timeSince(date) {
  if (!date) return "Never";
  var seconds = Math.floor((new Date() - new Date(date)) / 1000);
  var interval = seconds / 31536000;
  if (interval > 1) {
    return Math.floor(interval) + " years ago";
  }
  interval = seconds / 2592000;
  if (interval > 1) {
    return Math.floor(interval) + " months ago";
  }
  interval = seconds / 86400;
  if (interval > 1) {
    return Math.floor(interval) + " days ago";
  }
  interval = seconds / 3600;
  if (interval > 1) {
    return Math.floor(interval) + " hours ago";
  }
  interval = seconds / 60;
  if (interval > 1) {
    return Math.floor(interval) + " minutes ago";
  }
  return Math.floor(seconds) + " seconds ago";
}

function parseDuration(duration) {
  const regex = /^(\d+)([dwmy])$/i;
  const match = duration.match(regex);
  if (!match) return null;

  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();

  const now = new Date();
  switch (unit) {
    case "d":
      return new Date(now.getTime() - value * 24 * 60 * 60 * 1000);
    case "w":
      return new Date(now.getTime() - value * 7 * 24 * 60 * 60 * 1000);
    case "m":
      return new Date(now.getTime() - value * 30 * 24 * 60 * 60 * 1000);
    case "y":
      return new Date(now.getTime() - value * 365 * 24 * 60 * 60 * 1000);
    default:
      return null;
  }
}

Module(
  {
    pattern: "msgs ?(.*)",
    fromMe: true,
    desc: "Shows number of messages sent by each member with at least one message, sorted by count",
    usage:
      ".msgs (all members with messages)\n.msgs @mention (specific member)",
    use: "group",
  },
  async (message, match) => {
    if (!message.isGroup)
      return await message.sendReply("_This is a group command!_");

    let adminAccesValidated = ADMIN_ACCESS
      ? await isAdmin(message, message.sender)
      : false;
    if (message.fromOwner || adminAccesValidated) {
      var users = (
        await message.client.groupMetadata(message.jid)
      ).participants.map((e) => e.id);
      if (message.mention?.[0]) users = message.mention;
      if (message.reply_message && !message.mention.length)
        users = [message.reply_message?.jid];

      let userStats = await fetchFromStore(message.jid);

      let usersWithMessages = [];
      for (let user of users) {
        let userStat = userStats.find((stat) => stat.userJid === user);
        if (userStat && userStat.totalMessages > 0) {
          usersWithMessages.push({
            jid: user,
            stat: userStat,
          });
        }
      }

      usersWithMessages.sort(
        (a, b) => b.stat.totalMessages - a.stat.totalMessages
      );

      if (usersWithMessages.length === 0) {
        return await message.sendReply(
          "_No members found with messages in the database._"
        );
      }

      let final_msg = `_Messages sent by ${usersWithMessages.length} members_\n_Sorted by message count (highest to lowest)_\n\n`;

      for (let userObj of usersWithMessages) {
        let user = userObj.jid;
        let userStat = userObj.stat;
        let count = userStat.totalMessages;
        let name = userStat.User?.name?.replace(/[\r\n]+/gm, "") || "Unknown";
        let lastMsg = timeSince(userStat.lastMessageAt);
        let types_msg = "\n";
        if (userStat.textMessages > 0)
          types_msg += `_Text: *${userStat.textMessages}*_\n`;
        if (userStat.imageMessages > 0)
          types_msg += `_Image: *${userStat.imageMessages}*_\n`;
        if (userStat.videoMessages > 0)
          types_msg += `_Video: *${userStat.videoMessages}*_\n`;
        if (userStat.audioMessages > 0)
          types_msg += `_Audio: *${userStat.audioMessages}*_\n`;
        if (userStat.stickerMessages > 0)
          types_msg += `_Sticker: *${userStat.stickerMessages}*_\n`;
        if (userStat.otherMessages > 0)
          types_msg += `_Others: *${userStat.otherMessages}*_\n`;
        final_msg += `_Participant: *+${
          user.split("@")[0]
        }*_\n_Name: *${name}*_\n_Total msgs: *${count}*_\n_Last msg: *${lastMsg}*_${types_msg}\n\n`;
      }

      return await message.sendReply(final_msg);
    }
  }
);

Module(
  {
    pattern: "inactive ?(.*)",
    fromMe: true,
    desc: "Shows inactive members based on last message time. Can also kick them.",
    usage:
      ".inactive 30d (members inactive for 30+ days)\n.inactive 10d kick (kick members inactive for 10+ days)\n\nSupported units: d (days), w (weeks), m (months), y (years)",
    use: "group",
  },
  async (message, match) => {
    if (!message.isGroup)
      return await message.sendReply("_This is a group command!_");

    let adminAccesValidated = ADMIN_ACCESS
      ? await isAdmin(message, message.sender)
      : false;
    if (message.fromOwner || adminAccesValidated) {
      if (!match[1]) {
        return await message.sendReply(
          "_Usage:_\n" +
            "• `.inactive 30d` - Show members inactive for 30+ days\n" +
            "• `.inactive 10d kick` - Kick members inactive for 10+ days\n" +
            "• `.inactive 2w` - Show members inactive for 2+ weeks\n" +
            "• `.inactive 3m kick` - Kick members inactive for 3+ months\n\n" +
            "_Supported units:_ d (days), w (weeks), m (months), y (years)"
        );
      }

      const args = match[1].trim().split(" ");
      const durationStr = args[0];
      const shouldKick = args[1]?.toLowerCase() === "kick";

      const cutoffDate = parseDuration(durationStr);
      if (!cutoffDate) {
        return await message.sendReply(
          "_Invalid duration format!_\n" + "_Examples:_ 30d, 2w, 3m, 1y"
        );
      }

      if (shouldKick) {
        var admin = await isAdmin(message);
        if (!admin)
          return await message.sendReply(
            "_Bot needs admin privileges to kick members!_"
          );
      }

      const groupMetadata = await message.client.groupMetadata(message.jid);
      const participants = groupMetadata.participants.map((e) => e.id);
      const userStats = await fetchFromStore(message.jid);

      let oldestMessageDate = null;
      if (userStats.length > 0) {
        const oldestStat = userStats.reduce((oldest, current) => {
          const currentDate = new Date(
            current.lastMessageAt || current.createdAt
          );
          const oldestDate = new Date(oldest.lastMessageAt || oldest.createdAt);
          return currentDate < oldestDate ? current : oldest;
        });
        oldestMessageDate = new Date(
          oldestStat.lastMessageAt || oldestStat.createdAt
        );
      }

      const dataWarning = oldestMessageDate && cutoffDate < oldestMessageDate;

      let inactiveMembers = [];
      for (let user of participants) {
        let userStat = userStats.find((stat) => stat.userJid === user);

        if (!userStat || !userStat.lastMessageAt) {
          inactiveMembers.push({
            jid: user,
            name: userStat?.User?.name?.replace(/[\r\n]+/gm, "") || "Unknown",
            lastMessage: "Never",
            totalMessages: userStat?.totalMessages || 0,
          });
        } else {
          const lastMessageDate = new Date(userStat.lastMessageAt);
          if (lastMessageDate < cutoffDate) {
            inactiveMembers.push({
              jid: user,
              name: userStat.User?.name?.replace(/[\r\n]+/gm, "") || "Unknown",
              lastMessage: timeSince(userStat.lastMessageAt),
              totalMessages: userStat.totalMessages,
            });
          }
        }
      }

      if (shouldKick) {
        const botId =
          message.client.user?.lid?.split(":")[0] + "@lid" ||
          message.client.user.id.split(":")[0] + "@s.whatsapp.net";
        inactiveMembers = inactiveMembers.filter((member) => {
          const participant = groupMetadata.participants.find(
            (p) => p.id === member.jid
          );
          return !participant?.admin && member.jid !== botId;
        });
      }

      if (inactiveMembers.length === 0) {
        return await message.sendReply(
          `_No inactive members found for the specified duration (${durationStr})._`
        );
      }

      let responseMsg = `_Inactive members (${durationStr}+):_ *${inactiveMembers.length}*\n\n`;

      if (dataWarning) {
        responseMsg += `⚠️ _Warning: Database only has data from ${timeSince(
          oldestMessageDate
        )}. Members who were active before this time may appear as inactive._\n\n`;
      }

      if (shouldKick) {
        responseMsg += `_❗❗ Kicking ${inactiveMembers.length} inactive members. This action cannot be undone! ❗❗_\n\n`;

        for (let i = 0; i < Math.min(inactiveMembers.length, 10); i++) {
          const member = inactiveMembers[i];
          responseMsg += `${i + 1}. @${member.jid.split("@")[0]} (${
            member.name
          })\n`;
        }

        if (inactiveMembers.length > 10) {
          responseMsg += `... and ${inactiveMembers.length - 10} more\n`;
        }

        responseMsg += `\n_Starting kick process in 5 seconds..._`;

        await message.client.sendMessage(message.jid, {
          text: responseMsg,
          mentions: inactiveMembers.map((m) => m.jid),
        });

        await new Promise((r) => setTimeout(r, 5000));

        let kickCount = 0;
        for (let member of inactiveMembers) {
          try {
            await new Promise((r) => setTimeout(r, 2000));
            await message.client.groupParticipantsUpdate(
              message.jid,
              [member.jid],
              "remove"
            );
            kickCount++;

            if (kickCount % 5 === 0) {
              await message.send(
                `_Kicked ${kickCount}/${inactiveMembers.length} members..._`
              );
            }
          } catch (error) {
            console.error(`Failed to kick ${member.jid}:`, error);
          }
        }

        return await message.send(
          `_✅ Kicked ${kickCount}/${inactiveMembers.length} inactive members._`
        );
      } else {
        for (let i = 0; i < inactiveMembers.length; i++) {
          const member = inactiveMembers[i];
          responseMsg += `${i + 1}. @${member.jid.split("@")[0]}\n`;
          responseMsg += `   _Name:_ ${member.name}\n`;
          responseMsg += `   _Last msg:_ ${member.lastMessage}\n`;
          responseMsg += `   _Total msgs:_ ${member.totalMessages}\n\n`;
        }

        responseMsg += `_Use \`.inactive ${durationStr} kick\` to remove these members._`;

        return await message.client.sendMessage(message.jid, {
          text: responseMsg,
          mentions: inactiveMembers.map((m) => m.jid),
        });
      }
    }
  }
);

Module(
  {
    pattern: "users ?(.*)",
    fromMe: true,
    desc: "Shows top users by message count. In DM shows global stats by default, in groups shows chat-specific stats.",
    usage:
      ".users (shows top 10 users - global in DM, chat-specific in groups)\n.users global (shows global top users)\n.users 20 (shows top 20 users)\n.users global 15 (shows top 15 global users)",
    use: "utility",
  },
  async (message, match) => {
    let adminAccesValidated =
      ADMIN_ACCESS && message.isGroup
        ? await isAdmin(message, message.sender)
        : false;
    if (message.fromOwner || adminAccesValidated) {
      let limit = 10;
      let isGlobal = false;

      if (match[1]) {
        const args = match[1].trim().split(" ");

        if (args.includes("global")) {
          isGlobal = true;

          const limitArg = args.find(
            (arg) => arg !== "global" && !isNaN(parseInt(arg))
          );
          if (limitArg) {
            const parsedLimit = parseInt(limitArg);
            if (parsedLimit > 0 && parsedLimit <= 50) {
              limit = parsedLimit;
            } else if (parsedLimit > 50) {
              return await message.sendReply("_Maximum limit is 50 users._");
            }
          }
        } else {
          const parsedLimit = parseInt(args[0]);
          if (parsedLimit && parsedLimit > 0 && parsedLimit <= 50) {
            limit = parsedLimit;
          } else if (parsedLimit > 50) {
            return await message.sendReply("_Maximum limit is 50 users._");
          } else if (parsedLimit <= 0) {
            return await message.sendReply(
              "_Limit must be a positive number._"
            );
          }
        }
      }

      if (!message.isGroup && !match[1]?.includes("chat")) {
        isGlobal = true;
      }

      try {
        let topUsers;
        let scopeText;

        if (isGlobal) {
          topUsers = await getGlobalTopUsers(limit);
          scopeText = "global";
        } else {
          topUsers = await getTopUsers(message.jid, limit);
          scopeText = message.isGroup ? "group" : "chat";
        }

        if (topUsers.length === 0) {
          return await message.sendReply(
            `_No user data found in the database for ${scopeText} stats._`
          );
        }

        let responseMsg = `_Top ${topUsers.length} ${scopeText} users by message count_\n\n`;

        for (let i = 0; i < topUsers.length; i++) {
          const user = topUsers[i];
          const rank = i + 1;
          const name = user.name?.replace(/[\r\n]+/gm, "") || "Unknown";
          const lastMessage = timeSince(user.lastMessageAt);

          responseMsg += `*${rank}.* @${user.jid.split("@")[0]}\n`;
          responseMsg += `   _Name:_ ${name}\n`;
          responseMsg += `   _Messages:_ ${user.totalMessages}${
            isGlobal ? " (across all chats)" : ""
          }\n`;
          responseMsg += `   _Last seen:_ ${lastMessage}\n\n`;
        }

        if (isGlobal) {
          responseMsg += `\n_💡 Tip: Use \`.users chat\` for current chat stats only._`;
        } else if (message.isGroup) {
          responseMsg += `\n_💡 Tip: Use \`.users global\` for global stats across all chats._`;
        }

        const mentions = topUsers.map((user) => user.jid);

        return await message.client.sendMessage(message.jid, {
          text: responseMsg,
          mentions: mentions,
        });
      } catch (error) {
        console.error("Error in users command:", error);
        return await message.sendReply(
          "_Failed to fetch user data. Please try again._"
        );
      }
    }
  }
);
