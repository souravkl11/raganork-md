const {
  isAdmin,
  isFake,
  antifake,
  pdm,

  antipromote,
  antidemote,
  welcome,
  goodbye,
  groupAdminGuard,
} = require("./utils");
const { automute, autounmute, stickcmd } = require("./utils/db/schedulers");
const {
  parseWelcomeMessage,
  sendWelcomeMessage,
} = require("./utils/welcome-parser");

async function isSuperAdmin(message, user = message.client.user.id) {
  var metadata = await message.client.groupMetadata(message.jid);
  let superadmin = metadata.participants.filter((v) => v.admin == "superadmin");
  superadmin = superadmin.length ? superadmin[0].id == user : false;
  return superadmin;
}
const { Module } = require("../main");
const config = require("../config");
const { helpPrefix } = require("../core/plugins/registry");
const { isBot } = require("../core/identity");
const { isSudo } = require("../core/sudo");
const { getString } = require("./utils/lang");
const Lang = getString("group_updates");

function parseTime(input) {
  const m = String(input)
    .trim()
    .match(/^([01]?\d|2[0-3])[\s:]([0-5]\d)$/);
  return m ? `${m[1].padStart(2, "0")} ${m[2]}` : null;
}

function tConvert(time) {
  time = time.toString().match(/^([01]\d|2[0-3])( )([0-5]\d)(:[0-5]\d)?$/) || [
    time,
  ];
  if (time.length > 1) {
    time = time.slice(1);
    time[5] = +time[0] < 12 ? " AM" : " PM";
    time[0] = +time[0] % 12 || 12;
  }
  return time.join("").replace(" ", ":");
}

async function extractData(message) {
  return message.quoted.message.stickerMessage.fileSha256.toString();
}
Module(
  {
    pattern: "stickcmd ?(.*)",
    fromMe: true,
    desc: Lang.STICKCMD_DESC,
    usage: ".stickcmd .kick",
    warn: Lang.STICKCMD_WARN,
    use: "utility",
  },
  async (message, match) => {
    if (!match[1] || !message.reply_message || !message.reply_message.sticker)
      return await message.sendReply(
        Lang.STICKCMD_NEED.format(helpPrefix())
      );
    try {
      await stickcmd.set(match[1], await extractData(message));
    } catch {
      return await message.sendReply(Lang.FAILED);
    }
    await message.client.sendMessage(
      message.jid,
      {
        text: Lang.STICKED.format(match[1]),
      },
      {
        quoted: message.quoted,
      }
    );
  }
);

Module(
  {
    pattern: "unstick ?(.*)",
    fromMe: true,
    desc: Lang.UNSTICK_DESC,
    usage: ".unstick kick",
    use: "utility",
  },
  async (message, match) => {
    if (message.reply_message && message.reply_message.sticker) {
      let deleted = await stickcmd.delete(await extractData(message), "file");
      if (deleted)
        return await message.client.sendMessage(
          message.jid,
          {
            text: Lang.UNSTICKED,
          },
          {
            quoted: message.quoted,
          }
        );
      if (!deleted && match[1]) {
        var delete_again = await stickcmd.delete(match[1], "command");
        if (delete_again)
          return await message.sendReply(
            Lang.UNSTICKED_CMD.format(match[1])
          );
        if (!delete_again)
          return await message.sendReply(Lang.NO_STICKER_CMD);
      }
      if (!deleted && !match[1])
        return await message.send(Lang.NO_STICKER);
    } else if (match[1] && !message.reply_message) {
      let deleted = await stickcmd.delete(match[1], "command");
      if (deleted)
        return await message.sendReply(
          Lang.UNSTICKED_CMD_OK.format(match[1])
        );
      if (!deleted)
        return await message.sendReply(Lang.NO_CMD);
    } else
      return await message.sendReply(
        Lang.UNSTICK_NEED.format(helpPrefix())
      );
  }
);

