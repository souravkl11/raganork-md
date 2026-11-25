const fs = require("fs");
const path = require("path");
const { UserError } = require("../../core/pipeline/errors");

let ffmpeg;
try {
  ffmpeg = require("fluent-ffmpeg");
} catch (_) {}

let youtube;
try {
  youtube = require("youtube-sr").default || require("youtube-sr");
} catch (_) {}

const config = require("../../config");
const { getTempSubdir, uniqueTempPath, runFfmpeg } = require("../../core/helpers");
const { isPublicHttpUrl } = require("./guards");
const engine = require("./yt-engine");
const { getString } = require("./lang");
const Lang = getString("yt");

const tempDir = () => getTempSubdir("yt");
// above this a video goes out as a document instead of an inline video
const VIDEO_SIZE_LIMIT = 150 * 1024 * 1024;
const DEFAULT_MAX_DURATION_MIN = 60;
// WhatsApp accepts documents up to 2 GB, so the download cap sits there, not at the inline-video limit
const DEFAULT_MAX_SIZE_MB = 2000;
const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "www.youtu.be",
]);

const stamp = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

function parseSize(size) {
  if (typeof size === "number") return size > 0 ? size : 0;
  const match = String(size ?? "").match(/([\d.]+)\s*(KB|MB|GB)?/i);
  if (!match) return 0;
  const value = parseFloat(match[1]);
  const unit = (match[2] || "").toUpperCase();
  if (unit === "KB") return value * 1024;
  if (unit === "MB") return value * 1024 * 1024;
  if (unit === "GB") return value * 1024 * 1024 * 1024;
  return value;
}

function youtubeUrlFrom(text) {
  const raw = String(text ?? "").match(/\bhttps?:\/\/\S+/i)?.[0];
  if (!raw) return null;
  let url;
  try {
    url = new URL(raw.replace(/[)\]\.,!?>]*$/, ""));
  } catch (_) {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (!YOUTUBE_HOSTS.has(host)) return null;
  const [first, second] = url.pathname.split("/").filter(Boolean);
  let id = null;
  if (host.endsWith("youtu.be")) id = first;
  else if (first === "watch") id = url.searchParams.get("v");
  else if (["shorts", "live", "embed", "v"].includes(first)) id = second;
  return /^[\w-]{11}$/.test(id || "") ? `https://www.youtube.com/watch?v=${id}` : null;
}

function videoIdOf(url) {
  return String(url ?? "").match(/[?&]v=([\w-]{11})/)?.[1] ?? null;
}

function idFrom(input) {
  const text = String(input ?? "").trim();
  if (/^[\w-]{11}$/.test(text)) return text;
  const id = videoIdOf(youtubeUrlFrom(text) || text);
  if (!id) throw new UserError(Lang.NOT_YT_LINK);
  return id;
}

function durationSeconds(info) {
  for (const value of [info?.lengthSeconds, info?.durationSeconds, info?.duration]) {
    if (typeof value === "number" && value > 0) return value;
    if (typeof value === "string" && /^\d+(:\d+){0,2}$/.test(value.trim())) {
      return value.trim().split(":").reduce((total, part) => total * 60 + Number(part), 0);
    }
  }
  return null;
}

function limitError(message) {
  const error = new Error(message);
  error.code = "YT_LIMIT";
  return error;
}

function assertWithinLimits(info, formats = []) {
  const maxMinutes = parseInt(config.MAX_YT_DURATION, 10) > 0 ? parseInt(config.MAX_YT_DURATION, 10) : DEFAULT_MAX_DURATION_MIN;
  const maxMb = parseInt(config.MAX_YT_SIZE, 10) > 0 ? parseInt(config.MAX_YT_SIZE, 10) : DEFAULT_MAX_SIZE_MB;
  const seconds = durationSeconds(info);
  if (seconds && seconds > maxMinutes * 60) {
    throw limitError(Lang.TOO_LONG.format(Math.ceil(seconds / 60), maxMinutes));
  }
  const size = formats.reduce((total, f) => total + parseSize(f?.size), 0);
  if (size > maxMb * 1024 * 1024) {
    throw limitError(Lang.TOO_BIG.format(formatBytes(size), maxMb));
  }
}

