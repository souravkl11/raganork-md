const { Module } = require("../main");
const config = require("../config");
const { isAdmin, filter } = require("./utils");

const { helpPrefix } = require("../core/plugins/registry");

const SCOPES = ["chat", "global", "group", "dm"];
const SUBCOMMANDS = ["help", "list", "del", "delete", "toggle", "test"];

// triggers can contain spaces, so only a trailing scope word is split off:
// "good morning" -> trigger "good morning", "good morning global" -> scope global
function parseTriggerAndScope(input) {
  const words = input.trim().split(/\s+/);
  const last = words[words.length - 1].toLowerCase();
  if (words.length > 1 && SCOPES.includes(last)) {
    return { trigger: words.slice(0, -1).join(" "), scope: last };
  }
  return { trigger: words.join(" "), scope: "chat" };
}

// private chats: owner only (there is no admin to ask); groups: admins when ADMIN_ACCESS is on
async function mayManage(message) {
  if (message.fromOwner) return true;
  return Boolean(
    message.isGroup &&
      config.ADMIN_ACCESS &&
      (await isAdmin(message, message.sender))
  );
}

async function ownerForScope(message, scope) {
  if (scope === "chat" || message.fromOwner) return true;
  await message.sendReply(`_Only the owner can manage ${scope} filters._`);
  return false;
}

async function showMenu(message) {
  const p = helpPrefix();
  return await message.sendReply(
    `*📝 Filter Commands:*\n\n` +
      `• \`${p}filter trigger | response\` - Create chat filter\n` +
      `• \`${p}filter trigger | response | global\` - Create global filter\n` +
      `• \`${p}filter trigger | response | group\` - Create group-only filter\n` +
      `• \`${p}filter trigger | response | dm\` - Create DM-only filter\n` +
      `• \`${p}filter trigger | response | chat | exact\` - Exact match only\n` +
      `• \`${p}filter trigger | response | chat | case\` - Case sensitive\n` +
      `• \`${p}filter list\` - List all filters\n` +
      `• \`${p}filter del trigger\` - Delete filter\n` +
      `• \`${p}filter toggle trigger\` - Enable/disable filter\n` +
      `• \`${p}filter test text\` - Test matching\n` +
      `• \`${p}filter help\` - Detailed help\n\n` +
      `*Scopes:*\n` +
      `• \`chat\` - Current chat only (default)\n` +
      `• \`global\` - All chats (owner only)\n` +
      `• \`group\` - All groups (owner only)\n` +
      `• \`dm\` - All DMs (owner only)\n\n` +
      `*Options:*\n` +
      `• \`exact\` - Exact word match only\n` +
      `• \`case\` - Case sensitive matching`
  );
}

async function showHelp(message) {
  const p = helpPrefix();
  const helpText =
    `*🔧 Filter System Help*\n\n` +
    `*What are filters?*\n` +
    `Filters are auto-reply triggers that respond to specific words or phrases automatically.\n\n` +
    `*📝 Creating Filters:*\n` +
    `\`${p}filter hello | Hi there!\`\n` +
    `• Creates a chat-specific filter\n` +
    `• When someone says "hello", bot replies "Hi there!"\n\n` +
    `*🌍 Filter Scopes:*\n` +
    `• \`chat\` - Only works in current chat\n` +
    `• \`global\` - Works in all chats (owner only)\n` +
    `• \`group\` - Works in all groups only (owner only)\n` +
    `• \`dm\` - Works in all DMs only (owner only)\n\n` +
    `*⚙️ Filter Options:*\n` +
    `• \`exact\` - Only exact word matches\n` +
    `• \`case\` - Case sensitive matching\n\n` +
    `*📋 Examples:*\n` +
    `\`${p}filter bot | I'm here! | chat\`\n` +
    `\`${p}filter help | Contact admin | global\`\n` +
    `\`${p}filter Hello | Hi! | group | exact\`\n` +
    `\`${p}filter PASSWORD | Shh! | dm | case\`\n\n` +
    `*🔧 Management:*\n` +
    `• \`${p}filter list\` - List all filters\n` +
    `• \`${p}filter del trigger\` - Delete filter\n` +
    `• \`${p}filter toggle trigger\` - Enable/disable\n` +
    `• \`${p}filter test text\` - Test matching\n\n` +
    `*💡 Tips:*\n` +
    `• Filters are checked for every message\n` +
    `• Global filters work everywhere\n` +
    `• Use exact match for precise triggers\n` +
    `• Case sensitive is useful for passwords/codes`;

  await message.sendReply(helpText);
}

