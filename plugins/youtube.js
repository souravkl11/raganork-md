const { Module } = require("../main");
const axios = require("axios");
const { helpPrefix } = require("../core/plugins/registry");
const { queue } = require("../core/pipeline/dispatcher");
const {
  searchYoutube,
  getVideoInfo,
  sendYoutubeAudio,
  sendYoutubeVideo,
  youtubeUrlFrom,
  videoIdOf,
  assertWithinLimits,
  qualityMenuText,
  qualityOptions,
  formatBytes,
  failureText,
} = require("./utils/yt");
const ui = require("../core/ui");
const ytEngine = require("./utils/yt-engine");
const { getString } = require("./utils/lang");
const Lang = getString("youtube");
const YT = getString("yt");
// replies are matched against the current language and the old english text
const hasAny = (text, ...marks) => marks.some((mark) => mark && text.includes(mark));
const { spotifyTrack } = require("./utils/misc");
const { accountKey } = require("./utils");

const watchUrl = (id) => `https://www.youtube.com/watch?v=${id}`;

// downloads started by a number reply wait their turn in the chat's queue, like commands do
const inChatQueue = (message, name, job) =>
  queue(accountKey(message.jid), job, { name, jid: message.jid });

function formatViews(views) {
  if (views >= 1000000) {
    return (views / 1000000).toFixed(1) + "M";
  } else if (views >= 1000) {
    return (views / 1000).toFixed(1) + "K";
  }
  return views?.toString() || "N/A";
}

function searchResultText(query, results, footer) {
  let text = Lang.SEARCH_HEADER + "\n\n";
  text += Lang.SEARCH_FOUND.format(results.length, query);
  results.forEach((video, index) => {
    const id = video.id || videoIdOf(video.url);
    text += Lang.SEARCH_ITEM.format(index + 1, video.title, id ? ` (${id})` : "", video.duration, formatViews(video.views), video.channel.name);
  });
  return text + footer;
}

