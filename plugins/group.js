const { getString } = require("./utils/lang");
const Lang = getString("group");
const { loadBaileys } = require("../core/helpers");
const baileysPromise = loadBaileys()
  .then((baileys) => {
    ({ delay } = baileys);
  })
  .catch((err) => {
    console.error("Failed to load baileys:", err.message);
    process.exit(1);
  });
const { isAdmin, isNumeric, mentionjid } = require("./utils");
const { ADMIN_ACCESS, HANDLERS, MODE } = require("../config");
const { Module } = require("../main");
const {
  fetchFromStore,
  getFullMessage,
  fetchRecentChats,
} = require("../core/store");
var handler = HANDLERS !== "false" ? HANDLERS.split("")[0] : "";

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
      ".kick @mention or reply\n.kick all (removes everyone)\n.kick 91 (removes numbers starting with 91)",
  },
  async (message, match) => {
    if (!message.isGroup) return await message.sendReply(Lang.GROUP_COMMAND);
    let adminAccesValidated = ADMIN_ACCESS
      ? await isAdmin(message, message.sender)
      : false;
    if (message.fromOwner || adminAccesValidated) {
      var { participants, subject } = await message.client.groupMetadata(
        message.jid
      );
      if (match[1]) {
        if (match[1] === "all") {
          var admin = await isAdmin(message);
          if (!admin) return await message.sendReply(Lang.NOT_ADMIN);
          let users = participants.filter((member) => !member.admin);
          await message.send(
            `_❗❗ Kicking *every* members of ${subject}. Restart bot immediately to kill this process ❗❗_\n_*You have 5 seconds left*_`
          );
          await new Promise((r) => setTimeout(r, 5000));
          for (let member of users) {
            await new Promise((r) => setTimeout(r, 1000));
            await message.client.groupParticipantsUpdate(
              message.jid,
              [member.id],
              "remove"
            );
          }
          return;
        }
        if (isNumeric(match[1])) {
          var admin = await isAdmin(message);
          if (!admin) return await message.sendReply(Lang.NOT_ADMIN);
          let users = participants.filter(
            (member) => member.id.startsWith(match[1]) && !member.admin
          );
          await message.send(
            `_❗❗ Kicking *${users.length}* members starting with number *${match[1]}*. Restart bot immediately to kill this process ❗❗_\n_*You have 5 seconds left*_`
          );
          await new Promise((r) => setTimeout(r, 5000));
          for (let member of users) {
            await new Promise((r) => setTimeout(r, 1000));
            await message.client.groupParticipantsUpdate(
              message.jid,
              [member.id],
              "remove"
            );
          }
          return;
        }
      }
      const user = message.mention?.[0] || message.reply_message?.jid;
      if (!user) return await message.sendReply(Lang.NEED_USER);
      var admin = await isAdmin(message);
      if (!admin) return await message.sendReply(Lang.NOT_ADMIN);
      await message.client.sendMessage(message.jid, {
        text: mentionjid(user) + Lang.KICKED,
        mentions: [user],
      });
      await message.client.groupParticipantsUpdate(
        message.jid,
        [user],
        "remove"
      );
    }
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
    if (!message.isGroup) return await message.sendReply(Lang.GROUP_COMMAND);
    var init = match[1] || message.reply_message?.jid.split("@")[0];
    if (!init) return await message.sendReply(Lang.NEED_USER);
    var admin = await isAdmin(message);
    if (!admin) return await message.sendReply(Lang.NOT_ADMIN);
    var initt = init.split(" ").join("");
    var user = initt
      .replace(/\+/g, "")
      .replace(" ", "")
      .replace(" ", "")
      .replace(" ", "")
      .replace(" ", "")
      .replace(/\(/g, "")
      .replace(/\)/g, "")
      .replace(/-/g, "");
    await message.client.groupAdd(user, message);
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
    let adminAccesValidated = ADMIN_ACCESS
      ? await isAdmin(message, message.sender)
      : false;
    if (message.fromOwner || adminAccesValidated) {
      const user = message.mention?.[0] || message.reply_message?.jid;
      if (!user) return await message.sendReply(Lang.NEED_USER);
      if (!message.isGroup) return await message.sendReply(Lang.GROUP_COMMAND);
      var admin = await isAdmin(message);
      if (!admin) return await message.sendReply(Lang.NOT_ADMIN);
      await message.client.sendMessage(message.jid, {
        text: mentionjid(user) + Lang.PROMOTED,
        mentions: [user],
      });
      await message.client.groupParticipantsUpdate(
        message.jid,
        [user],
        "promote"
      );
    }
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
    if (!message.isGroup) return await message.sendReply(Lang.GROUP_COMMAND);
    let adminAccesValidated = ADMIN_ACCESS
      ? await isAdmin(message, message.sender)
      : false;
    if (message.fromOwner || adminAccesValidated) {
      var admin = await isAdmin(message);
      if (!admin) return await message.sendReply(Lang.NOT_ADMIN);
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
              await delay(900);
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
              await delay(900);
            }
            break;
          }
          default: {
            return await message.sendReply(
              "_Invalid input_\n_Eg: .requests approve all_\n_.requests reject all_"
            );
          }
        }
        return;
      }
      let msg =
        "*_Group join requests_*\n\n_(Use .requests approve|reject all)_\n\n";
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
    try {
      const repliedMessage = await getFullMessage(
        message.reply_message.id + "_"
      );
      if (!repliedMessage.found) {
        return await message.sendReply(
          "_Original message not found in database!_"
        );
      }
      const messageData = repliedMessage.messageData;
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
    if (!message.isGroup) return await message.sendReply(Lang.GROUP_COMMAND);
    let adminAccesValidated = ADMIN_ACCESS
      ? await isAdmin(message, message.sender)
      : false;
    if (message.fromOwner || adminAccesValidated) {
      const user = message.mention?.[0] || message.reply_message?.jid;
      if (!user) return await message.sendReply(Lang.NEED_USER);
      var admin = await isAdmin(message);
      if (!admin) return await message.sendReply(Lang.NOT_ADMIN);
      await message.client.sendMessage(message.jid, {
        text: mentionjid(user) + Lang.DEMOTED,
        mentions: [user],
      });
      await message.client.groupParticipantsUpdate(
        message.jid,
        [message.reply_message?.jid],
        "demote"
      );
    }
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
    if (!message.isGroup) return await message.sendReply(Lang.GROUP_COMMAND);
    let adminAccesValidated = ADMIN_ACCESS
      ? await isAdmin(message, message.sender)
      : false;
    if (message.fromOwner || adminAccesValidated) {
      var admin = await isAdmin(message);
      if (!admin) return await message.sendReply(Lang.NOT_ADMIN);
      if (match[1]) {
        const h2m = function (h) {
          return 1000 * 60 * 60 * h;
        };
        const m2m = function (m) {
          return 1000 * 60 * m;
        };
        let duration = match[1].endsWith("h")
          ? h2m(match[1].match(/\d+/)[0])
          : m2m(match[1].match(/\d+/)[0]);
        match = match[1].endsWith("h") ? match[1] + "ours" : match[1] + "mins";
        await message.client.groupSettingUpdate(message.jid, "announcement");
        await message.send(`_Muted for ${match}_`);
        await require("timers/promises").setTimeout(duration);
        return await message.client.groupSettingUpdate(
          message.jid,
          "not_announcement"
        );
        await message.send(Lang.UNMUTED);
      }
      await message.client.groupSettingUpdate(message.jid, "announcement");
      await message.send(Lang.MUTED);
    }
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
    if (!message.isGroup) return await message.sendReply(Lang.GROUP_COMMAND);
    let adminAccesValidated = ADMIN_ACCESS
      ? await isAdmin(message, message.sender)
      : false;
    if (message.fromOwner || adminAccesValidated) {
      var admin = await isAdmin(message);
      if (!admin) return await message.sendReply(Lang.NOT_ADMIN);
      await message.client.groupSettingUpdate(message.jid, "not_announcement");
      await message.send(Lang.UNMUTED);
    }
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
        ADMIN_ACCESS && message.isGroup
          ? await isAdmin(message, message.sender)
          : false;
      if (message.fromOwner || adminAccesValidated) {
        var jid = message.reply_message?.jid || message.jid;
        await message.sendReply(jid);
      }
    } else {
      if (MODE !== "public" && !message.fromOwner) return;
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
    if (!message.isGroup) return await message.sendReply(Lang.GROUP_COMMAND);
    let adminAccesValidated = ADMIN_ACCESS
      ? await isAdmin(message, message.sender)
      : false;
    if (message.fromOwner || adminAccesValidated) {
      var admin = await isAdmin(message);
      if (!admin) return await message.sendReply(Lang.NOT_ADMIN);
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
    if (!message.isGroup) return await message.sendReply(Lang.GROUP_COMMAND);
    let adminAccesValidated = ADMIN_ACCESS
      ? await isAdmin(message, message.sender)
      : false;
    if (message.fromOwner || adminAccesValidated) {
      var admin = await isAdmin(message);
      if (!admin) return await message.sendReply(Lang.NOT_ADMIN);
      await message.client.groupRevokeInvite(message.jid);
      await message.send(Lang.REVOKED);
    }
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
    if (!message.isGroup) return await message.sendReply(Lang.GROUP_COMMAND);
    let adminAccesValidated = ADMIN_ACCESS
      ? await isAdmin(message, message.sender)
      : false;
    if (message.fromOwner || adminAccesValidated) {
      if (!(await isAdmin(message)))
        return await message.sendReply(Lang.NOT_ADMIN);
      return await message.client.groupSettingUpdate(message.jid, "locked");
    }
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
    if (!message.isGroup) return await message.sendReply(Lang.GROUP_COMMAND);
    let adminAccesValidated = ADMIN_ACCESS
      ? await isAdmin(message, message.sender)
      : false;
    if (message.fromOwner || adminAccesValidated) {
      if (!(await isAdmin(message)))
        return await message.sendReply(Lang.NOT_ADMIN);
      return await message.client.groupSettingUpdate(message.jid, "unlocked");
    }
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
    if (!message.isGroup) return await message.sendReply(Lang.GROUP_COMMAND);
    let adminAccesValidated = ADMIN_ACCESS
      ? await isAdmin(message, message.sender)
      : false;
    if (message.fromOwner || adminAccesValidated) {
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
    if (!message.isGroup) return await message.sendReply(Lang.GROUP_COMMAND);
    let adminAccesValidated = ADMIN_ACCESS
      ? await isAdmin(message, message.sender)
      : false;
    if (message.fromOwner || adminAccesValidated) {
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
  }
);
Module(
  {
    pattern: "common ?(.*)",
    fromMe: false,
    use: "group",
    desc: "Get common participants in two groups, and kick using .common kick jid",
    usage: ".common jid1,jid2\n.common kick group_jid",
  },
  async (message, match) => {
    let adminAccesValidated = ADMIN_ACCESS
      ? await isAdmin(message, message.sender)
      : false;
    if (message.fromOwner || adminAccesValidated) {
      if (!match[1])
        return await message.sendReply(
          "_*Need jids*_\n_*.common jid1,jid2*_\n _OR_ \n_*.common kick group_jid*_"
        );
      if (match[1].includes("kick")) {
        var co = match[1].split(" ")[1];
        var g1 = await message.client.groupMetadata(co);
        var g2 = await message.client.groupMetadata(message.jid);
        var common = g1.participants.filter(({ id: id1 }) =>
          g2.participants.some(({ id: id2 }) => id2 === id1)
        );
        var jids = [];
        var msg = `_Kicking common participants of:_ *${g1.subject}* & *${g2.subject}*\n_count: ${common.length}_\n`;
        common
          .map((e) => e.id)
          .filter((e) => !e.includes(message.client.user?.id?.split(":")[0]))
          .map(async (s) => {
            msg += "```@" + s.split("@")[0] + "```\n";
            jids.push(s);
          });
        await message.client.sendMessage(message.jid, {
          text: msg,
          mentions: jids,
        });
        for (let user of jids) {
          await new Promise((r) => setTimeout(r, 1000));
          await message.client.groupParticipantsUpdate(
            message.jid,
            [user],
            "remove"
          );
        }
        return;
      }
      var co = match[1].split(",");
      var g1 = await message.client.groupMetadata(co[0]);
      var g2 = await message.client.groupMetadata(co[1]);
      var common = g1.participants.filter(({ id: id1 }) =>
        g2.participants.some(({ id: id2 }) => id2 === id1)
      );
      var msg = `_*Common participants of:*_ *${g1.subject}* & *${g2.subject}*\n_count: ${common.length}_\n`;
      var jids = [];
      common.map(async (s) => {
        msg += "```@" + s.id.split("@")[0] + "```\n";
        jids.push(s.id);
      });
      await message.client.sendMessage(message.jid, {
        text: msg,
        mentions: jids,
      });
    }
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
    let adminAccesValidated = ADMIN_ACCESS
      ? await isAdmin(message, message.sender)
      : false;
    if (message.fromOwner || adminAccesValidated) {
      if (!match[1])
        return await message.sendReply("_*Need jids*_\n_*.diff jid1,jid2*_");
      var co = match[1].split(",");
      var g1 = (await message.client.groupMetadata(co[0])).participants;
      var g2 = (await message.client.groupMetadata(co[1])).participants;
      var common = g1.filter(
        ({ id: jid1 }) => !g2.some(({ id: jid2 }) => jid2 === jid1)
      );
      var msg =
        "_*Difference of participants*_\n_count: " + common.length + "_\n";
      common.map(async (s) => {
        msg += "```" + s.id.split("@")[0] + "``` \n";
      });
      return await message.sendReply(msg);
    }
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
    const adminAccessValidated = ADMIN_ACCESS
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
        `_Tag what?_\n\n${handler}tag \`<text here>\`\n${handler}tag \`admin\`\n${handler}tag \`all\`\n${handler}tag \`(reply)\`\n${handler}tag \`120363355307899193@g.us\``
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
    var isGroup = message.jid.endsWith("@g.us");
    var user = message.jid;
    if (isGroup) user = message.mention?.[0] || message.reply_message?.jid;
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
    var isGroup = message.jid.endsWith("@g.us");
    if (!isGroup) return;
    var user = message.mention?.[0] || message.reply_message?.jid;
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
          "• `.getjids all` - Show all group JIDs\n" +
          "• `.getjids recent` - Show recent chat JIDs (default 10)\n" +
          "• `.getjids recent 15` - Show 15 recent chat JIDs"
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
      var image = await message.reply_message.download();
      const botJid = message.client.user?.id?.split(":")[0] + "@s.whatsapp.net";
      await message.client.setProfilePicture(botJid, {
        url: image,
      });
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
    let adminAccesValidated = ADMIN_ACCESS
      ? await isAdmin(message, message.sender)
      : false;
    if (message.fromOwner || adminAccesValidated) {
      if (message.reply_message && message.reply_message.image) {
        var image = await message.reply_message.download();
        await message.client.setProfilePicture(message.jid, { url: image });
        return await message.sendReply("_*Group icon updated ✅*_");
      }
      if (!message.reply_message.image) {
        try {
          var image = await message.client.profilePictureUrl(
            message.jid,
            "image"
          );
        } catch {
          return await message.sendReply("_Profile pic not found!_");
        }
        return await message.sendReply({ url: image }, "image");
      }
    }
  }
);
