const { getString } = require("./utils/lang");
const Lang = getString("group");
const { setTimeout: sleep } = require("timers/promises");
const {
  isAdmin,
  isNumeric,
  mentionjid,
  groupAdminGuard,
  accountKey,
} = require("./utils");
const config = require("../config");
const { Module } = require("../main");
const { getFullMessage, fetchRecentChats } = require("../core/store");
const { helpPrefix } = require("../core/plugins/registry");
const { isOwner, isBot } = require("../core/identity");
const context = require("../core/context");

const MAX_MUTE_MINUTES = 7 * 24 * 60;
const wait = (ms) => sleep(ms, undefined, { ref: false });

const kickRuns = new Map();
const muteTimers = new Map();

const phoneOf = (member) => {
  const jid =
    member.phoneNumber ||
    (member.id.endsWith("@s.whatsapp.net") ? member.id : "");
  return jid.split("@")[0].split(":")[0];
};

const isProtected = (member, client) =>
  Boolean(member.admin) || isBot(member.id, client) || isOwner(member.id, client);

// the loop runs outside the command so the chat's queue stays free for `.kick stop`
function startKick(message, userIds, subject) {
  const key = accountKey(message.jid);
  if (kickRuns.has(key)) return false;
  const run = { stop: false };
  kickRuns.set(key, run);
  const { client, jid } = message;
  (async () => {
    let removed = 0;
    try {
      await wait(5000);
      for (const id of userIds) {
        await wait(1000);
        if (run.stop) break;
        try {
          await client.groupParticipantsUpdate(jid, [id], "remove");
          removed++;
        } catch (error) {
          console.error(`Failed to remove ${id} from ${subject}:`, error.message);
        }
      }
    } finally {
      kickRuns.delete(key);
    }
    const text = run.stop
      ? Lang.STOPPED_REMOVED.format(removed, userIds.length)
      : Lang.DONE_REMOVED.format(removed, userIds.length);
    await client.sendMessage(jid, { text }).catch(() => {});
  })();
  return true;
}

function parseMuteDuration(input) {
  const m = input
    .trim()
    .match(/^(\d+)\s*(m|min|mins|minutes?|h|hr|hrs|hours?)?$/i);
  if (!m) return null;
  const minutes =
    parseInt(m[1]) * (m[2] && m[2][0].toLowerCase() === "h" ? 60 : 1);
  if (!minutes || minutes > MAX_MUTE_MINUTES) return null;
  return minutes;
}

const describeMinutes = (minutes) =>
  minutes % 60 === 0 ? Lang.HOUR_S.format(minutes / 60) : Lang.MINUTE_S.format(minutes);

function cancelMuteTimer(key) {
  clearTimeout(muteTimers.get(key));
  muteTimers.delete(key);
}

const ADD_STATUS = {
  200: Lang.ADD_200,
  401: Lang.ADD_401,
  403: Lang.ADD_403,
  408: Lang.ADD_408,
  409: Lang.ADD_409,
  500: Lang.ADD_500,
};

Module(
  {
    pattern: "clear ?(.*)",
    fromMe: true,
    desc: Lang.CLEAR_CHAT,
    use: "misc",
    usage: Lang.CLEAR_CLEARS_THE_CURRENT_CHAT,
  },
  async (message, match) => {
    await message.client.chatModify(
      {
        delete: true,
        lastMessages: [
          {
            key: message.data.key,
            messageTimestamp: message.data.messageTimestamp,
          },
        ],
      },
      message.jid
    );
    return await message.send(Lang.CHAT_CLEARED);
  }
);