function isRestrictedVideo(info) {
  return Boolean(info?.isRestricted);
}

async function downloadFromAPI(url, type, quality) {
  return (type === "audio" ? await downloadAudio(url) : await downloadVideo(url, quality)).path;
}

function downloadFromExternalAPI(url, quality = "360p") {
  return downloadFromAPI(url, ["audio", "mp3", "m4a"].includes(quality) ? "audio" : "video", quality);
}

const heightOf = (quality) => parseInt(quality.match(/(\d+)p/)?.[1] || 0, 10);

async function getVideoInfo(url) {
  const videoId = idFrom(url);
  const info = await engine.getInfo(videoId);
  const { pickVideo, pickAudio, labelOf } = engine._internals;

  const labels = [...new Set(info.formats.filter((f) => f.hasVideo).map(labelOf).filter(Boolean))];
  const formats = labels
    .sort((a, b) => heightOf(b) - heightOf(a))
    .map((quality) => ({ type: "video", quality, size: pickVideo(info.formats, quality)?.size || 0, hasAudio: false }));
  const audio = pickAudio(info.formats);
  if (audio) formats.push({ type: "audio", quality: audio.audioQuality, size: audio.size, hasAudio: true });

  return {
    videoId,
    title: info.title,
    lengthSeconds: info.duration || null,
    views: info.views,
    isLive: info.isLive,
    thumbnail: info.thumbnail,
    channel: { name: info.author },
    formats,
  };
}

function muxTracks(dl, output) {
  const command = ffmpeg()
    .input(dl.videoPath)
    .input(dl.audioPath)
    .outputOptions(["-map", "0:v:0", "-map", "1:a:0", "-c", "copy", "-movflags", "+faststart"]);
  return runFfmpeg(command, output);
}

async function downloadVideo(url, quality = "360p") {
  if (!ffmpeg) throw new Error("ffmpeg is required to download videos");
  const info = await getVideoInfo(url);
  const target = /p$/i.test(quality) ? quality.toLowerCase() : `${quality}p`;
  const videos = info.formats.filter((f) => f.type === "video");
  assertWithinLimits(info, [
    videos.find((f) => f.quality === target) || videos.at(-1),
    info.formats.find((f) => f.type === "audio"),
  ]);

  const dl = await engine.download(info.videoId, "video", target);
  const output = path.join(tempDir(), `video_${stamp()}.mp4`);
  try {
    await muxTracks(dl, output);
  } catch (err) {
    await fs.promises.unlink(output).catch(() => {});
    throw err;
  } finally {
    await Promise.all([dl.videoPath, dl.audioPath].map((f) => fs.promises.unlink(f).catch(() => {})));
  }
  return { path: output, title: info.title, quality: dl.quality || target, playable: Boolean(dl.videoMime?.includes("avc1")) };
}

async function downloadAudio(url, { best = false, onInfo } = {}) {
  const info = await getVideoInfo(url);
  assertWithinLimits(info, [info.formats.find((f) => f.type === "audio")]);
  if (onInfo) await onInfo(info);
  const dl = await engine.download(info.videoId, "audio", undefined, { bestAudio: best });
  return { path: dl.audioPath, title: info.title, info };
}

