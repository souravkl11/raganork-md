const { Module } = require("../main");
const { welcome, goodbye, groupAdminGuard } = require("./utils");
const {
  parseWelcomeMessage,
  sendWelcomeMessage,
} = require("./utils/welcome-parser");
const { helpPrefix } = require("../core/plugins/registry");

const { getString } = require("./utils/lang");
const Lang = getString("welcome");

const MAX_LENGTH = 2000;

const PLACEHOLDERS =
  "$mention, $user, $group, $desc, $count, $pp, $gpp, $date, $time";

async function describeGroups(message, rows, title) {
  if (!rows.length) return "";
  let text = `*${title}:*\n`;
  for (let i = 0; i < rows.length; i++) {
    const data = rows[i];
    const status = data.enabled ? Lang.STATUS_ENABLED : Lang.STATUS_DISABLED;
    try {
      const groupMeta = await message.client.groupMetadata(data.jid);
      const groupName = groupMeta.subject || Lang.UNKNOWN_GROUP;
      text += Lang.STATUS_ITEM.format(
        i + 1,
        groupName,
        status,
        data.message.substring(0, 50) + (data.message.length > 50 ? "..." : "")
      );
    } catch {
      text += Lang.STATUS_ITEM_UNKNOWN.format(i + 1, status);
    }
  }
  return text;
}

async function showStatus(message) {
  if (!message.fromOwner) return;
  try {
    const welcomeData = await welcome.get();
    const goodbyeData = await goodbye.get();

    if (!welcomeData.length && !goodbyeData.length) {
      return await message.sendReply(Lang.NONE_CONFIGURED);
    }

    const statusText =
      Lang.STATUS_HEADER +
      (await describeGroups(message, welcomeData, Lang.STATUS_WELCOME)) +
      (await describeGroups(message, goodbyeData, Lang.STATUS_GOODBYE));

    await message.sendReply(statusText);
  } catch (error) {
    console.error("Error getting welcome status:", error);
    await message.sendReply(Lang.STATUS_ERROR);
  }
}

async function showHelp(message) {
  return await message.sendReply(Lang.HELP.format(MAX_LENGTH).replaceAll("{p}", helpPrefix()));
}

function greetingCommand(name, store) {
  // each word gets its own strings so translations can inflect them
  const L = (key) => Lang[`${key}_${name.toUpperCase()}`];

  Module(
    {
      pattern: `${name} ?(.*)`,
      fromMe: false,
      desc: L("DESC").format(PLACEHOLDERS),
      usage: L("USAGE"),
      use: "group",
    },
    async (message, match) => {
      const text = match[1]?.trim() || "";
      const input = text.toLowerCase();
      const p = helpPrefix();
      const say = (str, ...args) => message.sendReply(str.format(...args).replaceAll("{p}", p));
      const ownerInfo =
        !message.isGroup &&
        message.fromOwner &&
        ["", "help", "status"].includes(input);
      if (!ownerInfo && !(await groupAdminGuard(message))) return;

      if (!input) {
        return await say(L("SETUP"));
      }
      if (input === "help") return await showHelp(message);
      if (input === "status") return await showStatus(message);
      if (input === "on") {
        const current = await store.get(message.jid);
        if (!current) {
          return await say(L("NOT_SET_FIRST"));
        }
        await store.toggle(message.jid, true);
        return await say(L("ENABLED"));
      }
      if (input === "off") {
        await store.toggle(message.jid, false);
        return await say(L("DISABLED"));
      }
      if (input === "get") {
        const current = await store.get(message.jid);
        if (!current) {
          return await say(L("NOT_SET"));
        }
        return await message.sendReply(
          L("CURRENT").format(current.message, current.enabled ? Lang.ENABLED : Lang.DISABLED)
        );
      }
      if (input === "del" || input === "delete") {
        const deleted = await store.delete(message.jid);
        if (deleted) {
          return await say(L("DELETED"));
        }
        return await say(L("NOT_FOUND"));
      }

      if (text.length > MAX_LENGTH) {
        return await say(L("TOO_LONG"), MAX_LENGTH);
      }
      await store.set(message.jid, text);
      await message.sendReply(L("SET").format(text).replaceAll("{p}", p));
    }
  );

  Module(
    {
      pattern: `test${name} ?(.*)`,
      fromMe: false,
      desc: L("TEST_DESC"),
      usage: `.test${name}`,
      use: "group",
    },
    async (message) => {
      if (!(await groupAdminGuard(message))) return;
      const data = await store.get(message.jid);
      if (!data || !data.enabled) {
        return await message.sendReply(L("TEST_NONE"));
      }
      const parsedMessage = await parseWelcomeMessage(data.message, message, [
        { id: message.sender },
      ]);
      if (parsedMessage) {
        await message.sendReply(L("TESTING"));
        await sendWelcomeMessage(message, parsedMessage);
      } else {
        await message.sendReply(L("PARSE_ERROR"));
      }
    }
  );
}

greetingCommand("welcome", welcome);
greetingCommand("goodbye", goodbye);
