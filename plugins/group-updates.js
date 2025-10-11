const {
  isAdmin,
  isFake,
  antifake,
  pdm,

  antipromote,
  antidemote,
  welcome,
  goodbye,
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
const { ALLOWED, HANDLERS, ADMIN_ACCESS, SUDO } = require("../config");
var handler = HANDLERS !== "false" ? HANDLERS.split("")[0] : "";

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
        "_Reply to a sticker_\n_Ex: *.stickcmd kick*_"
      );
    try {
      await stickcmd.set(match[1], await extractData(message));
    } catch {
      return await message.sendReply("_Failed!_");
    }
    await message.client.sendMessage(
      message.jid,
      {
        text: `_Sticked command ${match[1]} to this sticker! Reconnecting..._`,
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
        "_Need command or reply to a sticker!_\n_Ex: *.unstick kick*_"
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
    message.sendReply("_*Stickified commands:*_\n\n_" + msg + "_");
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
    let adminAccesValidated = ADMIN_ACCESS
      ? await isAdmin(message, message.sender)
      : false;
    if (message.fromOwner || adminAccesValidated) {
      match = match[1]?.toLowerCase();
      if (!match)
        return await message.sendReply(
          "*Wrong format!*\n*.automute 22 00 (For 10 PM)*\n*.automute 06 00 (For 6 AM)*\n*.automute off*"
        );
      if (match.includes("am") || match.includes("pm"))
        return await message.sendReply(
          "_Time must be in HH MM format (24 hour)_"
        );
      if (match == "off") {
        await automute.delete(message.jid);
        return await message.sendReply(
          "*Automute has been disabled in this group ❗*"
        );
      }
      var mregex = /[0-2][0-9] [0-5][0-9]/;
      if (mregex.test(match?.match(/(\d+)/g)?.join(" ")) === false)
        return await message.sendReply(
          "*_Wrong format!_\n_.automute 22 00 (For 10 PM)_\n_.automute 06 00 (For 6 AM)_*"
        );
      var admin = await isAdmin(message);
      if (!admin) return await message.sendReply("_I'm not an admin_");
      await automute.set(message.jid, match.match(/(\d+)/g)?.join(" "));
      await message.sendReply(
        `*_Group will auto mute at ${tConvert(
          match.match(/(\d+)/g).join(" ")
        )}, rebooting.._*`
      );
      process.exit(0);
    }
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
    let adminAccesValidated = ADMIN_ACCESS
      ? await isAdmin(message, message.sender)
      : false;
    if (message.fromOwner || adminAccesValidated) {
      match = match[1]?.toLowerCase();
      if (!match)
        return await message.sendReply(
          "*_Wrong format!_*\n*_.autounmute 22 00 (For 10 PM)_*\n*_.autounmute 06 00 (For 6 AM)_*\n*_.autounmute off_*"
        );
      if (match.includes("am") || match.includes("pm"))
        return await message.sendReply(
          "_Time must be in HH MM format (24 hour)_"
        );
      if (match === "off") {
        await autounmute.delete(message.jid);
        return await message.sendReply(
          "*_Auto unmute has been disabled in this group ❗_*"
        );
      }
      var mregex = /[0-2][0-9] [0-5][0-9]/;
      if (mregex.test(match?.match(/(\d+)/g)?.join(" ")) === false)
        return await message.sendReply(
          "*_Wrong format_!\n_.autounmute 22 00 (For 10 PM)_\n_.autounmute 06 00 (For 6 AM)_*"
        );
      var admin = await isAdmin(message);
      if (!admin) return await message.sendReply("*I'm not admin*");
      await autounmute.set(message.jid, match?.match(/(\d+)/g)?.join(" "));
      await message.sendReply(
        `*_Group will auto open at ${tConvert(match)}, rebooting.._*`
      );
      process.exit(0);
    }
  }
);

Module(
  {
    pattern: "getmute ?(.*)",
    fromMe: false,
    use: "group",
  },
  async (message, match) => {
    let adminAccesValidated = ADMIN_ACCESS
      ? await isAdmin(message, message.sender)
      : false;
    if (message.fromOwner || adminAccesValidated) {
      var mute = await automute.get();
      var unmute = await autounmute.get();
      var msg = "";
      for (e in mute) {
        let temp = unmute.find((element) => element.chat === mute[e].chat);
        if (temp && temp.time) {
          mute[e].unmute = temp.time;
        }
        msg +=
          `*${Math.floor(parseInt(e) + 1)}. Group:* ${
            (await message.client.groupMetadata(mute[e].chat)).subject
          }
*➥ Mute:* ${tConvert(mute[e].time)}
*➥ Unmute:* ${tConvert(mute[e].unmute || "Not set")}` + "\n\n";
      }
      if (!msg) return await message.sendReply("_No mutes/unmutes found!_");
      message.sendReply("*Scheduled Mutes/Unmutes*\n\n" + msg);
    }
  }
);

