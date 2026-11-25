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
const { getString } = require("./utils/lang");
const Lang = getString("manage");
const capitalize = (v) => String(v).charAt(0).toUpperCase() + String(v).slice(1);

function restartNote(key) {
  return needsRestart(key) ? Lang.RESTART_NOTE : "";
}

const PROTECTED_KEYS = ["SESSION", "LOCAL_SESSIONS", "LOGIN_METHODS", "DATABASE_URL", "HATCHED_SESSIONS"];

const isSecretKey = (key) => {
  const name = String(key).trim().toUpperCase();
  return PROTECTED_KEYS.includes(name) || /_(KEY|TOKEN|SECRET)$/.test(name);
};

function inOwnChat(message) {
  const ids = identity.botIds(message.client);
  return message.jid === ids.lid || message.jid === ids.pn;
}

const showValue = (key, value, message) =>
  isSecretKey(key) && !inOwnChat(message) ? Lang.HIDDEN : value;

async function setVar(key, value, message = false) {
  await configStore.set(key.trim(), value, { persist: true });
  if (message) {
    await message.sendReply(
      Lang.SET.format(key.trim(), value, restartNote(key.trim()))
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
        ? Lang.DELETED.format(name, restartNote(name))
        : Lang.NOT_SET.format(name)
    );
  }
  return true;
}
Module(
  {
    pattern: "setvar ?(.*)",
    fromMe: true,
    desc: Lang.SETVAR_DESC,
    usage: ".setvar MY_VAR=some_value",
  },
  async (message, args) => {
    const input = args[1];
    if (!input || !input.includes("=")) {
      return await message.sendReply(
        Lang.SETVAR_FORMAT.format(helpPrefix())
      );
    }

    const [key, ...valueParts] = input.split("=");
    const value = valueParts.join("=").trim();

    if (key.trim().toUpperCase() === "SUDO") {
      return await message.sendReply(
        Lang.SUDO_DEPRECATED.format(helpPrefix())
      );
    }

    if (PROTECTED_KEYS.includes(key.trim().toUpperCase())) {
      return await message.sendReply(
        Lang.PROTECTED.format(key.trim().toUpperCase(), helpPrefix())
      );
    }

    try {
      // a secret typed here must not be echoed back into the chat
      if (isSecretKey(key)) {
        await setVar(key.trim(), value);
        await message.sendReply(
          Lang.SET_SECRET.format(key.trim(), restartNote(key.trim()))
        );
      } else {
        if (key.trim().toUpperCase() === "BUTTONS" && catalog.isOn(value) && !ui.enabled()) {
          await message.sendReply(BUTTONS_WARNING.replace("{p}", helpPrefix()));
        }
        await setVar(key.trim(), value, message);
      }
    } catch (error) {
      await message.sendReply(
        Lang.SET_FAILED.format(key.trim(), error.message)
      );
    }
  }
);

Module(
  {
    pattern: "getvar ?(.*)",
    fromMe: true,
    desc: Lang.GETVAR_DESC,
    usage: ".getvar MY_VAR",
  },
  async (message, args) => {
    const key = args[1]?.trim();
    if (!key) {
      return await message.sendReply(
        Lang.GETVAR_NEED.format(helpPrefix())
      );
    }

    const variable = config[key];
    if (variable !== undefined && variable !== null && variable !== "") {
      await message.sendReply(
        Lang.VARIABLE.format(key, showValue(key, variable, message))
      );
    } else {
      await message.sendReply(Lang.VAR_NOT_FOUND.format(key));
    }
  }
);

Module(
  {
    pattern: "delvar ?(.*)",
    fromMe: true,
    desc: Lang.DELVAR_DESC,
    usage: ".delvar MY_VAR",
  },
  async (message, args) => {
    const key = args[1]?.trim();
    if (!key) {
      return await message.sendReply(
        Lang.DELVAR_NEED.format(helpPrefix())
      );
    }
    try {
      if (config[key] === undefined) {
        return await message.sendReply(Lang.VAR_NOT_FOUND.format(key));
      }
      await delVar(key.trim(), message);
    } catch (error) {
      await message.sendReply(
        Lang.DEL_FAILED.format(key.trim(), error.message)
      );
    }
  }
);

