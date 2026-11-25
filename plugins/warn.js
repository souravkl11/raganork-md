const { Module } = require("../main");
const config = require("../config");
const {
  isAdmin,
  getWarn,
  setWarn,
  resetWarn,
  decrementWarn,
  getWarnCount,
  getAllWarns,
  groupAdminGuard,
} = require("./utils");
const { setVar } = require("./manage");
const { isSudo } = require("../core/sudo");
const { isBot } = require("../core/identity");

const { helpPrefix } = require("../core/plugins/registry");
const { getString } = require("./utils/lang");
const Lang = getString("warn");
const getWarnLimit = () => parseInt(config.WARN || 4);

async function checkWarnings(message, targetUser) {
  const targetNumericId = targetUser?.split("@")[0];

  try {
    const warnings = await getWarn(message.jid, targetUser);

    if (!warnings || warnings.length === 0) {
      return await message.client.sendMessage(message.jid, {
        text: Lang.NO_WARNINGS.format(targetNumericId, getWarnLimit()),
        mentions: [targetUser],
      });
    }

    const currentWarns = warnings.length;
    const remaining = getWarnLimit() - currentWarns;

    let warningsList = Lang.HISTORY_HEADER.format(
      targetNumericId,
      currentWarns,
      getWarnLimit(),
      remaining > 0 ? remaining : 0
    );

    warnings.slice(0, 5).forEach((warn, index) => {
      const date = new Date(warn.timestamp).toLocaleString();
      const warnedByNumeric = warn.warnedBy?.split("@")[0];
      warningsList += Lang.HISTORY_ITEM.format(index + 1, warn.reason, warnedByNumeric, date);
    });

    if (warnings.length > 5) {
      warningsList += Lang.HISTORY_MORE.format(warnings.length - 5);
    }

    if (remaining <= 0) {
      warningsList += Lang.HISTORY_EXCEEDED;
    } else if (remaining === 1) {
      warningsList += Lang.HISTORY_LAST;
    }

    await message.client.sendMessage(message.jid, {
      text: warningsList,
      mentions: [targetUser, ...warnings.slice(0, 5).map((w) => w.warnedBy)],
    });
  } catch (error) {
    console.error("Warning check error:", error);
    await message.sendReply(Lang.CHECK_FAILED);
  }
}

async function listWarnings(message) {
  try {
    const allWarnings = await getAllWarns(message.jid);

    if (Object.keys(allWarnings).length === 0) {
      return await message.sendReply(Lang.CLEAN_GROUP);
    }

    let warnList = Lang.LIST_HEADER.format(getWarnLimit());

    const sortedUsers = Object.entries(allWarnings).sort(
      ([, a], [, b]) => b.length - a.length
    );

    let mentions = [];

    sortedUsers.forEach(([userJid, userWarnings], index) => {
      const userNumericId = userJid?.split("@")[0];
      const warnCount = userWarnings.length;
      const remaining = getWarnLimit() - warnCount;
      const status =
        remaining <= 0
          ? Lang.STATUS_EXCEEDED
          : remaining === 1
          ? Lang.STATUS_FINAL
          : Lang.STATUS_REMAINING.format(remaining);

      warnList += Lang.LIST_ITEM.format(index + 1, userNumericId, warnCount, getWarnLimit(), status);

      if (userWarnings.length > 0) {
        const latestWarning = userWarnings[0];
        warnList += Lang.LIST_LATEST.format(
          latestWarning.reason.substring(0, 30) + (latestWarning.reason.length > 30 ? "..." : "")
        );
      }
      warnList += "\n";

      mentions.push(userJid);
    });

    warnList += Lang.LIST_FOOTER.format(sortedUsers.length, helpPrefix());

    await message.client.sendMessage(message.jid, {
      text: warnList,
      mentions,
    });
  } catch (error) {
    console.error("Warning list error:", error);
    await message.sendReply(Lang.LIST_FAILED);
  }
}

async function warnStats(message) {
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
      if (count >= getWarnLimit()) atLimit++;
      else if (count >= getWarnLimit() - 1) nearLimit++;
      else safe++;
    });

    await message.sendReply(
      Lang.STATS.format(getWarnLimit(), totalUsers, totalWarnings, atLimit, nearLimit, safe, helpPrefix())
    );
  } catch (error) {
    console.error("Warning stats error:", error);
    await message.sendReply(Lang.STATS_FAILED);
  }
}

