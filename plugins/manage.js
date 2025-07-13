function containsDisallowedWords(str, disallowedWords) {
  str = str.toLowerCase();
  for (let word of disallowedWords) {
    if (str.match(word)) {
      let otherWords = str.replace(word, "±").split("±");
      for (let _word of otherWords) {
        str = str.replace(_word, "");
      }
      let filteredWord = str;
      return filteredWord;
    }
  }
}

function checkLinks(links, allowedWords) {
  let testArray = [];
  for (let i = 0; i < links.length; i++) {
    const link = links[i];
    let isAllowed = true;
    for (let j = 0; j < allowedWords.length; j++) {
      const allowedWord = allowedWords[j];
      if (link.includes(allowedWord)) {
        isAllowed = true;
        break;
      }
      isAllowed = false;
    }
    testArray.push(isAllowed);
  }
  return testArray.includes(false);
}
const { Module } = require("../main");
const {
  isAdmin,
  antilinkConfig,
  antiword,
  antibot,
  antispam,
  antipromote,
  antidemote,
  pdm,
  setWarn,
  getWarn,
  linkDetector,
} = require("./utils");
const config = require("../config");
const { settingsMenu, ADMIN_ACCESS } = config;
const fs = require("fs");
const { BotVariable } = require("../core/database");
const { getNumericId } = require("./utils/lid-helper");
var handler = config.HANDLERS !== "false" ? config.HANDLERS.split("")[0] : "";

async function setVar(key, value, message = false) {
  await BotVariable.upsert({
    key: key.trim(),
    value: value,
  });
  config[key.trim()] = value;
  if (message) {
    await message.sendReply(`_${key.trim()} set to '${value}' successfully!_`);
  }
  return true;
}

async function delVar(key, message = false) {
  await BotVariable.destroy({ where: { key: key.trim() } });
  delete config[key.trim()];
  if (message) {
    await message.sendReply(`_${key.trim()} deleted successfully!_`);
  }
  return true;
}
Module(
  {
    pattern: "setvar ?(.*)",
    fromMe: true,
    desc: "Set bot variables remotely",
    usage: ".setvar MY_VAR=some_value",
  },
  async (message, args) => {
    const input = args[1];
    if (!input || !input.includes("=")) {
      return await message.sendReply(
        "_Invalid format. Use: .setvar KEY=VALUE_"
      );
    }

    const [key, ...valueParts] = input.split("=");
    const value = valueParts.join("=").trim();

    try {
      await setVar(key.trim(), value, message);
    } catch (error) {
      await message.sendReply(
        `_Failed to set variable '${key.trim()}'. Error: ${error.message}_`
      );
    }
  }
);

Module(
  {
    pattern: "getvar ?(.*)",
    fromMe: true,
    desc: "Get bot variable value",
    usage: ".getvar MY_VAR",
  },
  async (message, args) => {
    const key = args[1]?.trim();
    if (!key) {
      return await message.sendReply(
        "_Please provide a variable name. Use: .getvar MY_VAR_"
      );
    }

    const variable = config[key];
    if (variable) {
      await message.sendReply(`_Variable '${key}': ${variable}_`);
    } else {
      await message.sendReply(`_Variable '${key}' not found._`);
    }
  }
);

Module(
  {
    pattern: "delvar ?(.*)",
    fromMe: true,
    desc: "Delete bot variable",
    usage: ".delvar MY_VAR",
  },
  async (message, args) => {
    const key = args[1]?.trim();
    if (!key) {
      return await message.sendReply(
        "_Please provide a variable name. Use: .delvar MY_VAR_"
      );
    }
 try {
      if (config[key] === undefined) {
        return await message.sendReply(`_Variable '${key}' not found._`);
      }
      await delVar(key.trim(), message);
    } catch (error) {
      await message.sendReply(
        `_Failed to delete variable '${key.trim()}'. Error: ${error.message}_`
      );
    }
  }
);

Module(
  {
    pattern: "allvar",
    fromMe: true,
    desc: "Get all bot variables",
    use: "owner",
  },
  async (message, match) => {
    try {
      let msg = "*All Bot Variables:*\n\n";
      for (const key in config) {
        if (!variables.find((v) => v.key === key)) {
          msg += `*${key}*: ${config[key]}\n`;
        }
      }

      await message.sendReply(msg);
    } catch (error) {
      await message.sendReply(
        `_Failed to fetch variables. Error: ${error.message}_`
      );
    }
  }
);

Module(
  {
    pattern: "platform",
    fromMe: true,
    use: "settings",
  },
  async (message, match) => {
    return await message.sendReply(`_Bot is running on ${config.PLATFORM}_`);
  }
);