Module(
  {
    pattern: "setenv ?(.*)",
    fromMe: true,
    desc: Lang.SETENV_DESC,
    usage: ".setenv MY_VAR=some_value",
  },
  async (message, args) => {
    const input = args[1];
    if (!input || !input.includes("=")) {
      return await message.sendReply(
        Lang.SETENV_FORMAT.format(helpPrefix())
      );
    }

    const [key, ...valueParts] = input.split("=");
    const value = valueParts.join("=").trim();
    const trimmedKey = key.trim();

    try {
      if (!fs.existsSync("./config.env")) {
        return await message.sendReply(
          Lang.SETENV_UNSUPPORTED
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
        Lang.SETENV_DONE.format(trimmedKey, showValue(trimmedKey, value, message))
      );
    } catch (error) {
      await message.sendReply(
        Lang.SETENV_FAILED.format(trimmedKey, error.message)
      );
    }
  }
);

Module(
  {
    pattern: "allvar",
    fromMe: true,
    desc: Lang.ALLVAR_DESC,
    use: "owner",
  },
  async (message, match) => {
    try {
      const keys = config.getDynamicKeys().sort();
      if (keys.length === 0) {
        return await message.sendReply(Lang.NO_VARS);
      }
      const lines = keys.map(
        (key) => `*${key}*: ${showValue(key, config[key], message)}`
      );
      await message.sendReply(Lang.ALL_VARS.format(lines.join("\n")));
    } catch (error) {
      await message.sendReply(
        Lang.ALLVAR_FAILED.format(error.message)
      );
    }
  }
);

Module(
  {
    pattern: "language ?(.*)",
    fromMe: true,
    desc: Lang.LANGUAGE_DESC,
    use: "settings",
  },
  async (message, match) => {
    // any json dropped into utils/lang is selectable
    const languages = fs
      .readdirSync(__dirname + "/utils/lang")
      .filter((file) => file.endsWith(".json"))
      .map((file) => file.slice(0, -5))
      .sort();
    if (!match[1] || !languages.includes(match[1].toLowerCase())) {
      const names = languages.map(capitalize);
      return await message.sendReply(
        Lang.BAD_LANGUAGE.format(
          names.length > 1 ? names.slice(0, -1).join(", ") + Lang.AND + names[names.length - 1] : names.join("")
        )
      );
    }
    return await setVar("LANGUAGE", match[1].toLowerCase(), message);
  }
);

const BUTTONS_WARNING = Lang.BUTTONS_WARNING;


function rawValue(key) {
  const v = config[key];
  return Array.isArray(v) ? v.join(",") : String(v ?? "");
}

function valueLabel(s) {
  if (s.kind === "bool") return catalog.isOn(config[s.key]) ? Lang.ON : Lang.OFF;
  const v = rawValue(s.key);
  if (s.kind === "enum") return capitalize(v && v !== "false" ? v : s.options[0].value);
  return v === "" || v === "false" ? Lang.VALUE_NOT_SET : v;
}

function choicesOf(s) {
  if (s.kind === "bool") {
    return [
      { label: Lang.CHOICE_ON, button: Lang.BUTTON_ON, value: "true", word: "on" },
      { label: Lang.CHOICE_OFF, button: Lang.BUTTON_OFF, value: s.offValue ?? "false", word: "off" },
    ];
  }
  if (s.kind === "enum") {
    return s.options.map((o) => ({ label: capitalize(o.value), button: capitalize(o.value), value: o.value, word: o.value, also: o.also }));
  }
  return [];
}

const backButton = () => ({ text: Lang.BACK, id: ui.cmd("settings") });

function menuText() {
  const p = helpPrefix();
  let n = 0;
  let text = Lang.MENU_HEADER.format(p);
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
    header: Lang.LIST_HEADER,
    body: Lang.LIST_BODY,
    footer: `${config.BOT_NAME} · v${config.VERSION}`,
    button: Lang.OPEN_SETTINGS,
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
  text += Lang.NOW.format(valueLabel(s));
  const choices = choicesOf(s);
  if (choices.length) {
    text += "\n" + choices.map((c, i) => `${i + 1}. ${c.label}`).join("\n");
  } else if (s.via) {
    text += Lang.CHANGE_WITH.format(p + s.via);
  } else {
    text += Lang.CHANGE_WITH.format(`${p}setvar ${s.key}=value`);
  }
  return text + restartNote(s.key);
}

async function showSetting(message, s) {
  const text = detailText(s);
  const choices = choicesOf(s);
  const opts = { text, header: s.title, body: text.replace(/^\*_.+?_\* \([A-Z_]+\)\n/, ""), footer: s.category };
  if (s.via) {
    return await message.sendButtons({ ...opts, buttons: [{ text: Lang.HOW_TO_CHANGE, id: ui.cmd(s.via) }, backButton()] });
  }
  if (!choices.length) {
    const current = rawValue(s.key);
    const copy = `${helpPrefix()}setvar ${s.key}=${current.length <= 200 && current !== "false" ? current : ""}`;
    return await message.sendButtons({ ...opts, buttons: [{ text: Lang.COPY_COMMAND, copy }, backButton()] });
  }
  const choiceButton = (c) => ({ text: c.button, id: ui.cmd("settings", s.key, c.word) });
  if (choices.length <= 2) {
    return await message.sendButtons({ ...opts, buttons: [...choices.map(choiceButton), backButton()] });
  }
  return await message.sendList({
    ...opts,
    button: Lang.CHOOSE,
    sections: [{ title: s.title, rows: choices.map((c) => ({ title: c.button, id: choiceButton(c).id })) }],
    extraButtons: [backButton()],
  });
}

async function confirm(message, text) {
  return await message.sendButtons({ text, buttons: [{ text: Lang.BACK_TO_SETTINGS, id: ui.cmd("settings") }] });
}

async function applyValue(message, s, value, also) {
  const turningButtonsOn = s.key === "BUTTONS" && catalog.isOn(value) && !ui.enabled();
  if (turningButtonsOn) await message.sendReply(BUTTONS_WARNING.replace("{p}", helpPrefix()));
  await setVar(s.key, value);
  for (const [k, v] of Object.entries(also || {})) await setVar(k, v);
  if (turningButtonsOn) {
    return await message.sendButtons({
      text: Lang.BUTTONS_ON_TEXT.format(helpPrefix()),
      body: Lang.BUTTONS_ON_BODY,
      footer: Lang.OWN_RISK,
      buttons: [
        { text: Lang.BTN_SETTINGS, id: ui.cmd("settings") },
        { text: Lang.BTN_MENU, id: ui.cmd("menu") },
      ],
    });
  }
  return await confirm(message, Lang.SETTING_SET.format(s.title, valueLabel(s), restartNote(s.key)));
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
      return await message.sendReply(Lang.INVALID_VALUE.format(s.title, choices.map((c) => c.word).join(" / ")));
    }
    return await applyValue(message, s, choice.value, choice.also);
  }
  if (s.via) {
    return await message.sendReply(Lang.USE_VIA.format(helpPrefix() + s.via, s.title.toLowerCase()));
  }
  if (s.kind === "number" && !/^\d+$/.test(input)) {
    return await message.sendReply(Lang.MUST_NUMBER.format(s.title));
  }
  return await applyValue(message, s, input);
}

