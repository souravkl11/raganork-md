const { Module } = require("../main");
const { ADMIN_ACCESS, HANDLERS, WARN, SUDO } = require("../config");
const {
  isAdmin,
  getWarn,
  setWarn,
  resetWarn,
  decrementWarn,
  getWarnCount,
  getAllWarns,
} = require("./utils");

const handler = HANDLERS !== "false" ? HANDLERS.split("")[0] : "";
const warnLimit = parseInt(WARN || 4);
const sudoUsers = (SUDO || "").split(",");

Module(
  {
    pattern: "warn ?(.*)",
    fromMe: false,
    desc: "Warn a user in the group. After reaching the limit, user will be kicked.",
    usage: ".warn @user reason\n.warn reply reason",
    use: "group",
  },
  async (message, match) => {
    if (!match[0].split(" ")[0]?.toLowerCase().endsWith("warn")) return;
    if (!message.isGroup)
      return await message.sendReply("_This is a group-only command!_");

    let adminAccess = ADMIN_ACCESS
      ? await isAdmin(message, message.sender)
      : false;
    if (!message.fromOwner && !adminAccess) return;

    const botIsAdmin = await isAdmin(message);
    if (!botIsAdmin) {
      return await message.sendReply(
        "_I need admin privileges to manage warnings!_"
      );
    }

    const targetUser = message.mention?.[0] || message.reply_message?.jid;
    if (!targetUser) {
      return await message.sendReply(
        `_Please mention a user or reply to their message!_\n\n` +
          `*Usage:*\n` +
          `• \`${handler}warn @user reason\`\n` +
          `• \`${handler}warn reply reason\`\n` +
          `• \`${handler}warnings @user\` - Check warnings\n` +
          `• \`${handler}rmwarn @user\` - Remove one warning\n` +
          `• \`${handler}resetwarn @user\` - Remove all warnings\n` +
          `• \`${handler}warnlist\` - List all warned users`
      );
    }

    const isTargetAdmin = await isAdmin(message, targetUser);
    if (isTargetAdmin) {
      return await message.sendReply("_Cannot warn group admins!_");
    }

    const targetNumericId = targetUser?.split("@")[0];
    if (sudoUsers.includes(targetNumericId)) {
      return await message.sendReply("_Cannot warn bot owners/sudo users!_");
    }

    let rawReason = match[1] || "No reason provided";
    const mentionRegex = new RegExp(`@${targetNumericId}\\s*`, "g");
    const reason =
      rawReason.replace(mentionRegex, "").trim() || "No reason provided";

    try {
      await setWarn(message.jid, targetUser, reason, message.sender);

      const warnData = await getWarn(message.jid, targetUser, warnLimit);
      const currentWarns = warnData.current;
      const remaining = warnData.remaining;

      if (warnData.exceeded) {
        try {
          await message.client.groupParticipantsUpdate(
            message.jid,
            [targetUser],
            "remove"
          );

          await message.client.sendMessage(message.jid, {
            text:
              `⚠ *User Kicked!*\n\n` +
              `- User: \`@${targetNumericId}\`\n` +
              `- Reason: \`${reason}\`\n` +
              `- Warnings: \`${currentWarns}/${warnLimit} (LIMIT EXCEEDED)\`\n` +
              `- Action: \`Removed from group\`\n\n` +
              `_User has been kicked for exceeding the warning limit._`,
            mentions: [targetUser],
          });
        } catch (kickError) {
          await message.client.sendMessage(message.jid, {
            text:
              `⚠ *Warning Limit Exceeded!*\n\n` +
              `- User: \`@${targetNumericId}\`\n` +
              `- Warnings: \`${currentWarns}/${warnLimit}\`\n` +
              `- Error: \`Failed to kick user\`\n\n` +
              `_Please manually remove the user or check my admin permissions._`,
            mentions: [targetUser],
          });
        }
      } else {
        await message.client.sendMessage(message.jid, {
          text:
            `⚠ *User Warned!*\n\n` +
            `- User: \`@${targetNumericId}\`\n` +
            `- Reason: \`${reason}\`\n` +
            `- Warnings: \`${currentWarns}/${warnLimit}\`\n` +
            `- Remaining: \`${remaining}\`\n\n` +
            `${
              remaining === 1
                ? "_Next warning will result in a kick!_"
                : `_${remaining} more warnings before kick._`
            }`,
          mentions: [targetUser],
        });
      }
    } catch (error) {
      console.error("Warning error:", error);
      await message.sendReply("_Failed to add warning! Please try again._");
    }
  }
);