Module(
  {
    pattern: "language ?(.*)",
    fromMe: true,
    desc: "Change bot's language for some commands",
    use: "settings",
  },
  async (message, match) => {
    if (
      !match[1] ||
      !["english", "manglish", "turkish"].includes(match[1].toLowerCase())
    )
      return await message.sendReply(
        "_Invalid language! Available languages are English, Manglish and Turkish_"
      );
    return await setVar("LANGUAGE", match[1].toLowerCase(), message);
  }
);

Module(
  {
    pattern: "settings ?(.*)",
    fromMe: true,
    desc: "Bot settings to enable extra options related to WhatsApp bot functionality.",
    use: "owner",
  },
  async (message, match) => {
    let configs = settingsMenu;
    if (match[1]) {
      const selectedOption = parseInt(match[1]);
      if (
        !isNaN(selectedOption) &&
        selectedOption > 0 &&
        selectedOption <= configs.length
      ) {
        const setting = configs[selectedOption - 1];
        let msg = `*${setting.title}*\n\n1. ON\n2. OFF`;
        return await message.sendReply(msg);
      }
    }
    let msg =
      "*Settings configuration menu*\n\nSelect an option by number:\n\n";
    configs.forEach((e, index) => {
      msg += `${index + 1}. ${e.title}\n`;
    });
    return await message.sendReply(msg);
  }
);

Module(
  {
    pattern: "mode ?(.*)",
    fromMe: true,
    desc: "Change bot mode to public & private",
    use: "settings",
  },
  async (message, match) => {
    if (
      match[1]?.toLowerCase() == "public" ||
      match[1]?.toLowerCase() == "private"
    ) {
      return await setVar("MODE", match[1], message);
    } else {
      return await message.sendReply(
        `_*Mode manager*_\n_Current mode: ${config.MODE}_\n_Use \`.mode public|private\`_`
      );
    }
  }
);

Module(
  {
    pattern: "antidelete ?(.*)",
    fromMe: true,
    desc: "Activates anti delete",
    use: "settings",
  },
  async (message, match) => {
    let target = match[1]?.toLowerCase();
    if (target == "chat" || target == "sudo") {
      await setVar("ANTI_DELETE", match[1]);
      return await message.sendReply(
        `_Anti-delete activated ✅_\n\n_Recovered messages will be sent to the ${
          target == "chat" ? "original chat" : "first sudo"
        }_`
      );
    } else if (target == "off") {
      await setVar("ANTI_DELETE", "off");
      return await message.sendReply(`_Anti-delete deactivated ❌_`);
    } else {
      return await message.sendReply(
        `_*Anti delete*_\n\n_Recovers deleted messages and sends automatically_\n\n_Current status: ${
          config.ANTI_DELETE || "off"
        }_\n\n_Use \`.antidelete chat|sudo|off\`_\n\n- "chat" - sends to original chat\n- "sudo" - sends to first sudo\n- "off" - disables anti-delete_`
      );
    }
  }
);

Module(
  {
    pattern: "setsudo ?(.*)",
    fromMe: true,
    use: "owner",
  },
  async (message, mm) => {
    var m = message;
    var newSudo = (
      m.reply_message ? m.reply_message?.jid : "" || m.mention?.[0] || mm[1]
    ).split("@")[0];
    if (!newSudo) return await m.sendReply("_Need reply/mention/number_");
    const oldSudo = config.SUDO?.split(",");
    var newSudo = (
      m.reply_message ? m.reply_message?.jid : "" || m.mention?.[0] || mm[1]
    ).split("@")[0];
    if (!newSudo) return await m.sendReply("_Need reply/mention/number_");
    newSudo = newSudo.replace(/[^0-9]/g, "");
    if (!oldSudo.includes(newSudo)) {
      oldSudo.push(newSudo);
      var setSudo = oldSudo;
      setSudo = setSudo
        .map((x) => {
          if (typeof x === "number") {
            return x.toString();
          } else {
            return x.replace(/[^0-9]/g, "");
          }
        })
        .filter((x) => x)
        .join(",");
      await m.sendMessage("_Added @" + newSudo + " as sudo_", "text", {
        mentions: [newSudo + "@s.whatsapp.net"],
      });
      await setVar("SUDO", setSudo);
    } else return await m.sendReply("_User is already a sudo_");
  }
);

Module(
  {
    pattern: "getsudo ?(.*)",
    fromMe: true,
    use: "owner",
  },
  async (message, match) => {
    return await message.sendReply(config.SUDO);
  }
);