Module(
  {
    pattern: "settings ?(.*)",
    fromMe: true,
    desc: Lang.SETTINGS_DESC,
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
      return await message.sendReply(Lang.UNKNOWN_SETTING.format(first, helpPrefix()));
    }
    if (!rest.length) return await showSetting(message, s);
    return await setFromInput(message, s, input.slice(first.length).trim());
  }
);

Module(
  {
    pattern: "mode ?(.*)",
    fromMe: true,
    desc: Lang.MODE_DESC,
    use: "settings",
  },
  async (message, match) => {
    if (
      match[1]?.toLowerCase() == "public" ||
      match[1]?.toLowerCase() == "private"
    ) {
      return await setVar("MODE", match[1], message);
    } else {
      const text = Lang.MODE_TEXT.format(config.MODE, helpPrefix());
      return await message.sendButtons({
        text,
        header: Lang.MODE_HEADER,
        body: Lang.MODE_BODY.format(config.MODE),
        buttons: [
          { text: Lang.BTN_PUBLIC, id: ui.cmd("mode", "public") },
          { text: Lang.BTN_PRIVATE, id: ui.cmd("mode", "private") },
        ],
      });
    }
  }
);

Module(
  {
    pattern: "antidelete ?(.*)",
    fromMe: true,
    desc: Lang.ANTIDELETE_DESC,
    use: "settings",
  },
  async (message, match) => {
    let target = match[1]?.trim();
    const usage = Lang.ANTIDELETE_USAGE.replaceAll("{p}", helpPrefix());
    const describe = () => {
      const mode = config.ANTI_DELETE;
      if (!mode || mode === "off" || mode === "false") return Lang.MODE_OFF;
      return mode === "custom" ? Lang.MODE_CUSTOM.format(config.ANTI_DELETE_JID) : mode;
    };
    if (!target) {
      return await message.sendReply(
        Lang.ANTIDELETE_STATUS.format(
          describe(),
          String(config.ANTI_DELETE_OWN) === "true" ? Lang.RECOVERED : Lang.IGNORED,
          usage
        )
      );
    }

    target = target.toLowerCase();

    if (target === "off") {
      await setVar("ANTI_DELETE", "off");
      await setVar("ANTI_DELETE_JID", "");
      return await message.sendReply(Lang.ANTIDELETE_OFF);
    } else if (/^own\s+(on|off)$/.test(target)) {
      const on = target.endsWith("on");
      await setVar("ANTI_DELETE_OWN", on ? "true" : "false");
      return await message.sendReply(
        on ? Lang.OWN_RECOVERED : Lang.OWN_IGNORED
      );
    } else if (target === "chat") {
      await setVar("ANTI_DELETE", "chat");
      await setVar("ANTI_DELETE_JID", "");
      return await message.sendReply(
        Lang.ANTIDELETE_CHAT
      );
    } else if (target === "sudo") {
      await setVar("ANTI_DELETE", "sudo");
      await setVar("ANTI_DELETE_JID", "");
      return await message.sendReply(
        Lang.ANTIDELETE_SUDO
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
          Lang.BAD_JID
        );
      }
      await setVar("ANTI_DELETE", "custom");
      await setVar("ANTI_DELETE_JID", jid);
      return await message.sendReply(
        Lang.ANTIDELETE_CUSTOM.format(jid)
      );
    } else {
      return await message.sendReply(Lang.INVALID_OPTION.format(usage));
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
        return await m.sendReply(Lang.NEED_TARGET);
      }
    } else {
      targetLid = m.sender;
    }

    if (!targetLid) return await m.sendReply(Lang.NO_TARGET);

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
        return await m.sendReply(Lang.ALREADY_SUDO);
      }

      sudoMap.push(targetLid);
      await setVar("SUDO_MAP", JSON.stringify(sudoMap));

      const displayId = targetLid.split("@")[0];

      await m.sendMessage(Lang.SUDO_ADDED.format(displayId), "text", {
        mentions: [targetLid],
      });
    } catch (error) {
      console.error("setsudo error:", error);
      await m.sendReply(Lang.SUDO_ERROR.format(error.message));
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
      return await message.sendReply(Lang.NO_SUDO);
    }

    const sudoList = sudoMap
      .map((lid, index) => {
        const displayId = lid.split("@")[0];
        return `${index + 1}. @${displayId}`;
      })
      .join("\n");

    await message.sendMessage(Lang.SUDO_LIST.format(sudoList), "text", {
      mentions: sudoMap,
    });
  }
);

