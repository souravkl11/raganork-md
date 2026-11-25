const { isAdmin, timeSince } = require("./utils");
const { Module } = require("../main");
const { isOwner } = require("../core/identity");
const { helpPrefix } = require("../core/plugins/registry");
const { getString } = require("./utils/lang");
const Lang = getString("message_stats");
const {
  fetchFromStore,
  getTopUsers,
  getGlobalTopUsers,
} = require("../core/store");

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
    desc: Lang.MSGS_DESC,
    usage: Lang.MSGS_USAGE,
    use: "group",
  },
  async (message, match) => {
    if (!message.isGroup)
      return await message.sendReply(Lang.GROUP_ONLY);

    if (message.fromOwner) {
      var users = (
        await message.client.groupMetadata(message.jid)
      ).participants.map((e) => e.id);
      if (message.mention?.[0]) users = message.mention;
      if (message.reply_message && !message.mention?.length)
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
          Lang.NO_MEMBERS
        );
      }

      let final_msg = Lang.MSGS_HEADER.format(usersWithMessages.length);

      for (let userObj of usersWithMessages) {
        let user = userObj.jid;
        let userStat = userObj.stat;
        let count = userStat.totalMessages;
        let name = userStat.User?.name?.replace(/[\r\n]+/gm, "") || Lang.UNKNOWN;
        let lastMsg = timeSince(userStat.lastMessageAt);
        let types_msg = "\n";
        if (userStat.textMessages > 0)
          types_msg += Lang.TEXT.format(userStat.textMessages);
        if (userStat.imageMessages > 0)
          types_msg += Lang.IMAGE.format(userStat.imageMessages);
        if (userStat.videoMessages > 0)
          types_msg += Lang.VIDEO.format(userStat.videoMessages);
        if (userStat.audioMessages > 0)
          types_msg += Lang.AUDIO.format(userStat.audioMessages);
        if (userStat.stickerMessages > 0)
          types_msg += Lang.STICKER.format(userStat.stickerMessages);
        if (userStat.otherMessages > 0)
          types_msg += Lang.OTHERS.format(userStat.otherMessages);
        final_msg += Lang.MSGS_ITEM.format(user.split("@")[0], name, count, lastMsg, types_msg);
      }

      return await message.sendReply(final_msg);
    }
  }
);

