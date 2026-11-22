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
  let text = "YouTube Search Results\n\n";
  text += `_Found ${results.length} results for:_ *${query}*\n\n`;
  results.forEach((video, index) => {
    const id = video.id || videoIdOf(video.url);
    text += `*${index + 1}.* ${video.title}${id ? ` (${id})` : ""}\n`;
    text += `   _Duration:_ \`${video.duration}\` | _Views:_ \`${formatViews(video.views)}\`\n`;
    text += `   _Channel:_ ${video.channel.name}\n\n`;
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
    const detail = lines[at + 1]?.match(/_Duration:_ `([^`]*)` \| _Views:_ `([^`]*)`/);
    return {
      id,
      url: watchUrl(id),
      title,
      duration: detail?.[1],
      views: detail?.[2],
      channel: lines[at + 2]?.match(/_Channel:_ (.*)/)?.[1],
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
    const searchMsg = buttons ? null : await message.sendReply("_Searching YouTube..._");
    const results = await searchYoutube(query, 10);

    if (!results || results.length === 0) {
      return await showResult(message, searchMsg, "_No results found!_");
    }
    const text = searchResultText(query, results, footer);
    if (!buttons) return await showResult(message, searchMsg, text);

    await message.sendList({
      text,
      header: list.header,
      body: `_Results for:_ *${query}*\n${list.body}`,
      footer: "YouTube",
      button: list.button,
      sections: [
        {
          title: "Results",
          rows: results.map((video) => {
            const url = video.url || watchUrl(video.id);
            return {
              title: video.title,
              description: [video.duration, video.views != null && `${formatViews(video.views)} views`, video.channel?.name]
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
    await message.sendReply("_Search failed. Please try again later._");
  }
}

Module(
  {
    pattern: "song ?(.*)",
    desc: "Search YouTube and download audio",
    usage: ".song <query>",
    use: "download",
  },
  async (message, match) => {
    const query = match[1];
    if (!query) {
      return await message.sendReply(
        `_Please provide a search query!_\n_Example: ${helpPrefix()}song faded alan walker_`
      );
    }
    await runSearch(message, query, "_Reply with a number (1-10) to download audio_", "Song search error:", {
      header: "🎵 Pick a song",
      body: "_Tap the button and pick one to download its audio._",
      button: "Show results",
      rowCommand: (url) => ui.cmd("play", url),
    });
  }
);

Module(
  {
    pattern: "yts ?(.*)",
    desc: "Search YouTube with detailed info",
    usage: ".yts <query>",
    use: "download",
  },
  async (message, match) => {
    const query = match[1];
    if (!query) {
      return await message.sendReply(
        `_Please provide a search query!_\n_Example: ${helpPrefix()}yts ncs music_`
      );
    }
    const url = youtubeUrlFrom(query);
    if (url) return await showVideoDetails(message, url);
    await runSearch(message, query, "_Reply with a number (1-10) to see video details_", "YTS search error:", {
      header: "🔎 YouTube search",
      body: "_Tap the button and pick a video to see its details._",
      button: "Show results",
      rowCommand: (url) => ui.cmd("yts", url),
    });
  }
);

Module(
  {
    pattern: "ytv ?(.*)",
    desc: "Download YouTube video with quality selection",
    usage: ".ytv <link>",
    use: "download",
  },
  async (message, match) => {
    const url = youtubeUrlFrom(match[1] || message.reply_message?.text);

    if (!url) {
      return await message.sendReply(
        `_Please provide a valid YouTube link!_\n_Example: ${helpPrefix()}ytv https://youtube.com/watch?v=xxxxx or https://youtube.com/shorts/xxxxx_`
      );
    }

    try {
      const buttons = ui.enabled();
      const infoMsg = buttons ? null : await message.sendReply("_📊 Fetching video info..._");
      const info = await getVideoInfo(url);
      assertWithinLimits(info);

      const menu = qualityMenuText(info, videoIdOf(url) || info.videoId || "");
      if (!menu || !buttons) {
        return await showResult(message, infoMsg, menu || "_No video formats available for this video._");
      }
      const options = qualityOptions(info);
      await message.sendList({
        text: menu,
        header: "🎬 Select quality",
        body: `_*${info.title}*_\n_Tap the button and pick a quality._`,
        footer: "YouTube",
        button: "Choose quality",
        sections: [
          {
            title: "Qualities",
            rows: options.map((o) => ({
              title: o.audio ? "Audio only" : o.quality,
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
        text === "_Download failed!_" ? "_Failed to fetch video info. Please check the link._" : text
      );
    }
  }
);

Module(
  {
    pattern: "video ?(.*)",
    desc: "Download YouTube video (360p unless a quality is given)",
    usage: ".video <link> [720p]",
    use: "download",
  },
  async (message, match) => {
    const quality = match[1]?.match(/(?:^|\s)(\d{3,4}p)\s*$/i)?.[1]?.toLowerCase() || "360p";
    const url = youtubeUrlFrom(match[1] || message.reply_message?.text);

    if (!url) {
      return await message.sendReply(
        `_Please provide a valid YouTube link!_\n_Example: ${helpPrefix()}video https://youtube.com/watch?v=xxxxx or https://youtube.com/shorts/xxxxx_`
      );
    }
    await sendYoutubeVideo(message, url, quality);
  }
);

Module(
  {
    pattern: "yta ?(.*)",
    desc: "Download YouTube audio as document (best quality) from a link or search",
    usage: ".yta <song name or link>",
    use: "download",
  },
  async (message, match) => {
    const input = match[1] || message.reply_message?.text;
    if (!input) {
      return await message.sendReply(
        `_Please provide a song name or link!_\n_Example: ${helpPrefix()}yta faded alan walker_`
      );
    }

    const url = youtubeUrlFrom(input);
    if (url) return await sendYoutubeAudio(message, url, { asDocument: true, best: true });

    let searchMsg;
    try {
      searchMsg = await message.sendReply("_Searching..._");
      const results = await searchYoutube(input, 1);
      if (!results || results.length === 0) {
        return await message.edit("_No results found!_", message.jid, searchMsg.key);
      }
      await sendYoutubeAudio(message, results[0].url, { asDocument: true, best: true, status: searchMsg });
    } catch (error) {
      console.error("yta error:", error);
      if (searchMsg) await message.edit("_Download failed!_", message.jid, searchMsg.key);
      else await message.sendReply("_Download failed. Please try again._");
    }
  }
);

Module(
  {
    pattern: "play ?(.*)",
    desc: "Play audio from YouTube search or link",
    usage: ".play <song name or link>",
    use: "download",
  },
  async (message, match) => {
    const input = match[1] || message.reply_message?.text;
    if (!input) {
      return await message.sendReply(
        `_Please provide a song name or link!_\n_Example: ${helpPrefix()}play faded alan walker_`
      );
    }

    const url = youtubeUrlFrom(input);
    if (url) return await sendYoutubeAudio(message, url);

    let searchMsg;
    try {
      searchMsg = await message.sendReply("_Searching..._");
      const results = await searchYoutube(input, 1);

      if (!results || results.length === 0) {
        return await message.edit("_No results found!_", message.jid, searchMsg.key);
      }

      const video = results[0];
      await message.edit(`_Downloading *${video.title}*..._`, message.jid, searchMsg.key);
      await sendYoutubeAudio(message, video.url, { status: searchMsg });
    } catch (error) {
      console.error("Play error:", error);
      if (searchMsg) {
        await message.edit("_Download failed!_", message.jid, searchMsg.key);
      } else {
        await message.sendReply("_Download failed. Please try again._");
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
  let caption = `_*${video.title}*_\n\n`;
  caption += `*Channel:* ${video.channel || "N/A"}\n`;
  caption += `*Duration:* \`${video.duration || "N/A"}\`\n`;
  caption += `*Views:* \`${video.views || "N/A"}\`\n`;
  if (video.uploadedAt) caption += `*Uploaded:* ${video.uploadedAt}\n`;
  caption += `\n*URL:* ${video.url}\n\n`;
  caption += "_Reply with:_\n";
  caption += "*1.* Audio\n";
  caption += "*2.* Video";

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
    const body = caption
      .slice(0, caption.indexOf("_Reply with:_"))
      .replace(/^\*URL:\*.*$/m, "")
      .trim();
    return await message.sendButtons({
      text: caption,
      body,
      footer: "YouTube",
      image: thumbnail,
      buttons: [
        { text: "🎵 Audio", id: ui.cmd("play", video.url) },
        { text: "🎬 Video", id: ui.cmd("ytv", video.url) },
        { text: "📄 Audio file", id: ui.cmd("yta", video.url) },
        { text: "Open on YouTube", url: video.url },
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
      repliedText.includes("YouTube Search Results") &&
      repliedText.includes("to download audio")
    ) {
      if (selectedNumber < 1 || selectedNumber > 10) {
        return await message.sendReply("_Please select a number between 1-10_");
      }

      try {
        const video = await listedVideo(repliedText, selectedNumber);
        if (!video) return await message.sendReply("_Invalid selection!_");

        const status = await message.sendReply(`_Downloading *${video.title}*..._`);
        await inChatQueue(message, "song", () => sendYoutubeAudio(message, video.url, { status }));
      } catch (error) {
        console.error("Song selection error:", error);
        await message.sendReply("_Failed to process your selection._");
      }
    } else if (
      repliedText.includes("YouTube Search Results") &&
      repliedText.includes("see video details")
    ) {
      if (selectedNumber < 1 || selectedNumber > 10) {
        return await message.sendReply("_Please select a number between 1-10_");
      }

      try {
        const video = await listedVideo(repliedText, selectedNumber);
        if (!video) return await message.sendReply("_Invalid selection!_");
        await sendVideoDetails(message, video);
      } catch (error) {
        console.error("YTS video info error:", error);
        await message.sendReply("_Failed to fetch video info._");
      }
    } else if (
      repliedText.includes("Reply with:") &&
      repliedText.includes("* Audio")
    ) {
      if (selectedNumber !== 1 && selectedNumber !== 2) {
        return await message.sendReply(
          "_Please select 1 for Audio or 2 for Video_"
        );
      }

      const url = youtubeUrlFrom(repliedText.match(/\*URL:\*\s*(https?:\/\/\S+)/m)?.[1]);
      if (!url) return;

      if (selectedNumber === 1) {
        await inChatQueue(message, "yts-audio", () => sendYoutubeAudio(message, url));
      } else {
        await inChatQueue(message, "yts-video", () => sendYoutubeVideo(message, url, "360p"));
      }
    } else if (
      repliedText.includes("Select Video Quality") &&
      repliedText.includes("Reply with a number")
    ) {
      const lines = repliedText.split("\n");
      const videoId = lines
        .map((line) => line.trim().match(/^\(([\w-]{11})\)$/)?.[1])
        .find(Boolean);

      if (!videoId) {
        return await message.sendReply("_Failed to retrieve video ID._");
      }

      const url = watchUrl(videoId);
      if (!repliedText.match(/_\*([^*]+)\*_/)) return;

      const qualityLines = lines.filter((line) => line.match(/^\*\d+\./));
      const selectedLine = qualityLines[selectedNumber - 1];
      if (!selectedLine) {
        return await message.sendReply("_Invalid quality selection!_");
      }

      if (selectedLine.includes("Audio Only")) {
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
    desc: "Sign in to YouTube, for servers YouTube asks to confirm they're not a bot",
    usage: ".ytlogin | .ytlogin status | .ytlogin force",
    use: "owner",
  },
  async (message, match) => {
    const arg = match[1]?.trim().toLowerCase();
    const loggedIn = await ytEngine.isLoggedIn();
    if (arg === "status") {
      return await message.sendReply(loggedIn ? "_Signed in to YouTube._" : "_Not signed in to YouTube._");
    }
    if (loggedIn && arg !== "force") {
      return await message.sendReply(
        `_Already signed in._\n_${helpPrefix()}ytlogout to sign out, ${helpPrefix()}ytlogin force to sign in again._`
      );
    }
    // return once the code is out: waiting for approval would hold the chat's queue
    await new Promise((codeSent) => {
      ytEngine
        .login(async ({ verification_url, user_code, expires_in }) => {
          await message
            .sendReply(
              `*YouTube login*\n\n1. Open ${verification_url}\n2. Enter *${user_code}*\n3. Choose an account and allow access\n\n_Use a spare account. The code expires in ${Math.round(expires_in / 60)} minutes._`
            )
            .catch(() => {});
          codeSent();
        })
        .then(() => message.sendReply("_Signed in to YouTube._"))
        .catch((error) => message.sendReply(`_YouTube login failed: ${error.message}_`))
        .catch(() => {})
        .finally(codeSent);
    });
  }
);

Module(
  {
    pattern: "ytlogout",
    fromMe: true,
    desc: "Sign out of YouTube",
    use: "owner",
  },
  async (message) => {
    await ytEngine.logout();
    await message.sendReply("_Signed out of YouTube._");
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
    desc: "Download audio from Spotify link",
    usage: ".spotify <spotify link>",
    use: "download",
  },
  async (message, match) => {
    const url = spotifyUrlFrom(match[1] || message.reply_message?.text);

    if (!url) {
      return await message.sendReply(
        `_Please provide a valid Spotify link!_\n_Example: ${helpPrefix()}spotify https://open.spotify.com/track/xxxxx_`
      );
    }

    let downloadMsg;
    try {
      downloadMsg = await message.sendReply("_Fetching Spotify info..._");
      const spotifyInfo = await spotifyTrack(url);
      const { title, artist } = spotifyInfo;

      await message.edit(
        `_Downloading *${title}* by *${artist}*..._`,
        message.jid,
        downloadMsg.key
      );

      const results = await searchYoutube(`${title} ${artist}`, 1);

      if (!results || results.length === 0) {
        return await message.edit(
          "_No matching songs found on YouTube!_",
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
        await message.edit("_Download failed!_", message.jid, downloadMsg.key);
      } else {
        await message.sendReply("_Download failed. Please try again._");
      }
    }
  }
);