async function createFilter(message, input) {
  const parts = input.split("|").map((p) => p.trim());
  if (parts.length < 2) {
    return await message.sendReply(
      "_Format: trigger | response | scope(optional) | options(optional)_"
    );
  }

  const trigger = parts[0];
  const response = parts[1];
  const scope = (parts[2] || "chat").toLowerCase();
  const options = parts[3] || "";

  if (!trigger || !response) {
    return await message.sendReply("_Both trigger and response are required!_");
  }

  if (!SCOPES.includes(scope)) {
    return await message.sendReply(
      "_Invalid scope! Use: chat, global, group, or dm_"
    );
  }
  if (!(await ownerForScope(message, scope))) return;

  const filterOptions = {
    caseSensitive: options.includes("case"),
    exactMatch: options.includes("exact"),
  };

  try {
    await filter.set(
      trigger,
      response,
      message.jid,
      scope,
      message.sender,
      filterOptions
    );

    const scopeText =
      scope === "chat"
        ? "this chat"
        : scope === "global"
        ? "all chats"
        : `all ${scope}s`;
    const optionsText = [];
    if (filterOptions.exactMatch) optionsText.push("exact match");
    if (filterOptions.caseSensitive) optionsText.push("case sensitive");
    const optionsStr = optionsText.length ? ` (${optionsText.join(", ")})` : "";

    await message.sendReply(
      `✅ *Filter Created!*\n\n` +
        `*Trigger:* ${trigger}\n` +
        `*Response:* ${response}\n` +
        `*Scope:* ${scopeText}${optionsStr}`
    );
  } catch (error) {
    console.error("Filter creation error:", error);
    await message.sendReply("_Failed to create filter!_");
  }
}

async function listFilters(message, scopeArg) {
  const scope = scopeArg?.trim().toLowerCase();
  const byScope = scope && ["global", "group", "dm"].includes(scope);
  if (byScope && !(await ownerForScope(message, scope))) return;

  try {
    const filters = byScope
      ? await filter.getByScope(scope)
      : await filter.get(message.jid);

    if (!filters || filters.length === 0) {
      return await message.sendReply("_No filters found!_");
    }

    let msg = `*📝 Active Filters:*\n\n`;

    filters.forEach((f, index) => {
      const scopeEmoji =
        {
          chat: "💬",
          global: "🌍",
          group: "👥",
          dm: "📱",
        }[f.scope] || "💬";

      const options = [];
      if (f.exactMatch) options.push("exact");
      if (f.caseSensitive) options.push("case");
      const optionsStr = options.length ? ` [${options.join(", ")}]` : "";

      msg += `${index + 1}. ${scopeEmoji} *${f.trigger}*${optionsStr}\n`;
      msg += `   ↳ _${f.response.substring(0, 50)}${
        f.response.length > 50 ? "..." : ""
      }_\n`;
      msg += `   _Scope: ${f.scope}${f.enabled ? "" : " (disabled)"}_\n\n`;
    });

    await message.sendReply(msg);
  } catch (error) {
    console.error("Filter listing error:", error);
    await message.sendReply("_Failed to fetch filters!_");
  }
}

async function deleteFilter(message, input) {
  if (!input) {
    return await message.sendReply(
      `_Provide filter trigger to delete!_\n_Usage: ${helpPrefix()}filter del trigger_`
    );
  }

  const { trigger, scope } = parseTriggerAndScope(input);
  if (!(await ownerForScope(message, scope))) return;

  try {
    const deleted = await filter.delete(trigger, message.jid, scope);

    if (deleted > 0) {
      await message.sendReply(`✅ _Filter "${trigger}" deleted successfully!_`);
    } else {
      await message.sendReply(`❌ _Filter "${trigger}" not found!_`);
    }
  } catch (error) {
    console.error("Filter deletion error:", error);
    await message.sendReply("_Failed to delete filter!_");
  }
}