Module(
  {
    pattern: "inactive ?(.*)",
    fromMe: true,
    desc: Lang.INACTIVE_DESC,
    usage: Lang.INACTIVE_USAGE,
    use: "group",
  },
  async (message, match) => {
    if (!message.isGroup)
      return await message.sendReply(Lang.GROUP_ONLY);

    if (message.fromOwner) {
      if (!match[1]) {
        return await message.sendReply(
          Lang.INACTIVE_HELP.replaceAll("{p}", helpPrefix())
        );
      }

      const args = match[1].trim().split(/\s+/);
      const durationStr = args[0];
      const flags = args.slice(1).map((arg) => arg.toLowerCase());
      const shouldKick = flags.includes("kick");
      const force = flags.includes("force");

      const cutoffDate = parseDuration(durationStr);
      if (!cutoffDate) {
        return await message.sendReply(
          Lang.BAD_DURATION
        );
      }

      if (shouldKick) {
        var admin = await isAdmin(message);
        if (!admin)
          return await message.sendReply(
            Lang.NEED_ADMIN
          );
      }

      const groupMetadata = await message.client.groupMetadata(message.jid);
      const participants = groupMetadata.participants.map((e) => e.id);
      const userStats = await fetchFromStore(message.jid);

      let dataStart = null;
      for (const stat of userStats) {
        const date = new Date(stat.createdAt || stat.lastMessageAt);
        if (!dataStart || date < dataStart) dataStart = date;
      }
      const dataWarning = !dataStart || cutoffDate < dataStart;

      if (shouldKick && dataWarning && !force) {
        return await message.sendReply(
          Lang.NOT_KICKING.format(
            dataStart ? Lang.DATA_GOES_BACK.format(timeSince(dataStart)) : Lang.DATA_EMPTY,
            durationStr,
            durationStr
          ).replaceAll("{p}", helpPrefix())
        );
      }

      let inactiveMembers = [];
      for (let user of participants) {
        let userStat = userStats.find((stat) => stat.userJid === user);

        if (!userStat || !userStat.lastMessageAt) {
          inactiveMembers.push({
            jid: user,
            name: userStat?.User?.name?.replace(/[\r\n]+/gm, "") || Lang.UNKNOWN,
            lastMessage: Lang.NEVER,
            totalMessages: userStat?.totalMessages || 0,
          });
        } else {
          const lastMessageDate = new Date(userStat.lastMessageAt);
          if (lastMessageDate < cutoffDate) {
            inactiveMembers.push({
              jid: user,
              name: userStat.User?.name?.replace(/[\r\n]+/gm, "") || Lang.UNKNOWN,
              lastMessage: timeSince(userStat.lastMessageAt),
              totalMessages: userStat.totalMessages,
            });
          }
        }
      }

      if (shouldKick) {
        inactiveMembers = inactiveMembers.filter((member) => {
          const participant = groupMetadata.participants.find(
            (p) => p.id === member.jid
          );
          return !participant?.admin && !isOwner(member.jid, message.client);
        });
      }

      if (inactiveMembers.length === 0) {
        return await message.sendReply(
          Lang.NO_INACTIVE.format(durationStr)
        );
      }

      let responseMsg = Lang.INACTIVE_HEADER.format(durationStr, inactiveMembers.length);

      if (dataWarning) {
        responseMsg += Lang.DATA_WARNING.format(
          dataStart ? Lang.DATA_FROM.format(timeSince(dataStart)) : Lang.DATA_NONE
        );
      }

      if (shouldKick) {
        responseMsg += Lang.KICK_WARNING.format(inactiveMembers.length);

        for (let i = 0; i < Math.min(inactiveMembers.length, 10); i++) {
          const member = inactiveMembers[i];
          responseMsg += `${i + 1}. @${member.jid.split("@")[0]} (${
            member.name
          })\n`;
        }

        if (inactiveMembers.length > 10) {
          responseMsg += Lang.AND_MORE.format(inactiveMembers.length - 10);
        }

        responseMsg += Lang.KICK_START;

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
                Lang.KICK_PROGRESS.format(kickCount, inactiveMembers.length)
              );
            }
          } catch (error) {
            console.error(`Failed to kick ${member.jid}:`, error);
          }
        }

        return await message.send(
          Lang.KICK_DONE.format(kickCount, inactiveMembers.length)
        );
      } else {
        for (let i = 0; i < inactiveMembers.length; i++) {
          const member = inactiveMembers[i];
          responseMsg += Lang.INACTIVE_ITEM.format(i + 1, member.jid.split("@")[0], member.name, member.lastMessage, member.totalMessages);
        }

        responseMsg += Lang.KICK_HINT.format(helpPrefix(), durationStr);

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
    desc: Lang.USERS_DESC,
    usage: Lang.USERS_USAGE,
    use: "utility",
  },
  async (message, match) => {
    if (message.fromOwner) {
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
              return await message.sendReply(Lang.MAX_LIMIT);
            }
          }
        } else {
          const parsedLimit = parseInt(args[0]);
          if (parsedLimit && parsedLimit > 0 && parsedLimit <= 50) {
            limit = parsedLimit;
          } else if (parsedLimit > 50) {
            return await message.sendReply(Lang.MAX_LIMIT);
          } else if (parsedLimit <= 0) {
            return await message.sendReply(
              Lang.BAD_LIMIT
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
          scopeText = Lang.SCOPE_GLOBAL;
        } else {
          topUsers = await getTopUsers(message.jid, limit);
          scopeText = message.isGroup ? Lang.SCOPE_GROUP : Lang.SCOPE_CHAT;
        }

        if (topUsers.length === 0) {
          return await message.sendReply(
            Lang.NO_USER_DATA.format(scopeText)
          );
        }

        let responseMsg = Lang.USERS_HEADER.format(topUsers.length, scopeText);

        for (let i = 0; i < topUsers.length; i++) {
          const user = topUsers[i];
          const rank = i + 1;
          const name = user.name?.replace(/[\r\n]+/gm, "") || Lang.UNKNOWN;
          const lastMessage = timeSince(user.lastMessageAt);

          responseMsg += Lang.USERS_ITEM.format(rank, user.jid.split("@")[0], name, user.totalMessages, isGlobal ? Lang.ACROSS_ALL : "", lastMessage);
        }

        if (isGlobal) {
          responseMsg += Lang.TIP_CHAT.format(helpPrefix());
        } else if (message.isGroup) {
          responseMsg += Lang.TIP_GLOBAL.format(helpPrefix());
        }

        const mentions = topUsers.map((user) => user.jid);

        return await message.client.sendMessage(message.jid, {
          text: responseMsg,
          mentions: mentions,
        });
      } catch (error) {
        console.error("Error in users command:", error);
        return await message.sendReply(
          Lang.USERS_FAILED
        );
      }
    }
  }
);