Module(
  {
    pattern: "antifake ?(.*)",
    fromMe: false,
    use: "group",
  },
  async (message, match) => {
    let adminAccesValidated = ADMIN_ACCESS
      ? await isAdmin(message, message.sender)
      : false;
    if (message.fromOwner || adminAccesValidated) {
      var admin = await isAdmin(message);
      if (!admin) return await message.sendReply("_I'm not admin!_");
      if (match[1] === "on") {
        await antifake.set(message.jid);
        return await message.sendReply("_Antifake enabled!_");
      }
      if (match[1] === "allow") {
        return await message.sendReply(
          `_Allowed prefixes are: ${ALLOWED} (applies to all groups)_`
        );
      }
      if (match[1] === "off") {
        await antifake.delete(message.jid);
        return await message.sendReply("_Antifake disabled!_");
      }
      const buttons = [
        {
          buttonId: handler + "antifake on",
          buttonText: {
            displayText: "On",
          },
          type: 1,
        },
        {
          buttonId: handler + "antifake off",
          buttonText: {
            displayText: "Off",
          },
          type: 1,
        },
        {
          buttonId: handler + "antifake allow",
          buttonText: {
            displayText: "Allowed prefixes",
          },
          type: 1,
        },
      ];

      const buttonMessage = {
        text: "Antifake control menu",
        footer: "",
        buttons: buttons,
        headerType: 1,
      };
      await message.client.sendMessage(message.jid, buttonMessage, {
        quoted: message.data,
      });
    }
  }
);

Module(
  {
    on: "group-update",
    fromMe: false,
  },
  async (message, match) => {
    message.myjid = message.client.user.id.split(":")[0];
    var db = await antifake.get();
    let sudos = SUDO.split(",");
    const jids = [];
    db.map((data) => {
      jids.push(data.jid);
    });
    var pdmdb = await pdm.get();
    const pdmjids = [];
    pdmdb.map((data) => {
      pdmjids.push(data.jid);
    });
    var apdb = await antipromote.get();
    const apjids = [];
    apdb.map((data) => {
      apjids.push(data.jid);
    });
    var addb = await antidemote.get();
    const adjids = [];
    addb.map((data) => {
      adjids.push(data.jid);
    });
    var admin_jids = [];
    var admins = (await message.client.groupMetadata(message.jid)).participants
      .filter((v) => v.admin !== null)
      .map((x) => x.id);
    admins.map(async (user) => {
      admin_jids.push(user.replace("c.us", "s.whatsapp.net"));
    });
    if (
      (message.action == "promote" || message.action == "demote") &&
      pdmjids.includes(message.jid)
    ) {
      if (message.from.split("@")[0] == message.myjid) return;
      if (message.action == "demote") admin_jids.push(message.participant[0]);
      await message.client.sendMessage(message.jid, {
        text: `_*[${
          message.action == "promote" ? "Promote detected" : "Demote detected"
        }]*_\n\n@${message.from.split("@")[0]} ${message.action}d @${
          message.participant[0].split("@")[0]
        }`,
        mentions: admin_jids,
      });
    }
    if (message.action == "promote" && apjids.includes(message.jid)) {
      if (
        message.from.split("@")[0] == message.myjid ||
        sudos.includes(message.from.split("@")[0]) ||
        message.participant[0].split("@")[0] == message.myjid ||
        (await isSuperAdmin(message, message.from))
      )
        return;
      var admin = await isAdmin(message);
      if (!admin) return;
      await message.client.groupParticipantsUpdate(
        message.jid,
        [message.from],
        "demote"
      );
      return await message.client.groupParticipantsUpdate(
        message.jid,
        [message.participant[0]],
        "demote"
      );
    }
    if (message.action == "demote" && adjids.includes(message.jid)) {
      if (
        message.from.split("@")[0] == message.myjid ||
        sudos.includes(message.from.split("@")[0]) ||
        (await isSuperAdmin(message, message.from))
      )
        return;
      if (message.participant[0].split("@")[0] == message.myjid) {
        return await message.client.sendMessage(message.jid, {
          text: `_*Bot number was demoted, I'm unable to execute anti-demote* [Demoted by @${
            message.from.split("@")[0]
          }]_`,
          mentions: admin_jids,
        });
      }
      var admin = await isAdmin(message);
      if (!admin) return;
      await message.client.groupParticipantsUpdate(
        message.jid,
        [message.from],
        "demote"
      );
      return await message.client.groupParticipantsUpdate(
        message.jid,
        [message.participant[0]],
        "promote"
      );
    }
    if (message.action === "add" && jids.includes(message.jid)) {
      var allowed = ALLOWED.split(",");
      if (isFake(message.participant[0], allowed)) {
        var admin = await isAdmin(message);
        if (!admin) return;
        return await message.client.groupParticipantsUpdate(
          message.jid,
          [message.participant[0]],
          "remove"
        );
      }
    }

    if (message.action === "add") {
      const welcomeData = await welcome.get(message.jid);
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

    if (message.action === "remove") {
      const goodbyeData = await goodbye.get(message.jid);
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