Module(
  {
    pattern: "warnings ?(.*)",
    fromMe: false,
    desc: "Check warnings for a user",
    usage: ".warnings @user\n.warnings reply",
    use: "group",
  },
  async (message, match) => {
    if (!message.isGroup)
      return await message.sendReply("_This is a group-only command!_");

    let adminAccess = ADMIN_ACCESS
      ? await isAdmin(message, message.sender)
      : false;
    if (!message.fromOwner && !adminAccess) return;

    const targetUser =
      message.mention?.[0] || message.reply_message?.jid || message.sender;
    const targetNumericId = targetUser?.split("@")[0];

    try {
      const warnings = await getWarn(message.jid, targetUser);

      if (!warnings || warnings.length === 0) {
        return await message.client.sendMessage(message.jid, {
          text:
            `✓ *No Warnings*\n\n` +
            `- User: \`@${targetNumericId}\`\n` +
            `- Status: \`Clean record\`\n` +
            `- Warnings: \`0/${warnLimit}\``,
          mentions: [targetUser],
        });
      }

      const currentWarns = warnings.length;
      const remaining = warnLimit - currentWarns;

      let warningsList = `📋 *Warning History*\n\n`;
      warningsList += `- User: \`@${targetNumericId}\`\n`;
      warningsList += `- Total Warnings: \`${currentWarns}/${warnLimit}\`\n`;
      warningsList += `- Remaining: \`${remaining > 0 ? remaining : 0}\`\n\n`;

      warnings.slice(0, 5).forEach((warn, index) => {
        const date = new Date(warn.timestamp).toLocaleString();
        const warnedByNumeric = warn.warnedBy?.split("@")[0];
        warningsList += `*${index + 1}.* ${warn.reason}\n`;
        warningsList += `   _By: @${warnedByNumeric}_\n`;
        warningsList += `   _Date: ${date}_\n\n`;
      });

      if (warnings.length > 5) {
        warningsList += `_... and ${warnings.length - 5} more warnings_\n\n`;
      }

      if (remaining <= 0) {
        warningsList += `⚠ _User has exceeded the warning limit!_`;
      } else if (remaining === 1) {
        warningsList += `⚠ _Next warning will result in a kick!_`;
      }

      await message.client.sendMessage(message.jid, {
        text: warningsList,
        mentions: [targetUser, ...warnings.slice(0, 5).map((w) => w.warnedBy)],
      });
    } catch (error) {
      console.error("Warning check error:", error);
      await message.sendReply("_Failed to retrieve warnings!_");
    }
  }
);

Module(
  {
    pattern: "rmwarn ?(.*)",
    fromMe: false,
    desc: "Remove one warning for a user",
    usage: ".rmwarn @user\n.rmwarn reply",
    use: "group",
  },
  async (message, match) => {
    if (!message.isGroup)
      return await message.sendReply("_This is a group-only command!_");

    let adminAccess = ADMIN_ACCESS
      ? await isAdmin(message, message.sender)
      : false;
    if (!message.fromOwner && !adminAccess) return;

    const targetUser = message.mention?.[0] || message.reply_message?.jid;
    if (!targetUser) {
      return await message.sendReply(
        "_Please mention a user or reply to their message!_"
      );
    }

    const targetNumericId = targetUser?.split("@")[0];

    try {
      const currentCount = await getWarnCount(message.jid, targetUser);

      if (currentCount === 0) {
        return await message.client.sendMessage(message.jid, {
          text:
            "ℹ *No Warnings*\n\n" +
            "- User: `@" +
            targetNumericId +
            "`\n" +
            "- Status: `No warnings to remove`",
          mentions: [targetUser],
        });
      }

      const removed = await decrementWarn(message.jid, targetUser);

      if (removed) {
        const newCount = await getWarnCount(message.jid, targetUser);
        await message.client.sendMessage(message.jid, {
          text:
            "✓ *Warning Removed!*\n\n" +
            "- User: `@" +
            targetNumericId +
            "`\n" +
            "- Removed: `1 warning`\n" +
            "- Remaining: `" +
            newCount +
            " warning(s)`\n" +
            "- Status: `" +
            (newCount === 0 ? "Clean record" : "Still has warnings") +
            "`",
          mentions: [targetUser],
        });
      } else {
        await message.sendReply("_Failed to remove warning!_");
      }
    } catch (error) {
      console.error("Warning removal error:", error);
      await message.sendReply("_Failed to remove warning!_");
    }
  }
);