async function convertM4aToMp3(m4aPath, meta = null) {
  if (!ffmpeg) {
    return m4aPath;
  }

  const timestamp = stamp();
  const taggedM4a = path.join(tempDir(), `audio_${timestamp}.m4a`);

  return new Promise((resolve, reject) => {
    let ffmpegProcess = ffmpeg(m4aPath).outputOptions(["-c copy", "-map 0:a"]);

    if (meta?.title)
      ffmpegProcess.outputOption("-metadata", `title=${meta.title}`);
    if (meta?.artist)
      ffmpegProcess.outputOption("-metadata", `artist=${meta.artist}`);
    if (meta?.album)
      ffmpegProcess.outputOption("-metadata", `album=${meta.album}`);

    ffmpegProcess
      .output(taggedM4a)
      .on("end", async () => {
        ffmpegProcess = null;
        if (fs.existsSync(m4aPath)) fs.unlinkSync(m4aPath);

        if (meta?.thumbnail) {
          try {
            const response = await fetch(meta.thumbnail);
            if (response.ok) {
              const coverBuffer = await response.arrayBuffer();
              const coverPath = path.join(tempDir(), `cover_${timestamp}.jpg`);
              fs.writeFileSync(coverPath, Buffer.from(coverBuffer));

              const finalM4a = path.join(
                tempDir(),
                `audio_final_${timestamp}.m4a`,
              );

              await new Promise((innerResolve) => {
                let proc = ffmpeg(taggedM4a)
                  .input(coverPath)
                  .outputOptions([
                    "-c copy",
                    "-map 0",
                    "-map 1",
                    "-disposition:v:0",
                    "attached_pic",
                  ])
                  .output(finalM4a)
                  .on("end", () => {
                    proc = null;
                    if (fs.existsSync(taggedM4a)) fs.unlinkSync(taggedM4a);
                    if (fs.existsSync(coverPath)) fs.unlinkSync(coverPath);
                    innerResolve(finalM4a);
                  })
                  .on("error", (err) => {
                    proc = null;
                    console.error(
                      "Failed to add M4A cover, using metadata-only:",
                      err.message,
                    );
                    if (fs.existsSync(finalM4a)) fs.unlinkSync(finalM4a);
                    if (fs.existsSync(coverPath)) fs.unlinkSync(coverPath);
                    innerResolve(taggedM4a);
                  });
                proc.run();
              });

              resolve(finalM4a);
            } else {
              resolve(taggedM4a);
            }
          } catch (e) {
            console.error("Failed to add M4A artwork:", e);
            resolve(taggedM4a);
          }
        } else {
          resolve(taggedM4a);
        }
      })
      .on("error", (err) => {
        ffmpegProcess = null;
        if (fs.existsSync(taggedM4a)) fs.unlinkSync(taggedM4a);
        console.error(
          "Failed to add metadata, using original audio:",
          err.message,
        );
        resolve(m4aPath);
      })
      .run();
  });
}

async function searchYoutube(query, limit = 10) {
  let results = [];
  if (youtube) {
    try {
      results = await youtube.search(query, { limit, type: "video" });
    } catch (err) {
      console.error("youtube-sr search failed, using Innertube:", err.message);
    }
  }
  if (!results?.length) return engine.search(query, limit);
  return results.map((video) => ({
    id: video.id,
    title: video.title,
    url: video.url,
    duration: video.durationFormatted,
    thumbnail: video.thumbnail?.url,
    views: video.views,
    uploadedAt: video.uploadedAt,
    channel: {
      name: video.channel?.name,
      url: video.channel?.url,
    },
  }));
}

// [{ quality, size }] best first, plus { audio: true, size } when an audio stream exists
function qualityOptions(info) {
  const videoFormats = (info.formats || [])
    .filter((f) => f.type === "video" && f.quality)
    .sort((a, b) => parseInt(b.quality.match(/(\d+)/)?.[1] || 0) - parseInt(a.quality.match(/(\d+)/)?.[1] || 0));
  const qualities = [...new Set(videoFormats.map((f) => f.quality))];
  if (!qualities.length) return null;
  const audioFormat = (info.formats || []).find((f) => f.type === "audio");
  const audioSize = parseSize(audioFormat?.size);
  const options = qualities.map((quality) => {
    const videoSize = parseSize(videoFormats.find((f) => f.quality === quality).size);
    return { quality, size: videoSize && audioSize ? videoSize + audioSize : 0 };
  });
  if (audioFormat) options.push({ audio: true, size: audioSize || 0 });
  return options;
}