Module(
  {
    pattern: "delsudo ?(.*)",
    fromMe: true,
    desc: "Deletes sudo",
  },
  async (m, mm) => {
    const oldSudo = config.SUDO?.split(",");
    var newSudo = (
      m.reply_message ? m.reply_message?.jid : "" || m.mention?.[0] || mm[1]
    ).split("@")[0];
    if (!newSudo) return await m.sendReply("*Need reply/mention/number*");
    if (oldSudo.includes(newSudo)) {
      oldSudo.push(newSudo);
      var setSudo = oldSudo;
      setSudo = setSudo
        .filter((x) => x !== newSudo.replace(/[^0-9]/g, ""))
        .join(",");
      await m.sendMessage("_Removed @" + newSudo + " from sudo!_", "text", {
        mentions: [newSudo + "@s.whatsapp.net"],
      });
      await setVar("SUDO", setSudo, m);
    } else return await m.sendReply("_User is already not a sudo_");
  }
);

Module(
  {
    pattern: "toggle ?(.*)",
    fromMe: true,
    desc: "To toggle commands on/off (enable/disable)",
    usage: ".toggle img",
    use: "group",
  },
  async (message, match) => {
    if (match[0].includes("filter")) return;
    match = match[1];
    if (match) {
      const { commands } = require("../main");
      const extractCommandName = (pattern) => {
        const match = pattern?.toString().match(/(\W*)([A-Za-z1234567890 ]*)/);
        return match && match[2] ? match[2].trim() : "";
      };
      const availableCommands = commands
        .filter((x) => x.pattern)
        .map((cmd) => extractCommandName(cmd.pattern));
      let disabled =
        typeof config.DISABLED_COMMANDS === "string"
          ? config.DISABLED_COMMANDS.split(",")
          : [];
      if (!availableCommands.includes(match.trim()))
        return await message.sendReply(
          `_${handler}${match.trim()} is not a valid command!_`
        );
      if (match == "toggle" || match == "setvar" || match == "getvar")
        return await message.sendReply(
          `_You can't disable ${handler}${match.trim()} command!_`
        );
      if (!disabled.includes(match)) {
        disabled.push(match.trim());
        await message.sendReply(
          `_Successfully turned off \`${handler}${match}\` command_\n_Use \`${handler}toggle ${match}\` to enable this command back_`
        );
        return await setVar("DISABLED_COMMANDS", disabled.join(","), false);
      } else {
        await message.sendReply(
          `_Successfully turned on \`${handler}${match}\` command_`
        );
        return await setVar(
          "DISABLED_COMMANDS",
          disabled.filter((x) => x != match).join(",") || "null",
          false
        );
      }
    } else
      return await message.sendReply(
        `_Example: ${handler}toggle img_\n\n_(This will disable .img command)_`
      );
  }
);

Module(
  {
    pattern: "antibot ?(.*)",
    fromMe: false,
    desc: "Detects other bot's messages and kicks.",
    use: "group",
  },
  async (message, match) => {
    let adminAccesValidated = ADMIN_ACCESS
      ? await isAdmin(message, message.sender)
      : false;
    if (message.fromOwner || adminAccesValidated) {
      match[1] = match[1] ? match[1].toLowerCase() : "";
      var db = await antibot.get();
      const jids = [];
      db.map((data) => {
        jids.push(data.jid);
      });
      if (match[1] === "on") {
        if (!(await isAdmin(message)))
          return await message.sendReply("_I'm not an admin!_");
        await antibot.set(message.jid);
      }
      if (match[1] === "off") {
        await antibot.delete(message.jid);
      }
      if (match[1] !== "on" && match[1] !== "off") {
        var status = jids.includes(message.jid) ? "on" : "off";
        var { subject } = await message.client.groupMetadata(message.jid);
        return await message.sendReply(
          `_Antibot menu of ${subject}_` +
            "\n\n_Antibot is currently turned *" +
            status +
            "*_\n\n_Use .antibot on/off_"
        );
      }
      await message.sendReply(
        match[1] === "on" ? "_Antibot activated!_" : "_Antibot turned off!_"
      );
    }
  }
);

Module(
  {
    pattern: "antispam ?(.*)",
    fromMe: false,
    desc: "Detects spam messages and kicks user.",
    use: "group",
  },
  async (message, match) => {
    let adminAccesValidated = ADMIN_ACCESS
      ? await isAdmin(message, message.sender)
      : false;
    if (message.fromOwner || adminAccesValidated) {
      match[1] = match[1] ? match[1].toLowerCase() : "";
      var db = await antispam.get();
      const jids = [];
      db.map((data) => {
        jids.push(data.jid);
      });
      if (match[1] === "on") {
        if (!(await isAdmin(message)))
          return await message.sendReply("_I'm not an admin!_");
        await antispam.set(message.jid);
      }
      if (match[1] === "off") {
        await antispam.delete(message.jid);
      }
      if (match[1] !== "on" && match[1] !== "off") {
        var status = jids.includes(message.jid) ? "on" : "off";
        var { subject } = await message.client.groupMetadata(message.jid);
        return await message.sendReply(
          `_Anti spam menu of ${subject}_` +
            "\n\n_Antispam is currently turned *" +
            status +
            "*_\n\n_Use .antispam on/off_"
        );
      }
      await message.sendReply(
        match[1] === "on" ? "_Antispam activated!_" : "_Antispam turned off!_"
      );
    }
  }
);

