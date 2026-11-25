const { Module } = require("../main");
const config = require("../config");
const { isAdmin, filter } = require("./utils");

const { helpPrefix } = require("../core/plugins/registry");
const { getString } = require("./utils/lang");
const Lang = getString("filter");

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
  await message.sendReply(Lang.OWNER_SCOPE.format(scope));
  return false;
}

async function showMenu(message) {
  const p = helpPrefix();
  return await message.sendReply(
    Lang.MENU.replaceAll("{p}", p)
  );
}

async function showHelp(message) {
  const p = helpPrefix();
  const helpText =
    Lang.HELP.replaceAll("{p}", p);

  await message.sendReply(helpText);
}

async function createFilter(message, input) {
  const parts = input.split("|").map((p) => p.trim());
  if (parts.length < 2) {
    return await message.sendReply(
      Lang.FORMAT
    );
  }

  const trigger = parts[0];
  const response = parts[1];
  const scope = (parts[2] || "chat").toLowerCase();
  const options = parts[3] || "";

  if (!trigger || !response) {
    return await message.sendReply(Lang.NEED_BOTH);
  }

  if (!SCOPES.includes(scope)) {
    return await message.sendReply(
      Lang.BAD_SCOPE
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

    const scopeText = {
      chat: Lang.SCOPE_CHAT,
      global: Lang.SCOPE_GLOBAL,
      group: Lang.SCOPE_GROUP,
      dm: Lang.SCOPE_DM,
    }[scope];
    const optionsText = [];
    if (filterOptions.exactMatch) optionsText.push(Lang.OPT_EXACT);
    if (filterOptions.caseSensitive) optionsText.push(Lang.OPT_CASE);
    const optionsStr = optionsText.length ? ` (${optionsText.join(", ")})` : "";

    await message.sendReply(
      Lang.CREATED.format(trigger, response, scopeText, optionsStr)
    );
  } catch (error) {
    console.error("Filter creation error:", error);
    await message.sendReply(Lang.CREATE_FAILED);
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
      return await message.sendReply(Lang.NONE);
    }

    let msg = Lang.LIST_HEADER;

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

      msg += Lang.LIST_ITEM.format(
        index + 1,
        scopeEmoji,
        f.trigger,
        optionsStr,
        f.response.substring(0, 50) + (f.response.length > 50 ? "..." : ""),
        f.scope,
        f.enabled ? "" : Lang.LIST_DISABLED
      );
    });

    await message.sendReply(msg);
  } catch (error) {
    console.error("Filter listing error:", error);
    await message.sendReply(Lang.LIST_FAILED);
  }
}

async function deleteFilter(message, input) {
  if (!input) {
    return await message.sendReply(
      Lang.DEL_NEED.format(helpPrefix())
    );
  }

  const { trigger, scope } = parseTriggerAndScope(input);
  if (!(await ownerForScope(message, scope))) return;

  try {
    const deleted = await filter.delete(trigger, message.jid, scope);

    if (deleted > 0) {
      await message.sendReply(Lang.DELETED.format(trigger));
    } else {
      await message.sendReply(Lang.NOT_FOUND.format(trigger));
    }
  } catch (error) {
    console.error("Filter deletion error:", error);
    await message.sendReply(Lang.DEL_FAILED);
  }
}

async function toggleFilter(message, input) {
  if (!input) {
    return await message.sendReply(
      Lang.TOGGLE_NEED.format(helpPrefix())
    );
  }

  const { trigger, scope } = parseTriggerAndScope(input);
  if (!(await ownerForScope(message, scope))) return;

  try {
    // flips the stored state, including re-enabling a disabled filter
    const toggled = await filter.toggle(trigger, message.jid, scope);

    if (toggled) {
      await message.sendReply(
        (toggled.enabled ? Lang.ENABLED : Lang.DISABLED).format(trigger)
      );
    } else {
      await message.sendReply(Lang.NOT_FOUND.format(trigger));
    }
  } catch (error) {
    console.error("Filter toggle error:", error);
    await message.sendReply(Lang.TOGGLE_FAILED);
  }
}

async function testFilter(message, testText) {
  if (!testText) {
    return await message.sendReply(
      Lang.TEST_NEED.format(helpPrefix())
    );
  }

  try {
    const matchedFilter = await filter.checkMatch(testText, message.jid);

    if (matchedFilter) {
      await message.sendReply(
        Lang.MATCH.format(
          matchedFilter.trigger,
          matchedFilter.response,
          matchedFilter.scope,
          matchedFilter.exactMatch ? Lang.OPT_EXACT_SHORT : "",
          matchedFilter.caseSensitive ? Lang.CASE_SENSITIVE : Lang.CASE_INSENSITIVE
        )
      );
    } else {
      await message.sendReply(
        Lang.NO_MATCH.format(testText)
      );
    }
  } catch (error) {
    console.error("Filter test error:", error);
    await message.sendReply(Lang.TEST_FAILED);
  }
}

Module(
  {
    pattern: "filter(s|help)?(?:\\s+(.*))?$",
    fromMe: false,
    desc: Lang.DESC,
    usage: Lang.USAGE,
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
    desc: Lang.DEL_DESC,
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
    desc: Lang.TEST_DESC,
    usage: ".testfilter hello world",
    use: "utility",
  },
  async (message, match) => {
    if (!(await mayManage(message))) return;
    await testFilter(message, match[1]?.trim());
  }
);