Module(
  {
    pattern: "delsudo ?(.*)",
    fromMe: true,
    desc: Lang.DELSUDO_DESC,
  },
  async (m, mm) => {
    let targetLid;

    if (m.isGroup) {
      if (m.mention && m.mention.length > 0) {
        targetLid = m.mention[0];
      } else if (m.reply_message) {
        targetLid = m.reply_message.jid;
      } else {
        return await m.sendReply(Lang.NEED_TARGET);
      }
    } else {
      targetLid = m.sender;
    }

    if (!targetLid) return await m.sendReply(Lang.NO_TARGET);

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
        return await m.sendReply(Lang.NOT_SUDO);
      }

      sudoMap = sudoMap.filter((lid) => lid !== targetLid);
      await setVar("SUDO_MAP", JSON.stringify(sudoMap));

      const displayId = targetLid.split("@")[0];

      await m.sendMessage(Lang.SUDO_REMOVED.format(displayId), "text", {
        mentions: [targetLid],
      });
    } catch (error) {
      console.error("delsudo error:", error);
      await m.sendReply(Lang.DELSUDO_ERROR.format(error.message));
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
      Lang.FILTER_TOGGLE_NEED.format(helpPrefix())
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
      Lang.FILTER_OWNER_ONLY.format(scope)
    );
  }
  try {
    const toggled = await filter.toggle(trigger, message.jid, scope);
    if (!toggled) {
      return await message.sendReply(Lang.FILTER_NOT_FOUND.format(trigger));
    }
    await message.sendReply(
      (toggled.enabled ? Lang.FILTER_ENABLED : Lang.FILTER_DISABLED).format(trigger)
    );
  } catch (error) {
    console.error("Filter toggle error:", error);
    await message.sendReply(Lang.FILTER_FAILED);
  }
}