Module(
  {
    pattern: "pdm ?(.*)",
    fromMe: false,
    desc: "Detects promote/demote and sends alert.",
    use: "group",
  },
  async (message, match) => {
    let adminAccesValidated = ADMIN_ACCESS
      ? await isAdmin(message, message.sender)
      : false;
    if (message.fromOwner || adminAccesValidated) {
      match[1] = match[1] ? match[1].toLowerCase() : "";
      var db = await pdm.get();
      const jids = [];
      db.map((data) => {
        jids.push(data.jid);
      });
      if (match[1] === "on") {
        await pdm.set(message.jid);
      }
      if (match[1] === "off") {
        await pdm.delete(message.jid);
      }
      if (match[1] !== "on" && match[1] !== "off") {
        var status = jids.includes(message.jid) ? "on" : "off";
        var { subject } = await message.client.groupMetadata(message.jid);
        return await message.sendReply(
          `_Promote|demote alert message menu of ${subject}_` +
            "\n\n_PDM alert is currently turned *" +
            status +
            "*_\n\n_Use .pdm on/off_"
        );
      }
      await message.sendReply(
        match[1] === "on" ? "_Pdm activated!_" : "_Pdm turned off!_"
      );
    }
  }
);

Module(
  {
    pattern: "antidemote ?(.*)",
    fromMe: true,
    desc: "Detects demote and automatically promotes demoted one and demotes person who demoted.",
    use: "group",
  },
  async (message, match) => {
    match[1] = match[1] ? match[1].toLowerCase() : "";
    var db = await antidemote.get();
    const jids = [];
    db.map((data) => {
      jids.push(data.jid);
    });
    if (match[1] === "on") {
      await antidemote.set(message.jid);
    }
    if (match[1] === "off") {
      await antidemote.delete(message.jid);
    }
    if (match[1] !== "on" && match[1] !== "off") {
      var status = jids.includes(message.jid) ? "on" : "off";
      var { subject } = await message.client.groupMetadata(message.jid);
      return await message.sendReply(
        `_Anti demote menu of ${subject}_` +
          "\n\n_This feature is currently turned *" +
          status +
          "*_\n\n_Use .antidemote on/off_"
      );
    }
    await message.sendReply(
      match[1] === "on" ? "_Antidemote activated!_" : "_Antidemote turned off!_"
    );
  }
);

Module(
  {
    pattern: "antipromote ?(.*)",
    fromMe: true,
    desc: "Detects promote and automatically demotes promoted one and demotes person who promoted.",
    use: "group",
  },
  async (message, match) => {
    match[1] = match[1] ? match[1].toLowerCase() : "";
    var db = await antipromote.get();
    const jids = [];
    db.map((data) => {
      jids.push(data.jid);
    });
    if (match[1] === "on") {
      await antipromote.set(message.jid);
    }
    if (match[1] === "off") {
      await antipromote.delete(message.jid);
    }
    if (match[1] !== "on" && match[1] !== "off") {
      var status = jids.includes(message.jid) ? "on" : "off";
      var { subject } = await message.client.groupMetadata(message.jid);
      return await message.sendReply(
        `_Anti promote menu of ${subject}_` +
          "\n\n_This feature is currently turned *" +
          status +
          "*_\n\n_Use .antipromote on/off_"
      );
    }
    await message.sendReply(
      match[1] === "on"
        ? "_Antipromote activated!_"
        : "_Antipromote turned off!_"
    );
  }
);

