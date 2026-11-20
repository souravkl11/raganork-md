const escapeRegex = (word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function containsDisallowedWords(str, disallowedWords, { wholeWord = false } = {}) {
  const text = String(str || "").toLowerCase();
  for (const raw of disallowedWords) {
    const word = String(raw).trim().toLowerCase();
    if (!word) continue;
    let pattern;
    try {
      pattern = wholeWord
        ? new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegex(word)}(?![\\p{L}\\p{N}])`, "u")
        : new RegExp(word);
    } catch (_) {
      pattern = new RegExp(escapeRegex(word));
    }
    const found = text.match(pattern);
    if (found && found[0]) return found[0];
  }
}

const { Module } = require("../main");
const { filter, groupAdminGuard } = require("./utils");
const config = require("../config");
const catalog = require("../core/config/catalog");
const ui = require("../core/ui");
const fs = require("fs");
const configStore = require("../core/config/store");
const context = require("../core/context");
const identity = require("../core/identity");
const { needsRestart } = require("../core/config/schema");

const { helpPrefix, commandName } = require("../core/plugins/registry");

function restartNote(key) {
  return needsRestart(key) ? "\n_Restart needed for this to take effect._" : "";
}

const PROTECTED_KEYS = ["SESSION", "DATABASE_URL"];

const isSecretKey = (key) => {
  const name = String(key).trim().toUpperCase();
  return PROTECTED_KEYS.includes(name) || /_(KEY|TOKEN|SECRET)$/.test(name);
};

function inOwnChat(message) {
  const ids = identity.botIds(message.client);
  return message.jid === ids.lid || message.jid === ids.pn;
}

const showValue = (key, value, message) =>
  isSecretKey(key) && !inOwnChat(message) ? "[hidden, ask in your own chat]" : value;

async function setVar(key, value, message = false) {
  await configStore.set(key.trim(), value, { persist: true });
  if (message) {
    await message.sendReply(
      `_${key.trim()} set to '${value}' successfully!_${restartNote(key.trim())}`
    );
  }
  return true;
}

async function delVar(key, message = false) {
  const name = key.trim();
  // inside a session, fall back to deleting the global value when there's no session one
  let removed = await configStore.unset(name, { persist: true });
  if (!removed && context.accountId()) {
    removed = await context.runUnscoped(() => configStore.unset(name, { persist: true }));
  }
  if (message) {
    await message.sendReply(
      removed
        ? `_${name} deleted successfully!_${restartNote(name)}`
        : `_${name} is not set._`
    );
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
        `_Invalid format. Use: ${helpPrefix()}setvar KEY=VALUE_`
      );
    }

    const [key, ...valueParts] = input.split("=");
    const value = valueParts.join("=").trim();

    if (key.trim().toUpperCase() === "SUDO") {
      return await message.sendReply(
        `_Setting SUDO via setvar is deprecated!_\n\n_Use \`${helpPrefix()}setsudo\` command instead to properly manage sudo users with LID support._`
      );
    }

    if (PROTECTED_KEYS.includes(key.trim().toUpperCase())) {
      return await message.sendReply(
        `_${key.trim().toUpperCase()} can't be changed with ${helpPrefix()}setvar. Edit it in the platform settings._`
      );
    }

    try {
      // a secret typed here must not be echoed back into the chat
      if (isSecretKey(key)) {
        await setVar(key.trim(), value);
        await message.sendReply(
          `_${key.trim()} set successfully!_${restartNote(key.trim())}`
        );
      } else {
        await setVar(key.trim(), value, message);
      }
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
        `_Please provide a variable name. Use: ${helpPrefix()}getvar MY_VAR_`
      );
    }

    const variable = config[key];
    if (variable !== undefined && variable !== null && variable !== "") {
      await message.sendReply(
        `_Variable '${key}': ${showValue(key, variable, message)}_`
      );
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
        `_Please provide a variable name. Use: ${helpPrefix()}delvar MY_VAR_`
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
        `_Invalid format. Use: ${helpPrefix()}setenv KEY=VALUE_`
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
        `_Environment variable '${trimmedKey}' set to '${showValue(trimmedKey, value, message)}' in config.env_\n\n_Note: Restart required for changes to take effect._`
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
      const keys = config.getDynamicKeys().sort();
      if (keys.length === 0) {
        return await message.sendReply("_No variables are set in the database._");
      }
      const lines = keys.map(
        (key) => `*${key}*: ${showValue(key, config[key], message)}`
      );
      await message.sendReply(`*All Bot Variables:*\n\n${lines.join("\n")}`);
    } catch (error) {
      await message.sendReply(
        `_Failed to fetch variables. Error: ${error.message}_`
      );
    }
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

