const { Module } = require("../main");
const {
  pinterestSearch,
  getBuffer,
  downloadGram,
  pinterestDl,
  tiktok,
  igStalk,
  fb,
} = require("./utils");
const { getTempPath } = require("../core/helpers");
const fileType = require("file-type");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");

const getFileType = async (buffer) => {
  try {
    if (fileType.fileTypeFromBuffer) {
      return await fileType.fileTypeFromBuffer(buffer);
    }

    if (fileType.fromBuffer) {
      return await fileType.fromBuffer(buffer);
    }

    return await fileType(buffer);
  } catch (error) {
    return null;
  }
};
const botConfig = require("../config");
const axios = require("axios");
const isFromMe = botConfig.MODE === "public" ? false : true;
const commandHandlerPrefix =
  botConfig.HANDLERS !== "false" ? botConfig.HANDLERS.split("")[0] : "";

async function checkRedirect(url) {
  let split_url = url.split("/");
  if (split_url.includes("share")) {
    let res = await axios.get(url);
    return res.request.res.responseUrl;
  }
  return url;
}
Module(
  {
    pattern: "insta ?(.*)",
    fromMe: isFromMe,
    desc: "Instagram post/reel/tv/highlights downloader",
    usage: "insta link or reply to a link",
    use: "download",
  },
  async (message, match) => {
    let mediaLink = match[1] || message.reply_message?.text;
    if (/\bhttps?:\/\/\S+/gi.test(mediaLink)) {
      mediaLink = mediaLink.match(/\bhttps?:\/\/\S+/gi)[0];
    }
    if (
      mediaLink &&
      (mediaLink.includes("gist") ||
        mediaLink.includes("youtu") ||
        mediaLink.startsWith("ll"))
    )
      return;
    if (!mediaLink) return await message.sendReply("*Need Instagram link*");
    mediaLink = await checkRedirect(mediaLink);
    if (mediaLink.includes("stories"))
      return await message.sendReply("*_Use .story command!_*");
    if (mediaLink && !mediaLink.includes("instagram.com")) {
      return await message.sendMessage("*_Need Instagram link!_*", "text", {
        quoted: message.data,
      });
    }

    const instagramRegex =
      /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com(?:\/.+?)?\/(p|s|reel|tv)\/)([\w-]+)(?:\/)?(\?.*)?$/;
    const urlMatch = instagramRegex.exec(mediaLink);

    if (urlMatch) {
      try {
        var downloadResult = await downloadGram(urlMatch[0]);
      } catch {
        return await message.sendReply(
          "_Something went wrong, Please try again!_"
        );
      }
      if (downloadResult === false)
        return await message.sendReply(
          "_Something went wrong, Please try again!_"
        );

      const quotedMessage = message.reply_message
        ? message.quoted
        : message.data;
      for (const mediaUrl of downloadResult) {
        if (mediaLink.includes("reel")) {
          return await message.sendMessage({ url: mediaUrl }, "video", {
            quoted: quotedMessage,
          });
        }
        const mediaBuffer = await getBuffer(mediaUrl);
        const fileTypeResult = await getFileType(mediaBuffer);
        const { mime } = fileTypeResult || { mime: "application/octet-stream" };
        await message.sendMessage(
          mediaBuffer,
          mime.includes("video") ? "video" : "image",
          {
            quoted: quotedMessage,
          }
        );
      }
    }
  }
);

Module(
  {
    pattern: "fb ?(.*)",
    fromMe: isFromMe,
    desc: "Facebook video downloader",
    usage: "fb link or reply to a link",
    use: "download",
  },
  async (message, match) => {
    let videoLink = !message.reply_message?.message
      ? match[1]
      : message.reply_message.message;

    if (/\bhttps?:\/\/\S+/gi.test(videoLink)) {
      videoLink = videoLink.match(/\bhttps?:\/\/\S+/gi)[0];
    }
    if (!videoLink) return await message.sendReply("_Need facebook link_");
    try {
      const { url } = await fb(videoLink);
      return await message.sendReply({ url }, "video");
    } catch (e) {
      console.error("Facebook download error:", e.message);
      return await message.sendReply(
        "_Something went wrong, Please try again!_"
      );
    }
  }
);

Module(
  {
    pattern: "ig ?(.*)",
    fromMe: isFromMe,
    desc: "Gets account info from instagram",
    usage: "ig username",
    excludeFromCommands: true,
    use: "search",
  },
  async (message, match) => {
    if (!match[1]) return await message.sendReply("_Need Instagram username!_");

    if (match[1].startsWith("https") && match[1].includes("instagram")) {
      const usernameRegex = /instagram\.com\/([^/?]+)/i;
      const usernameMatch = match[1].match(usernameRegex);
      match[1] = usernameMatch && usernameMatch[1];
    }

    try {
      var accountInfo = await igStalk(encodeURIComponent(match[1]));
    } catch {
      return await message.sendReply("_Server busy!_");
    }

    await message.sendMessage({ url: accountInfo.profile_pic }, "image", {
      caption: `_*Name:*_ ${accountInfo.full_name}\n_*Followers:*_ ${
        accountInfo.followers
      }\n_*Following:*_ ${accountInfo.following}\n_*Bio:*_ ${
        accountInfo.bio
      }\n_*Private account:*_ ${
        accountInfo.is_private ? "Yes" : "No"
      } \n_*Posts:*_ ${accountInfo.posts}`,
      quoted: message.data,
    });
  }
);

