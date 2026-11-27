const { Module } = require("../main");
const {
  pinterestSearch,
  downloadGram,
  pinterestDl,
  tiktok,
  igStalk,
  fb,
} = require("./utils");
const axios = require("axios");
const { getString } = require("./utils/lang");
const Lang = getString("social");

const INSTAGRAM_HOSTS = new Set(["instagram.com", "www.instagram.com", "instagr.am"]);

function hostOf(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch (_) {
    return "";
  }
}

// share links redirect to the post; only Instagram's own hosts are followed, at every hop
async function checkRedirect(url) {
  if (!INSTAGRAM_HOSTS.has(hostOf(url)) || !url.split("/").includes("share")) return url;
  try {
    const res = await axios.get(url, {
      timeout: 10000,
      maxContentLength: 2 * 1024 * 1024,
      beforeRedirect: (options) => {
        if (!INSTAGRAM_HOSTS.has(String(options.hostname).toLowerCase())) {
          throw new Error("redirect left Instagram");
        }
      },
    });
    return res.request.res.responseUrl || url;
  } catch (_) {
    return url;
  }
}
Module(
  {
    pattern: "insta(?!ll) ?(.*)",
    desc: Lang.INSTA_DESC,
    usage: Lang.INSTA_USAGE,
    use: "download",
  },
  async (message, match) => {
    let mediaLinks = match[1] || message.reply_message?.text;
    if (!mediaLinks)
      return await message.sendReply(Lang.NEED_INSTA);

    const allUrls = mediaLinks.match(/\bhttps?:\/\/\S+/gi) || [];
    if (!allUrls.length)
      return await message.sendReply(Lang.NEED_INSTA);

    const instagramUrls = [];
    const instagramRegex =
      /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:p|s|reel|tv)\/[\w-]+/i;

    for (let url of allUrls) {
      if (url.includes("gist") || url.includes("youtu")) continue;

      url = await checkRedirect(url);

      if (url.includes("stories")) continue;

      if (!INSTAGRAM_HOSTS.has(hostOf(url))) continue;

      if (instagramRegex.test(url)) {
        const mediaId = url.match(/\/([\w-]+)\/?$/)?.[1];
        if (mediaId && mediaId.length > 20) continue;

        instagramUrls.push(url);
      }
    }

    if (!instagramUrls.length)
      return await message.sendReply(Lang.NEED_VALID_INSTA);

    try {
      const allMediaUrls = [];
      const quotedMessage = message.reply_message
        ? message.quoted
        : message.data;

      for (const url of instagramUrls) {
        try {
          const downloadResult = await downloadGram(url);
          if (downloadResult && downloadResult.length) {
            allMediaUrls.push(...downloadResult);
          }
        } catch (err) {
          console.error("Error downloading from:", url, err?.message);
        }
      }

      if (!allMediaUrls.length)
        return await message.sendReply(
          Lang.WRONG
        );

      if (allMediaUrls.length === 1) {
        return await message.sendMessage(
          { url: allMediaUrls[0] },
          /\.(jpg|jpeg|png|webp|heic)(\?|$)/i.test(allMediaUrls[0])
            ? "image"
            : "video",
          {
            quoted: quotedMessage,
          }
        );
      }

      const albumObject = allMediaUrls.map((mediaUrl) => {
        return /\.(jpg|jpeg|png|webp|heic)(\?|$)/i.test(mediaUrl)
          ? { image: mediaUrl }
          : { video: mediaUrl };
      });
      albumObject[0].caption = Lang.DONE_ITEMS.format(allMediaUrls.length);
      return await message.client.albumMessage(
        message.jid,
        albumObject,
        message.data
      );
    } catch (err) {
      console.error("Insta command error:", err?.message || err);
      return await message.sendReply(
        Lang.WRONG
      );
    }
  }
);

Module(
  {
    pattern: "fb ?(.*)",
    desc: Lang.FB_DESC,
    usage: Lang.FB_USAGE,
    use: "download",
  },
  async (message, match) => {
    let videoLink = !message.reply_message?.message
      ? match[1]
      : message.reply_message.message;

    if (/\bhttps?:\/\/\S+/gi.test(videoLink)) {
      videoLink = videoLink.match(/\bhttps?:\/\/\S+/gi)[0];
    }
    if (!videoLink) return await message.sendReply(Lang.NEED_FB);
    try {
      const { url } = await fb(videoLink);
      return await message.sendReply({ url }, "video");
    } catch (e) {
      console.error("Facebook download error:", e.message);
      return await message.sendReply(
        Lang.WRONG
      );
    }
  }
);

Module(
  {
    pattern: "ig ?(.*)",
    desc: Lang.IG_DESC,
    usage: Lang.IG_USAGE,
    excludeFromCommands: true,
    use: "search",
  },
  async (message, match) => {
    if (!match[1]) return await message.sendReply(Lang.NEED_IG_USER);

    if (match[1].startsWith("https") && match[1].includes("instagram")) {
      const usernameRegex = /instagram\.com\/([^/?]+)/i;
      const usernameMatch = match[1].match(usernameRegex);
      match[1] = usernameMatch && usernameMatch[1];
    }

    try {
      var accountInfo = await igStalk(encodeURIComponent(match[1]));
    } catch {
      return await message.sendReply(Lang.SERVER_BUSY);
    }

    await message.sendMessage({ url: accountInfo.profile_pic }, "image", {
      caption: Lang.IG_INFO.format(
        accountInfo.full_name,
        accountInfo.followers,
        accountInfo.following,
        accountInfo.bio,
        accountInfo.is_private ? Lang.YES : Lang.NO,
        accountInfo.posts
      ),
      quoted: message.data,
    });
  }
);