const BUTTONS_WARNING =
  "_*⚠️ Interactive buttons are unofficial.*_\n_WhatsApp may stop showing them at any time, or restrict accounts that use them. Use at your own risk._\n\n_If buttons stop showing, type_ `{p}settings BUTTONS off` _to go back to normal mode._";

const capitalize = (v) => String(v).charAt(0).toUpperCase() + String(v).slice(1);

function rawValue(key) {
  const v = config[key];
  return Array.isArray(v) ? v.join(",") : String(v ?? "");
}

function valueLabel(s) {
  if (s.kind === "bool") return catalog.isOn(config[s.key]) ? "ON ✅" : "OFF ❌";
  const v = rawValue(s.key);
  if (s.kind === "enum") return capitalize(v && v !== "false" ? v : s.options[0].value);
  return v === "" || v === "false" ? "not set" : v;
}

function choicesOf(s) {
  if (s.kind === "bool") {
    return [
      { label: "ON", button: "✅ On", value: "true", word: "on" },
      { label: "OFF", button: "❌ Off", value: s.offValue ?? "false", word: "off" },
    ];
  }
  if (s.kind === "enum") {
    return s.options.map((o) => ({ label: capitalize(o.value), button: capitalize(o.value), value: o.value, word: o.value, also: o.also }));
  }
  return [];
}

const backButton = () => ({ text: "⬅️ Back", id: ui.cmd("settings") });

function menuText() {
  const p = helpPrefix();
  let n = 0;
  let text = `*_Settings configuration menu_*\n_Reply with a number, or use_ \`${p}settings <name>\`\n`;
  for (const cat of catalog.settingsCatalog()) {
    text += `\n*${cat.name}*\n`;
    for (const item of cat.items) {
      n += 1;
      text += `_${n}. ${item.title}_ · ${valueLabel(item)}\n`;
    }
  }
  return text.trim();
}

async function showMenu(message) {
  return await message.sendList({
    text: menuText(),
    header: "⚙️ Bot settings",
    body: "_Tap the button below and pick a setting to change it._",
    footer: `${config.BOT_NAME} · v${config.VERSION}`,
    button: "Open settings",
    sections: catalog.settingsCatalog().map((cat) => ({
      title: cat.name,
      rows: cat.items.map((item) => ({
        title: item.title,
        description: valueLabel(item),
        id: ui.cmd("settings", item.key),
      })),
    })),
  });
}

function detailText(s) {
  const p = helpPrefix();
  let text = `*_${s.title}_* (${s.key})\n`;
  if (s.desc) text += `_${s.desc}_\n`;
  text += `_Now:_ ${valueLabel(s)}\n`;
  const choices = choicesOf(s);
  if (choices.length) {
    text += "\n" + choices.map((c, i) => `${i + 1}. ${c.label}`).join("\n");
  } else if (s.via) {
    text += `\n_Change it with_ \`${p}${s.via}\``;
  } else {
    text += `\n_Change it with_ \`${p}setvar ${s.key}=value\``;
  }
  return text + restartNote(s.key);
}

async function showSetting(message, s) {
  const text = detailText(s);
  const choices = choicesOf(s);
  const opts = { text, header: s.title, body: text.replace(/^\*_.+?_\* \([A-Z_]+\)\n/, ""), footer: s.category };
  if (s.via) {
    return await message.sendButtons({ ...opts, buttons: [{ text: "ℹ️ How to change", id: ui.cmd(s.via) }, backButton()] });
  }
  if (!choices.length) {
    const current = rawValue(s.key);
    const copy = `${helpPrefix()}setvar ${s.key}=${current.length <= 200 && current !== "false" ? current : ""}`;
    return await message.sendButtons({ ...opts, buttons: [{ text: "✏️ Copy command", copy }, backButton()] });
  }
  const choiceButton = (c) => ({ text: c.button, id: ui.cmd("settings", s.key, c.word) });
  if (choices.length <= 2) {
    return await message.sendButtons({ ...opts, buttons: [...choices.map(choiceButton), backButton()] });
  }
  return await message.sendList({
    ...opts,
    button: "Choose",
    sections: [{ title: s.title, rows: choices.map((c) => ({ title: c.button, id: choiceButton(c).id })) }],
    extraButtons: [backButton()],
  });
}