Module(
  {
    pattern: "kick ?(.*)",
    fromMe: false,
    desc: Lang.KICK_DESC,
    use: "group",
    usage:
      Lang.KICK_MENTION_OR_REPLY_KICK,
  },
  async (message, match) => {
    if (!(await groupAdminGuard(message, { botAdmin: true }))) return;
    const arg = match[1]?.trim().toLowerCase();
    if (arg === "stop") {
      const run = kickRuns.get(accountKey(message.jid));
      if (!run)
        return await message.sendReply(Lang.NO_KICK_IS_RUNNING_IN);
      run.stop = true;
      return await message.sendReply(Lang.STOPPING_AFTER_THE_CURRENT_MEMBER);
    }
    if (arg === "all" || (arg && isNumeric(arg))) {
      const { participants, subject } = await message.client.groupMetadata(
        message.jid
      );
      let candidates = participants.filter(
        (member) => !isProtected(member, message.client)
      );
      let skipped = 0;
      if (arg !== "all") {
        candidates = candidates.filter((member) => {
          const phone = phoneOf(member);
          if (!phone) skipped++;
          return phone.startsWith(arg);
        });
      }
      if (!candidates.length)
        return await message.sendReply(Lang.NO_MEMBERS_TO_REMOVE);
      const ids = candidates.map((member) => member.id);
      if (!startKick(message, ids, subject))
        return await message.sendReply(
          Lang.A_KICK_IS_ALREADY_RUNNING.replaceAll("{p}", helpPrefix())
        );
      const who = arg === "all" ? Lang.MEMBERS_WORD : Lang.MEMBERS_STARTING_WITH.format(arg);
      return await message.send(
        Lang.KICK_COUNTDOWN.format(ids.length, who, subject).replaceAll("{p}", helpPrefix()) +
          (skipped
            ? Lang.MEMBERS_SKIPPED_PHONE_NUMBER_UNKNOWN.format(skipped)
            : "")
      );
    }
    const user = message.mention?.[0] || message.reply_message?.jid;
    if (!user) return await message.sendReply(Lang.NEED_USER);
    if (isBot(user, message.client) || isOwner(user, message.client))
      return await message.sendReply(Lang.I_WONT_REMOVE_THE_BOT);
    await message.client.sendMessage(message.jid, {
      text: mentionjid(user) + Lang.KICKED,
      mentions: [user],
    });
    await message.client.groupParticipantsUpdate(message.jid, [user], "remove");
  }
);
Module(
  {
    pattern: "add ?(.*)",
    fromMe: true,
    desc: Lang.ADD_DESC,
    warn: Lang.YOU_NUMBER_MIGHT_GET_BANNED,
    use: "group",
    usage: Lang.ADD_919876543210,
  },
  async (message, match) => {
    if (!(await groupAdminGuard(message, { botAdmin: true }))) return;
    const number = (
      match[1] ||
      message.reply_message?.jid?.split("@")[0] ||
      ""
    ).replace(/\D/g, "");
    if (!number) return await message.sendReply(Lang.NEED_USER);
    if (number.length < 7 || number.length > 15)
      return await message.sendReply(
        Lang.THAT_DOES_NOT_LOOK_LIKE
      );
    const [result] = await message.client.groupParticipantsUpdate(
      message.jid,
      [number + "@s.whatsapp.net"],
      "add"
    );
    const status = String(result?.status ?? "");
    return await message.sendReply(
      Lang.ADD_RESULT.format(
        number,
        ADD_STATUS[status] || Lang.ADD_UNKNOWN_STATUS.format(status || Lang.UNKNOWN_LOWER)
      )
    );
  }
);
Module(
  {
    pattern: "promote ?(.*)",
    fromMe: false,
    use: "group",
    desc: Lang.PROMOTE_DESC,
    usage: Lang.PROMOTE_MENTION_OR_REPLY,
  },
  async (message, match) => {
    if (!(await groupAdminGuard(message, { botAdmin: true }))) return;
    const user = message.mention?.[0] || message.reply_message?.jid;
    if (!user) return await message.sendReply(Lang.NEED_USER);
    await message.client.sendMessage(message.jid, {
      text: mentionjid(user) + Lang.PROMOTED,
      mentions: [user],
    });
    await message.client.groupParticipantsUpdate(message.jid, [user], "promote");
  }
);
Module(
  {
    pattern: "requests ?(.*)",
    fromMe: false,
    use: "group",
    usage: Lang.REQUESTS_APPROVE_ALL_OR_REJECT,
    desc: Lang.GET_LIST_OF_PENDING_JOIN,
  },
  async (message, match) => {
    if (!(await groupAdminGuard(message, { botAdmin: true }))) return;
    let approvalList = await message.client.groupRequestParticipantsList(
      message.jid
    );
    if (!approvalList.length)
      return await message.sendReply(Lang.NO_PENDING_REQUESTS);
    let approvalJids = approvalList.map((x) => x.jid);
    if (match[1]) {
      match = match[1].toLowerCase();
      switch (match) {
        case "approve all": {
          await message.sendReply(
            Lang.APPROVING_PARTICIPANTS.format(approvalJids.length)
          );
          for (let x of approvalJids) {
            await message.client.groupRequestParticipantsUpdate(
              message.jid,
              [x],
              "approve"
            );
            await wait(900);
          }
          break;
        }
        case "reject all": {
          await message.sendReply(
            Lang.REJECTING_PARTICIPANTS.format(approvalJids.length)
          );
          for (let x of approvalJids) {
            await message.client.groupRequestParticipantsUpdate(
              message.jid,
              [x],
              "reject"
            );
            await wait(900);
          }
          break;
        }
        default: {
          return await message.sendReply(
            Lang.INVALID_INPUT_EG_REQUESTS_APPROVE.replaceAll("{p}", helpPrefix())
          );
        }
      }
      return;
    }
    let msg =
      Lang.GROUP_JOIN_REQUESTS_USE_REQUESTS.replaceAll("{p}", helpPrefix());
    const requestType = (type_, requestor) => {
      switch (type_) {
        case "linked_group_join":
          return Lang.VIA_COMMUNITY;
        case "invite_link":
          return Lang.INVITE_LINK;
        case "non_admin_add":
          return Lang.VIA_ADDED_BY.format(requestor.split("@")[0]);
      }
    };
    for (let x in approvalList) {
      msg += Lang.REQUEST_ITEM.format(
        parseInt(x) + 1,
        approvalList[x].jid.split("@")[0],
        requestType(approvalList[x].request_method, approvalList[x].requestor),
        new Date(parseInt(approvalList[x].request_time) * 1000).toLocaleString()
      );
    }
    return await message.client.sendMessage(
      message.jid,
      { text: msg, mentions: approvalJids },
      { quoted: message.data }
    );
  }
);
Module(
  {
    pattern: "leave",
    fromMe: true,
    desc: Lang.LEAVE_DESC,
    usage: Lang.LEAVE_EXITS_CURRENT_GROUP,
    use: "group",
  },
  async (message, match) => {
    if (!message.isGroup)
      return await message.sendReply(
        Lang.LEAVE_FROM_WHERE_THIS_IS
      );
    return await message.client.groupLeave(message.jid);
  }
);
Module(
  {
    pattern: "quoted",
    fromMe: true,
    desc: Lang.SENDS_REPLIED_MESSAGES_REPLIED_MESSAGE,
    usage: Lang.QUOTED_REPLY_TO_A_QUOTED,
    use: "group",
  },
  async (message, match) => {
    if (!message.reply_message?.id) {
      return await message.sendReply(Lang.REPLY_TO_A_MESSAGE_THAT);
    }
    try {
      const repliedMessage = await getFullMessage(message.reply_message.id);
      const messageData = repliedMessage.found
        ? repliedMessage.messageData
        : message.reply_message.data;
      let quotedMessageId = null;
      let quotedMessage = null;
      let participant = null;
      if (messageData.message) {
        const msgKeys = Object.keys(messageData.message);
        for (const key of msgKeys) {
          const msgContent = messageData.message[key];
          if (msgContent?.contextInfo?.stanzaId) {
            quotedMessageId = msgContent.contextInfo.stanzaId;
            quotedMessage = msgContent.contextInfo.quotedMessage;
            participant = msgContent.contextInfo.participant;
            break;
          }
        }
      }
      if (!quotedMessageId) {
        return await message.sendReply(
          Lang.THE_REPLIED_MESSAGE_DOESNT_CONTAIN
        );
      }
      const originalQuoted = await getFullMessage(quotedMessageId);
      if (originalQuoted.found) {
        return await message.forwardMessage(
          message.jid,
          originalQuoted.messageData
        );
      } else if (quotedMessage) {
        const reconstructedMsg = {
          key: {
            remoteJid: message.jid,
            fromMe: false,
            id: quotedMessageId,
            participant: participant,
          },
          message: quotedMessage,
        };
        return await message.forwardMessage(message.jid, reconstructedMsg);
      } else {
        return await message.sendReply(
          Lang.QUOTED_MESSAGE_NOT_FOUND_AND
        );
      }
    } catch (error) {
      console.error("Error in quoted command:", error);
      return await message.sendReply(Lang.FAILED_TO_LOAD_QUOTED_MESSAGE);
    }
  }
);