Module(
  {
    pattern: "getstick ?(.*)",
    fromMe: true,
    desc: Lang.GETSTICK_DESC,
    use: "utility",
  },
  async (message, match) => {
    var all = await stickcmd.get();
    var commands = all.map((element) => element.dataValues.command);
    var msg = commands.join("_\n_");
    await message.sendReply(Lang.STICKIFIED.format(msg));
  }
);

Module(
  {
    pattern: "automute ?(.*)",
    fromMe: false,
    warn: Lang.IST_WARN,
    use: "group",
  },
  async (message, match) => {
    if (!(await groupAdminGuard(message))) return;
    const input = match[1]?.trim().toLowerCase();
    if (!input)
      return await message.sendReply(
        Lang.AUTOMUTE_FORMAT.replaceAll("{p}", helpPrefix())
      );
    if (input === "off") {
      await automute.delete(message.jid);
      return await message.sendReply(
        Lang.AUTOMUTE_OFF
      );
    }
    const time = parseTime(input);
    if (!time)
      return await message.sendReply(
        Lang.AUTOMUTE_BAD_TIME.replaceAll("{p}", helpPrefix())
      );
    var admin = await isAdmin(message);
    if (!admin) return await message.sendReply(Lang.NOT_ADMIN);
    await automute.set(message.jid, time);
    await message.sendReply(Lang.AUTOMUTE_SET.format(tConvert(time)));
  }
);

Module(
  {
    pattern: "autounmute ?(.*)",
    fromMe: false,
    warn: Lang.IST_WARN,
    use: "group",
  },
  async (message, match) => {
    if (!(await groupAdminGuard(message))) return;
    const input = match[1]?.trim().toLowerCase();
    if (!input)
      return await message.sendReply(
        Lang.AUTOUNMUTE_FORMAT.replaceAll("{p}", helpPrefix())
      );
    if (input === "off") {
      await autounmute.delete(message.jid);
      return await message.sendReply(
        Lang.AUTOUNMUTE_OFF
      );
    }
    const time = parseTime(input);
    if (!time)
      return await message.sendReply(
        Lang.AUTOUNMUTE_BAD_TIME.replaceAll("{p}", helpPrefix())
      );
    var admin = await isAdmin(message);
    if (!admin) return await message.sendReply(Lang.NOT_ADMIN_BOLD);
    await autounmute.set(message.jid, time);
    await message.sendReply(Lang.AUTOUNMUTE_SET.format(tConvert(time)));
  }
);

Module(
  {
    pattern: "getmute ?(.*)",
    fromMe: false,
    use: "group",
  },
  async (message, match) => {
    const adminAccess =
      message.isGroup &&
      config.ADMIN_ACCESS &&
      (await isAdmin(message, message.sender));
    if (!message.fromOwner && !adminAccess) return;
    let mute = await automute.get();
    const unmute = await autounmute.get();
    if (!message.fromOwner) mute = mute.filter((m) => m.chat === message.jid);
    let msg = "";
    for (const [index, row] of mute.entries()) {
      const temp = unmute.find((element) => element.chat === row.chat);
      let subject = Lang.UNKNOWN_GROUP;
      try {
        subject = (await message.client.groupMetadata(row.chat)).subject;
      } catch {}
      msg += Lang.MUTE_ITEM.format(index + 1, subject, tConvert(row.time), tConvert(temp?.time || Lang.NOT_SET));
    }
    if (!msg) return await message.sendReply(Lang.NO_MUTES);
    await message.sendReply(Lang.MUTES_HEADER + msg);
  }
);