Module(
  {
    pattern: "story ?(.*)",
    fromMe: isFromMe,
    desc: "Instagram stories downloader",
    usage: ".story username or link",
    use: "download",
  },
  async (message, match) => {
    let userIdentifier =
      match[1] !== "" ? match[1] : message.reply_message.text;

    if (
      userIdentifier &&
      (userIdentifier.includes("/reel/") ||
        userIdentifier.includes("/tv/") ||
        userIdentifier.includes("/p/"))
    )
      return;
    if (!userIdentifier)
      return await message.sendReply("_Need an Instagram username or link!_");

    userIdentifier = !/\bhttps?:\/\/\S+/gi.test(userIdentifier)
      ? `https://instagram.com/stories/${userIdentifier}/`
      : userIdentifier.match(/\bhttps?:\/\/\S+/gi)[0];

    try {
      var storyData = await downloadGram(userIdentifier);
    } catch {
      return await message.sendReply("*_Sorry, server error_*");
    }

    if (!storyData) return await message.sendReply("*_User has no stories!_*");

    for (const storyMediaUrl of storyData) {
      const mediaBuffer = await getBuffer(storyMediaUrl);
      const fileTypeResult = await getFileType(mediaBuffer);
      const { mime } = fileTypeResult || { mime: "application/octet-stream" };
      await message.sendReply(
        mediaBuffer,
        mime.includes("video") ? "video" : "image"
      );
    }
  }
);

Module(
  {
    pattern: "pinterest ?(.*)",
    fromMe: isFromMe,
    desc: "Pinterest downloader",
    usage: ".pinterest query or link",
    use: "download",
  },
  async (message, match) => {
    let userQuery = match[1] !== "" ? match[1] : message.reply_message.text;
    if (userQuery === "g") return;
    if (!userQuery)
      return await message.sendReply("_Need search term or pin video link_");

    if (/\bhttps?:\/\/\S+/gi.test(userQuery)) {
      userQuery = userQuery.match(/\bhttps?:\/\/\S+/gi)[0];
      let pinterestResult;
      try {
        pinterestResult = await pinterestDl(userQuery);
      } catch (err) {
        console.error("pinterestDl error:", err?.message || err);
        return await message.sendReply("_Server error_");
      }

      if (
        !pinterestResult ||
        !pinterestResult.status ||
        !pinterestResult.result
      )
        return await message.sendReply(
          "_No downloadable media found for this link_"
        );

      const url = pinterestResult.result;
      const quotedMessage = message.reply_message ? message.quoted : message.data;
      await message.sendMessage({url}, "video", { quoted: quotedMessage });
    } else {
      let desiredCount = parseInt(userQuery.split(",")[1]) || 5;
      let searchQuery = userQuery.split(",")[0] || userQuery;
      let searchResults;
      try {
        const res = await pinterestSearch(searchQuery, desiredCount);
        if (!res || !res.status || !Array.isArray(res.result)) {
          return await message.sendReply("_No results found for this query_");
        }
        searchResults = res.result;
      } catch (err) {
        console.error("pinterestSearch error:", err?.message || err);
        return await message.sendReply(
          "_Server error while searching Pinterest_"
        );
      }

      const toDownload = Math.min(desiredCount, searchResults.length);
      await message.sendReply(
        `_Downloading ${toDownload} results for ${searchQuery} from Pinterest_`
      );

      let successfulDownloads = 0;
      for (let i = 0;i < searchResults.length && successfulDownloads < toDownload; i++) {
        try {
          const url = searchResults[i];
          await message.sendMessage(
            {url},
            "image"
          );
          successfulDownloads++;
        } catch (error) {
          console.error(
            "Error downloading pinterest item:",
            error?.message || error
          );
        }
      }
    }
  }
);

Module(
  {
    pattern: "tiktok ?(.*)",
    fromMe: isFromMe,
    desc: "TikTok video downloader",
    usage: ".tiktok reply or link",
    use: "download",
  },
  async (message, match) => {
    let videoLink = match[1] !== "" ? match[1] : message.reply_message.text;
    if (!videoLink) return await message.sendReply("_Need a TikTok URL_");
    videoLink = videoLink.match(/\bhttps?:\/\/\S+/gi)[0];
    let downloadResult;
    try {
      downloadResult = await tiktok(videoLink);
      await message.sendReply(downloadResult, "video");
    } catch (error) {
      return await message.sendReply(
        "_Something went wrong, Please try again!_"
      );
    }
  }
);