async function confirm(message, text) {
  return await message.sendButtons({ text, buttons: [{ text: "⬅️ Back to settings", id: ui.cmd("settings") }] });
}

async function applyValue(message, s, value, also) {
  const turningButtonsOn = s.key === "BUTTONS" && catalog.isOn(value) && !ui.enabled();
  if (turningButtonsOn) await message.sendReply(BUTTONS_WARNING.replace("{p}", helpPrefix()));
  await setVar(s.key, value);
  for (const [k, v] of Object.entries(also || {})) await setVar(k, v);
  if (turningButtonsOn) {
    return await message.sendButtons({
      text: `_Buttons enabled ✅_\n_If you don't see buttons on this message, type_ \`${helpPrefix()}settings BUTTONS off\``,
      body: "_Buttons enabled ✅_\n_If you can see the buttons below, they work on your WhatsApp._",
      footer: "Use at your own risk",
      buttons: [
        { text: "⚙️ Settings", id: ui.cmd("settings") },
        { text: "📜 Menu", id: ui.cmd("menu") },
      ],
    });
  }
  return await confirm(message, `_${s.title} set to ${valueLabel(s)}_${restartNote(s.key)}`);
}

// resolves typed input ("on", "public", any text) against the setting's kind
async function setFromInput(message, s, input) {
  const choices = choicesOf(s);
  if (choices.length) {
    const word = input.toLowerCase();
    let choice = choices.find((c) => c.word === word);
    if (!choice && s.kind === "bool") {
      if (["true", "1", "yes", "enable"].includes(word)) choice = choices[0];
      if (["false", "0", "no", "disable"].includes(word)) choice = choices[1];
    }
    if (!choice) {
      return await message.sendReply(`_Invalid value for ${s.title}. Use: ${choices.map((c) => c.word).join(" / ")}_`);
    }
    return await applyValue(message, s, choice.value, choice.also);
  }
  if (s.via) {
    return await message.sendReply(`_Use_ \`${helpPrefix()}${s.via}\` _to change ${s.title.toLowerCase()}._`);
  }
  if (s.kind === "number" && !/^\d+$/.test(input)) {
    return await message.sendReply(`_${s.title} must be a number_`);
  }
  return await applyValue(message, s, input);
}