// uses the id printed in the line; older lists without ids are searched again
async function listedVideo(repliedText, n) {
  const lines = repliedText.split("\n");
  const at = lines.findIndex((line) => line.startsWith(`*${n}.*`));
  const id = lines[at]?.match(/\(([\w-]{11})\)\s*$/)?.[1];
  if (id) {
    const title = lines[at].replace(/^\*\d+\.\*\s*/, "").replace(/\s*\([\w-]{11}\)\s*$/, "");
    const detail = lines[at + 1]?.match(/`([^`]*)`[^`]*`([^`]*)`/);
    return {
      id,
      url: watchUrl(id),
      title,
      duration: detail?.[1],
      views: detail?.[2],
      channel: lines[at + 2]?.match(/^\s*_[^_]+:_ (.*)/)?.[1],
    };
  }
  const query = repliedText.match(/Found \d+ results for:_\s*\*(.+?)\*/)?.[1];
  if (!query) return null;
  const video = (await searchYoutube(query, 10))[n - 1];
  if (!video) return null;
  return {
    id: video.id || videoIdOf(video.url),
    url: video.url,
    title: video.title,
    duration: video.duration,
    views: formatViews(video.views),
    channel: video.channel?.name,
    uploadedAt: video.uploadedAt,
    thumbnail: video.thumbnail,
  };
}

// button mode sends no status message (the list is the answer), so results
// replace the status when there is one and go out as a reply otherwise
const showResult = (message, status, text) =>
  status ? message.edit(text, message.jid, status.key) : message.sendReply(text);

// rowCommand(url) -> the command a tapped row runs
async function runSearch(message, query, footer, errorLabel, list) {
  try {
    const buttons = ui.enabled();
    const searchMsg = buttons ? null : await message.sendReply(Lang.SEARCHING_YT);
    const results = await searchYoutube(query, 10);

    if (!results || results.length === 0) {
      return await showResult(message, searchMsg, Lang.NO_RESULTS);
    }
    const text = searchResultText(query, results, footer);
    if (!buttons) return await showResult(message, searchMsg, text);

    await message.sendList({
      text,
      header: list.header,
      body: Lang.RESULTS_FOR.format(query, list.body),
      footer: "YouTube",
      button: list.button,
      sections: [
        {
          title: Lang.RESULTS,
          rows: results.map((video) => {
            const url = video.url || watchUrl(video.id);
            return {
              title: video.title,
              description: [video.duration, video.views != null && Lang.VIEWS.format(formatViews(video.views)), video.channel?.name]
                .filter(Boolean)
                .join(" · "),
              id: list.rowCommand(url),
            };
          }),
        },
      ],
    });
  } catch (error) {
    console.error(errorLabel, error);
    await message.sendReply(Lang.SEARCH_FAILED);
  }
}

Module(
  {
    pattern: "song ?(.*)",
    desc: Lang.SONG_DESC,
    usage: ".song <query>",
    use: "download",
  },
  async (message, match) => {
    const query = match[1];
    if (!query) {
      return await message.sendReply(
        Lang.NEED_QUERY.format(helpPrefix(), "song faded alan walker")
      );
    }
    await runSearch(message, query, Lang.SONG_FOOTER, "Song search error:", {
      header: Lang.SONG_HEADER,
      body: Lang.SONG_BODY,
      button: Lang.SHOW_RESULTS,
      rowCommand: (url) => ui.cmd("play", url),
    });
  }
);

Module(
  {
    pattern: "yts ?(.*)",
    desc: Lang.YTS_DESC,
    usage: ".yts <query>",
    use: "download",
  },
  async (message, match) => {
    const query = match[1];
    if (!query) {
      return await message.sendReply(
        Lang.NEED_QUERY.format(helpPrefix(), "yts ncs music")
      );
    }
    const url = youtubeUrlFrom(query);
    if (url) return await showVideoDetails(message, url);
    await runSearch(message, query, Lang.YTS_FOOTER, "YTS search error:", {
      header: Lang.YTS_HEADER,
      body: Lang.YTS_BODY,
      button: Lang.SHOW_RESULTS,
      rowCommand: (url) => ui.cmd("yts", url),
    });
  }
);

Module(
  {
    pattern: "ytv ?(.*)",
    desc: Lang.YTV_DESC,
    usage: ".ytv <link>",
    use: "download",
  },
  async (message, match) => {
    const url = youtubeUrlFrom(match[1] || message.reply_message?.text);

    if (!url) {
      return await message.sendReply(
        Lang.NEED_LINK.format(helpPrefix(), "ytv")
      );
    }

    try {
      const buttons = ui.enabled();
      const infoMsg = buttons ? null : await message.sendReply(Lang.FETCHING_INFO);
      const info = await getVideoInfo(url);
      assertWithinLimits(info);

      const menu = qualityMenuText(info, videoIdOf(url) || info.videoId || "");
      if (!menu || !buttons) {
        return await showResult(message, infoMsg, menu || Lang.NO_FORMATS);
      }
      const options = qualityOptions(info);
      await message.sendList({
        text: menu,
        header: Lang.SELECT_QUALITY,
        body: Lang.QUALITY_BODY.format(info.title),
        footer: "YouTube",
        button: Lang.CHOOSE_QUALITY,
        sections: [
          {
            title: Lang.QUALITIES,
            rows: options.map((o) => ({
              title: o.audio ? Lang.AUDIO_ONLY : o.quality,
              description: o.size ? `~ ${formatBytes(o.size)}` : "",
              id: o.audio ? ui.cmd("yta", url) : ui.cmd("video", url, o.quality),
            })),
          },
        ],
      });
    } catch (error) {
      console.error("YTV info error:", error);
      const text = failureText(error);
      await message.sendReply(
        text === YT.DOWNLOAD_FAILED ? Lang.INFO_FAILED : text
      );
    }
  }
);

Module(
  {
    pattern: "video ?(.*)",
    desc: Lang.VIDEO_DESC,
    usage: ".video <link> [720p]",
    use: "download",
  },
  async (message, match) => {
    const quality = match[1]?.match(/(?:^|\s)(\d{3,4}p)\s*$/i)?.[1]?.toLowerCase() || "360p";
    const url = youtubeUrlFrom(match[1] || message.reply_message?.text);

    if (!url) {
      return await message.sendReply(
        Lang.NEED_LINK.format(helpPrefix(), "video")
      );
    }
    await sendYoutubeVideo(message, url, quality);
  }
);

Module(
  {
    pattern: "yta ?(.*)",
    desc: Lang.YTA_DESC,
    usage: ".yta <song name or link>",
    use: "download",
  },
  async (message, match) => {
    const input = match[1] || message.reply_message?.text;
    if (!input) {
      return await message.sendReply(
        Lang.NEED_SONG.format(helpPrefix(), "yta")
      );
    }

    const url = youtubeUrlFrom(input);
    if (url) return await sendYoutubeAudio(message, url, { asDocument: true, best: true });

    let searchMsg;
    try {
      searchMsg = await message.sendReply(Lang.SEARCHING);
      const results = await searchYoutube(input, 1);
      if (!results || results.length === 0) {
        return await message.edit(Lang.NO_RESULTS, message.jid, searchMsg.key);
      }
      await sendYoutubeAudio(message, results[0].url, { asDocument: true, best: true, status: searchMsg });
    } catch (error) {
      console.error("yta error:", error);
      if (searchMsg) await message.edit(Lang.DL_FAILED, message.jid, searchMsg.key);
      else await message.sendReply(Lang.DL_FAILED_RETRY);
    }
  }
);

Module(
  {
    pattern: "play ?(.*)",
    desc: Lang.PLAY_DESC,
    usage: ".play <song name or link>",
    use: "download",
  },
  async (message, match) => {
    const input = match[1] || message.reply_message?.text;
    if (!input) {
      return await message.sendReply(
        Lang.NEED_SONG.format(helpPrefix(), "play")
      );
    }

    const url = youtubeUrlFrom(input);
    if (url) return await sendYoutubeAudio(message, url);

    let searchMsg;
    try {
      searchMsg = await message.sendReply(Lang.SEARCHING);
      const results = await searchYoutube(input, 1);

      if (!results || results.length === 0) {
        return await message.edit(Lang.NO_RESULTS, message.jid, searchMsg.key);
      }

      const video = results[0];
      await message.edit(Lang.DOWNLOADING.format(video.title), message.jid, searchMsg.key);
      await sendYoutubeAudio(message, video.url, { status: searchMsg });
    } catch (error) {
      console.error("Play error:", error);
      if (searchMsg) {
        await message.edit(Lang.DL_FAILED, message.jid, searchMsg.key);
      } else {
        await message.sendReply(Lang.DL_FAILED_RETRY);
      }
    }
  }
);

const clockOf = (secs) => {
  if (!secs) return undefined;
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const sec = String(Math.floor(secs % 60)).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
};

// .yts <url>: details for a single link (the target of a tapped search row)
async function showVideoDetails(message, url) {
  try {
    const info = await getVideoInfo(url);
    const id = videoIdOf(url) || info.videoId;
    await sendVideoDetails(message, {
      id,
      url: id ? watchUrl(id) : url,
      title: info.title,
      channel: info.channel?.name,
      duration: clockOf(info.lengthSeconds),
      views: info.views != null ? formatViews(info.views) : undefined,
      uploadedAt: info.uploadedAt,
      thumbnail: info.thumbnail,
    });
  } catch (error) {
    console.error("YTS details error:", error);
    await message.sendReply(failureText(error));
  }
}

async function sendVideoDetails(message, video) {
  let head = Lang.DETAILS.format(video.title, video.channel || Lang.NA, video.duration || Lang.NA, video.views || Lang.NA);
  if (video.uploadedAt) head += Lang.UPLOADED.format(video.uploadedAt);
  const caption = head + Lang.DETAILS_URL.format(video.url) + Lang.DETAILS_REPLY;

  let thumbnail;
  try {
    const response = await axios.get(
      video.thumbnail || `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`,
      { responseType: "arraybuffer", timeout: 10000 }
    );
    thumbnail = Buffer.from(response.data);
  } catch (error) {
    console.error("YTS thumbnail error:", error.message);
  }
  if (ui.enabled()) {
    // the "Open on YouTube" button carries the link, so the body drops the URL line
    const body = head.trim();
    return await message.sendButtons({
      text: caption,
      body,
      footer: "YouTube",
      image: thumbnail,
      buttons: [
        { text: Lang.BTN_AUDIO, id: ui.cmd("play", video.url) },
        { text: Lang.BTN_VIDEO, id: ui.cmd("ytv", video.url) },
        { text: Lang.BTN_AUDIO_FILE, id: ui.cmd("yta", video.url) },
        { text: Lang.BTN_OPEN, url: video.url },
      ],
    });
  }
  if (thumbnail) await message.sendReply(thumbnail, "image", { caption });
  else await message.sendReply(caption);
}

Module(
  {
    on: "text",
  },
  async (message, match) => {
    const numberMatch = message.text?.match(/^\d+$/);
    if (!numberMatch) return;
    const selectedNumber = parseInt(numberMatch[0]);
    if (
      !message.reply_message ||
      !message.reply_message.fromMe ||
      !message.reply_message.message
    ) {
      return;
    }
    const repliedText = message.reply_message.message;
    if (
      hasAny(repliedText, Lang.SEARCH_HEADER, "YouTube Search Results") &&
      hasAny(repliedText, Lang.SONG_FOOTER, "to download audio")
    ) {
      if (selectedNumber < 1 || selectedNumber > 10) {
        return await message.sendReply(Lang.PICK_1_10);
      }

      try {
        const video = await listedVideo(repliedText, selectedNumber);
        if (!video) return await message.sendReply(Lang.INVALID_SELECTION);

        const status = await message.sendReply(Lang.DOWNLOADING.format(video.title));
        await inChatQueue(message, "song", () => sendYoutubeAudio(message, video.url, { status }));
      } catch (error) {
        console.error("Song selection error:", error);
        await message.sendReply(Lang.SELECTION_FAILED);
      }
    } else if (
      hasAny(repliedText, Lang.SEARCH_HEADER, "YouTube Search Results") &&
      hasAny(repliedText, Lang.YTS_FOOTER, "see video details")
    ) {
      if (selectedNumber < 1 || selectedNumber > 10) {
        return await message.sendReply(Lang.PICK_1_10);
      }

      try {
        const video = await listedVideo(repliedText, selectedNumber);
        if (!video) return await message.sendReply(Lang.INVALID_SELECTION);
        await sendVideoDetails(message, video);
      } catch (error) {
        console.error("YTS video info error:", error);
        await message.sendReply(Lang.VIDEO_INFO_FAILED);
      }
    } else if (
      hasAny(repliedText, Lang.DETAILS_REPLY) ||
      (repliedText.includes("Reply with:") && repliedText.includes("* Audio"))
    ) {
      if (selectedNumber !== 1 && selectedNumber !== 2) {
        return await message.sendReply(
          Lang.PICK_1_2
        );
      }

      const url = youtubeUrlFrom(repliedText.match(/\*[^*\n]+:\*\s*(https?:\/\/\S+)/m)?.[1]);
      if (!url) return;

      if (selectedNumber === 1) {
        await inChatQueue(message, "yts-audio", () => sendYoutubeAudio(message, url));
      } else {
        await inChatQueue(message, "yts-video", () => sendYoutubeVideo(message, url, "360p"));
      }
    } else if (
      (hasAny(repliedText, YT.QUALITY_HEADER.split("\n")[0]) && hasAny(repliedText, YT.QUALITY_FOOTER.trim())) ||
      (repliedText.includes("Select Video Quality") && repliedText.includes("Reply with a number"))
    ) {
      const lines = repliedText.split("\n");
      const videoId = lines
        .map((line) => line.trim().match(/^\(([\w-]{11})\)$/)?.[1])
        .find(Boolean);

      if (!videoId) {
        return await message.sendReply(Lang.NO_VIDEO_ID);
      }

      const url = watchUrl(videoId);
      if (!repliedText.match(/_\*([^*]+)\*_/)) return;

      const qualityLines = lines.filter((line) => line.match(/^\*\d+\./));
      const selectedLine = qualityLines[selectedNumber - 1];
      if (!selectedLine) {
        return await message.sendReply(Lang.INVALID_QUALITY);
      }

      if (hasAny(selectedLine, YT.AUDIO_ONLY, "Audio Only")) {
        await inChatQueue(message, "ytv-audio", () =>
          sendYoutubeAudio(message, url, { asDocument: true, best: true })
        );
      } else {
        const quality = selectedLine.match(/(\d+p)/)?.[1];
        if (!quality) return;
        await inChatQueue(message, "ytv-video", () => sendYoutubeVideo(message, url, quality));
      }
    }
  }
);

Module(
  {
    pattern: "ytlogin ?(.*)",
    fromMe: true,
    desc: Lang.YTLOGIN_DESC,
    usage: ".ytlogin | .ytlogin status | .ytlogin force",
    use: "owner",
  },
  async (message, match) => {
    const arg = match[1]?.trim().toLowerCase();
    const loggedIn = await ytEngine.isLoggedIn();
    if (arg === "status") {
      return await message.sendReply(loggedIn ? Lang.SIGNED_IN : Lang.NOT_SIGNED_IN);
    }
    if (loggedIn && arg !== "force") {
      return await message.sendReply(
        Lang.ALREADY_SIGNED_IN.replaceAll("{p}", helpPrefix())
      );
    }
    // return once the code is out: waiting for approval would hold the chat's queue
    await new Promise((codeSent) => {
      ytEngine
        .login(async ({ verification_url, user_code, expires_in }) => {
          await message
            .sendReply(
              Lang.LOGIN_STEPS.format(verification_url, user_code, Math.round(expires_in / 60))
            )
            .catch(() => {});
          codeSent();
        })
        .then(() => message.sendReply(Lang.SIGNED_IN))
        .catch((error) => message.sendReply(Lang.LOGIN_FAILED.format(error.message)))
        .catch(() => {})
        .finally(codeSent);
    });
  }
);

Module(
  {
    pattern: "ytlogout",
    fromMe: true,
    desc: Lang.YTLOGOUT_DESC,
    use: "owner",
  },
  async (message) => {
    await ytEngine.logout();
    await message.sendReply(Lang.SIGNED_OUT);
  }
);

function spotifyUrlFrom(text) {
  const raw = String(text ?? "").match(/\bhttps?:\/\/\S+/i)?.[0];
  try {
    const host = new URL(raw).hostname.toLowerCase();
    return host === "spotify.com" || host.endsWith(".spotify.com") ? raw : null;
  } catch (_) {
    return null;
  }
}

Module(
  {
    pattern: "spotify ?(.*)",
    desc: Lang.SPOTIFY_DESC,
    usage: ".spotify <spotify link>",
    use: "download",
  },
  async (message, match) => {
    const url = spotifyUrlFrom(match[1] || message.reply_message?.text);

    if (!url) {
      return await message.sendReply(
        Lang.NEED_SPOTIFY.format(helpPrefix())
      );
    }

    let downloadMsg;
    try {
      downloadMsg = await message.sendReply(Lang.SPOTIFY_FETCHING);
      const spotifyInfo = await spotifyTrack(url);
      const { title, artist } = spotifyInfo;

      await message.edit(
        Lang.SPOTIFY_DOWNLOADING.format(title, artist),
        message.jid,
        downloadMsg.key
      );

      const results = await searchYoutube(`${title} ${artist}`, 1);

      if (!results || results.length === 0) {
        return await message.edit(
          Lang.NO_MATCH,
          message.jid,
          downloadMsg.key
        );
      }

      await sendYoutubeAudio(message, results[0].url, {
        status: downloadMsg,
        meta: { title, artist, thumbnail: spotifyInfo?.thumbnail },
      });
    } catch (error) {
      console.error("Spotify download error:", error);
      if (downloadMsg) {
        await message.edit(Lang.DL_FAILED, message.jid, downloadMsg.key);
      } else {
        await message.sendReply(Lang.DL_FAILED_RETRY);
      }
    }
  }
);
