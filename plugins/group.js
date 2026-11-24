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
      ? `_Stopped. Removed ${removed}/${userIds.length}._`
      : `_Done. Removed ${removed}/${userIds.length}._`;
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
  minutes % 60 === 0 ? `${minutes / 60} hour(s)` : `${minutes} minute(s)`;

function cancelMuteTimer(key) {
  clearTimeout(muteTimers.get(key));
  muteTimers.delete(key);
}

const ADD_STATUS = {
  200: "was added",
  401: "has blocked this number",
  403: "could not be added directly (privacy settings), an invite is needed",
  408: "left recently and cannot be added yet",
  409: "is already in the group",
  500: "could not be added",
};

Module(
  {
    pattern: "clear ?(.*)",
    fromMe: true,
    desc: "Clear chat",
    use: "misc",
    usage: ".clear (clears the current chat)",
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
    return await message.send("_Chat cleared!_");
  }
);

Module(
  {
    pattern: "kick ?(.*)",
    fromMe: false,
    desc: Lang.KICK_DESC,
    use: "group",
    usage:
      ".kick @mention or reply\n.kick all (removes everyone except admins)\n.kick 91 (removes numbers starting with 91)\n.kick stop (stops a running kick)",
  },
  async (message, match) => {
    if (!(await groupAdminGuard(message, { botAdmin: true }))) return;
    const arg = match[1]?.trim().toLowerCase();
    if (arg === "stop") {
      const run = kickRuns.get(accountKey(message.jid));
      if (!run)
        return await message.sendReply("_No kick is running in this group._");
      run.stop = true;
      return await message.sendReply("_Stopping after the current member._");
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
        return await message.sendReply("_No members to remove._");
      const ids = candidates.map((member) => member.id);
      if (!startKick(message, ids, subject))
        return await message.sendReply(
          `_A kick is already running here. Use ${helpPrefix()}kick stop to cancel it._`
        );
      const who = arg === "all" ? "members" : `members starting with ${arg}`;
      return await message.send(
        `_❗ Removing *${ids.length}* ${who} of ${subject} in 5 seconds. Send ${helpPrefix()}kick stop to cancel. ❗_` +
          (skipped
            ? `\n_${skipped} members skipped (phone number unknown)._`
            : "")
      );
    }
    const user = message.mention?.[0] || message.reply_message?.jid;
    if (!user) return await message.sendReply(Lang.NEED_USER);
    if (isBot(user, message.client) || isOwner(user, message.client))
      return await message.sendReply("_I won't remove the bot or its owner._");
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
    warn: "You number might get banned, use with caution",
    use: "group",
    usage: ".add 919876543210",
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
        "_That does not look like a phone number._"
      );
    const [result] = await message.client.groupParticipantsUpdate(
      message.jid,
      [number + "@s.whatsapp.net"],
      "add"
    );
    const status = String(result?.status ?? "");
    return await message.sendReply(
      `_+${number} ${
        ADD_STATUS[status] ||
        `could not be added (status ${status || "unknown"})`
      }_`
    );
  }
);
Module(
  {
    pattern: "promote ?(.*)",
    fromMe: false,
    use: "group",
    desc: Lang.PROMOTE_DESC,
    usage: ".promote @mention or reply",
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
    usage: ".requests approve all or reject all",
    desc: "Get list of pending join requests",
  },
  async (message, match) => {
    if (!(await groupAdminGuard(message, { botAdmin: true }))) return;
    let approvalList = await message.client.groupRequestParticipantsList(
      message.jid
    );
    if (!approvalList.length)
      return await message.sendReply("_No pending requests!_");
    let approvalJids = approvalList.map((x) => x.jid);
    if (match[1]) {
      match = match[1].toLowerCase();
      switch (match) {
        case "approve all": {
          await message.sendReply(
            `_Approving ${approvalJids.length} participants._`
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
            `_Rejecting ${approvalJids.length} participants._`
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
            `_Invalid input_\n_Eg: ${helpPrefix()}requests approve all_\n_${helpPrefix()}requests reject all_`
          );
        }
      }
      return;
    }
    let msg =
      `*_Group join requests_*\n\n_(Use ${helpPrefix()}requests approve|reject all)_\n\n`;
    const requestType = (type_, requestor) => {
      switch (type_) {
        case "linked_group_join":
          return "community";
        case "invite_link":
          return "invite link";
        case "non_admin_add":
          return `added by +${requestor.split("@")[0]}`;
      }
    };
    for (let x in approvalList) {
      msg += `*_${parseInt(x) + 1}. @${
        approvalList[x].jid.split("@")[0]
      }_*\n  _• via: ${requestType(
        approvalList[x].request_method,
        approvalList[x].requestor
      )}_\n  _• at: ${new Date(
        parseInt(approvalList[x].request_time) * 1000
      ).toLocaleString()}_\n\n`;
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
    usage: ".leave (exits current group)",
    use: "group",
  },
  async (message, match) => {
    if (!message.isGroup)
      return await message.sendReply(
        "_Leave from where? This is a group command bruh!_"
      );
    return await message.client.groupLeave(message.jid);
  }
);
Module(
  {
    pattern: "quoted",
    fromMe: true,
    desc: "Sends replied message's replied message. Useful for recovering deleted messages.",
    usage: ".quoted (reply to a quoted message)",
    use: "group",
  },
  async (message, match) => {
    if (!message.reply_message?.id) {
      return await message.sendReply("_Reply to a message that quotes another message!_");
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
          "_The replied message doesn't contain a quoted message!_"
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
          "_Quoted message not found and no cached data available!_"
        );
      }
    } catch (error) {
      console.error("Error in quoted command:", error);
      return await message.sendReply("_Failed to load quoted message!_");
    }
  }
);