Module(
  {
    pattern: "warn(ings|list|stats)?(?:\\s+(.*))?$",
    fromMe: false,
    desc: Lang.WARN_DESC,
    usage: Lang.WARN_USAGE,
    use: "group",
  },
  async (message, match) => {
    let sub = match[1] === "ings" ? "check" : match[1] || null;
    const args = match[2]?.trim() || "";
    if (!sub) {
      const [first, ...others] = args.split(/\s+/);
      const word = first.toLowerCase();
      const rest = others.join(" ");
      if ((word === "list" || word === "stats") && !rest) sub = word;
      else if (word === "check" && (!rest || rest.startsWith("@"))) sub = word;
    }

    if (!(await groupAdminGuard(message, { botAdmin: !sub }))) return;

    if (sub === "list") return await listWarnings(message);
    if (sub === "stats") return await warnStats(message);
    if (sub === "check") {
      const user =
        message.mention?.[0] || message.reply_message?.jid || message.sender;
      return await checkWarnings(message, user);
    }

    const targetUser = message.mention?.[0] || message.reply_message?.jid;
    if (!targetUser) {
      return await message.sendReply(Lang.WARN_HELP.replaceAll("{p}", helpPrefix()));
    }

    const isTargetAdmin = await isAdmin(message, targetUser);
    if (isTargetAdmin) {
      return await message.sendReply(Lang.CANNOT_WARN_ADMIN);
    }

    if (isSudo(targetUser) || isBot(targetUser, message.client)) {
      return await message.sendReply(Lang.CANNOT_WARN_BOT);
    }

    const targetNumericId = targetUser?.split("@")[0];
    let rawReason = args || Lang.NO_REASON;
    const mentionRegex = new RegExp(`@${targetNumericId}\\s*`, "g");
    const reason =
      rawReason.replace(mentionRegex, "").trim() || Lang.NO_REASON;

    try {
      await setWarn(message.jid, targetUser, reason, message.sender);

      const warnData = await getWarn(message.jid, targetUser, getWarnLimit());
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
            text: Lang.KICKED.format(targetNumericId, reason, currentWarns, getWarnLimit()),
            mentions: [targetUser],
          });
        } catch (kickError) {
          await message.client.sendMessage(message.jid, {
            text: Lang.KICK_FAILED.format(targetNumericId, currentWarns, getWarnLimit()),
            mentions: [targetUser],
          });
        }
      } else {
        await message.client.sendMessage(message.jid, {
          text:
            Lang.WARNED.format(targetNumericId, reason, currentWarns, getWarnLimit(), remaining) +
            (remaining === 1 ? Lang.WARNED_LAST : Lang.WARNED_MORE.format(remaining)),
          mentions: [targetUser],
        });
      }
    } catch (error) {
      console.error("Warning error:", error);
      await message.sendReply(Lang.WARN_FAILED);
    }
  }
);

Module(
  {
    pattern: "rmwarn ?(.*)",
    fromMe: false,
    desc: Lang.RMWARN_DESC,
    usage: ".rmwarn @user\n.rmwarn reply",
    use: "group",
  },
  async (message, match) => {
    if (!message.isGroup)
      return await message.sendReply(Lang.GROUP_ONLY);

    let adminAccess = config.ADMIN_ACCESS
      ? await isAdmin(message, message.sender)
      : false;
    if (!message.fromOwner && !adminAccess) return;

    const targetUser = message.mention?.[0] || message.reply_message?.jid;
    if (!targetUser) {
      return await message.sendReply(Lang.NEED_USER);
    }

    const targetNumericId = targetUser?.split("@")[0];

    try {
      const currentCount = await getWarnCount(message.jid, targetUser);

      if (currentCount === 0) {
        return await message.client.sendMessage(message.jid, {
          text: Lang.NOTHING_TO_REMOVE.format(targetNumericId),
          mentions: [targetUser],
        });
      }

      const removed = await decrementWarn(message.jid, targetUser);

      if (removed) {
        const newCount = await getWarnCount(message.jid, targetUser);
        await message.client.sendMessage(message.jid, {
          text: Lang.REMOVED.format(
            targetNumericId,
            newCount,
            newCount === 0 ? Lang.CLEAN_RECORD : Lang.STILL_WARNED
          ),
          mentions: [targetUser],
        });
      } else {
        await message.sendReply(Lang.REMOVE_FAILED);
      }
    } catch (error) {
      console.error("Warning removal error:", error);
      await message.sendReply(Lang.REMOVE_FAILED);
    }
  }
);

Module(
  {
    pattern: "resetwarn ?(.*)",
    fromMe: false,
    desc: Lang.RESETWARN_DESC,
    usage: ".resetwarn @user\n.resetwarn reply",
    use: "group",
  },
  async (message, match) => {
    if (!message.isGroup)
      return await message.sendReply(Lang.GROUP_ONLY);

    let adminAccess = config.ADMIN_ACCESS
      ? await isAdmin(message, message.sender)
      : false;
    if (!message.fromOwner && !adminAccess) {
      return await message.sendReply(Lang.RESET_NEED_ADMIN);
    }

    const targetUser = message.mention?.[0] || message.reply_message?.jid;
    if (!targetUser) {
      return await message.sendReply(Lang.NEED_USER);
    }

    const targetNumericId = targetUser?.split("@")[0];

    try {
      const currentCount = await getWarnCount(message.jid, targetUser);

      if (currentCount === 0) {
        return await message.client.sendMessage(message.jid, {
          text: Lang.NOTHING_TO_RESET.format(targetNumericId),
          mentions: [targetUser],
        });
      }

      const removed = await resetWarn(message.jid, targetUser);

      if (removed) {
        await message.client.sendMessage(message.jid, {
          text: Lang.RESET.format(targetNumericId, currentCount),
          mentions: [targetUser],
        });
      } else {
        await message.sendReply(Lang.RESET_FAILED);
      }
    } catch (error) {
      console.error("Warning reset error:", error);
      await message.sendReply(Lang.RESET_FAILED);
    }
  }
);

Module(
  {
    pattern: "setwarnlimit ?(.*)",
    fromMe: true,
    desc: Lang.LIMIT_DESC,
    usage: ".setwarnlimit 5",
    use: "group",
  },
  async (message, match) => {
    const newLimit = parseInt(match[1]);

    if (!newLimit || newLimit < 1 || newLimit > 20) {
      return await message.sendReply(Lang.LIMIT_INVALID.format(getWarnLimit(), helpPrefix()));
    }

    try {
      const previous = getWarnLimit();
      await setVar("WARN", String(newLimit));
      await message.sendReply(Lang.LIMIT_SET.format(newLimit, previous, newLimit));
    } catch (error) {
      console.error("Set warn limit error:", error);
      await message.sendReply(Lang.LIMIT_FAILED);
    }
  }
);
