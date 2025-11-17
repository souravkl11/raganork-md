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

    if (key.trim().toUpperCase() === "SUDO") {
      return await message.sendReply(
        "_Setting SUDO via setvar is deprecated!_\n\n_Use `.setsudo` command instead to properly manage sudo users with LID support._"
      );
    }

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
    pattern: "setenv ?(.*)",
    fromMe: true,
    desc: "Set environment variables in config.env",
    usage: ".setenv MY_VAR=some_value",
  },
  async (message, args) => {
    const input = args[1];
    if (!input || !input.includes("=")) {
      return await message.sendReply(
        "_Invalid format. Use: .setenv KEY=VALUE_"
      );
    }

    const [key, ...valueParts] = input.split("=");
    const value = valueParts.join("=").trim();
    const trimmedKey = key.trim();

    try {
      if (!fs.existsSync("./config.env")) {
        return await message.sendReply(
          "_Setting env variables unsupported on containers. Use setvar or set from platform settings._"
        );
      }

      let envContent = fs.readFileSync("./config.env", "utf8");
      const lines = envContent.split("\n");

      let found = false;
      const updatedLines = lines.map((line) => {
        if (line.trim().startsWith(`${trimmedKey}=`)) {
          found = true;
          return `${trimmedKey}=${value}`;
        }
        return line;
      });

      if (!found) {
        updatedLines.push(`${trimmedKey}=${value}`);
      }

      fs.writeFileSync("./config.env", updatedLines.join("\n"));

      await message.sendReply(
        `_Environment variable '${trimmedKey}' set to '${value}' in config.env_\n\n_Note: Restart required for changes to take effect._`
      );
    } catch (error) {
      await message.sendReply(
        `_Failed to set environment variable '${trimmedKey}'. Error: ${error.message}_`
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
        let msg = `_*${setting.title}*_\n\n1. ON\n2. OFF`;
        return await message.sendReply(msg);
      }
    }
    let msg =
      "*_Settings configuration menu_*\n\n_Select an option by number:_\n\n";
    configs.forEach((e, index) => {
      msg += `_${index + 1}. ${e.title}_\n`;
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
    let target = match[1]?.trim();
    if (!target) {
      return await message.sendReply(
        `_*Anti delete*_\n\n_Recovers deleted messages and sends automatically_\n\n_Current status: ${
          config.ANTI_DELETE || "off"
        }_\n\n_Usage:_\n\`.antidelete chat\` - _sends to original chat_\n\`.antidelete sudo\` - _sends to first sudo_\n\`.antidelete <jid>\` - _sends to custom JID_\n\`.antidelete off\` - _disables anti-delete_`
      );
    }

    target = target.toLowerCase();

    if (target === "off") {
      await setVar("ANTI_DELETE", "off");
      await setVar("ANTI_DELETE_JID", "");
      return await message.sendReply(`_Anti-delete deactivated ❌_`);
    } else if (target === "chat") {
      await setVar("ANTI_DELETE", "chat");
      await setVar("ANTI_DELETE_JID", "");
      return await message.sendReply(
        `_Anti-delete activated ✅_\n\n_Recovered messages will be sent to the original chat_`
      );
    } else if (target === "sudo") {
      await setVar("ANTI_DELETE", "sudo");
      await setVar("ANTI_DELETE_JID", "");
      return await message.sendReply(
        `_Anti-delete activated ✅_\n\n_Recovered messages will be sent to the first sudo_`
      );
    } else if (target.includes("@")) {
      if (!target.match(/^\d+@(s\.whatsapp\.net|g\.us)$/)) {
        return await message.sendReply(
          `_Invalid JID format!_\n\n_Accepted formats:_\n- \`123020340234@s.whatsapp.net\` (personal)\n- \`123020340234@g.us\` (group)_`
        );
      }
      await setVar("ANTI_DELETE", "custom");
      await setVar("ANTI_DELETE_JID", target);
      return await message.sendReply(
        `_Anti-delete activated ✅_\n\n_Recovered messages will be sent to: ${target}_`
      );
    } else {
      return await message.sendReply(
        `_Invalid option!_\n\n_Usage:_\n\`.antidelete chat\` - _sends to original chat_\n\`.antidelete sudo\` - _sends to first sudo_\n\`.antidelete <jid>\` - _sends to custom JID_\n\`.antidelete off\` - _disables anti-delete_`
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
    let targetLid;

    // determine target based on context
    if (m.isGroup) {
      // in groups: check mention first, then reply
      if (m.mention && m.mention.length > 0) {
        targetLid = m.mention[0];
      } else if (m.reply_message) {
        targetLid = m.reply_message.jid;
      } else {
        return await m.sendReply("_Need reply or mention in groups_");
      }
    } else {
      // in DM: use sender
      targetLid = m.sender;
    }

    if (!targetLid) return await m.sendReply("_Could not determine target_");

    try {
      // get current SUDO_MAP
      let sudoMap = [];
      if (config.SUDO_MAP) {
        try {
          sudoMap = JSON.parse(config.SUDO_MAP);
          if (!Array.isArray(sudoMap)) sudoMap = [];
        } catch (e) {
          sudoMap = [];
        }
      }

      // check if already sudo
      if (sudoMap.includes(targetLid)) {
        return await m.sendReply("_User is already a sudo_");
      }

      // add to sudo map
      sudoMap.push(targetLid);
      await setVar("SUDO_MAP", JSON.stringify(sudoMap));

      // format for display
      const displayId = targetLid.split("@")[0];

      await m.sendMessage(`_Added @${displayId} as sudo_`, "text", {
        mentions: [targetLid],
      });
    } catch (error) {
      console.error("setsudo error:", error);
      await m.sendReply(`_Error setting sudo: ${error.message}_`);
    }
  }
);

Module(
  {
    pattern: "getsudo ?(.*)",
    fromMe: true,
    use: "owner",
  },
  async (message, match) => {
    let sudoMap = [];
    if (config.SUDO_MAP) {
      try {
        sudoMap = JSON.parse(config.SUDO_MAP);
        if (!Array.isArray(sudoMap)) sudoMap = [];
      } catch (e) {
        sudoMap = [];
      }
    }

    if (sudoMap.length === 0) {
      return await message.sendReply("_No sudo users configured_");
    }

    const sudoList = sudoMap
      .map((lid, index) => {
        const displayId = lid.split("@")[0];
        return `${index + 1}. @${displayId}`;
      })
      .join("\n");

    await message.sendMessage(`*Sudo Users:*\n\n${sudoList}`, "text", {
      mentions: sudoMap,
    });
  }
);

Module(
  {
    pattern: "delsudo ?(.*)",
    fromMe: true,
    desc: "Deletes sudo",
  },
  async (m, mm) => {
    let targetLid;

    // determine target based on context
    if (m.isGroup) {
      // in groups: check mention first, then reply
      if (m.mention && m.mention.length > 0) {
        targetLid = m.mention[0];
      } else if (m.reply_message) {
        targetLid = m.reply_message.jid;
      } else {
        return await m.sendReply("_Need reply or mention in groups_");
      }
    } else {
      // in DM: use sender
      targetLid = m.sender;
    }

    if (!targetLid) return await m.sendReply("_Could not determine target_");

    try {
      // get current SUDO_MAP
      let sudoMap = [];
      if (config.SUDO_MAP) {
        try {
          sudoMap = JSON.parse(config.SUDO_MAP);
          if (!Array.isArray(sudoMap)) sudoMap = [];
        } catch (e) {
          sudoMap = [];
        }
      }

      // check if user is sudo
      if (!sudoMap.includes(targetLid)) {
        return await m.sendReply("_User is not a sudo_");
      }

      // remove from sudo map
      sudoMap = sudoMap.filter((lid) => lid !== targetLid);
      await setVar("SUDO_MAP", JSON.stringify(sudoMap));

      // format for display
      const displayId = targetLid.split("@")[0];

      await m.sendMessage(`_Removed @${displayId} from sudo!_`, "text", {
        mentions: [targetLid],
      });
    } catch (error) {
      console.error("delsudo error:", error);
      await m.sendReply(`_Error removing sudo: ${error.message}_`);
    }
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
    pattern: "callreject ?(.*)",
    fromMe: true,
    desc: "Comprehensive call rejection management system",
    usage:
      ".callreject on/off\n.callreject allow <number>\n.callreject remove <number>\n.callreject list\n.callreject clear\n.callreject msg <message>\n.callreject msg off",
    use: "owner",
  },
  async (message, match) => {
    const input = match[1]?.trim();

    if (!input) {
      return await message.sendReply(
        "*📞 Call Rejection Management*\n\n" +
          "*Basic Controls:*\n" +
          "• `.callreject on` - Enable call rejection\n" +
          "• `.callreject off` - Disable call rejection\n\n" +
          "*Whitelist Management:*\n" +
          "• `.callreject allow <number>` - Whitelist a number\n" +
          "• `.callreject remove <number>` - Remove from whitelist\n" +
          "• `.callreject list` - Show whitelisted numbers\n" +
          "• `.callreject clear` - Clear all whitelisted numbers\n\n" +
          "*Message Settings:*\n" +
          "• `.callreject msg <text>` - Set rejection message\n" +
          "• `.callreject msg off` - Disable rejection message\n\n" +
          "*Current Status:*\n" +
          `• Call Rejection: ${
            config.REJECT_CALLS ? "✅ Enabled" : "❌ Disabled"
          }\n` +
          `• Rejection Message: ${
            config.CALL_REJECT_MESSAGE ? "✅ Set" : "❌ Not Set"
          }\n` +
          `• Whitelisted Numbers: ${
            config.ALLOWED_CALLS ? config.ALLOWED_CALLS.split(",").length : 0
          }`
      );
    }

    const [action, ...restParts] = input.split(" ");
    const rest = restParts.join(" ");

    switch (action.toLowerCase()) {
      case "on":
      case "enable":
        await setVar("REJECT_CALLS", "true", false);
        await message.sendReply(
          "*✅ Call rejection enabled*\n\nAll incoming calls will be rejected except whitelisted numbers."
        );
        break;

      case "off":
      case "disable":
        await setVar("REJECT_CALLS", "false", false);
        await message.sendReply(
          "*❌ Call rejection disabled*\n\nAll incoming calls will be accepted."
        );
        break;

      case "allow":
        if (!rest) {
          if (!message.jid.includes("@g.us")) {
            const chatNumber = message.jid.split("@")[0];
            const myNumber = message.client.user.id.split(":")[0];

            if (chatNumber === myNumber) {
              return await message.sendReply(
                "*❌ You cannot whitelist your own number*"
              );
            }

            let allowedNumbers = config.ALLOWED_CALLS
              ? config.ALLOWED_CALLS.split(",")
                  .map((n) => n.trim())
                  .filter((n) => n)
              : [];

            if (allowedNumbers.includes(chatNumber)) {
              return await message.sendReply(
                `*📞 Number +${chatNumber} is already whitelisted*`
              );
            }

            allowedNumbers.push(chatNumber);
            await setVar("ALLOWED_CALLS", allowedNumbers.join(","), false);
            await message.sendReply(
              `*✅ Whitelisted +${chatNumber}*\n\nThis number can now call you even when call rejection is enabled.`
            );
          } else {
            return await message.sendReply(
              "*❌ Please provide a phone number*\n\n*Usage:* `.callreject allow 919876543210`\n\n*Note:* In DM chats, you can use `.callreject allow` without a number to whitelist that contact."
            );
          }
        } else {
          const number = rest.replace(/[^0-9]/g, "");
          if (!number) {
            return await message.sendReply(
              "*❌ Please provide a valid phone number*\n\n*Usage:* `.callreject allow 919876543210`"
            );
          }

          let allowedNumbers = config.ALLOWED_CALLS
            ? config.ALLOWED_CALLS.split(",")
                .map((n) => n.trim())
                .filter((n) => n)
            : [];

          if (allowedNumbers.includes(number)) {
            return await message.sendReply(
              `*📞 Number +${number} is already whitelisted*`
            );
          }

          allowedNumbers.push(number);
          await setVar("ALLOWED_CALLS", allowedNumbers.join(","), false);
          await message.sendReply(
            `*✅ Whitelisted +${number}*\n\nThis number can now call you even when call rejection is enabled.`
          );
        }
        break;

      case "remove":
        if (!rest) {
          if (!message.jid.includes("@g.us")) {
            const chatNumber = message.jid.split("@")[0];
            let allowedNumbers = config.ALLOWED_CALLS
              ? config.ALLOWED_CALLS.split(",")
                  .map((n) => n.trim())
                  .filter((n) => n)
              : [];

            if (!allowedNumbers.includes(chatNumber)) {
              return await message.sendReply(
                `*📞 Number +${chatNumber} is not whitelisted*`
              );
            }

            allowedNumbers = allowedNumbers.filter((n) => n !== chatNumber);
            await setVar("ALLOWED_CALLS", allowedNumbers.join(","), false);
            await message.sendReply(
              `*🚫 Removed +${chatNumber} from whitelist*\n\nThis number will now be blocked when call rejection is enabled.`
            );
          } else {
            return await message.sendReply(
              "*❌ Please provide a phone number*\n\n*Usage:* `.callreject remove 919876543210`\n\n*Note:* In DM chats, you can use `.callreject remove` without a number to remove that contact from whitelist."
            );
          }
        } else {
          const number = rest.replace(/[^0-9]/g, "");
          if (!number) {
            return await message.sendReply(
              "*❌ Please provide a valid phone number*\n\n*Usage:* `.callreject remove 919876543210`"
            );
          }

          let allowedNumbers = config.ALLOWED_CALLS
            ? config.ALLOWED_CALLS.split(",")
                .map((n) => n.trim())
                .filter((n) => n)
            : [];

          if (!allowedNumbers.includes(number)) {
            return await message.sendReply(
              `*📞 Number +${number} is not whitelisted*`
            );
          }

          allowedNumbers = allowedNumbers.filter((n) => n !== number);
          await setVar("ALLOWED_CALLS", allowedNumbers.join(","), false);
          await message.sendReply(
            `*🚫 Removed +${number} from whitelist*\n\nThis number will now be blocked when call rejection is enabled.`
          );
        }
        break;

      case "list":
        const allowedNumbers = config.ALLOWED_CALLS
          ? config.ALLOWED_CALLS.split(",")
              .map((n) => n.trim())
              .filter((n) => n)
          : [];

        if (allowedNumbers.length === 0) {
          return await message.sendReply(
            "*📞 No numbers in the whitelist*\n\nAll calls will be rejected when call rejection is enabled."
          );
        }

        const numbersText = allowedNumbers
          .map((num, index) => `${index + 1}. +${num}`)
          .join("\n");
        await message.sendReply(
          `*📞 Whitelisted Numbers*\n\n${numbersText}\n\n*Total:* ${allowedNumbers.length} numbers`
        );
        break;

      case "clear":
        const currentAllowed = config.ALLOWED_CALLS
          ? config.ALLOWED_CALLS.split(",")
              .map((n) => n.trim())
              .filter((n) => n)
          : [];

        if (currentAllowed.length === 0) {
          return await message.sendReply("*📞 Whitelist is already empty*");
        }

        await setVar("ALLOWED_CALLS", "", false);
        await message.sendReply(
          `*🗑️ Cleared whitelist*\n\nRemoved ${currentAllowed.length} numbers from the whitelist. All calls will now be rejected when call rejection is enabled.`
        );
        break;

      case "msg":
      case "message":
        if (!rest) {
          const currentMsg = config.CALL_REJECT_MESSAGE;
          return await message.sendReply(
            "*📞 Call Rejection Message*\n\n" +
              `*Current Message:* ${currentMsg || "Not set"}\n\n` +
              "*Commands:*\n" +
              "• `.callreject msg <your message>` - Set rejection message\n" +
              "• `.callreject msg off` - Disable rejection message\n\n" +
              "*Example:* `.callreject msg Sorry, I'm busy right now. I'll call you back later.`"
          );
        }

        if (rest.toLowerCase() === "off" || rest.toLowerCase() === "disable") {
          await setVar("CALL_REJECT_MESSAGE", "", false);
          await message.sendReply(
            "*🔇 Call rejection message disabled*\n\nRejected callers will not receive any message."
          );
        } else {
          await setVar("CALL_REJECT_MESSAGE", rest, false);
          await message.sendReply(
            `*✅ Call rejection message set*\n\n*Message:* "${rest}"\n\nThis message will be sent to rejected callers.`
          );
        }
        break;

      default:
        await message.sendReply(
          "*❌ Invalid command*\n\n" +
            "*Valid commands:* on, off, allow, remove, list, clear, msg\n\n" +
            "*Examples:*\n" +
            "• `.callreject on` - Enable call rejection\n" +
            "• `.callreject allow 919876543210` - Whitelist a number\n" +
            "• `.callreject msg I'm busy` - Set rejection message\n\n" +
            "Type `.callreject` for full help menu."
        );
        break;
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
        let msg = `*_${setting.title}_*\n1. ON\n2. OFF`;
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
          const usr = message.sender;

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
            const targetNumericId = usr?.split("@")[0];

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
              await message.sendMessage(
                `${customMessage}\n\n*Action:* User kicked for sending unauthorized link`,
                "text",
                {
                  mentions: [usr],
                }
              );
            } catch (kickError) {
              await message.sendMessage(
                `${customMessage}\n\n*Error:* Failed to kick user`,
                "text",
                {
                  mentions: [usr],
                }
              );
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
    const formatTime = (seconds) => {
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;

      return `${days} ${days === 1 ? "day" : "days"}, ${hours} ${
        hours === 1 ? "hr" : "hrs"
      }, ${mins} ${mins === 1 ? "min" : "mins"}, ${secs} ${
        secs === 1 ? "sec" : "secs"
      }`;
    };

    const osUptime = formatTime(Math.floor(require("os").uptime()));
    const processUptime = formatTime(Math.floor(process.uptime()));

    return await message.sendReply(
      `                 *[ UPTIME ]*\n\n_System: ${osUptime}_\n\n_Process: ${processUptime}_`
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
        const readMore = String.fromCharCode(8206).repeat(4001);
        if (e)
          await message.sendMessage(
            `_ ❌ Error:_\n${readMore}` + util.format(e),
            "text"
          );
      }
    }
  }
);
module.exports = {
  containsDisallowedWords,
  setVar,
  delVar,
};