Module(
  {
    pattern: "resetwarn ?(.*)",
    fromMe: false,
    desc: "Reset all warnings for a user",
    usage: ".resetwarn @user\n.resetwarn reply",
    use: "group",
  },
  async (message, match) => {
    if (!message.isGroup)
      return await message.sendReply("_This is a group-only command!_");

    let adminAccess = ADMIN_ACCESS
      ? await isAdmin(message, message.sender)
      : false;
    if (!message.fromOwner && !adminAccess) {
      return await message.sendReply(
        "_You need admin privileges to reset warnings!_"
      );
    }

    const targetUser = message.mention?.[0] || message.reply_message?.jid;
    if (!targetUser) {
      return await message.sendReply(
        "_Please mention a user or reply to their message!_"
      );
    }

    const targetNumericId = targetUser?.split("@")[0];

    try {
      const currentCount = await getWarnCount(message.jid, targetUser);

      if (currentCount === 0) {
        return await message.client.sendMessage(message.jid, {
          text:
            "ℹ *No Warnings*\n\n" +
            "- User: `@" +
            targetNumericId +
            "`\n" +
            "- Status: `No warnings to reset`",
          mentions: [targetUser],
        });
      }

      const removed = await resetWarn(message.jid, targetUser);

      if (removed) {
        await message.client.sendMessage(message.jid, {
          text:
            "✓ *Warnings Reset!*\n\n" +
            "- User: `@" +
            targetNumericId +
            "`\n" +
            "- Removed: `" +
            currentCount +
            " warning(s)`\n" +
            "- Status: `Clean record`",
          mentions: [targetUser],
        });
      } else {
        await message.sendReply("_Failed to reset warnings!_");
      }
    } catch (error) {
      console.error("Warning reset error:", error);
      await message.sendReply("_Failed to reset warnings!_");
    }
  }
);

Module(
  {
    pattern: "warnlist",
    fromMe: false,
    desc: "List all warned users in the group",
    usage: ".warnlist",
    use: "group",
  },
  async (message) => {
    if (!message.isGroup)
      return await message.sendReply("_This is a group-only command!_");

    let adminAccess = ADMIN_ACCESS
      ? await isAdmin(message, message.sender)
      : false;
    if (!message.fromOwner && !adminAccess) {
      return await message.sendReply(
        "_You need admin privileges to view the warning list!_"
      );
    }

    try {
      const allWarnings = await getAllWarns(message.jid);

      if (Object.keys(allWarnings).length === 0) {
        return await message.sendReply(
          `✓ *Clean Group!*\n\n` +
            `- No users have warnings in this group.\n` +
            `_Everyone is following the rules!_`
        );
      }

      let warnList = `📋 *Group Warning List*\n\n`;
      warnList += `- Warning Limit: \`${warnLimit}\`\n\n`;

      const sortedUsers = Object.entries(allWarnings).sort(
        ([, a], [, b]) => b.length - a.length
      );

      let mentions = [];

      sortedUsers.forEach(([userJid, userWarnings], index) => {
        const userNumericId = userJid?.split("@")[0];
        const warnCount = userWarnings.length;
        const remaining = warnLimit - warnCount;
        const status =
          remaining <= 0
            ? "⚠ LIMIT EXCEEDED"
            : remaining === 1
            ? "⚠ FINAL WARNING"
            : `✓ ${remaining} remaining`;

        warnList += `*${index + 1}.* @${userNumericId}\n`;
        warnList += `   _Warnings: \`${warnCount}/${warnLimit}\`_\n`;
        warnList += `   _Status: \`${status}\`_\n`;

        if (userWarnings.length > 0) {
          const latestWarning = userWarnings[0];
          warnList += `   _Latest: \`${latestWarning.reason.substring(0, 30)}${
            latestWarning.reason.length > 30 ? "..." : ""
          }\`_\n`;
        }
        warnList += "\n";

        mentions.push(userJid);
      });

      warnList += `_Total warned users: ${sortedUsers.length}_\n`;
      warnList += `_Use ${handler}warnings @user for detailed history_`;

      await message.client.sendMessage(message.jid, {
        text: warnList,
        mentions,
      });
    } catch (error) {
      console.error("Warning list error:", error);
      await message.sendReply("_Failed to retrieve warning list!_");
    }
  }
);