function qualityMenuText(info, videoId) {
  const options = qualityOptions(info);
  if (!options) return null;
  let text = Lang.QUALITY_HEADER.format(info.title, videoId);
  options.forEach((o, index) => {
    const label = o.audio ? Lang.AUDIO_ONLY : o.quality;
    text += `*${index + 1}.* _*${label}*_${o.size ? ` ~ _${formatBytes(o.size)}_` : ""}\n`;
  });
  return text + Lang.QUALITY_FOOTER;
}

async function fetchCover(thumbnail, files) {
  try {
    if (!(await isPublicHttpUrl(thumbnail))) return null;
    const res = await fetch(thumbnail, { signal: AbortSignal.timeout(10000) });
    if (!res.ok || !String(res.headers.get("content-type")).startsWith("image/")) return null;
    const data = Buffer.from(await res.arrayBuffer());
    if (!data.length || data.length > 5 * 1024 * 1024) return null;
    const file = uniqueTempPath("yt_cover.jpg");
    files.push(file);
    await fs.promises.writeFile(file, data);
    return file;
  } catch (_) {
    return null;
  }
}

// aac is stream-copied into a tagged m4a; opus/webm is encoded to mp3, or with keepOpus
// stream-copied into a tagged .opus (ogg can't carry the cover)
async function tagAudio(input, tags, files, { keepOpus = false } = {}) {
  const aac = !input.endsWith(".webm");
  if (!aac && keepOpus && ffmpeg) {
    const output = uniqueTempPath("yt_audio.opus");
    files.push(output);
    const command = ffmpeg(input).outputOption("-map", "0:a").outputOption("-c:a", "copy");
    for (const key of ["title", "artist", "album"]) {
      if (tags[key]) command.outputOption("-metadata", `${key}=${tags[key]}`);
    }
    try {
      await runFfmpeg(command, output);
      return { path: output, ext: "opus", mimetype: "audio/ogg; codecs=opus" };
    } catch (err) {
      console.error("opus remux failed:", err.message);
    }
  }
  const original = aac
    ? { path: input, ext: "m4a", mimetype: "audio/mp4" }
    : { path: input, ext: "webm", mimetype: "audio/webm" };
  if (!ffmpeg) return original;
  const result = aac ? { ext: "m4a", mimetype: "audio/mp4" } : { ext: "mp3", mimetype: "audio/mpeg" };
  const cover = tags.thumbnail ? await fetchCover(tags.thumbnail, files) : null;
  for (const withCover of cover ? [true, false] : [false]) {
    const output = uniqueTempPath(`yt_audio.${result.ext}`);
    files.push(output);
    const command = ffmpeg(input).outputOption("-map", "0:a");
    if (aac) command.outputOption("-c:a", "copy");
    else command.outputOption("-c:a", "libmp3lame").outputOption("-q:a", "2").outputOption("-id3v2_version", "3");
    if (withCover) {
      command.input(cover).outputOption("-map", "1:v");
      if (aac) command.outputOption("-c:v", "copy").outputOption("-disposition:v:0", "attached_pic");
      else command.outputOption("-c:v", "mjpeg").outputOption("-metadata:s:v", "title=Album cover").outputOption("-metadata:s:v", "comment=Cover (front)");
    }
    if (aac) command.outputOption("-movflags", "+faststart");
    for (const key of ["title", "artist", "album"]) {
      if (tags[key]) command.outputOption("-metadata", `${key}=${tags[key]}`);
    }
    try {
      await runFfmpeg(command, output);
      return { path: output, ...result };
    } catch (err) {
      console.error("audio tagging failed:", err.message);
    }
  }
  return original;
}

function statusReporter(message, existing) {
  let sent = existing || null;
  return async (text) => {
    try {
      if (sent) await message.edit(text, message.jid, sent.key);
      else sent = await message.sendReply(text);
    } catch (err) {
      console.error("status update failed:", err.message);
    }
  };
}

function removeFiles(files) {
  return Promise.all(files.map((file) => fs.promises.unlink(file).catch(() => {})));
}