Module(
  {
    pattern: "antifake ?(.*)",
    fromMe: false,
    use: "group",
  },
  async (message, match) => {
    if (!(await groupAdminGuard(message))) return;
    const input = match[1]?.trim().toLowerCase();
    if (input === "on") {
      if (!(await isAdmin(message)))
        return await message.sendReply(Lang.NOT_ADMIN_EXCL);
      await antifake.set(message.jid);
      return await message.sendReply(Lang.ANTIFAKE_ON);
    }
    if (input === "allow") {
      return await message.sendReply(
        Lang.ANTIFAKE_ALLOWED.format(config.ALLOWED)
      );
    }
    if (input === "off") {
      await antifake.delete(message.jid);
      return await message.sendReply(Lang.ANTIFAKE_OFF);
    }
    const prefix = helpPrefix();
    await message.sendReply(
      Lang.ANTIFAKE_HELP.replaceAll("{p}", prefix)
    );
  }
);

Module(
  {
    on: "group-update",
    fromMe: false,
  },
  async (message, match) => {
    const { action, jid, client } = message;
    const target = message.participant?.[0];
    const listed = async (store) =>
      (await store.get()).some((data) => data.jid === jid);
    const adminJids = async () =>
      (await client.groupMetadata(jid)).participants
        .filter((v) => v.admin !== null)
        .map((x) => x.id.replace("c.us", "s.whatsapp.net"));

    if ((action === "promote" || action === "demote") && message.from && target) {
      const byBot = isBot(message.from, client);
      if (!byBot && (await listed(pdm))) {
        const mentions = await adminJids();
        if (action === "demote") mentions.push(target.id);
        await client.sendMessage(jid, {
          text: (action === "promote" ? Lang.PROMOTE_DETECTED : Lang.DEMOTE_DETECTED).format(
            message.from.split("@")[0],
            target.id.split("@")[0]
          ),
          mentions,
        });
      }
      const exempt = byBot || isSudo(message.from);
      if (action === "promote" && (await listed(antipromote))) {
        if (
          exempt ||
          isBot(target.id, client) ||
          (await isSuperAdmin(message, message.from))
        )
          return;
        if (!(await isAdmin(message))) return;
        await client.groupParticipantsUpdate(jid, [message.from], "demote");
        return await client.groupParticipantsUpdate(jid, [target.id], "demote");
      }
      if (action === "demote" && (await listed(antidemote))) {
        if (exempt || (await isSuperAdmin(message, message.from))) return;
        if (isBot(target.id, client)) {
          return await client.sendMessage(jid, {
            text: Lang.BOT_DEMOTED.format(message.from.split("@")[0]),
            mentions: await adminJids(),
          });
        }
        if (!(await isAdmin(message))) return;
        await client.groupParticipantsUpdate(jid, [message.from], "demote");
        return await client.groupParticipantsUpdate(jid, [target.id], "promote");
      }
    }

    if (action === "add" && target && (await listed(antifake))) {
      const phone =
        target.phoneNumber ||
        (target.id.endsWith("@s.whatsapp.net") ? target.id : "");
      const number = phone.split("@")[0].split(":")[0];
      if (number && isFake(number, (config.ALLOWED || "").split(","))) {
        if (!(await isAdmin(message))) return;
        return await client.groupParticipantsUpdate(jid, [target.id], "remove");
      }
    }

    if (action === "add") {
      const welcomeData = await welcome.get(jid);
      if (welcomeData && welcomeData.enabled) {
        try {
          const parsedMessage = await parseWelcomeMessage(
            welcomeData.message,
            message,
            message.participant
          );
          if (parsedMessage) {
            await sendWelcomeMessage(message, parsedMessage);
          }
        } catch (error) {
          console.error("Error sending welcome message:", error);
        }
      }
    }

    if (action === "remove") {
      const goodbyeData = await goodbye.get(jid);
      if (goodbyeData && goodbyeData.enabled) {
        try {
          const parsedMessage = await parseWelcomeMessage(
            goodbyeData.message,
            message,
            message.participant
          );
          if (parsedMessage) {
            await sendWelcomeMessage(message, parsedMessage);
          }
        } catch (error) {
          console.error("Error sending goodbye message:", error);
        }
      }
    }
  }
);