Module(
  {
    pattern: "antilink ?(.*)",
    fromMe: false,
    desc: "Advanced antilink system with warn/kick/delete modes and flexible link filtering",
    use: "group",
  },
  async (message, match) => {
    let adminAccesValidated = ADMIN_ACCESS
      ? await isAdmin(message, message.sender)
      : false;

    if (!(message.fromOwner || adminAccesValidated)) return;

    const input = match[1] ? match[1].toLowerCase().trim() : "";
    const args = input.split(" ");
    const command = args[0];
    const value = args.slice(1).join(" ");

    let config = await antilinkConfig.get(message.jid);

    try {
      switch (command) {
        case "on":
        case "enable":
          if (!(await isAdmin(message))) {
            return await message.sendReply("_I'm not an admin!_");
          }

          if (!config) {
            config = await antilinkConfig.set(message.jid, {
              mode: "delete",
              enabled: true,
              updatedBy: message.sender,
            });
          } else {
            config = await antilinkConfig.update(message.jid, {
              enabled: true,
              updatedBy: message.sender,
            });
          }

          return await message.sendReply(
            `✅ *Antilink Enabled!*\n\n` +
              `• Mode: *${config.mode.toUpperCase()}*\n` +
              `• Type: *${config.isWhitelist ? "WHITELIST" : "BLACKLIST"}*\n` +
              `• Use \`${handler}antilink help\` for more options`
          );

        case "off":
        case "disable":
          if (config) {
            await antilinkConfig.update(message.jid, {
              enabled: false,
              updatedBy: message.sender,
            });
          }

          return await message.sendReply("❌ *Antilink Disabled!*");

        case "mode":
          if (!value || !["warn", "kick", "delete"].includes(value)) {
            return await message.sendReply(
              `_Invalid mode! Available modes:_\n\n` +
                `• \`warn\` - Warn users for links\n` +
                `• \`kick\` - Kick users for links\n` +
                `• \`delete\` - Only delete the message\n\n` +
                `_Usage:_ \`${handler}antilink mode delete\``
            );
          }

          if (!(await isAdmin(message))) {
            return await message.sendReply("_I'm not an admin!_");
          }

          if (!config) {
            config = await antilinkConfig.set(message.jid, {
              mode: value,
              enabled: true,
              updatedBy: message.sender,
            });
          } else {
            config = await antilinkConfig.update(message.jid, {
              mode: value,
              updatedBy: message.sender,
            });
          }

          return await message.sendReply(
            `✅ *Antilink mode set to ${value.toUpperCase()}!*\n\n` +
              `${
                value === "warn"
                  ? "⚠️ Users will be warned for sending links"
                  : value === "kick"
                  ? "👢 Users will be kicked for sending links"
                  : "🗑️ Links will be deleted without action"
              }`
          );

        case "allow":
        case "whitelist":
          if (!value) {
            return await message.sendReply(
              `_Add domains to whitelist:_\n\n` +
                `_Usage:_ \`${handler}antilink allow google.com,youtube.com\`\n` +
                `_Current:_ ${config?.allowedLinks || "gist,instagram,youtu"}`
            );
          }

          const allowedDomains = value
            .split(",")
            .map((d) => d.trim())
            .filter((d) => d);

          if (!config) {
            config = await antilinkConfig.set(message.jid, {
              allowedLinks: allowedDomains.join(","),
              isWhitelist: true,
              enabled: true,
              updatedBy: message.sender,
            });
          } else {
            config = await antilinkConfig.update(message.jid, {
              allowedLinks: allowedDomains.join(","),
              isWhitelist: true,
              updatedBy: message.sender,
            });
          }

          return await message.sendReply(
            `✅ *Allowed links updated!*\n\n` +
              `*Whitelist mode:* Only these domains are allowed\n` +
              `*Domains:* ${allowedDomains.join(", ")}`
          );

        case "block":
        case "blacklist":
          if (!value) {
            return await message.sendReply(
              `_Add domains to blacklist:_\n\n` +
                `_Usage:_ \`${handler}antilink block facebook.com,twitter.com\`\n` +
                `_Current:_ ${config?.blockedLinks || "None"}`
            );
          }

          const blockedDomains = value
            .split(",")
            .map((d) => d.trim())
            .filter((d) => d);

          if (!config) {
            config = await antilinkConfig.set(message.jid, {
              blockedLinks: blockedDomains.join(","),
              isWhitelist: false,
              enabled: true,
              updatedBy: message.sender,
            });
          } else {
            config = await antilinkConfig.update(message.jid, {
              blockedLinks: blockedDomains.join(","),
              isWhitelist: false,
              updatedBy: message.sender,
            });
          }

          return await message.sendReply(
            `✅ *Blocked links updated!*\n\n` +
              `*Blacklist mode:* These domains are blocked\n` +
              `*Domains:* ${blockedDomains.join(", ")}`
          );

        case "message":
        case "msg":
          if (!value) {
            return await message.sendReply(
              `_Set custom warning message:_\n\n` +
                `_Usage:_ \`${handler}antilink message Links not allowed!\`\n` +
                `_Current:_ ${config?.customMessage || "Default message"}`
            );
          }

          if (!config) {
            config = await antilinkConfig.set(message.jid, {
              customMessage: value,
              enabled: true,
              updatedBy: message.sender,
            });
          } else {
            config = await antilinkConfig.update(message.jid, {
              customMessage: value,
              updatedBy: message.sender,
            });
          }

          return await message.sendReply(
            `✅ *Custom message set!*\n\n` + `*Message:* ${value}`
          );

        case "reset":
          if (config) {
            await antilinkConfig.delete(message.jid);
          }
          return await message.sendReply(
            "🔄 *Antilink settings reset to default!*"
          );

        case "help":
          return await message.sendReply(
            `🛡️ *Antilink System Help*\n\n` +
              `*Basic Commands:*\n` +
              `• \`${handler}antilink on/off\` - Enable/disable\n` +
              `• \`${handler}antilink mode warn/kick/delete\` - Set action\n\n` +
              `*Link Control:*\n` +
              `• \`${handler}antilink allow domain1,domain2\` - Whitelist mode\n` +
              `• \`${handler}antilink block domain1,domain2\` - Blacklist mode\n\n` +
              `*Customization:*\n` +
              `• \`${handler}antilink message Your text\` - Custom warning\n` +
              `• \`${handler}antilink reset\` - Reset to default\n` +
              `• \`${handler}antilink status\` - View current settings\n\n` +
              `*Detection:*\n` +
              `• Catches \`https://example.com\`\n` +
              `• Catches \`www.example.com\`\n` +
              `• Catches \`example.com\`\n` +
              `• Catches \`example.com/path\`\n\n` +
              `*Modes:*\n` +
              `• *WARN* - Issues warnings, kicks after limit\n` +
              `• *KICK* - Immediately kicks users\n` +
              `• *DELETE* - Only deletes the message`
          );

        case "status":
        default:
          if (!config) {
            config = {
              enabled: false,
              mode: "delete",
              allowedLinks: "gist,instagram,youtu",
              blockedLinks: null,
              isWhitelist: true,
              customMessage: null,
            };
          }

          const { subject } = await message.client.groupMetadata(message.jid);

          return await message.sendReply(
            `🛡️ *Antilink Status - ${subject}*\n\n` +
              `*Status:* ${config.enabled ? "✅ ENABLED" : "❌ DISABLED"}\n` +
              `*Mode:* ${config.mode?.toUpperCase() || "DELETE"}\n` +
              `*Type:* ${
                config.isWhitelist ? "⚪ WHITELIST" : "⚫ BLACKLIST"
              }\n\n` +
              `*${config.isWhitelist ? "Allowed" : "Blocked"} Domains:*\n` +
              `${
                config.isWhitelist
                  ? config.allowedLinks || "gist,instagram,youtu"
                  : config.blockedLinks || "None"
              }\n\n` +
              `*Custom Message:* ${config.customMessage || "Default"}\n\n` +
              `_Use \`${handler}antilink help\` for all commands_`
          );
      }
    } catch (error) {
      console.error("Antilink error:", error);
      return await message.sendReply(
        "_An error occurred while updating antilink settings._"
      );
    }
  }
);

