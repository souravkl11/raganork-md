const { Module } = require("../main");
const config = require("../config");
const { setVar } = require("./manage");
const fromMe = config.MODE !== "public";

const HANDLER_PREFIX =
  config.HANDLERS === "false" ? "" : (config.HANDLERS || ".").charAt(0);

const URL_PATTERNS = {
  instagram:
    /^https?:\/\/(?:www\.)?instagram\.com\/(?:p\/[A-Za-z0-9_-]+\/?|reel\/[A-Za-z0-9_-]+\/?|tv\/[A-Za-z0-9_-]+\/?|stories\/[A-Za-z0-9_.-]+\/\d+\/?)(?:\?.*)?$/i,
  youtube:
    /^https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})(?:[\?&].*)?$/i,
  tiktok:
    /^https?:\/\/(?:www\.)?(?:tiktok\.com\/@?[A-Za-z0-9_.-]+\/video\/\d+|vm\.tiktok\.com\/[A-Za-z0-9_-]+\/?|vt\.tiktok\.com\/[A-Za-z0-9_-]+\/?|v\.tiktok\.com\/[A-Za-z0-9_-]+\/?)(?:\?.*)?$/i,
  pinterest:
    /^https?:\/\/(?:www\.)?(?:pinterest\.com\/(?:pin\/\d+\/?[A-Za-z0-9_-]*)\/?|pin\.it\/[A-Za-z0-9_-]+\/?)(?:\?.*)?$/i,
  twitter:
    /^https?:\/\/(?:www\.)?(?:twitter\.com|x\.com|mobile\.twitter\.com)\/[A-Za-z0-9_]{1,15}\/status\/\d+(?:\?.*)?$/i,
  facebook:
    /^https?:\/\/(?:www\.)?(?:fb\.watch\/[A-Za-z0-9_-]+\/?|(?:facebook\.com|m\.facebook\.com)\/(?:(?:watch(?:\/?|\?v=))|(?:.*\/videos?\/\d+)|(?:video\.php\?v=\d+)|(?:.*\/posts\/\d+))(?:[\s\S]*)?)$/i,
};

function getFirstUrl(text) {
  if (!text) return null;
  const urlMatch = text.match(/https?:\/\/\S+/i);
  if (!urlMatch) return null;
  return urlMatch[0].replace(/[)\]\.,!?>]*$/, "");
}

function detectPlatform(url) {
  for (const [platform, re] of Object.entries(URL_PATTERNS)) {
    if (re.test(url)) return platform;
  }
  return null;
}

function isAlreadyCommand(text) {
  text = text?.toLowerCase()?.trim();
  if (!text) return false;
  const regex =
    /(insta\s|instah|story\s|storyh|tiktok\s|tiktokh|pinterest\s|pinteresth|twitter\s|twitterh|fb\s|fbh|play\s|playh|ytv\s|ytvh)/;
  return regex.test(text);
}
Module({ on: "text", fromMe }, async (message) => {
  try {
    if (message.fromBot) return;
    const chatJid = message.jid;
    const isGroup = chatJid.includes("@g.us");
    const autodlEnabledForChat = (() => {
      try {
        const enabledList = config.AUTODL || "";
        const enabled = enabledList
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (enabled.includes(chatJid)) return true;
        if (isGroup && config.AUTODL_ALL_GROUPS === "true") return true;
        if (!isGroup && config.AUTODL_ALL_DMS === "true") return true;
        return false;
      } catch (e) {
        return false;
      }
    })();
    if (!autodlEnabledForChat) return;
    let text = message.text || "";
    if (isAlreadyCommand(text)) return;

    const url = getFirstUrl(text);
    if (!url) return;

    const platform = detectPlatform(url);
    if (!platform) return;

    let cmd;
    if (platform === "youtube") {
      const lower = text.toLowerCase();
      cmd = lower.includes("audio") || lower.includes("mp3") ? "play" : "ytv";
    } else if (platform === "instagram") {
      cmd = url.includes("/stories/") ? "story" : "insta";
    } else if (platform === "tiktok") cmd = "tiktok";
    else if (platform === "pinterest") cmd = "pinterest";
    else if (platform === "twitter") cmd = "twitter";
    else if (platform === "facebook") cmd = "fb";
    else return;

    const downloadCommand = `${HANDLER_PREFIX}${cmd} ${url}`.trim();

    const md = message.data && message.data.message;
    if (md) {
      if (
        md.extendedTextMessage &&
        typeof md.extendedTextMessage.text !== "undefined"
      ) {
        md.extendedTextMessage.text = downloadCommand;
      }
      if (typeof md.conversation !== "undefined") {
        md.conversation = downloadCommand;
      }
    }

    message.text = downloadCommand;
    message.message = downloadCommand;

    await message.react("⬇️");
    await message.client.ev.emit("messages.upsert", {
      messages: [message.data],
      type: "notify",
    });
  } catch (err) {
    if (config.DEBUG)
      console.error(
        "[AutoDownload] Error:",
        err && err.message ? err.message : err
      );
  }
});