Module(
  {
    pattern: "setwarnlimit ?(.*)",
    fromMe: true,
    desc: "Set the warning limit for the group",
    usage: ".setwarnlimit 5",
    use: "group",
  },
  async (message, match) => {
    const newLimit = parseInt(match[1]);

    if (!newLimit || newLimit < 1 || newLimit > 20) {
      return await message.sendReply(
        `⚠ *Invalid Warning Limit*\n\n` +
          `- Please provide a number between 1 and 20.\n` +
          `- Current limit: \`${warnLimit}\`\n\n` +
          `*Usage:* \`${handler}setwarnlimit 5\``
      );
    }

    try {
      await message.sendReply(
        `✓ *Warning Limit Updated!*\n\n` +
          `- New limit: \`${newLimit} warnings\`\n` +
          `- Previous limit: \`${warnLimit}\`\n\n` +
          `_Users will now be kicked after ${newLimit} warnings._`
      );
    } catch (error) {
      console.error("Set warn limit error:", error);
      await message.sendReply("_Failed to update warning limit!_");
    }
  }
);

Module(
  {
    pattern: "warnstats",
    fromMe: false,
    desc: "Show warning statistics for the group",
    usage: ".warnstats",
    use: "group",
  },
  async (message) => {
    if (!message.isGroup)
      return await message.sendReply("_This is a group-only command!_");

    let adminAccess = ADMIN_ACCESS
      ? await isAdmin(message, message.sender)
      : false;
    if (!message.fromOwner && !adminAccess) {
      return await message.sendReply(
        "_You need admin privileges to view warning statistics!_"
      );
    }

    try {
      const allWarnings = await getAllWarns(message.jid);

      const totalUsers = Object.keys(allWarnings).length;
      const totalWarnings = Object.values(allWarnings).reduce(
        (sum, warnings) => sum + warnings.length,
        0
      );

      let atLimit = 0;
      let nearLimit = 0;
      let safe = 0;

      Object.values(allWarnings).forEach((userWarnings) => {
        const count = userWarnings.length;
        if (count >= warnLimit) atLimit++;
        else if (count >= warnLimit - 1) nearLimit++;
        else safe++;
      });

      const stats =
        `📊 *Group Warning Statistics*\n\n` +
        `- Warning Limit: \`${warnLimit}\`\n` +
        `- Total Warned Users: \`${totalUsers}\`\n` +
        `- Total Warnings Issued: \`${totalWarnings}\`\n\n` +
        `*User Status:*\n` +
        `- ⚠ At Limit: \`${atLimit}\`\n` +
        `- ⚠ Near Limit: \`${nearLimit}\`\n` +
        `- ✓ Safe: \`${safe}\`\n\n` +
        `_Use ${handler}warnlist to see detailed list_`;

      await message.sendReply(stats);
    } catch (error) {
      console.error("Warning stats error:", error);
      await message.sendReply("_Failed to retrieve warning statistics!_");
    }
  }
);