Module(
  {
    pattern: "antiword ?(.*)",
    fromMe: false,
    desc: "Activates antiword, kicks if user sends not allowed words",
    use: "group",
  },
  async (message, match) => {
    let adminAccesValidated = ADMIN_ACCESS
      ? await isAdmin(message, message.sender)
      : false;
    if (message.fromOwner || adminAccesValidated) {
      match[1] = match[1] ? match[1].toLowerCase() : "";
      var db = await antiword.get();
      const jids = [];
      db.map((data) => {
        jids.push(data.jid);
      });
      var antiwordWarn = config.ANTIWORD_WARN?.split(",") || [];
      if (match[1].includes("warn")) {
        if (match[1].endsWith("on")) {
          if (!(await isAdmin(message)))
            return await message.sendReply("_I'm not an admin!_");
          if (!antiwordWarn.includes(message.jid)) {
            antiwordWarn.push(message.jid);
            await setVar("ANTIWORD_WARN", antiwordWarn.join(","), false);
          }
          return await message.sendReply(
            `_Antiword warn has been activated in this group!_`
          );
        }
        if (match[1].endsWith("off")) {
          if (!(await isAdmin(message)))
            return await message.sendReply("_I'm not an admin!_");
          if (antiwordWarn.includes(message.jid)) {
            await message.sendReply(`_Antiword warn deactivated!_`);
            return await setVar(
              "ANTIWORD_WARN",
              antiwordWarn.filter((x) => x != message.jid).join(",") || "null",
              false
            );
          }
        }
      }
      if (match[1] === "on") {
        if (!(await isAdmin(message)))
          return await message.sendReply("_I'm not an admin!_");
        await antiword.set(message.jid);
      }
      if (match[1] === "off") {
        await antiword.delete(message.jid);
      }
      if (match[1] !== "on" && match[1] !== "off") {
        var status =
          jids.includes(message.jid) || antiwordWarn.includes(message.jid)
            ? "on"
            : "off";
        var { subject } = await message.client.groupMetadata(message.jid);
        return await message.sendReply(
          `_Antiword menu of ${subject}_` +
            "\n\n_Antiword is currently turned *" +
            status +
            "*_\n\n_Eg: .antiword on/off_\n_.antiword warn on/off_\n\n_Use `setvar ANTI_WORDS:fuck,nigga` to block custom words or set `ANTI_WORDS:auto` to auto detect bad words (It's already enabled by default!)_"
        );
      }
      await message.sendReply(
        match[1] === "on" ? "_Antiword activated!_" : "_Antiword turned off!_"
      );
    }
  }
);