Module(
  {
    pattern: "demote ?(.*)",
    fromMe: false,
    use: "group",
    desc: Lang.DEMOTE_DESC,
    usage: Lang.DEMOTE_MENTION_OR_REPLY,
  },
  async (message, match) => {
    if (!(await groupAdminGuard(message, { botAdmin: true }))) return;
    const user = message.mention?.[0] || message.reply_message?.jid;
    if (!user) return await message.sendReply(Lang.NEED_USER);
    await message.client.sendMessage(message.jid, {
      text: mentionjid(user) + Lang.DEMOTED,
      mentions: [user],
    });
    await message.client.groupParticipantsUpdate(message.jid, [user], "demote");
  }
);
Module(
  {
    pattern: "mute ?(.*)",
    use: "group",
    fromMe: false,
    desc: Lang.MUTE_DESC,
    usage:
      Lang.MUTE_MUTES_GROUP_INDEFINITELY_MUTE,
  },
  async (message, match) => {
    if (!(await groupAdminGuard(message, { botAdmin: true }))) return;
    const input = match[1]?.trim();
    const key = accountKey(message.jid);
    if (!input) {
      cancelMuteTimer(key);
      await message.client.groupSettingUpdate(message.jid, "announcement");
      return await message.send(Lang.MUTED);
    }
    const minutes = parseMuteDuration(input);
    if (!minutes)
      return await message.sendReply(
        Lang.GIVE_A_DURATION_LIKE_30M.replaceAll("{p}", helpPrefix())
      );
    await message.client.groupSettingUpdate(message.jid, "announcement");
    cancelMuteTimer(key);
    const { jid } = message;
    const session = context.current();
    const fallback = message.client;
    const timer = setTimeout(async () => {
      muteTimers.delete(key);
      // the socket is replaced on every reconnect, so ask the session for the live one
      const client = session?.bot?.sock || fallback;
      try {
        await client.groupSettingUpdate(jid, "not_announcement");
        await client.sendMessage(jid, { text: Lang.UNMUTED });
      } catch (error) {
        console.error(`Scheduled unmute failed for ${jid}:`, error.message);
      }
    }, minutes * 60 * 1000);
    timer.unref();
    muteTimers.set(key, timer);
    await message.send(
      Lang.MUTED_FOR_I_WILL_UNMUTE.format(describeMinutes(minutes)).replaceAll("{p}", helpPrefix())
    );
  }
);
Module(
  {
    pattern: "unmute",
    use: "group",
    fromMe: false,
    desc: Lang.UNMUTE_DESC,
    usage: Lang.UNMUTE_UNMUTES_THE_GROUP,
  },
  async (message, match) => {
    if (!(await groupAdminGuard(message, { botAdmin: true }))) return;
    cancelMuteTimer(accountKey(message.jid));
    await message.client.groupSettingUpdate(message.jid, "not_announcement");
    await message.send(Lang.UNMUTED);
  }
);
Module(
  {
    pattern: "jid",
    use: "group",
    fromMe: false,
    desc: Lang.JID_DESC,
    usage: Lang.JID_GETS_CURRENT_CHAT_JID,
  },
  async (message) => {
    if (message.isGroup) {
      let adminAccesValidated =
        config.ADMIN_ACCESS && message.isGroup
          ? await isAdmin(message, message.sender)
          : false;
      if (message.fromOwner || adminAccesValidated) {
        var jid = message.reply_message?.jid || message.jid;
        await message.sendReply(jid);
      }
    } else {
      if (config.MODE !== "public" && !message.fromOwner) return;
      await message.sendReply(message.jid);
    }
  }
);
Module(
  {
    pattern: "invite",
    fromMe: false,
    use: "group",
    desc: Lang.INVITE_DESC,
    usage: Lang.INVITE_GENERATES_GROUP_INVITE_LINK,
  },
  async (message) => {
    if (!(await groupAdminGuard(message, { botAdmin: true }))) return;
    var code = await message.client.groupInviteCode(message.jid);
    await message.client.sendMessage(
      message.jid,
      {
        text: `https://chat.whatsapp.com/${code}`,
        detectLinks: true,
      },
      { detectLinks: true }
    );
  }
);
Module(
  {
    pattern: "revoke",
    fromMe: false,
    use: "group",
    desc: Lang.REVOKE_DESC,
    usage: Lang.REVOKE_REVOKES_RESETS_GROUP_INVITE,
  },
  async (message, match) => {
    if (!(await groupAdminGuard(message, { botAdmin: true }))) return;
    await message.client.groupRevokeInvite(message.jid);
    await message.send(Lang.REVOKED);
  }
);
Module(
  {
    pattern: "glock ?(.*)",
    fromMe: false,
    use: "group",
    desc: Lang.CHANGE_GROUP_SETTINGS_TO_ALLOW,
    usage: Lang.GLOCK_LOCKS_GROUP_SETTINGS,
  },
  async (message, match) => {
    if (!(await groupAdminGuard(message, { botAdmin: true }))) return;
    return await message.client.groupSettingUpdate(message.jid, "locked");
  }
);
Module(
  {
    pattern: "gunlock ?(.*)",
    fromMe: false,
    use: "group",
    desc: Lang.CHANGE_GROUP_SETTINGS_TO_ALLOW_2,
    usage: Lang.GUNLOCK_UNLOCKS_GROUP_SETTINGS,
  },
  async (message, match) => {
    if (!(await groupAdminGuard(message, { botAdmin: true }))) return;
    return await message.client.groupSettingUpdate(message.jid, "unlocked");
  }
);
Module(
  {
    pattern: "gname ?(.*)",
    fromMe: false,
    use: "group",
    desc: Lang.CHANGE_GROUP_SUBJECT,
    usage: Lang.GNAME_NEW_GROUP_NAME,
  },
  async (message, match) => {
    if (!(await groupAdminGuard(message))) return;
    let newName = match[1] || message.reply_message?.text;
    if (!newName) return await message.sendReply(Lang.NEED_TEXT);
    var { restrict } = await message.client.groupMetadata(message.jid);
    if (restrict && !(await isAdmin(message)))
      return await message.sendReply(Lang.NOT_ADMIN);
    return await message.client.groupUpdateSubject(
      message.jid,
      (match[1] || message.reply_message?.text).slice(0, 25)
    );
  }
);
Module(
  {
    pattern: "gdesc ?(.*)",
    fromMe: false,
    use: "group",
    desc: Lang.CHANGE_GROUP_DESCRIPTION,
    usage: Lang.GDESC_NEW_GROUP_DESCRIPTION_HERE,
  },
  async (message, match) => {
    if (!(await groupAdminGuard(message))) return;
    let newName = match[1] || message.reply_message?.text;
    if (!newName) return await message.sendReply(Lang.NEED_TEXT);
    var { restrict } = await message.client.groupMetadata(message.jid);
    if (restrict && !(await isAdmin(message)))
      return await message.sendReply(Lang.NOT_ADMIN);
    try {
      return await message.client.groupUpdateDescription(
        message.jid,
        (match[1] || message.reply_message?.text).slice(0, 512)
      );
    } catch {
      return await message.sendReply(Lang.FAILED_TO_CHANGE);
    }
  }
);
async function mayReadGroups(message, jids) {
  if (message.fromOwner) return true;
  const adminAccess =
    message.isGroup &&
    config.ADMIN_ACCESS &&
    (await isAdmin(message, message.sender));
  if (!adminAccess) return false;
  if (jids.some((jid) => jid !== message.jid)) {
    await message.sendReply(Lang.ONLY_THE_OWNER_CAN_LOOK);
    return false;
  }
  return true;
}