async function toggleFilter(message, input) {
  if (!input) {
    return await message.sendReply(
      `_Provide filter trigger to toggle!_\n_Usage: ${helpPrefix()}filter toggle trigger_`
    );
  }

  const { trigger, scope } = parseTriggerAndScope(input);
  if (!(await ownerForScope(message, scope))) return;

  try {
    // flips the stored state, including re-enabling a disabled filter
    const toggled = await filter.toggle(trigger, message.jid, scope);

    if (toggled) {
      await message.sendReply(
        `✅ _Filter "${trigger}" ${
          toggled.enabled ? "enabled" : "disabled"
        } successfully!_`
      );
    } else {
      await message.sendReply(`❌ _Filter "${trigger}" not found!_`);
    }
  } catch (error) {
    console.error("Filter toggle error:", error);
    await message.sendReply("_Failed to toggle filter!_");
  }
}

async function testFilter(message, testText) {
  if (!testText) {
    return await message.sendReply(
      `_Provide text to test against filters!_\n_Usage: ${helpPrefix()}filter test hello world_`
    );
  }

  try {
    const matchedFilter = await filter.checkMatch(testText, message.jid);

    if (matchedFilter) {
      await message.sendReply(
        `✅ *Filter Match Found!*\n\n` +
          `*Trigger:* ${matchedFilter.trigger}\n` +
          `*Response:* ${matchedFilter.response}\n` +
          `*Scope:* ${matchedFilter.scope}\n` +
          `*Options:* ${matchedFilter.exactMatch ? "exact " : ""}${
            matchedFilter.caseSensitive ? "case-sensitive" : "case-insensitive"
          }`
      );
    } else {
      await message.sendReply(
        `❌ _No filters would be triggered by: "${testText}"_`
      );
    }
  } catch (error) {
    console.error("Filter test error:", error);
    await message.sendReply("_Failed to test filter!_");
  }
}

Module(
  {
    pattern: "filter(s|help)?(?:\\s+(.*))?$",
    fromMe: false,
    desc: "Create auto-reply filters. Usage: .filter trigger | response | scope(optional) | options(optional)",
    usage:
      ".filter hello | Hi there! | chat\n.filter help | I can help you | global\n.filter bye | Goodbye! | group | exact\n.filter list [scope]\n.filter del trigger [scope]\n.filter toggle trigger [scope]\n.filter test text\n.filter help",
    use: "utility",
  },
  async (message, match) => {
    if (!(await mayManage(message))) return;
    const input = match[2]?.trim() || "";

    if (match[1] === "help") return await showHelp(message);
    if (match[1] === "s") return await listFilters(message, input);

    if (!input) return await showMenu(message);

    const [first, ...rest] = input.split(/\s+/);
    const word = first.toLowerCase();
    if (!input.includes("|") && SUBCOMMANDS.includes(word)) {
      const args = rest.join(" ");
      if (word === "help") return await showHelp(message);
      if (word === "list") return await listFilters(message, args);
      if (word === "toggle") return await toggleFilter(message, args);
      if (word === "test") return await testFilter(message, args);
      return await deleteFilter(message, args);
    }

    return await createFilter(message, input);
  }
);

Module(
  {
    pattern: "delfilter ?(.*)",
    fromMe: false,
    desc: "Delete a filter",
    usage: ".delfilter trigger\n.delfilter trigger global",
    use: "utility",
  },
  async (message, match) => {
    if (!(await mayManage(message))) return;
    await deleteFilter(message, match[1]?.trim());
  }
);

Module(
  {
    pattern: "testfilter ?(.*)",
    fromMe: false,
    desc: "Test if a message would trigger any filters",
    usage: ".testfilter hello world",
    use: "utility",
  },
  async (message, match) => {
    if (!(await mayManage(message))) return;
    await testFilter(message, match[1]?.trim());
  }
);
