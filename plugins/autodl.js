const { Module } = require("../main");
const config = require("../config");
const { setVar } = require("./manage");
const { downloadGram, pinterestDl, tiktok, fb, spotifyTrack } = require("./utils");
const { getVideoInfo, downloadAudio, convertM4aToMp3, searchYoutube } = require("./utils/yt");
const fs = require("fs");
const fromMe = config.MODE !== "public";

const HANDLER_PREFIX =
  config.HANDLERS === "false" ? "" : (config.HANDLERS || ".").charAt(0);

const URL_PATTERNS = {
  instagram:
    /^https?:\/\/(?:www\.)?instagram\.com\/(?:p\/[A-Za-z0-9_-]+\/?|reel\/[A-Za-z0-9_-]+\/?|tv\/[A-Za-z0-9_-]+\/?|stories\/[A-Za-z0-9_.-]+\/\d+\/?)(?:\?.*)?$/i,
  youtube:
    /^https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/[A-Za-z0-9_-]+\/?)|youtu\.be\/)([A-Za-z0-9_-]{11})?(?:[\?&].*)?$/i,
  spotify:
    /^https?:\/\/(?:open\.)?spotify\.com\/(?:intl-[a-z]{2}\/)?track\/[A-Za-z0-9]+(?:\?.*)?$/i,
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