Module(
  {
    pattern: "story ?(.*)",
    desc: Lang.STORY_DESC,
    usage: Lang.STORY_USAGE,
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
      return await message.sendReply(Lang.NEED_STORY);

    userIdentifier = !/\bhttps?:\/\/\S+/gi.test(userIdentifier)
      ? `https://instagram.com/stories/${userIdentifier}/`
      : userIdentifier.match(/\bhttps?:\/\/\S+/gi)[0];

    try {
      var storyData = await downloadGram(userIdentifier);
    } catch {
      return await message.sendReply(Lang.SERVER_ERROR_SORRY);
    }
    if (!storyData || !storyData.length)
      return await message.sendReply(Lang.NOT_FOUND);
    if (storyData.length === 1)
      return await message.sendReply(
        { url: storyData[0] },
        /\.(jpg|jpeg|png|webp)(\?|$)/i.test(storyData[0]) ? "image" : "video"
      );
    userIdentifier = userIdentifier
      .replace("https://instagram.com/stories/", "")
      .split("/")[0];
    let albumObject = storyData.map((storyMediaUrl) => {
      return /\.(jpg|jpeg|png|webp)(\?|$)/i.test(storyMediaUrl)
        ? { image: storyMediaUrl }
        : { video: storyMediaUrl };
    });
    albumObject[0].caption = Lang.STORIES_FROM.format(userIdentifier);
    return await message.client.albumMessage(
      message.jid,
      albumObject,
      message.data
    );
  }
);

Module(
  {
    pattern: "pinterest ?(.*)",
    desc: Lang.PIN_DESC,
    usage: Lang.PIN_USAGE,
    use: "download",
  },
  async (message, match) => {
    let userQuery = match[1] !== "" ? match[1] : message.reply_message.text;
    if (!userQuery)
      return await message.sendReply(Lang.NEED_PIN);

    if (/\bhttps?:\/\/\S+/gi.test(userQuery)) {
      userQuery = userQuery.match(/\bhttps?:\/\/\S+/gi)[0];
      let pinterestResult;
      try {
        pinterestResult = await pinterestDl(userQuery);
      } catch (err) {
        console.error("pinterestDl error:", err?.message || err);
        return await message.sendReply(Lang.SERVER_ERROR);
      }

      if (
        !pinterestResult ||
        !pinterestResult.status ||
        !pinterestResult.result
      )
        return await message.sendReply(
          Lang.PIN_NO_MEDIA
        );

      const url = pinterestResult.result;
      const quotedMessage = message.reply_message
        ? message.quoted
        : message.data;
      await message.sendMessage({ url }, "video", { quoted: quotedMessage });
    } else {
      let desiredCount = Math.min(Math.max(parseInt(userQuery.split(",")[1]) || 5, 1), 10);
      let searchQuery = userQuery.split(",")[0] || userQuery;
      let searchResults;
      try {
        const res = await pinterestSearch(searchQuery, desiredCount);
        if (!res || !res.status || !Array.isArray(res.result)) {
          return await message.sendReply(Lang.PIN_NO_RESULTS);
        }
        searchResults = res.result;
      } catch (err) {
        console.error("pinterestSearch error:", err?.message || err);
        return await message.sendReply(
          Lang.PIN_SEARCH_ERROR
        );
      }

      const toDownload = Math.min(desiredCount, searchResults.length);
      await message.sendReply(
        Lang.PIN_DOWNLOADING.format(toDownload, searchQuery)
      );

      const imagesToSend = searchResults
        .slice(0, toDownload)
        .map((url) => ({ image: url }));
      imagesToSend[0].caption = Lang.PIN_RESULTS.format(searchQuery);
      try {
        await message.client.albumMessage(
          message.jid,
          imagesToSend,
          message.data
        );
      } catch (error) {
        console.log(
          "Album send failed, falling back to individual sends:",
          error
        );
        for (const url of searchResults.slice(0, toDownload)) {
          try {
            await message.sendMessage({ url }, "image");
          } catch (error) {
            console.error(
              "Error downloading pinterest item:",
              error?.message || error
            );
          }
        }
      }
    }
  }
);

Module(
  {
    pattern: "tiktok ?(.*)",
    desc: Lang.TIKTOK_DESC,
    usage: Lang.TIKTOK_USAGE,
    use: "download",
  },
  async (message, match) => {
    let videoLink = match[1] !== "" ? match[1] : message.reply_message.text;
    if (!videoLink) return await message.sendReply(Lang.NEED_TIKTOK);
    videoLink = videoLink.match(/\bhttps?:\/\/\S+/gi)?.[0];
    if (!videoLink) return await message.sendReply(Lang.NEED_TIKTOK);
    let downloadResult;
    try {
      downloadResult = await tiktok(videoLink);
      await message.sendReply(downloadResult, "video");
    } catch (error) {
      return await message.sendReply(
        Lang.WRONG
      );
    }
  }
);

module.exports = { checkRedirect };