Module(
  {
    pattern: "demote ?(.*)",
    fromMe: false,
    use: "group",
    desc: Lang.DEMOTE_DESC,
    usage: ".demote @mention or reply",
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
      ".mute (mutes group indefinitely)\n.mute 1h (mutes for 1 hour)\n.mute 5m (mutes for 5 minutes)",
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
        `_Give a duration like 30m or 2h (up to 7 days), or no duration to mute until ${helpPrefix()}unmute_`
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
      `_Muted for ${describeMinutes(minutes)}. I will unmute then; if the bot restarts before that, use ${helpPrefix()}unmute._`
    );
  }
);
Module(
  {
    pattern: "unmute",
    use: "group",
    fromMe: false,
    desc: Lang.UNMUTE_DESC,
    usage: ".unmute (unmutes the group)",
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
    usage: ".jid (gets current chat jid)\n.jid (reply to get user jid)",
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
    usage: ".invite (generates group invite link)",
  },
  async (message) => {
    if (!(await groupAdminGuard(message, { botAdmin: true }))) return;
    var code = await message.client.groupInviteCode(message.jid);
    await message.client.sendMessage(
      message.jid,
      {
        text: "https://chat.whatsapp.com/" + code,
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
    usage: ".revoke (revokes/resets group invite link)",
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
    desc: "Change group settings to allow only admins to edit group's info!",
    usage: ".glock (locks group settings)",
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
    desc: "Change group settings to allow everyone to edit group's info!",
    usage: ".gunlock (unlocks group settings)",
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
    desc: "Change group subject",
    usage: ".gname New Group Name",
  },
  async (message, match) => {
    if (!(await groupAdminGuard(message))) return;
    let newName = match[1] || message.reply_message?.text;
    if (!newName) return await message.sendReply("_Need text!_");
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
    desc: "Change group description",
    usage: ".gdesc New group description here",
  },
  async (message, match) => {
    if (!(await groupAdminGuard(message))) return;
    let newName = match[1] || message.reply_message?.text;
    if (!newName) return await message.sendReply("_Need text!_");
    var { restrict } = await message.client.groupMetadata(message.jid);
    if (restrict && !(await isAdmin(message)))
      return await message.sendReply(Lang.NOT_ADMIN);
    try {
      return await message.client.groupUpdateDescription(
        message.jid,
        (match[1] || message.reply_message?.text).slice(0, 512)
      );
    } catch {
      return await message.sendReply("_Failed to change!_");
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
    await message.sendReply("_Only the owner can look at other groups._");
    return false;
  }
  return true;
}

Module(
  {
    pattern: "common ?(.*)",
    fromMe: false,
    use: "group",
    desc: "Get common participants in two groups, and kick using .common kick jid",
    usage: ".common jid1,jid2\n.common kick group_jid",
  },
  async (message, match) => {
    const input = match[1]?.trim();
    const usage =
      `_*Need jids*_\n_*${helpPrefix()}common jid1,jid2*_\n _OR_ \n_*${helpPrefix()}common kick group_jid*_`;
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
        return await message.sendReply("_No common members to remove._");
      const jids = common.map((member) => member.id);
      let msg = `_Removing common participants of:_ *${g1.subject}* & *${g2.subject}*\n_count: ${jids.length}_\n`;
      for (const jid of jids) msg += "```@" + jid.split("@")[0] + "```\n";
      if (!startKick(message, jids, g2.subject))
        return await message.sendReply(
          `_A kick is already running here. Use ${helpPrefix()}kick stop to cancel it._`
        );
      return await message.client.sendMessage(message.jid, {
        text: msg + `\n_Starting in 5 seconds. Send ${helpPrefix()}kick stop to cancel._`,
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
    let msg = `_*Common participants of:*_ *${g1.subject}* & *${g2.subject}*\n_count: ${common.length}_\n`;
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
    desc: "Get difference of participants in two groups",
    usage: ".diff jid1,jid2",
  },
  async (message, match) => {
    const co = match[1]?.split(",").map((jid) => jid.trim());
    const valid = co?.length === 2 && co[0] && co[1];
    if (!(await mayReadGroups(message, valid ? co : []))) return;
    if (!valid)
      return await message.sendReply(`_*Need jids*_\n_*${helpPrefix()}diff jid1,jid2*_`);
    const g1 = (await message.client.groupMetadata(co[0])).participants;
    const g2 = (await message.client.groupMetadata(co[1])).participants;
    const only = g1.filter(
      ({ id: jid1 }) => !g2.some(({ id: jid2 }) => jid2 === jid1)
    );
    let msg = "_*Difference of participants*_\n_count: " + only.length + "_\n";
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
      ".tag text\n.tag (reply to message)\n.tagall (tag everyone)\n.tagadmin (tag admins only)\n.tag 120363355307899193@g.us (tag in specific group)",
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
        "_Error: Unable to fetch group metadata. Please check the group ID._"
      );
    }
    const isTagAdmin = match[1]?.includes("admin");
    const isTagAll = match[1]?.includes("all");
    const isReply = !!message.reply_message;
    const customText = match[2]?.trim();
    const hasCustomText = customText && !customText.match(/(\d+@g\.us)/);
    
    if (!isReply && !isTagAdmin && !isTagAll && !hasCustomText) {
      return await message.sendReply(
        `_Tag what?_\n\n${helpPrefix()}tag \`<text here>\`\n${helpPrefix()}tag \`admin\`\n${helpPrefix()}tag \`all\`\n${helpPrefix()}tag \`(reply)\`\n${helpPrefix()}tag \`120363355307899193@g.us\``
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
    desc: "Block a user",
    usage: ".block (reply to a message)\n.block @mention",
  },
  async (message, match) => {
    const user = message.isGroup
      ? message.mention?.[0] || message.reply_message?.jid
      : message.jid;
    if (!user)
      return await message.sendReply("_Reply to a user or mention them._");
    await message.client.updateBlockStatus(user, "block");
  }
);
Module(
  {
    pattern: "join ?(.*)",
    fromMe: true,
    use: "owner",
    desc: "Join a WhatsApp group using invite link",
    usage: ".join https://chat.whatsapp.com/abcdef123456",
  },
  async (message, match) => {
    let rgx =
      /^(?:https?:\/\/)?chat\.whatsapp\.com\/(?:invite\/)?([a-zA-Z0-9_-]{22})(?:\?.*)?$/;
    let matchResult = match[1] && match[1].match(rgx);
    if (!matchResult) return await message.sendReply("_*Need group link*_");
    let inviteCode = matchResult[1];
    await message.client.groupAcceptInvite(inviteCode);
  }
);
Module(
  {
    pattern: "unblock ?(.*)",
    fromMe: true,
    use: "owner",
    desc: "Unblock a user",
    usage: ".unblock (reply to a message)\n.unblock @mention",
  },
  async (message) => {
    const user = message.isGroup
      ? message.mention?.[0] || message.reply_message?.jid
      : message.jid;
    if (!user)
      return await message.sendReply("_Reply to a user or mention them._");
    await message.client.updateBlockStatus(user, "unblock");
  }
);
Module(
  {
    pattern: "getjids ?(.*)",
    desc: "Get group JIDs - all groups or recent chats",
    use: "utility",
    usage:
      ".getjids all (shows all group JIDs)\n.getjids recent (shows recent chat JIDs)\n.getjids recent 15 (shows 15 recent chats)",
    fromMe: true,
  },
  async (message, match) => {
    const args = match[1]?.trim().split(" ") || [];
    const command = args[0]?.toLowerCase();
    if (!command || (command !== "all" && command !== "recent")) {
      return await message.sendReply(
        "*Usage:*\n" +
          `• \`${helpPrefix()}getjids all\` - Show all group JIDs\n` +
          `• \`${helpPrefix()}getjids recent\` - Show recent chat JIDs (default 10)\n` +
          `• \`${helpPrefix()}getjids recent 15\` - Show 15 recent chat JIDs`
      );
    }
    if (command === "all") {
      var allGroups = await message.client.groupFetchAllParticipating();
      var groups = Object.keys(allGroups);
      const recentChats = await fetchRecentChats(100);
      const dmChats = recentChats.filter((chat) => chat.type === "private");
      const totalChats = groups.length + dmChats.length;
      if (!totalChats) return await message.sendReply("_No chats found!_");
      const chunkSize = 100;
      let totalMessages = Math.ceil(totalChats / chunkSize);
      let chatIndex = 0;
      for (let msgIndex = 0; msgIndex < totalMessages; msgIndex++) {
        const startIdx = msgIndex * chunkSize;
        const endIdx = Math.min(startIdx + chunkSize, totalChats);
        let _msg = `*All Chat JIDs*\n`;
        if (totalMessages > 1) {
          _msg += `Part ${msgIndex + 1}/${totalMessages}: Chats ${
            startIdx + 1
          }-${endIdx} of ${totalChats}\n\n`;
        }
        while (
          chatIndex < groups.length &&
          chatIndex - msgIndex * chunkSize < chunkSize
        ) {
          const jid = groups[chatIndex - msgIndex * chunkSize];
          if (!jid) break;
          const count = chatIndex + 1;
          const groupData = allGroups[jid];
          const groupName = groupData ? groupData.subject : "Unknown Group";
          _msg += `_*${count}. 👥 Group:*_ \`${groupName}\`\n_JID:_ \`${jid}\`\n\n`;
          chatIndex++;
          if (chatIndex >= startIdx + chunkSize) break;
        }
        const dmStartIndex = Math.max(0, startIdx - groups.length);
        const dmEndIndex = Math.min(dmChats.length, endIdx - groups.length);
        for (let i = dmStartIndex; i < dmEndIndex && chatIndex < endIdx; i++) {
          const dm = dmChats[i];
          const count = chatIndex + 1;
          const dmName = dm.name || "Unknown";
          _msg += `_*${count}. 💬 Private*_: \`${dmName}\`\n_JID:_ \`${dm.jid}\`\n\n`;
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
        return await message.sendReply("_*Maximum limit is 50 chats!*_");
      }
      const recentChats = await fetchRecentChats(limit);
      if (!recentChats.length) {
        return await message.sendReply("_No recent chats found!_");
      }
      let allGroups = {};
      try {
        allGroups = await message.client.groupFetchAllParticipating();
      } catch (error) {
        console.error("Error fetching group data:", error);
      }
      let _msg = `*Recent Chat JIDs*\n_Showing ${recentChats.length} most recent chats_\n\n`;
      for (let i = 0; i < recentChats.length; i++) {
        const chat = recentChats[i];
        const count = i + 1;
        const chatType = chat.type === "group" ? "👥 Group" : "💬 Private";
        let chatName = chat.name || "Unknown";
        if (chat.type === "group" && allGroups[chat.jid]) {
          chatName =
            allGroups[chat.jid].subject || chat.name || "Unknown Group";
        }
        const lastMessageTime = new Date(chat.lastMessageTime).toLocaleString();
        _msg += `_*${count}. ${chatType}:*_ \`${chatName}\`\n`;
        _msg += `_JID:_ \`${chat.jid}\`\n`;
        _msg += `_Last Message:_ ${lastMessageTime}\n\n`;
      }
      const chunkSize = 4000;
      if (_msg.length > chunkSize) {
        const chunks = [];
        let currentChunk = `*Recent Chat JIDs*\n_Showing ${recentChats.length} most recent chats_\n\n`;
        for (let i = 0; i < recentChats.length; i++) {
          const chat = recentChats[i];
          const count = i + 1;
          const chatType = chat.type === "group" ? "👥 Group" : "💬 Private";
          let chatName = chat.name || "Unknown";
          if (chat.type === "group" && allGroups[chat.jid]) {
            chatName =
              allGroups[chat.jid].subject || chat.name || "Unknown Group";
          }
          const lastMessageTime = new Date(
            chat.lastMessageTime
          ).toLocaleString();
          const chatInfo = `_*${count}. ${chatType}:*_ \`${chatName}\`\n_JID:_ \`${chat.jid}\`\n_Last Message:_ ${lastMessageTime}\n\n`;
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
    desc: "Change/Get profile picture (full screen supported) with replied message",
    usage:
      ".pp (reply to image to set profile pic)\n.pp (reply to user to get their profile pic)",
  },
  async (message, match) => {
    if (message.reply_message && message.reply_message.image) {
      const image = await message.reply_message.download("buffer");
      const botJid = message.client.user?.id?.split(":")[0] + "@s.whatsapp.net";
      await message.client.setProfilePicture(botJid, image);
      return await message.sendReply("_*Updated profile pic ✅*_");
    }
    if (message.reply_message && !message.reply_message.image) {
      try {
        var image = await message.client.profilePictureUrl(
          message.reply_message?.jid,
          "image"
        );
      } catch {
        return await message.sendReply("_Profile pic not found!_");
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
    desc: "Change/Get group icon (full screen supported) with replied message",
    usage: ".gpp (reply to image to set group icon)",
  },
  async (message, match) => {
    if (!(await groupAdminGuard(message))) return;
    if (message.reply_message?.image) {
      if (!(await isAdmin(message)))
        return await message.sendReply(Lang.NOT_ADMIN);
      const image = await message.reply_message.download("buffer");
      await message.client.setProfilePicture(message.jid, image);
      return await message.sendReply("_*Group icon updated ✅*_");
    }
    try {
      var image = await message.client.profilePictureUrl(message.jid, "image");
    } catch {
      return await message.sendReply("_Profile pic not found!_");
    }
    return await message.sendReply({ url: image }, "image");
  }
);

Module(
  {
    pattern: "gstatus ?(.*)",
    fromMe: false,
    use: "group",
    desc: "Post a group status update (text/image/video/audio)",
    usage:
      ".gstatus your text\n.gstatus (reply to image/video/audio)\n.gstatus your caption (reply to image/video)\n.gstatus 120363xxxx@g.us (reply to a message in DM or group)",
  },
  async (message, match) => {
    const rawInput = (match[1] || "").trim();
    const quoted = message.reply_message;
    const jidMatch = rawInput.match(/(\d+(?:-\d+)?@g\.us|\d+@s\.whatsapp\.net|\d+@lid)/i);
    const hasTargetJid = !!jidMatch;

    if (!message.isGroup && !hasTargetJid) {
      return await message.sendReply(
        `_In DM, use ${helpPrefix()}gstatus <group_jid> and reply to a message._`
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
      return await message.sendReply("_Group status is not supported in this build._");
    }

    const targetJid = hasTargetJid ? jidMatch[1] : message.jid;
    const text = hasTargetJid ? rawInput.replace(jidMatch[0], "").trim() : rawInput;

    if (!targetJid.endsWith("@g.us")) {
      return await message.sendReply(`_Target must be a valid group JID (..@g.us)._\n_Example: ${helpPrefix()}gstatus 120363xxxx@g.us (reply to a message)_`);
    }

    if (hasTargetJid && !quoted) {
      return await message.sendReply(`_Reply to a message first, then use ${helpPrefix()}gstatus <jid>._`);
    }

    if (!quoted && !text) {
      return await message.sendReply(
        "_Reply to an image/video/audio or provide text to post group status._"
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

    const targetInfo = hasTargetJid ? ` to ${targetJid}` : "";

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
            "_Unsupported reply type. Use image, video, audio, or a text message._"
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
        "_Unsupported reply type. Use image, video, audio, or text._"
      );
    } catch (error) {
      return await message.sendReply(
        `_Failed to post group status: ${error.message}_`
      );
    }
  }
);