Module(
  {
    pattern: "settings ?(.*)",
    fromMe: true,
    desc: "View and change every bot setting. Use .settings <name> [value]",
    usage: ".settings | .settings ALWAYS_ONLINE on",
    use: "owner",
  },
  async (message, match) => {
    const input = match[1]?.trim();
    if (!input) return await showMenu(message);
    const [first, ...rest] = input.split(/\s+/);
    const all = catalog.allSettings();
    const s = /^\d+$/.test(first) ? all[parseInt(first) - 1] : catalog.settingFor(first);
    if (!s) {
      return await message.sendReply(`_Unknown setting '${first}'. Use_ \`${helpPrefix()}settings\` _to see all._`);
    }
    if (!rest.length) return await showSetting(message, s);
    return await setFromInput(message, s, input.slice(first.length).trim());
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
      const text = `_*Mode manager*_\n_Current mode: ${config.MODE}_\n_Use \`${helpPrefix()}mode public|private\`_`;
      return await message.sendButtons({
        text,
        header: "Mode manager",
        body: `_Current mode: *${config.MODE}*_\n_Public: everyone can use commands. Private: only you and sudo._`,
        buttons: [
          { text: "🌍 Public", id: ui.cmd("mode", "public") },
          { text: "🔒 Private", id: ui.cmd("mode", "private") },
        ],
      });
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
    const usage = `_Usage:_\n\`${helpPrefix()}antidelete chat\` - _sends to original chat_\n\`${helpPrefix()}antidelete here\` - _sends to this chat_\n\`${helpPrefix()}antidelete sudo\` - _sends to first sudo_\n\`${helpPrefix()}antidelete <jid/number>\` - _sends to custom chat_\n\`${helpPrefix()}antidelete own on/off\` - _also recover messages deleted by the bot/owner_\n\`${helpPrefix()}antidelete off\` - _disables anti-delete_`;
    const describe = () => {
      const mode = config.ANTI_DELETE;
      if (!mode || mode === "off" || mode === "false") return "off";
      return mode === "custom" ? `custom (${config.ANTI_DELETE_JID})` : mode;
    };
    if (!target) {
      return await message.sendReply(
        `_*Anti delete*_\n\n_Recovers deleted messages and sends automatically_\n\n_Current status: ${describe()}_\n_Own deletions: ${
          String(config.ANTI_DELETE_OWN) === "true" ? "recovered" : "ignored"
        }_\n\n${usage}`
      );
    }

    target = target.toLowerCase();

    if (target === "off") {
      await setVar("ANTI_DELETE", "off");
      await setVar("ANTI_DELETE_JID", "");
      return await message.sendReply(`_Anti-delete deactivated ❌_`);
    } else if (/^own\s+(on|off)$/.test(target)) {
      const on = target.endsWith("on");
      await setVar("ANTI_DELETE_OWN", on ? "true" : "false");
      return await message.sendReply(
        `_Messages deleted by the bot/owner will be ${
          on ? "recovered ✅" : "ignored ❌"
        }_`
      );
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
    } else if (target === "here" || /^\d{7,}$/.test(target) || target.includes("@")) {
      const jid =
        target === "here"
          ? message.jid
          : target.includes("@")
          ? target
          : `${target}@s.whatsapp.net`;
      if (!jid.match(/^[\w.-]+@(s\.whatsapp\.net|g\.us|lid)$/)) {
        return await message.sendReply(
          `_Invalid JID format!_\n\n_Accepted formats:_\n- \`123020340234@s.whatsapp.net\` (personal)\n- \`123020340234@g.us\` (group)_`
        );
      }
      await setVar("ANTI_DELETE", "custom");
      await setVar("ANTI_DELETE_JID", jid);
      return await message.sendReply(
        `_Anti-delete activated ✅_\n\n_Recovered messages will be sent to: ${jid}_`
      );
    } else {
      return await message.sendReply(`_Invalid option!_\n\n${usage}`);
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

    if (m.isGroup) {
      if (m.mention && m.mention.length > 0) {
        targetLid = m.mention[0];
      } else if (m.reply_message) {
        targetLid = m.reply_message.jid;
      } else {
        return await m.sendReply("_Need reply or mention in groups_");
      }
    } else {
      targetLid = m.sender;
    }

    if (!targetLid) return await m.sendReply("_Could not determine target_");

    try {
      let sudoMap = [];
      if (config.SUDO_MAP) {
        try {
          sudoMap = JSON.parse(config.SUDO_MAP);
          if (!Array.isArray(sudoMap)) sudoMap = [];
        } catch (e) {
          sudoMap = [];
        }
      }

      if (sudoMap.includes(targetLid)) {
        return await m.sendReply("_User is already a sudo_");
      }

      sudoMap.push(targetLid);
      await setVar("SUDO_MAP", JSON.stringify(sudoMap));

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

    if (m.isGroup) {
      if (m.mention && m.mention.length > 0) {
        targetLid = m.mention[0];
      } else if (m.reply_message) {
        targetLid = m.reply_message.jid;
      } else {
        return await m.sendReply("_Need reply or mention in groups_");
      }
    } else {
      targetLid = m.sender;
    }

    if (!targetLid) return await m.sendReply("_Could not determine target_");

    try {
      let sudoMap = [];
      if (config.SUDO_MAP) {
        try {
          sudoMap = JSON.parse(config.SUDO_MAP);
          if (!Array.isArray(sudoMap)) sudoMap = [];
        } catch (e) {
          sudoMap = [];
        }
      }

      if (!sudoMap.includes(targetLid)) {
        return await m.sendReply("_User is not a sudo_");
      }

      sudoMap = sudoMap.filter((lid) => lid !== targetLid);
      await setVar("SUDO_MAP", JSON.stringify(sudoMap));

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

const FILTER_SCOPES = ["chat", "global", "group", "dm"];

const listOf = (raw) =>
  typeof raw === "string"
    ? raw
        .split(",")
        .map((x) => x.trim())
        .filter((x) => x && x !== "null")
    : [];

async function toggleFilter(message, input) {
  if (!message.fromOwner) {
    if (!message.isGroup || !(await groupAdminGuard(message))) return;
  }
  if (!input) {
    return await message.sendReply(
      `_Provide filter trigger to toggle!_\n_Usage: ${helpPrefix()}filter toggle trigger_`
    );
  }
  // triggers can contain spaces, so only a trailing scope word is split off
  const words = input.split(/\s+/);
  const last = words[words.length - 1].toLowerCase();
  const scoped = words.length > 1 && FILTER_SCOPES.includes(last);
  const scope = scoped ? last : "chat";
  const trigger = (scoped ? words.slice(0, -1) : words).join(" ");
  if (scope !== "chat" && !message.fromOwner) {
    return await message.sendReply(
      `_Only the owner can toggle ${scope} filters!_`
    );
  }
  try {
    const toggled = await filter.toggle(trigger, message.jid, scope);
    if (!toggled) {
      return await message.sendReply(`❌ _Filter "${trigger}" not found!_`);
    }
    await message.sendReply(
      `✅ _Filter "${trigger}" ${
        toggled.enabled ? "enabled" : "disabled"
      } successfully!_`
    );
  } catch (error) {
    console.error("Filter toggle error:", error);
    await message.sendReply("_Failed to toggle filter!_");
  }
}

Module(
  {
    pattern: "toggle ?(.*)",
    fromMe: false,
    desc: "To toggle commands on/off (enable/disable)",
    usage: ".toggle img",
    use: "group",
  },
  async (message, match) => {
    const input = match[1]?.trim();
    const filterArgs = input?.match(/^filter(?:\s+(.*))?$/is);
    if (filterArgs) return await toggleFilter(message, filterArgs[1]?.trim());
    // open to everyone so admins reach the filter branch above
    if (!message.fromOwner) return;
    if (!input) {
      return await message.sendReply(
        `_Example: ${helpPrefix()}toggle img_\n\n_(This will disable ${helpPrefix()}img command)_`
      );
    }
    const name = input.toLowerCase();
    const { commands } = require("../main");
    const availableCommands = commands
      .filter((x) => x.pattern)
      .map((cmd) => commandName(cmd));
    if (!availableCommands.includes(name))
      return await message.sendReply(
        `_${helpPrefix()}${input} is not a valid command!_`
      );
    if (name == "toggle" || name == "setvar" || name == "getvar")
      return await message.sendReply(
        `_You can't disable ${helpPrefix()}${name} command!_`
      );
    const disabled = listOf(config.DISABLED_COMMANDS);
    if (!disabled.includes(name)) {
      disabled.push(name);
      await message.sendReply(
        `_Successfully turned off \`${helpPrefix()}${name}\` command_\n_Use \`${helpPrefix()}toggle ${name}\` to enable this command back_`
      );
      return await setVar("DISABLED_COMMANDS", disabled.join(","), false);
    }
    await message.sendReply(
      `_Successfully turned on \`${helpPrefix()}${name}\` command_`
    );
    return await setVar(
      "DISABLED_COMMANDS",
      disabled.filter((x) => x != name).join(","),
      false
    );
  }
);

const settingByTitle = (title) =>
  catalog.allSettings().find((s) => s.title.toLowerCase() === String(title || "").trim().toLowerCase()) || null;

// number replies to a text-mode menu or detail card; titles are matched first so
// menus sent by an older version (different order) still resolve correctly
async function handleSettingsReply(message) {
  if (!message.fromOwner) return false;
  const n = message.message?.match(/^\d+$/)?.[0];
  const quoted = message.reply_message?.text;
  if (!n || !quoted || !message.quoted?.key?.fromMe) return false;
  const num = parseInt(n);
  if (quoted.toLowerCase().includes("settings configuration menu")) {
    const line = quoted.match(new RegExp(`^_${num}\\. (.+?)_`, "m"))?.[1];
    const s = settingByTitle(line) || catalog.allSettings()[num - 1];
    if (!s) return false;
    await showSetting(message, s);
    return true;
  }
  const head = quoted.match(/^\*_(.+?)_\*(?: \(([A-Z_]+)\))?/m);
  if (!head || !/^1\. /m.test(quoted)) return false;
  const s = (head[2] && catalog.settingFor(head[2])) || settingByTitle(head[1]);
  if (!s) return false;
  const choice = choicesOf(s)[num - 1];
  if (!choice) return false;
  await applyValue(message, s, choice.value, choice.also);
  return true;
}

module.exports = {
  containsDisallowedWords,
  setVar,
  delVar,
  listOf,
  handleSettingsReply,
};