function failureText(error) {
  if (error.code === "YT_LIMIT") return `_${error.message}_`;
  if (error.code === "YT_IP_BLOCKED") {
    return Lang.IP_BLOCKED;
  }
  if (error.code === "YT_LOGIN_REQUIRED") {
    return Lang.LOGIN_REQUIRED;
  }
  const message = error.primary || error.message || "";
  if (/LOGIN_REQUIRED|not a bot/i.test(message)) return Lang.SIGNIN_CHECK;
  if (/AGE_CHECK_REQUIRED|AGE_VERIFICATION_REQUIRED|confirm your age/i.test(message)) return Lang.AGE_RESTRICTED;
  if (/needs to be reloaded/i.test(message)) return Lang.REJECTED;
  if (/private video|video unavailable|has been removed|ERROR \(/i.test(message)) return Lang.UNAVAILABLE;
  return Lang.DOWNLOAD_FAILED;
}

const safeFileName = (title) => String(title || "audio").replace(/[\\/:*?"<>|\r\n]+/g, "_").trim().slice(0, 100) || "audio";

async function sendYoutubeAudio(message, url, { asDocument = false, best = false, meta = {}, status = null } = {}) {
  const say = statusReporter(message, status);
  const files = [];
  try {
    if (!status) await say(Lang.FETCHING);
    const result = await downloadAudio(url, {
      best,
      onInfo: (info) => say(Lang.DOWNLOADING.format(info.title)),
    });
    files.push(result.path);
    const tags = {
      title: meta.title || result.title,
      artist: meta.artist || result.info?.channel?.name,
      album: meta.album,
      thumbnail: meta.thumbnail || result.info?.thumbnail,
    };
    const audio = await tagAudio(result.path, tags, files, { keepOpus: best });
    await say(Lang.SENDING_AUDIO);
    const stream = fs.createReadStream(audio.path);
    stream.on("error", () => {});
    try {
      if (asDocument) {
        await message.sendMessage({ stream }, "document", {
          fileName: `${safeFileName(tags.title)}.${audio.ext}`,
          mimetype: audio.mimetype,
          caption: `_*${tags.title}*_`,
        });
      } else {
        await message.sendReply({ stream }, "audio", { mimetype: audio.mimetype });
      }
    } finally {
      stream.destroy();
    }
    await say(Lang.DONE);
    return true;
  } catch (error) {
    console.error("YouTube audio error:", error.message);
    await say(failureText(error));
    return false;
  } finally {
    await removeFiles(files);
  }
}

async function sendYoutubeVideo(message, url, quality = "360p", { status = null } = {}) {
  const say = statusReporter(message, status);
  const files = [];
  try {
    await say(Lang.DOWNLOADING_VIDEO.format(quality));
    const result = await downloadVideo(url, quality);
    files.push(result.path);
    quality = result.quality || quality;
    await say(Lang.UPLOADING_VIDEO);
    const { size } = await fs.promises.stat(result.path);
    const stream = fs.createReadStream(result.path);
    stream.on("error", () => {});
    try {
      if (size > VIDEO_SIZE_LIMIT || !result.playable) {
        await message.sendMessage({ stream }, "document", {
          fileName: `${safeFileName(result.title)}.mp4`,
          mimetype: "video/mp4",
          caption: Lang.VIDEO_DOC_CAPTION.format(result.title, formatBytes(size), quality),
        });
      } else {
        await message.sendReply({ stream }, "video", {
          caption: Lang.VIDEO_CAPTION.format(result.title, quality),
        });
      }
    } finally {
      stream.destroy();
    }
    await say(Lang.DONE);
    return true;
  } catch (error) {
    console.error("YouTube video error:", error.message);
    await say(failureText(error));
    return false;
  } finally {
    await removeFiles(files);
  }
}

module.exports = {
  downloadVideo,
  downloadAudio,
  downloadFromExternalAPI,
  downloadFromAPI,
  isRestrictedVideo,
  searchYoutube,
  getVideoInfo,
  convertM4aToMp3,
  sendYoutubeAudio,
  sendYoutubeVideo,
  youtubeUrlFrom,
  videoIdOf,
  assertWithinLimits,
  qualityMenuText,
  qualityOptions,
  formatBytes,
  parseSize,
  failureText,
};
