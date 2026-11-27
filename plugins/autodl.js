const { Module, commands } = require("../main");
const config = require("../config");
const { helpPrefix, patternFor, commandName } = require("../core/plugins/registry");
const { parseText } = require("../core/pipeline/normalize");
const { queue, applyAlias } = require("../core/pipeline/dispatcher");
const { setVar } = require("./manage");
const { getString } = require("./utils/lang");
const Lang = getString("autodl");
const { downloadGram, pinterestDl, tiktok, fb, spotifyTrack, accountKey } = require("./utils");
const {
  getVideoInfo,
  searchYoutube,
  sendYoutubeAudio,
  youtubeUrlFrom,
  videoIdOf,
  assertWithinLimits,
  qualityMenuText,
  failureText,
} = require("./utils/yt");

const URL_PATTERNS = {
  instagram:
    /^https?:\/\/(?:www\.)?instagram\.com\/(?:p\/[A-Za-z0-9_-]+\/?|share\/(?:(?:p|reel|tv)\/)?[A-Za-z0-9_-]+\/?|reel\/[A-Za-z0-9_-]+\/?|tv\/[A-Za-z0-9_-]+\/?|stories\/[A-Za-z0-9_.-]+\/\d+\/?)(?:\?.*)?$/i,
  youtube:
    /^https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/[A-Za-z0-9_-]+\/?)|youtu\.be\/)([A-Za-z0-9_-]{11})?(?:[\?&].*)?$/i,
  spotify:
    /^https?:\/\/(?:open\.)?spotify\.com\/(?:intl-[a-z]{2}\/)?track\/[A-Za-z0-9]+(?:\?.*)?$/i,
  tiktok:
    /^https?:\/\/(?:www\.)?(?:tiktok\.com\/@?[A-Za-z0-9_.-]+\/video\/\d+|vm\.tiktok\.com\/[A-Za-z0-9_-]+\/?|vt\.tiktok\.com\/[A-Za-z0-9_-]+\/?|v\.tiktok\.com\/[A-Za-z0-9_-]+\/?)(?:\?.*)?$/i,
  pinterest:
    /^https?:\/\/(?:www\.)?(?:pinterest\.com\/(?:pin\/\d+\/?[A-Za-z0-9_-]*)\/?|pin\.it\/[A-Za-z0-9_-]+\/?)(?:\?.*)?$/i,
  facebook:
    /^https?:\/\/(?:www\.)?(?:fb\.watch\/[A-Za-z0-9_-]+\/?|(?:facebook\.com|m\.facebook\.com)\/(?:(?:watch(?:\/?|\?v=))|(?:.*\/videos?\/\d+)|(?:video\.php\?v=\d+)|(?:.*\/posts\/\d+))(?:[\s\S]*)?)$/i,
};

const DOWNLOAD_COMMANDS = new Set([
  "insta",
  "story",
  "tiktok",
  "pinterest",
  "fb",
  "play",
  "video",
  "ytv",
  "yta",
  "spotify",
]);

function getAllUrls(text) {
  if (!text) return [];
  const urlMatches = text.match(/https?:\/\/\S+/gi);
  if (!urlMatches) return [];
  return urlMatches.map((url) => url.replace(/[)\]\.,!?>]*$/, ""));
}

function detectPlatform(url) {
  for (const [platform, re] of Object.entries(URL_PATTERNS)) {
    if (re.test(url)) return platform;
  }
  return null;
}

// true when the dispatcher will run one of the download commands for this text
function isAlreadyCommand(text) {
  const parsed = applyAlias(parseText(text));
  if (!parsed) return false;
  return commands.some(
    (cmd) =>
      !cmd.on &&
      cmd.pattern !== undefined &&
      DOWNLOAD_COMMANDS.has(commandName(cmd)) &&
      patternFor(cmd).test(parsed),
  );
}

const isImageUrl = (url) => /\.(jpg|jpeg|png|webp|heic)(\?|$)/i.test(url);