function isAlreadyCommand(text) {
  text = text?.toLowerCase()?.trim();
  if (!text) return false;
  const regex =
    /(insta\s|instah|story\s|storyh|tiktok\s|tiktokh|pinterest\s|pinteresth|twitter\s|twitterh|fb\s|fbh|play\s|playh|ytv\s|ytvh|yta\s|ytah|spotify\s|spotifyh)/;
  return regex.test(text);
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
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

    const urls = getAllUrls(text);
    if (!urls.length) return;

    // group urls by platform
    const platformGroups = {};
    const unsupportedUrls = [];

    for (const url of urls) {
      const platform = detectPlatform(url);
      if (!platform) {
        unsupportedUrls.push(url);
      } else {
        if (!platformGroups[platform]) platformGroups[platform] = [];
        platformGroups[platform].push(url);
      }
    }

    if (!Object.keys(platformGroups).length) return;

    await message.react("⬇️");

    try {
      // handle youtube separately (only process first url for yt)
      if (platformGroups["youtube"]) {
        let url = platformGroups["youtube"][0];

        // Convert YouTube Shorts URL to regular watch URL if needed
        if (url.includes("youtube.com/shorts/")) {
          const shortId = url.match(
            /youtube\.com\/shorts\/([A-Za-z0-9_-]+)/
          )?.[1];
          if (shortId) {
            url = `https://www.youtube.com/watch?v=${shortId}`;
          }
        }

        const lowerText = text.toLowerCase();
        const isAudioMode =
          /\baudio\b|\bmp3\b/.test(lowerText) && !isAlreadyCommand(text);

        try {
          // if message contains "audio" or "mp3", download as audio
          if (isAudioMode) {
            let downloadMsg;
            let audioPath;

            try {
              downloadMsg = await message.sendReply("_Downloading audio..._");
              const result = await downloadAudio(url);
              audioPath = result.path;

              const mp3Path = await convertM4aToMp3(audioPath);
              audioPath = mp3Path;

              await message.edit(
                "_Sending audio..._",
                message.jid,
                downloadMsg.key
              );

              const stream = fs.createReadStream(audioPath);
              await message.sendMessage({ stream }, "document", {
                fileName: `${result.title}.m4a`,
                mimetype: "audio/mp4",
                caption: `_*${result.title}*_`,
              });
              stream.destroy();

              await message.edit(
                "_Download complete!_",
                message.jid,
                downloadMsg.key
              );

              await new Promise((resolve) => setTimeout(resolve, 100));
              if (fs.existsSync(audioPath)) {
                fs.unlinkSync(audioPath);
              }
            } catch (error) {
              if (config.DEBUG)
                console.error("[AutoDL YT Audio]", error?.message || error);
              if (downloadMsg) {
                await message.edit(
                  "_Download failed!_",
                  message.jid,
                  downloadMsg.key
                );
              } else {
                await message.sendReply("_Download failed. Please try again._");
              }

              if (audioPath && fs.existsSync(audioPath)) {
                fs.unlinkSync(audioPath);
              }
            }
            return;
          }

          // else download video with quality selection
          const info = await getVideoInfo(url);
          const videoFormats = info.formats
            .filter((f) => f.type === "video" && f.quality)
            .sort((a, b) => {
              const getRes = (q) => {
                const match = q.match(/(\d+)/);
                return match ? parseInt(match[1]) : 0;
              };
              return getRes(b.quality) - getRes(a.quality);
            });

          const uniqueQualities = [
            ...new Set(videoFormats.map((f) => f.quality)),
          ];

          const videoIdMatch = url.match(
            /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([^&\s/?]+)/
          );
          const videoId = videoIdMatch ? videoIdMatch[1] : info.videoId || "";

          let qualityText = "_*Select Video Quality*_\n\n";
          qualityText += `_*${info.title}*_\n\n(${videoId})\n\n`;

          if (uniqueQualities.length === 0) {
            await message.react("❌");
            return;
          }

          uniqueQualities.forEach((quality, index) => {
            const format = videoFormats.find((f) => f.quality === quality);
            const audioFormat = info.formats.find((f) => f.type === "audio");

            let sizeInfo = "";
            if (format.size && audioFormat?.size) {
              const parseSize = (sizeStr) => {
                const match = sizeStr.match(/([\d.]+)\s*(KB|MB|GB)/i);
                if (!match) return 0;
                const value = parseFloat(match[1]);
                const unit = match[2].toUpperCase();
                if (unit === "KB") return value * 1024;
                if (unit === "MB") return value * 1024 * 1024;
                if (unit === "GB") return value * 1024 * 1024 * 1024;
                return value;
              };

              const videoSize = parseSize(format.size);
              const audioSize = parseSize(audioFormat.size);
              const totalSize = videoSize + audioSize;

              if (totalSize > 0) {
                sizeInfo = ` ~ _${formatBytes(totalSize)}_`;
              }
            }

            qualityText += `*${index + 1}.* _*${quality}*_${sizeInfo}\n`;
          });

          const audioFormat = info.formats.find((f) => f.type === "audio");
          if (audioFormat) {
            let audioSizeInfo = "";
            if (audioFormat.size) {
              const parseSize = (sizeStr) => {
                const match = sizeStr.match(/([\d.]+)\s*(KB|MB|GB)/i);
                if (!match) return 0;
                const value = parseFloat(match[1]);
                const unit = match[2].toUpperCase();
                if (unit === "KB") return value * 1024;
                if (unit === "MB") return value * 1024 * 1024;
                if (unit === "GB") return value * 1024 * 1024 * 1024;
                return value;
              };
              const audioSize = parseSize(audioFormat.size);
              if (audioSize > 0) {
                audioSizeInfo = ` ~ _${formatBytes(audioSize)}_`;
              }
            }
            qualityText += `*${uniqueQualities.length + 1}.* _*Audio Only*_${audioSizeInfo}\n`;
          }

          qualityText += "\n_Reply with a number to download_";
          await message.sendReply(qualityText);
        } catch (err) {
          if (config.DEBUG) console.error("[AutoDL YT]", err?.message || err);
          await message.react("❌");
        }
        return;
      }

      // handle instagram (multiple urls support)
      if (platformGroups["instagram"]) {
        const allMediaUrls = [];
        const quotedMessage = message.reply_message
          ? message.quoted
          : message.data;

        for (const url of platformGroups["instagram"]) {
          try {
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
            /\.(jpg|jpeg|png|webp|heic)(\?|$)/i.test(allMediaUrls[0])
              ? "image"
              : "video",
            { quoted: quotedMessage }
          );
        } else {
          const albumObject = allMediaUrls.map((mediaUrl) => {
            return /\.(jpg|jpeg|png|webp|heic)(\?|$)/i.test(mediaUrl)
              ? { image: mediaUrl }
              : { video: mediaUrl };
          });
          await message.client.albumMessage(
            message.jid,
            albumObject,
            message.data
          );
        }
        return;
      }

      // handle tiktok (only process first url for now - api limitation)
      if (platformGroups["tiktok"]) {
        try {
          const downloadResult = await tiktok(platformGroups["tiktok"][0]);
          await message.sendReply(downloadResult, "video");
        } catch (err) {
          if (config.DEBUG)
            console.error("[AutoDL TikTok]", err?.message || err);
          await message.react("❌");
        }
        return;
      }

      // handle pinterest (multiple urls support)
      if (platformGroups["pinterest"]) {
        const allMediaUrls = [];
        const quotedMessage = message.reply_message
          ? message.quoted
          : message.data;

        for (const url of platformGroups["pinterest"]) {
          try {
            const pinterestResult = await pinterestDl(url);
            if (
              pinterestResult &&
              pinterestResult.status &&
              pinterestResult.result
            ) {
              allMediaUrls.push(pinterestResult.result);
            }
          } catch (err) {
            if (config.DEBUG)
              console.error("[AutoDL Pinterest]", err?.message || err);
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
          const albumObject = allMediaUrls.map((mediaUrl) => {
            return { video: mediaUrl };
          });
          await message.client.albumMessage(
            message.jid,
            albumObject,
            message.data
          );
        }
        return;
      }

      // handle facebook (only process first url for now)
      if (platformGroups["facebook"]) {
        try {
          const result = await fb(platformGroups["facebook"][0]);
          await message.sendReply({ url: result.url }, "video");
        } catch (err) {
          if (config.DEBUG) console.error("[AutoDL FB]", err?.message || err);
          await message.react("❌");
        }
        return;
      }

      // handle spotify (only process first url for now)
      if (platformGroups["spotify"]) {
        let downloadMsg;
        let audioPath;

        try {
          downloadMsg = await message.sendReply("_Fetching Spotify info..._");
          const spotifyInfo = await spotifyTrack(platformGroups["spotify"][0]);
          const { title, artist } = spotifyInfo;

          await message.edit(
            `_Downloading *${title}* by *${artist}*..._`,
            message.jid,
            downloadMsg.key
          );

          const query = `${title} ${artist}`;
          const results = await searchYoutube(query, 1);

          if (!results || results.length === 0) {
            await message.edit(
              "_No matching songs found on YouTube!_",
              message.jid,
              downloadMsg.key
            );
            return;
          }

          const video = results[0];
          const result = await downloadAudio(video.url);
          audioPath = result.path;

          const mp3Path = await convertM4aToMp3(audioPath);
          audioPath = mp3Path;

          await message.edit(
            "_Sending audio..._",
            message.jid,
            downloadMsg.key
          );

          const stream = fs.createReadStream(audioPath);
          await message.sendReply({ stream }, "audio", {
            mimetype: "audio/mp4",
          });
          stream.destroy();

          await message.edit(
            "_Download complete!_",
            message.jid,
            downloadMsg.key
          );

          await new Promise((resolve) => setTimeout(resolve, 100));
          if (fs.existsSync(audioPath)) {
            fs.unlinkSync(audioPath);
          }
        } catch (err) {
          if (config.DEBUG)
            console.error("[AutoDL Spotify]", err?.message || err);
          if (downloadMsg) {
            await message.edit("_Download failed!_", message.jid, downloadMsg.key);
          } else {
            await message.sendReply("_Download failed. Please try again._");
          }

          if (audioPath && fs.existsSync(audioPath)) {
            fs.unlinkSync(audioPath);
          }
        }
        return;
      }

      // handle twitter
      if (platformGroups["twitter"]) {
        await message.react("❌");
        return;
      }
    } catch (err) {
      if (config.DEBUG) console.error("[AutoDL]", err?.message || err);
      await message.react("❌");
    }
  } catch (err) {
    if (config.DEBUG) console.error("[AutoDL]", err?.message || err);
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