Module(
  {
    pattern: "toggle ?(.*)",
    fromMe: false,
    desc: Lang.TOGGLE_DESC,
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
        Lang.TOGGLE_EXAMPLE.replaceAll("{p}", helpPrefix())
      );
    }
    const name = input.toLowerCase();
    const { commands } = require("../main");
    const availableCommands = commands
      .filter((x) => x.pattern)
      .map((cmd) => commandName(cmd));
    if (!availableCommands.includes(name))
      return await message.sendReply(
        Lang.NOT_COMMAND.format(helpPrefix(), input)
      );
    if (name == "toggle" || name == "setvar" || name == "getvar")
      return await message.sendReply(
        Lang.CANT_DISABLE.format(helpPrefix(), name)
      );
    const disabled = listOf(config.DISABLED_COMMANDS);
    if (!disabled.includes(name)) {
      disabled.push(name);
      await message.sendReply(
        Lang.TURNED_OFF.format(name, name).replaceAll("{p}", helpPrefix())
      );
      return await setVar("DISABLED_COMMANDS", disabled.join(","), false);
    }
    await message.sendReply(
      Lang.TURNED_ON.format(helpPrefix(), name)
    );
    return await setVar(
      "DISABLED_COMMANDS",
      disabled.filter((x) => x != name).join(","),
      false
    );
  }
);

Module(
  {
    pattern: "alias ?(.*)",
    fromMe: true,
    desc: Lang.ALIAS_DESC,
    usage: ".alias steal take",
  },
  async (message, match) => {
    const p = helpPrefix();
    const { parseAliases } = require("../core/pipeline/dispatcher");
    const aliases = parseAliases(config.ALIASES);
    const save = () =>
      setVar("ALIASES", [...aliases].map(([a, t]) => `${a}=${t}`).join(","), false);
    const words = (match[1] || "").trim().toLowerCase().split(/\s+/).filter(Boolean);

    if (words.length === 0) {
      if (!aliases.size) return await message.sendReply(Lang.ALIAS_NONE.replaceAll("{p}", p));
      const lines = [...aliases].map(([a, t]) => Lang.ALIAS_LINE.format(a, t)).join("\n");
      return await message.sendReply(Lang.ALIAS_LIST.format(lines).replaceAll("{p}", p));
    }

    const strip = (w) => (p && w.startsWith(p) ? w.slice(p.length) : w);
    if (words[0] === "del" && words[1]) {
      const name = strip(words[1]);
      if (!aliases.delete(name)) return await message.sendReply(Lang.ALIAS_NOT_FOUND.format(name).replaceAll("{p}", p));
      await save();
      return await message.sendReply(Lang.ALIAS_REMOVED.format(name).replaceAll("{p}", p));
    }

    if (words.length !== 2) return await message.sendReply(Lang.ALIAS_USAGE.replaceAll("{p}", p));
    const [name, target] = words.map(strip);
    if (!/^[\p{L}\p{N}]{1,20}$/u.test(name)) return await message.sendReply(Lang.ALIAS_BAD_NAME);
    const { commands } = require("../main");
    const names = new Set(commands.filter((x) => x.pattern).map((cmd) => commandName(cmd)));
    // an alias over a real command would hide it
    if (names.has(name)) return await message.sendReply(Lang.ALIAS_TAKEN.format(name).replaceAll("{p}", p));
    if (!names.has(target)) return await message.sendReply(Lang.NOT_COMMAND.format(p, target));
    aliases.set(name, target);
    await save();
    return await message.sendReply(Lang.ALIAS_SET.format(name, target).replaceAll("{p}", p));
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
  if (
    quoted.toLowerCase().includes("settings configuration menu") ||
    quoted.includes(Lang.MENU_HEADER.split("\n")[0])
  ) {
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