Module(
  {
    on: "text",
    fromMe: false,
  },
  async (message, match) => {
    const configs = settingsMenu;
    const sMatch = message.message?.match(/^\d+$/);
    const settingsMatch =
      sMatch &&
      message.reply_message?.text &&
      message.reply_message.text
        .toLowerCase()
        .includes("settings configuration menu") &&
      message.quoted.key.fromMe;
    if (settingsMatch) {
      const optionNumber = parseInt(sMatch[0]);
      if (optionNumber > 0 && optionNumber <= configs.length) {
        const setting = configs[optionNumber - 1];
        let msg = `*${setting.title}*\n\n1. ON\n2. OFF`;
        return await message.sendReply(msg);
      }
    } else if (
      message.message?.match(/^(1|2)$/) &&
      message.reply_message?.text?.includes("1. ON") &&
      message.quoted.key.fromMe
    ) {
      const quotedMsg = message.reply_message.message;
      const option = parseInt(message.message);
      for (const setting of configs) {
        if (quotedMsg.includes(setting.title)) {
          const value = option === 1 ? "true" : "false";
          await setVar(setting.env_var, value);
          await message.sendReply(`${setting.title} set to ${value}`);
          return;
        }
      }
    }

    var antiworddb = await antiword.get();
    const antiwordjids = [];
    antiworddb.map((data) => {
      antiwordjids.push(data.jid);
    });
    if (antiwordjids.includes(message.jid)) {
      var antiwordWarn = config.ANTIWORD_WARN?.split(",") || [];
      if (antiwordWarn.includes(message.jid)) return;
      let disallowedWords = (config.ANTI_WORDS || "auto").split(",");
      if (config.ANTI_WORDS == "auto")
        disallowedWords = require("badwords/array");
      let thatWord = containsDisallowedWords(message.message, disallowedWords);
      if (thatWord) {
        await message.sendReply(
          `_The word ${thatWord} is not allowed in this chat!_`
        );
        await message.client.groupParticipantsUpdate(
          message.jid,
          [message.sender],
          "remove"
        );
        return await message.client.sendMessage(message.jid, {
          delete: message.data.key,
        });
      }
    }

    const foundLinks = linkDetector.detectLinks(message.message);

    if (foundLinks.length > 0) {
      const antilinkConf = await antilinkConfig.get(message.jid);

      if (antilinkConf && antilinkConf.enabled) {
        let linkBlocked = false;

        for (const link of foundLinks) {
          if (!antilinkConfig.checkAllowed(link, antilinkConf)) {
            linkBlocked = true;
            break;
          }
        }

        if (linkBlocked && !(await isAdmin(message, message.sender))) {
          const usr = message.sender.includes(":")
            ? message.sender.split(":")[0] + "@s.whatsapp.net"
            : message.sender;

          await message.client.sendMessage(message.jid, {
            delete: message.data.key,
          });
          const customMessage =
            antilinkConf.customMessage ||
            `⚠️ *Link Detected!*\n\n_Links are not allowed in this group._`;

          if (antilinkConf.mode === "delete") {
            await message.sendMessage(customMessage, "text", {
              mentions: [usr],
            });
          } else if (antilinkConf.mode === "warn") {
            const { WARN } = require("../config");
            const warnLimit = parseInt(WARN || 4);
            const targetNumericId = getNumericId(usr);

            try {
              await setWarn(
                message.jid,
                usr,
                "Sending unauthorized link",
                message.client.user.id
              );

              const warnData = await getWarn(message.jid, usr, warnLimit);
              const currentWarns = warnData.current;
              const remaining = warnData.remaining;

              if (warnData.exceeded) {
                try {
                  await message.client.groupParticipantsUpdate(
                    message.jid,
                    [usr],
                    "remove"
                  );
                  await message.sendMessage(
                    `${customMessage}\n\n` +
                      `*Action:* User kicked for exceeding warning limit\n` +
                      `*Warnings:* ${currentWarns}/${warnLimit}`,
                    "text",
                    {
                      mentions: [usr],
                    }
                  );
                } catch (kickError) {
                  await message.sendMessage(
                    `${customMessage}\n\n` +
                      `*Warnings:* ${currentWarns}/${warnLimit}\n` +
                      `*Error:* Failed to kick user`,
                    "text",
                    {
                      mentions: [usr],
                    }
                  );
                }
              } else {
                await message.sendMessage(
                  `${customMessage}\n\n` +
                    `*Warnings:* ${currentWarns}/${warnLimit}\n` +
                    `*Remaining:* ${remaining}\n\n` +
                    `${
                      remaining === 1
                        ? "_Next violation will result in a kick!_"
                        : `_${remaining} more warnings before kick._`
                    }`,
                  "text",
                  {
                    mentions: [usr],
                  }
                );
              }
            } catch (error) {
              console.error("Antilink warn error:", error);
              await message.sendMessage(customMessage, "text", {
                mentions: [usr],
              });
            }
          } else if (antilinkConf.mode === "kick") {
            try {
              await message.client.groupParticipantsUpdate(
                message.jid,
                [usr],
                "remove"
              );
              await message.sendMessage(`${customMessage}\n\n*Action:* User kicked for sending unauthorized link`, "text", {
                mentions: [usr],
              });
            } catch (kickError) {
              await message.sendMessage(`${customMessage}\n\n*Error:* Failed to kick user`, "text", {
                mentions: [usr],
              });
            }
          }
        }
      }
    }
  }
);
Module(
  {
    pattern: "uptime",
    fromMe: true,
    use: "utility",
    desc: "Shows system (OS) /process uptime",
  },
  async (message, match) => {
    var ut_sec = require("os").uptime();
    var ut_min = ut_sec / 60;
    var ut_hour = ut_min / 60;
    ut_sec = Math.floor(ut_sec);
    ut_min = Math.floor(ut_min);
    ut_hour = Math.floor(ut_hour);
    ut_hour = ut_hour % 60;
    ut_min = ut_min % 60;
    ut_sec = ut_sec % 60;
    var uptime_os = `_System (OS) : ${ut_hour} Hour(s), ${ut_min} minute(s) and ${ut_sec} second(s)_`;
    var sec_num = parseInt(process.uptime(), 10);
    var hours = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - hours * 3600) / 60);
    var seconds = sec_num - hours * 3600 - minutes * 60;
    var uptime_process = `_Process : ${hours} Hour(s), ${minutes} minute(s) and ${seconds} second(s)_`;
    return await message.sendReply(
      `                 _*[ UP-TIME ]*_\n\n${uptime_os}\n${uptime_process}`
    );
  }
);
Module(
  {
    on: "text",
    fromMe: !0,
  },
  async (message) => {
    if (message.message?.startsWith(">")) {
      var m = message;
      const util = require("util");
      const js = (x) => JSON.stringify(x, null, 2);
      try {
        let return_val = await eval(
          `(async () => { ${message.message.replace(">", "")} })()`
        );
        if (return_val && typeof return_val !== "string")
          return_val = util.inspect(return_val);
        if (return_val) {
          await message.sendMessage(return_val, "text");
        } else {
          const reactionMessage = {
            react: {
              text: "✅",
              key: m.data.key,
            },
          };
          
          await m.client.sendMessage(m.jid, reactionMessage);
        }
      } catch (e) {
        if (e) await message.sendMessage(util.format(e), "text");
      }
    }
  }
);
Module(
  {
    pattern: "testlink ?(.*)",
    fromMe: true,
    desc: "Test link detection for debugging",
    use: "utility",
  },
  async (message, match) => {
    const testText =
      match[1] || message.reply_message?.text || "No text provided";

    const foundLinks = linkDetector.detectLinks(testText);

    const result =
      `🔍 *Link Detection Test*\n\n` +
      `*Text:* ${testText}\n\n` +
      `*Detected Links:* ${foundLinks.length}\n` +
      `${
        foundLinks.length > 0
          ? foundLinks.map((link, i) => `${i + 1}. \`${link}\``).join("\n")
          : "_No links detected_"
      }\n\n` +
      `*Examples that SHOULD be detected:*\n` +
      linkDetector.testExamples.shouldDetect
        .slice(0, 5)
        .map((link) => `✅ ${link}`)
        .join("\n") +
      `\n\n*Examples that should NOT be detected:*\n` +
      linkDetector.testExamples.shouldNotDetect
        .slice(0, 5)
        .map((link) => `❌ ${link}`)
        .join("\n");

    await message.sendReply(result);
  }
);
module.exports = {
  containsDisallowedWords,
  setVar,
  delVar,
};