Module(
  {
    pattern: "common ?(.*)",
    fromMe: false,
    use: "group",
    desc: Lang.GET_COMMON_PARTICIPANTS_IN_TWO,
    usage: Lang.COMMON_JID1_JID2_COMMON_KICK,
  },
  async (message, match) => {
    const input = match[1]?.trim();
    const usage =
      Lang.NEED_JIDS_COMMON_JID1_JID2.replaceAll("{p}", helpPrefix());
    const kick = input?.match(/^kick(?:\s+(\S+))?$/i);
    if (kick) {
      if (!(await groupAdminGuard(message, { botAdmin: true }))) return;
      const other = kick[1];
      if (!other) return await message.sendReply(usage);
      if (!(await mayReadGroups(message, [other]))) return;
      const g1 = await message.client.groupMetadata(other);
      const g2 = await message.client.groupMetadata(message.jid);
      const common = g1.participants.filter(
        (member) =>
          g2.participants.some(({ id }) => id === member.id) &&
          !isProtected(member, message.client)
      );
      if (!common.length)
        return await message.sendReply(Lang.NO_COMMON_MEMBERS_TO_REMOVE);
      const jids = common.map((member) => member.id);
      let msg = Lang.REMOVING_COMMON_PARTICIPANTS_OF_COUNT.format(g1.subject, g2.subject, jids.length);
      for (const jid of jids) msg += "```@" + jid.split("@")[0] + "```\n";
      if (!startKick(message, jids, g2.subject))
        return await message.sendReply(
          Lang.A_KICK_IS_ALREADY_RUNNING.replaceAll("{p}", helpPrefix())
        );
      return await message.client.sendMessage(message.jid, {
        text: msg + Lang.STARTING_IN_5.replaceAll("{p}", helpPrefix()),
        mentions: jids,
      });
    }
    const co = input?.split(",").map((jid) => jid.trim());
    const valid = co?.length === 2 && co[0] && co[1];
    if (!(await mayReadGroups(message, valid ? co : []))) return;
    if (!valid) return await message.sendReply(usage);
    const g1 = await message.client.groupMetadata(co[0]);
    const g2 = await message.client.groupMetadata(co[1]);
    const common = g1.participants.filter(({ id: id1 }) =>
      g2.participants.some(({ id: id2 }) => id2 === id1)
    );
    let msg = Lang.COMMON_PARTICIPANTS_OF_COUNT.format(g1.subject, g2.subject, common.length);
    const jids = [];
    for (const s of common) {
      msg += "```@" + s.id.split("@")[0] + "```\n";
      jids.push(s.id);
    }
    await message.client.sendMessage(message.jid, {
      text: msg,
      mentions: jids,
    });
  }
);
Module(
  {
    pattern: "diff ?(.*)",
    fromMe: false,
    use: "utility",
    desc: Lang.GET_DIFFERENCE_OF_PARTICIPANTS_IN,
    usage: Lang.DIFF_JID1_JID2,
  },
  async (message, match) => {
    const co = match[1]?.split(",").map((jid) => jid.trim());
    const valid = co?.length === 2 && co[0] && co[1];
    if (!(await mayReadGroups(message, valid ? co : []))) return;
    if (!valid)
      return await message.sendReply(Lang.NEED_JIDS_DIFF_JID1_JID2.replaceAll("{p}", helpPrefix()));
    const g1 = (await message.client.groupMetadata(co[0])).participants;
    const g2 = (await message.client.groupMetadata(co[1])).participants;
    const only = g1.filter(
      ({ id: jid1 }) => !g2.some(({ id: jid2 }) => jid2 === jid1)
    );
    let msg = Lang.DIFFERENCE_OF_PARTICIPANTS_COUNT.format(only.length);
    for (const s of only) msg += "```" + s.id.split("@")[0] + "``` \n";
    return await message.sendReply(msg);
  }
);
Module(
  {
    pattern: "tag(all|admin)? ?(.*)?",
    fromMe: false,
    desc: Lang.TAGALL_DESC,
    use: "group",
    usage:
      Lang.TAG_TEXT_TAG_REPLY_TO,
  },
  async (message, match) => {
    const groupJidMatch = match[2]?.match(/(\d+@g\.us)/);
    if (groupJidMatch) {
      message.jid = groupJidMatch[1];
    } else if (!message.isGroup) {
      return await message.sendReply(Lang.GROUP_COMMAND);
    }
    const adminAccessValidated = config.ADMIN_ACCESS
      ? await isAdmin(message, message.sender)
      : false;
    if (!(message.fromOwner || adminAccessValidated)) return;
    let participants;
    try {
      const groupMetadata = await message.client.groupMetadata(message.jid);
      participants = groupMetadata.participants;
    } catch (error) {
      return await message.sendReply(
        Lang.ERROR_UNABLE_TO_FETCH_GROUP
      );
    }
    const isTagAdmin = match[1]?.includes("admin");
    const isTagAll = match[1]?.includes("all");
    const isReply = !!message.reply_message;
    const customText = match[2]?.trim();
    const hasCustomText = customText && !customText.match(/(\d+@g\.us)/);
    
    if (!isReply && !isTagAdmin && !isTagAll && !hasCustomText) {
      return await message.sendReply(
        Lang.TAG_WHAT_TAG_TEXT_HERE.replaceAll("{p}", helpPrefix())
      );
    }
    const targets = [];
    let msgText = "";
    for (let i = 0; i < participants.length; i++) {
      const p = participants[i];
      if (isTagAdmin && !p.admin) continue;
      targets.push(p.id.replace("c.us", "s.whatsapp.net"));
      msgText += `${targets.length}. @${p.id.split("@")[0]}\n`;
    }
    if (isReply) {
      await message.forwardMessage(message.jid, message.quoted,{detectLinks: true,contextInfo: {mentionedJid: targets, isForwarded: false}});
    } else if (hasCustomText) {
      await message.client.sendMessage(message.jid, {
        text: customText,
        mentions: targets,
      });
    } else {
      await message.client.sendMessage(message.jid, {
        text: "```" + msgText + "```",
        mentions: targets,
      });
    }
  }
);
Module(
  {
    pattern: "block ?(.*)",
    fromMe: true,
    use: "owner",
    desc: Lang.BLOCK_A_USER,
    usage: Lang.BLOCK_REPLY_TO_A_MESSAGE,
  },
  async (message, match) => {
    const user = message.isGroup
      ? message.mention?.[0] || message.reply_message?.jid
      : message.jid;
    if (!user)
      return await message.sendReply(Lang.REPLY_TO_A_USER_OR);
    await message.client.updateBlockStatus(user, "block");
  }
);
Module(
  {
    pattern: "join ?(.*)",
    fromMe: true,
    use: "owner",
    desc: Lang.JOIN_A_WHATSAPP_GROUP_USING,
    usage: Lang.JOIN_HTTPS_CHAT_WHATSAPP_COM,
  },
  async (message, match) => {
    let rgx =
      /^(?:https?:\/\/)?chat\.whatsapp\.com\/(?:invite\/)?([a-zA-Z0-9_-]{22})(?:\?.*)?$/;
    let matchResult = match[1] && match[1].match(rgx);
    if (!matchResult) return await message.sendReply(Lang.NEED_GROUP_LINK);
    let inviteCode = matchResult[1];
    await message.client.groupAcceptInvite(inviteCode);
  }
);
Module(
  {
    pattern: "unblock ?(.*)",
    fromMe: true,
    use: "owner",
    desc: Lang.UNBLOCK_A_USER,
    usage: Lang.UNBLOCK_REPLY_TO_A_MESSAGE,
  },
  async (message) => {
    const user = message.isGroup
      ? message.mention?.[0] || message.reply_message?.jid
      : message.jid;
    if (!user)
      return await message.sendReply(Lang.REPLY_TO_A_USER_OR);
    await message.client.updateBlockStatus(user, "unblock");
  }
);
Module(
  {
    pattern: "getjids ?(.*)",
    desc: Lang.GET_GROUP_JIDS_ALL_GROUPS,
    use: "utility",
    usage:
      Lang.GETJIDS_ALL_SHOWS_ALL_GROUP,
    fromMe: true,
  },
  async (message, match) => {
    const args = match[1]?.trim().split(" ") || [];
    const command = args[0]?.toLowerCase();
    if (!command || (command !== "all" && command !== "recent")) {
      return await message.sendReply(
        Lang.USAGE_GETJIDS_ALL_SHOW_ALL.replaceAll("{p}", helpPrefix())
      );
    }
    if (command === "all") {
      var allGroups = await message.client.groupFetchAllParticipating();
      var groups = Object.keys(allGroups);
      const recentChats = await fetchRecentChats(100);
      const dmChats = recentChats.filter((chat) => chat.type === "private");
      const totalChats = groups.length + dmChats.length;
      if (!totalChats) return await message.sendReply(Lang.NO_CHATS_FOUND);
      const chunkSize = 100;
      let totalMessages = Math.ceil(totalChats / chunkSize);
      let chatIndex = 0;
      for (let msgIndex = 0; msgIndex < totalMessages; msgIndex++) {
        const startIdx = msgIndex * chunkSize;
        const endIdx = Math.min(startIdx + chunkSize, totalChats);
        let _msg = Lang.ALL_CHAT_JIDS;
        if (totalMessages > 1) {
          _msg += Lang.PART_CHATS_OF.format(msgIndex + 1, totalMessages, startIdx + 1, endIdx, totalChats);
        }
        while (
          chatIndex < groups.length &&
          chatIndex - msgIndex * chunkSize < chunkSize
        ) {
          const jid = groups[chatIndex - msgIndex * chunkSize];
          if (!jid) break;
          const count = chatIndex + 1;
          const groupData = allGroups[jid];
          const groupName = groupData ? groupData.subject : Lang.UNKNOWN_GROUP;
          _msg += Lang.GROUP_JID.format(count, groupName, jid);
          chatIndex++;
          if (chatIndex >= startIdx + chunkSize) break;
        }
        const dmStartIndex = Math.max(0, startIdx - groups.length);
        const dmEndIndex = Math.min(dmChats.length, endIdx - groups.length);
        for (let i = dmStartIndex; i < dmEndIndex && chatIndex < endIdx; i++) {
          const dm = dmChats[i];
          const count = chatIndex + 1;
          const dmName = dm.name || Lang.UNKNOWN_NAME;
          _msg += Lang.PRIVATE_JID.format(count, dmName, dm.jid);
          chatIndex++;
        }
        await message.sendReply(_msg);
        if (msgIndex < totalMessages - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    } else if (command === "recent") {
      const limit = parseInt(args[1]) || 10;
      if (limit > 50) {
        return await message.sendReply(Lang.MAXIMUM_LIMIT_IS_50_CHATS);
      }
      const recentChats = await fetchRecentChats(limit);
      if (!recentChats.length) {
        return await message.sendReply(Lang.NO_RECENT_CHATS_FOUND);
      }
      let allGroups = {};
      try {
        allGroups = await message.client.groupFetchAllParticipating();
      } catch (error) {
        console.error("Error fetching group data:", error);
      }
      let _msg = Lang.RECENT_CHAT_JIDS_SHOWING_MOST.format(recentChats.length);
      for (let i = 0; i < recentChats.length; i++) {
        const chat = recentChats[i];
        const count = i + 1;
        const chatType = chat.type === "group" ? Lang.GROUP : Lang.PRIVATE;
        let chatName = chat.name || Lang.UNKNOWN_NAME;
        if (chat.type === "group" && allGroups[chat.jid]) {
          chatName =
            allGroups[chat.jid].subject || chat.name || Lang.UNKNOWN_GROUP;
        }
        const lastMessageTime = new Date(chat.lastMessageTime).toLocaleString();
        _msg += Lang.CHAT_LINE.format(count, chatType, chatName);
        _msg += Lang.JID.format(chat.jid);
        _msg += Lang.LAST_MESSAGE.format(lastMessageTime);
      }
      const chunkSize = 4000;
      if (_msg.length > chunkSize) {
        const chunks = [];
        let currentChunk = Lang.RECENT_CHAT_JIDS_SHOWING_MOST.format(recentChats.length);
        for (let i = 0; i < recentChats.length; i++) {
          const chat = recentChats[i];
          const count = i + 1;
          const chatType = chat.type === "group" ? Lang.GROUP : Lang.PRIVATE;
          let chatName = chat.name || Lang.UNKNOWN_NAME;
          if (chat.type === "group" && allGroups[chat.jid]) {
            chatName =
              allGroups[chat.jid].subject || chat.name || Lang.UNKNOWN_GROUP;
          }
          const lastMessageTime = new Date(
            chat.lastMessageTime
          ).toLocaleString();
          const chatInfo = Lang.JID_LAST_MESSAGE.format(count, chatType, chatName, chat.jid, lastMessageTime);
          if (currentChunk.length + chatInfo.length > chunkSize) {
            chunks.push(currentChunk);
            currentChunk = chatInfo;
          } else {
            currentChunk += chatInfo;
          }
        }
        if (currentChunk.trim()) {
          chunks.push(currentChunk);
        }
        for (let i = 0; i < chunks.length; i++) {
          await message.sendReply(chunks[i]);
          if (i < chunks.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
      } else {
        await message.sendReply(_msg);
      }
    }
  }
);
Module(
  {
    pattern: "pp ?(.*)",
    fromMe: true,
    use: "owner",
    desc: Lang.CHANGE_GET_PROFILE_PICTURE_FULL,
    usage:
      Lang.PP_REPLY_TO_IMAGE_TO,
  },
  async (message, match) => {
    if (message.reply_message && message.reply_message.image) {
      const image = await message.reply_message.download("buffer");
      const botJid = message.client.user?.id?.split(":")[0] + "@s.whatsapp.net";
      await message.client.setProfilePicture(botJid, image);
      return await message.sendReply(Lang.UPDATED_PROFILE_PIC);
    }
    if (message.reply_message && !message.reply_message.image) {
      try {
        var image = await message.client.profilePictureUrl(
          message.reply_message?.jid,
          "image"
        );
      } catch {
        return await message.sendReply(Lang.PROFILE_PIC_NOT_FOUND);
      }
      return await message.sendReply({ url: image }, "image");
    }
  }
);
Module(
  {
    pattern: "gpp ?(.*)",
    fromMe: false,
    use: "owner",
    desc: Lang.CHANGE_GET_GROUP_ICON_FULL,
    usage: Lang.GPP_REPLY_TO_IMAGE_TO,
  },
  async (message, match) => {
    if (!(await groupAdminGuard(message))) return;
    if (message.reply_message?.image) {
      if (!(await isAdmin(message)))
        return await message.sendReply(Lang.NOT_ADMIN);
      const image = await message.reply_message.download("buffer");
      await message.client.setProfilePicture(message.jid, image);
      return await message.sendReply(Lang.GROUP_ICON_UPDATED);
    }
    try {
      var image = await message.client.profilePictureUrl(message.jid, "image");
    } catch {
      return await message.sendReply(Lang.PROFILE_PIC_NOT_FOUND);
    }
    return await message.sendReply({ url: image }, "image");
  }
);

Module(
  {
    pattern: "gstatus ?(.*)",
    fromMe: false,
    use: "group",
    desc: Lang.POST_A_GROUP_STATUS_UPDATE,
    usage:
      Lang.GSTATUS_YOUR_TEXT_GSTATUS_REPLY,
  },
  async (message, match) => {
    const rawInput = (match[1] || "").trim();
    const quoted = message.reply_message;
    const jidMatch = rawInput.match(/(\d+(?:-\d+)?@g\.us|\d+@s\.whatsapp\.net|\d+@lid)/i);
    const hasTargetJid = !!jidMatch;

    if (!message.isGroup && !hasTargetJid) {
      return await message.sendReply(
        Lang.IN_DM_USE_GSTATUS_GROUP.replaceAll("{p}", helpPrefix())
      );
    }

    let adminAccesValidated = false;
    if (message.isGroup && config.ADMIN_ACCESS) {
      adminAccesValidated = await isAdmin(message, message.sender);
    }

    if (!(message.fromOwner || adminAccesValidated)) return;

    // var admin = await isAdmin(message);
    // if (!admin) return await message.sendReply(Lang.NOT_ADMIN);

    if (typeof message.sendGroupStatus !== "function") {
      return await message.sendReply(Lang.GROUP_STATUS_IS_NOT_SUPPORTED);
    }

    const targetJid = hasTargetJid ? jidMatch[1] : message.jid;
    const text = hasTargetJid ? rawInput.replace(jidMatch[0], "").trim() : rawInput;

    if (!targetJid.endsWith("@g.us")) {
      return await message.sendReply(Lang.TARGET_MUST_BE_A_VALID.replaceAll("{p}", helpPrefix()));
    }

    if (hasTargetJid && !quoted) {
      return await message.sendReply(Lang.REPLY_TO_A_MESSAGE_FIRST.replaceAll("{p}", helpPrefix()));
    }

    if (!quoted && !text) {
      return await message.sendReply(
        Lang.REPLY_TO_AN_IMAGE_VIDEO
      );
    }

    const sendGroupStatusToTarget = async (payload) => {
      const previousJid = message.jid;
      message.jid = targetJid;
      try {
        await message.sendGroupStatus(payload);
      } finally {
        message.jid = previousJid;
      }
    };

    const targetInfo = hasTargetJid ? Lang.TO.format(targetJid) : "";

    try {
      if (quoted?.image) {
        const buffer = await quoted.download("buffer");
        await sendGroupStatusToTarget({
          image: buffer,
          ...(text || quoted.caption
            ? { caption: text || quoted.caption }
            : {}),
        });
        return await message.react("✅");
      }

      if (quoted?.video) {
        const buffer = await quoted.download("buffer");
        await sendGroupStatusToTarget({
          video: buffer,
          ...(text || quoted.caption
            ? { caption: text || quoted.caption }
            : {}),
        });
        return await message.react("✅");
      }

      if (quoted?.audio) {
        const buffer = await quoted.download("buffer");
        await sendGroupStatusToTarget({
          audio: buffer,
          mimetype: quoted.mimetype || "audio/mp4",
        });
        return await message.react("✅");
      }

      if (quoted?.text || quoted?.message) {
        const quotedText = (quoted.text || quoted.message || "").trim();
        const finalText = (text || quotedText || "").trim();
        if (!finalText) {
          return await message.sendReply(
            Lang.UNSUPPORTED_REPLY_TYPE_USE_IMAGE
          );
        }
        await sendGroupStatusToTarget({ text: finalText });
        return await message.react("✅");
      }

      if (text) {
        await sendGroupStatusToTarget({ text });
        return await message.react("✅");
      }

      return await message.sendReply(
        Lang.UNSUPPORTED_REPLY_TYPE_USE_IMAGE_2
      );
    } catch (error) {
      return await message.sendReply(
        Lang.FAILED_TO_POST_GROUP_STATUS.format(error.message)
      );
    }
  }
);