async function downloadYoutube(message, text, link) {
  const url = youtubeUrlFrom(link);
  if (!url) {
    await message.react("❌");
    return;
  }
  try {
    if (/\baudio\b|\bmp3\b/i.test(text)) {
      await sendYoutubeAudio(message, url, { asDocument: true });
      return;
    }

    const info = await getVideoInfo(url);
    assertWithinLimits(info);
    const menu = qualityMenuText(info, videoIdOf(url) || info.videoId || "");
    if (!menu) {
      await message.react("❌");
      return;
    }
    await message.sendReply(menu);
  } catch (err) {
    if (config.DEBUG) console.error("[AutoDL YT]", err?.message || err);
    if (err.code === "YT_LIMIT" || err.code === "YT_LOGIN_REQUIRED") await message.sendReply(failureText(err));
    else await message.react("❌");
  }
}

async function downloadInstagram(message, urls) {
  const allMediaUrls = [];
  const quotedMessage = message.reply_message ? message.quoted : message.data;

  const { checkRedirect } = require("./social");

  for (const link of urls) {
    try {
      const url = await checkRedirect(link);
      const downloadResult = await downloadGram(url);
      if (downloadResult && downloadResult.length) {
        allMediaUrls.push(...downloadResult);
      }
    } catch (err) {
      if (config.DEBUG) console.error("[AutoDL IG]", err?.message || err);
    }
  }

  if (!allMediaUrls.length) {
    await message.react("❌");
    return;
  }

  if (allMediaUrls.length === 1) {
    await message.sendMessage(
      { url: allMediaUrls[0] },
      isImageUrl(allMediaUrls[0]) ? "image" : "video",
      { quoted: quotedMessage },
    );
  } else {
    const albumObject = allMediaUrls.map((mediaUrl) =>
      isImageUrl(mediaUrl) ? { image: mediaUrl } : { video: mediaUrl },
    );
    await message.client.albumMessage(message.jid, albumObject, message.data);
  }
}

async function downloadPinterest(message, urls) {
  const allMediaUrls = [];
  const quotedMessage = message.reply_message ? message.quoted : message.data;

  for (const url of urls) {
    try {
      const pinterestResult = await pinterestDl(url);
      if (pinterestResult && pinterestResult.status && pinterestResult.result) {
        allMediaUrls.push(pinterestResult.result);
      }
    } catch (err) {
      if (config.DEBUG) console.error("[AutoDL Pinterest]", err?.message || err);
    }
  }

  if (!allMediaUrls.length) {
    await message.react("❌");
    return;
  }

  if (allMediaUrls.length === 1) {
    await message.sendMessage({ url: allMediaUrls[0] }, "video", {
      quoted: quotedMessage,
    });
  } else {
    const albumObject = allMediaUrls.map((mediaUrl) => ({ video: mediaUrl }));
    await message.client.albumMessage(message.jid, albumObject, message.data);
  }
}

async function downloadSpotify(message, url) {
  let downloadMsg;
  try {
    downloadMsg = await message.sendReply(Lang.SPOTIFY_FETCHING);
    const spotifyInfo = await spotifyTrack(url);
    const { title, artist } = spotifyInfo;

    await message.edit(
      Lang.SPOTIFY_DOWNLOADING.format(title, artist),
      message.jid,
      downloadMsg.key,
    );

    const results = await searchYoutube(`${title} ${artist}`, 1);
    if (!results || results.length === 0) {
      await message.edit(Lang.NO_MATCH, message.jid, downloadMsg.key);
      return;
    }

    await sendYoutubeAudio(message, results[0].url, {
      status: downloadMsg,
      meta: { title, artist, thumbnail: spotifyInfo?.thumbnail },
    });
  } catch (err) {
    if (config.DEBUG) console.error("[AutoDL Spotify]", err?.message || err);
    if (downloadMsg) {
      await message.edit(Lang.DL_FAILED, message.jid, downloadMsg.key);
    } else {
      await message.sendReply(Lang.DL_FAILED_RETRY);
    }
  }
}