Module(
  {
    pattern: "autodl ?(.*)",
    fromMe: true,
    desc: "Auto-download URL watcher - enable in chats or globally",
    usage:
      ".autodl - show menu\n.autodl on/off - enable/disable in current chat\n.autodl on/off groups - enable/disable in all groups\n.autodl on/off dms - enable/disable in all DMs\n.autodl status - show current status",
  },
  async (message, match) => {
    const input = match[1]?.trim();
    const chatJid = message.jid;

    const readList = () => {
      try {
        const list = config.AUTODL || "";
        return list
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      } catch (e) {
        return [];
      }
    };

    if (!input) {
      const enabledList = readList();
      const enabled = enabledList.includes(chatJid);
      const globalGroups = config.AUTODL_ALL_GROUPS === "true";
      const globalDMs = config.AUTODL_ALL_DMS === "true";

      return await message.sendReply(
        `*_⬇️ AutoDownload Manager_*\n\n` +
          `- _Current chat:_ ${chatJid.includes("@g.us") ? "Group" : "DM"}\n` +
          `- _Status:_ ${enabled ? "Enabled ✅" : "Disabled ❌"}\n` +
          `- _Global Groups:_ ${
            globalGroups ? "Enabled ✅" : "Disabled ❌"
          }\n` +
          `- _Global DMs:_ ${globalDMs ? "Enabled ✅" : "Disabled ❌"}\n\n` +
          `_Commands:_\n` +
          `- \`${HANDLER_PREFIX}autodl on/off\` - Sets in current chat\n` +
          `- \`${HANDLER_PREFIX}autodl on/off groups\` - Sets in all groups\n` +
          `- \`${HANDLER_PREFIX}autodl on dms\` - Sets in all DMs\n` +
          `- \`${HANDLER_PREFIX}autodl off dms\` - Sets in all DMs\n` +
          `- \`${HANDLER_PREFIX}autodl status\` - Show detailed status`
      );
    }

    const parts = input.split(" ");
    const cmd = parts[0].toLowerCase();
    const target = parts[1]?.toLowerCase();

    if (cmd === "on") {
      if (target === "groups") {
        await setVar("AUTODL_ALL_GROUPS", "true");
        return await message.sendReply(
          "_AutoDL enabled for all groups ✅_\n_Use .autodl off groups to disable_"
        );
      } else if (target === "dms") {
        await setVar("AUTODL_ALL_DMS", "true");
        return await message.sendReply(
          "_AutoDL enabled for all DMs ✅_\n_Use .autodl off dms to disable_"
        );
      } else {
        const enabledList = readList();
        if (!enabledList.includes(chatJid)) enabledList.push(chatJid);
        await setVar("AUTODL", enabledList.join(","));
        return await message.sendReply(
          "_AutoDL enabled in this chat ✅_\n_Send a message with a supported URL to auto-convert to download command_"
        );
      }
    }

    if (cmd === "off") {
      if (target === "groups") {
        await setVar("AUTODL_ALL_GROUPS", "false");
        return await message.sendReply(
          "_AutoDL disabled for all groups ❌_\n_Use .autodl on groups to enable_"
        );
      } else if (target === "dms") {
        await setVar("AUTODL_ALL_DMS", "false");
        return await message.sendReply(
          "_AutoDL disabled for all DMs ❌_\n_Use .autodl on dms to enable_"
        );
      } else {
        const enabledList = readList().filter((x) => x !== chatJid);
        await setVar("AUTODL", enabledList.join(","));
        return await message.sendReply(
          "_AutoDL disabled in this chat ❌_\n_Use .autodl on to re-enable_"
        );
      }
    }

    if (cmd === "status") {
      const enabledList = readList();
      const globalGroups = config.AUTODL_ALL_GROUPS === "true";
      const globalDMs = config.AUTODL_ALL_DMS === "true";
      return await message.sendReply(
        `*_AutoDL Status_*\n\n` +
          `• _Enabled chats:_ ${
            enabledList.length > 0 ? enabledList.join(", ") : "None"
          }\n` +
          `• _Global Groups:_ ${
            globalGroups ? "Enabled ✅" : "Disabled ❌"
          }\n` +
          `• _Global DMs:_ ${globalDMs ? "Enabled ✅" : "Disabled ❌"}`
      );
    }

    return await message.sendReply(`_Unknown option: ${cmd}_`);
  }
);
