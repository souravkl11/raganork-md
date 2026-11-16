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
    desc: "Sticks commands on stickers. And if that sticker is sent, it will work as a command!",
    usage: ".stickcmd .kick",
    warn: "Only works on stickers",
    use: "utility",
  },
  async (message, match) => {
    if (!match[1] || !message.reply_message || !message.reply_message.sticker)
      return await message.sendReply(
        `_Reply to a sticker_\n_Ex: *${helpPrefix()}stickcmd kick*_`
      );
    try {
      await stickcmd.set(match[1], await extractData(message));
    } catch {
      return await message.sendReply("_Failed!_");
    }
    await message.client.sendMessage(
      message.jid,
      {
        text: `_Sticked command ${match[1]} to this sticker!_`,
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
    desc: "Deletes sticked commands on stickers",
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
            text: `_Removed sticker from commands!_`,
          },
          {
            quoted: message.quoted,
          }
        );
      if (!deleted && match[1]) {
        var delete_again = await stickcmd.delete(match[1], "command");
        if (delete_again)
          return await message.sendReply(
            `_Removed ${match[1]} from sticked commands!_`
          );
        if (!delete_again)
          return await message.sendReply("_No such sticker/command found!_");
      }
      if (!deleted && !match[1])
        return await message.send("_No such sticker found!_");
    } else if (match[1] && !message.reply_message) {
      let deleted = await stickcmd.delete(match[1], "command");
      if (deleted)
        return await message.sendReply(
          `_Successfully removed ${match[1]} from sticked commands!_`
        );
      if (!deleted)
        return await message.sendReply("_No such command was found!_");
    } else
      return await message.sendReply(
        `_Need command or reply to a sticker!_\n_Ex: *${helpPrefix()}unstick kick*_`
      );
  }
);

Module(
  {
    pattern: "getstick ?(.*)",
    fromMe: true,
    desc: "Shows sticked commands on stickers",
    use: "utility",
  },
  async (message, match) => {
    var all = await stickcmd.get();
    var commands = all.map((element) => element.dataValues.command);
    var msg = commands.join("_\n_");
    await message.sendReply("_*Stickified commands:*_\n\n_" + msg + "_");
  }
);

Module(
  {
    pattern: "automute ?(.*)",
    fromMe: false,
    warn: "This works according to IST (Indian standard time)",
    use: "group",
  },
  async (message, match) => {
    if (!(await groupAdminGuard(message))) return;
    const input = match[1]?.trim().toLowerCase();
    if (!input)
      return await message.sendReply(
        `*Wrong format!*\n*${helpPrefix()}automute 22 00 (For 10 PM)*\n*${helpPrefix()}automute 06 00 (For 6 AM)*\n*${helpPrefix()}automute off*`
      );
    if (input === "off") {
      await automute.delete(message.jid);
      return await message.sendReply(
        "*Automute has been disabled in this group ❗*"
      );
    }
    const time = parseTime(input);
    if (!time)
      return await message.sendReply(
        `_Time must be in HH MM format (24 hour)_\n_${helpPrefix()}automute 22 00 (For 10 PM)_\n_${helpPrefix()}automute 06 00 (For 6 AM)_`
      );
    var admin = await isAdmin(message);
    if (!admin) return await message.sendReply("_I'm not an admin_");
    await automute.set(message.jid, time);
    await message.sendReply(`*_Group will auto mute at ${tConvert(time)}_*`);
  }
);

Module(
  {
    pattern: "autounmute ?(.*)",
    fromMe: false,
    warn: "This works according to IST (Indian standard time)",
    use: "group",
  },
  async (message, match) => {
    if (!(await groupAdminGuard(message))) return;
    const input = match[1]?.trim().toLowerCase();
    if (!input)
      return await message.sendReply(
        `*_Wrong format!_*\n*_${helpPrefix()}autounmute 22 00 (For 10 PM)_*\n*_${helpPrefix()}autounmute 06 00 (For 6 AM)_*\n*_${helpPrefix()}autounmute off_*`
      );
    if (input === "off") {
      await autounmute.delete(message.jid);
      return await message.sendReply(
        "*_Auto unmute has been disabled in this group ❗_*"
      );
    }
    const time = parseTime(input);
    if (!time)
      return await message.sendReply(
        `_Time must be in HH MM format (24 hour)_\n_${helpPrefix()}autounmute 22 00 (For 10 PM)_\n_${helpPrefix()}autounmute 06 00 (For 6 AM)_`
      );
    var admin = await isAdmin(message);
    if (!admin) return await message.sendReply("*I'm not admin*");
    await autounmute.set(message.jid, time);
    await message.sendReply(`*_Group will auto open at ${tConvert(time)}_*`);
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
      let subject = "Unknown group";
      try {
        subject = (await message.client.groupMetadata(row.chat)).subject;
      } catch {}
      msg +=
        `*${index + 1}. Group:* ${subject}
*➥ Mute:* ${tConvert(row.time)}
*➥ Unmute:* ${tConvert(temp?.time || "Not set")}` + "\n\n";
    }
    if (!msg) return await message.sendReply("_No mutes/unmutes found!_");
    await message.sendReply("*Scheduled Mutes/Unmutes*\n\n" + msg);
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
        return await message.sendReply("_I'm not admin!_");
      await antifake.set(message.jid);
      return await message.sendReply("_Antifake enabled!_");
    }
    if (input === "allow") {
      return await message.sendReply(
        `_Allowed prefixes are: ${config.ALLOWED} (applies to all groups)_`
      );
    }
    if (input === "off") {
      await antifake.delete(message.jid);
      return await message.sendReply("_Antifake disabled!_");
    }
    const prefix = helpPrefix();
    await message.sendReply(
      "*Antifake control*\n\n" +
        `• \`${prefix}antifake on\` - Remove members whose number does not start with an allowed prefix\n` +
        `• \`${prefix}antifake off\` - Disable\n` +
        `• \`${prefix}antifake allow\` - Show the allowed prefixes`
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
          text: `_*[${
            action === "promote" ? "Promote detected" : "Demote detected"
          }]*_\n\n@${message.from.split("@")[0]} ${action}d @${
            target.id.split("@")[0]
          }`,
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
            text: `_*Bot number was demoted, I'm unable to execute anti-demote* [Demoted by @${
              message.from.split("@")[0]
            }]_`,
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