// one platform per message, in this order; for most only the first link is taken
async function downloadLinks(message, text, platformGroups) {
  try {
    if (platformGroups.youtube) {
      return await downloadYoutube(message, text, platformGroups.youtube[0]);
    }
    if (platformGroups.instagram) {
      return await downloadInstagram(message, platformGroups.instagram);
    }
    if (platformGroups.tiktok) {
      try {
        const downloadResult = await tiktok(platformGroups.tiktok[0]);
        await message.sendReply(downloadResult, "video");
      } catch (err) {
        if (config.DEBUG) console.error("[AutoDL TikTok]", err?.message || err);
        await message.react("❌");
      }
      return;
    }
    if (platformGroups.pinterest) {
      return await downloadPinterest(message, platformGroups.pinterest);
    }
    if (platformGroups.facebook) {
      try {
        const result = await fb(platformGroups.facebook[0]);
        await message.sendReply({ url: result.url }, "video");
      } catch (err) {
        if (config.DEBUG) console.error("[AutoDL FB]", err?.message || err);
        await message.react("❌");
      }
      return;
    }
    if (platformGroups.spotify) {
      return await downloadSpotify(message, platformGroups.spotify[0]);
    }
  } catch (err) {
    if (config.DEBUG) console.error("[AutoDL]", err?.message || err);
    await message.react("❌");
  }
}

Module({ on: "text" }, async (message) => {
  try {
    if (message.fromBot) return;
    const chatJid = message.jid;
    const isGroup = chatJid.includes("@g.us");
    const enabled = String(config.AUTODL || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const autodlEnabledForChat =
      enabled.includes(chatJid) ||
      (isGroup && config.AUTODL_ALL_GROUPS === "true") ||
      (!isGroup && config.AUTODL_ALL_DMS === "true");
    if (!autodlEnabledForChat) return;

    const text = message.text || "";
    if (isAlreadyCommand(text)) return;

    const platformGroups = {};
    for (const url of getAllUrls(text)) {
      const platform = detectPlatform(url);
      if (platform) (platformGroups[platform] ||= []).push(url);
    }
    if (!Object.keys(platformGroups).length) return;

    await message.react("⬇️");
    await queue(accountKey(chatJid), () => downloadLinks(message, text, platformGroups), {
      name: "autodl",
      jid: chatJid,
    });
  } catch (err) {
    if (config.DEBUG) console.error("[AutoDL]", err?.message || err);
  }
});

Module(
  {
    pattern: "autodl ?(.*)",
    fromMe: true,
    desc: Lang.DESC,
    usage: Lang.USAGE,
  },
  async (message, match) => {
    const input = match[1]?.trim();
    const chatJid = message.jid;
    const say = (text, ...args) => message.sendReply(text.format(...args).replaceAll("{p}", helpPrefix()));
    const onOff = (on) => (on ? Lang.ENABLED : Lang.DISABLED);

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

      return await say(
        Lang.MENU,
        chatJid.includes("@g.us") ? Lang.GROUP : Lang.DM,
        onOff(enabled),
        onOff(globalGroups),
        onOff(globalDMs)
      );
    }

    const parts = input.split(" ");
    const cmd = parts[0].toLowerCase();
    const target = parts[1]?.toLowerCase();

    if (cmd === "on") {
      if (target === "groups") {
        await setVar("AUTODL_ALL_GROUPS", "true");
        return await say(Lang.ON_GROUPS);
      } else if (target === "dms") {
        await setVar("AUTODL_ALL_DMS", "true");
        return await say(Lang.ON_DMS);
      } else {
        const enabledList = readList();
        if (!enabledList.includes(chatJid)) enabledList.push(chatJid);
        await setVar("AUTODL", enabledList.join(","));
        return await say(Lang.ON_CHAT);
      }
    }

    if (cmd === "off") {
      if (target === "groups") {
        await setVar("AUTODL_ALL_GROUPS", "false");
        return await say(Lang.OFF_GROUPS);
      } else if (target === "dms") {
        await setVar("AUTODL_ALL_DMS", "false");
        return await say(Lang.OFF_DMS);
      } else {
        const enabledList = readList().filter((x) => x !== chatJid);
        await setVar("AUTODL", enabledList.join(","));
        return await say(Lang.OFF_CHAT);
      }
    }

    if (cmd === "status") {
      const enabledList = readList();
      const globalGroups = config.AUTODL_ALL_GROUPS === "true";
      const globalDMs = config.AUTODL_ALL_DMS === "true";
      return await message.sendReply(
        Lang.STATUS.format(
          enabledList.length > 0 ? enabledList.join(", ") : Lang.NONE,
          onOff(globalGroups),
          onOff(globalDMs)
        )
      );
    }

    return await message.sendReply(Lang.UNKNOWN.format(cmd));
  }
);
