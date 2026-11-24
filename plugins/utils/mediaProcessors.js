const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
// jimp is heavy: required inside the functions that use it
const webp = require("node-webpmux");
const { getBuffer } = require("./misc");
const axios = require("axios");
const {
  getTempSubdir,
  uniqueTempPath,
  runFfmpeg,
} = require("../../core/helpers");

async function addExif(media, metadata) {
  if (!metadata.packname && !metadata.author) return media;

  const img = new webp.Image();
  const json = {
    "sticker-pack-id": `github.com/souravkl11/raganork`,
    "sticker-pack-name": metadata.packname,
    "sticker-pack-publisher": metadata.author,
    emojis: metadata.categories || [""],
    "android-app-store-link": metadata.android || "",
    "ios-app-store-link": metadata.ios || "",
  };

  const exifAttr = Buffer.from([
    0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57,
    0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00,
  ]);
  const jsonBuff = Buffer.from(JSON.stringify(json), "utf-8");
  const exif = Buffer.concat([exifAttr, jsonBuff]);
  exif.writeUIntLE(jsonBuff.length, 14, 4);

  await img.load(media);
  img.exif = exif;
  const exifPath = uniqueTempPath("exif.webp");
  await img.save(exifPath);
  return exifPath;
}

async function withDownload(replyMessage, fn) {
  const file = await replyMessage.download();
  try {
    return await fn(file);
  } finally {
    fs.unlink(file, () => {});
  }
}

function clampInt(value, min, max, fallback) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function bass(file, amount, callback) {
  const gain = clampInt(amount, 1, 50, 20);
  const bassPath = uniqueTempPath("bass.mp3");
  return runFfmpeg(ffmpeg().input(file).audioFilters(`bass=g=${gain}`), bassPath)
    .then(() => {
      const buf = fs.readFileSync(bassPath);
      fs.unlink(bassPath, () => {});
      if (callback) callback(buf);
      return buf;
    })
    .catch((err) => {
      console.error("bass failed:", err.message);
      if (!callback) throw err;
    });
}

const STICKER_FILTER =
  "scale=512:512:flags=lanczos:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000,setsar=1";

async function circle(message) {
  if (!message.reply_message) {
    return await message.sendReply("Reply to a sticker or photo");
  }

  await withDownload(message.reply_message, async (savedFile) => {
    if (savedFile.endsWith("webp")) {
      const outputPng = uniqueTempPath("output.png");
      const toStickerJpg = uniqueTempPath("tosticker.jpg");
      const stWebp = uniqueTempPath("st.webp");
      try {
        await runFfmpeg(ffmpeg(savedFile).fromFormat("webp_pipe"), outputPng);
        const img = await require("jimp").read(outputPng);
        img.resize(480, 480);
        img.circle();
        fs.writeFileSync(toStickerJpg, await img.getBufferAsync("image/png"));
        await runFfmpeg(
          ffmpeg(toStickerJpg)
            .outputOptions(["-y", "-vcodec libwebp"])
            .videoFilters(STICKER_FILTER),
          stWebp,
        );
        await message.sendReply(fs.readFileSync(stWebp), "sticker");
      } finally {
        for (const f of [outputPng, toStickerJpg, stWebp]) fs.unlink(f, () => {});
      }
    } else {
      const img = await require("jimp").read(savedFile);
      img.resize(480, 480);
      img.circle();
      await message.sendReply(await img.getBufferAsync("image/png"), "image");
    }
  });
}

async function blur(file, count = 5) {
  const image = await require("jimp").read(file);
  image.blur(parseInt(count));

  return new Promise((resolve) => {
    image.getBuffer("image/png", (err, buffer) => {
      resolve(buffer);
    });
  });
}

const attp = (text) => require("../../core/private").attp(text);

// wa freezes animated stickers past ~500kb
const MAX_ANIMATED_STICKER = 490 * 1024;
const VIDEO_STICKER_STEPS = [
  { q: 65, fps: 15, secs: 10, size: 512 },
  { q: 50, fps: 12, secs: 8, size: 512 },
  { q: 35, fps: 10, secs: 6, size: 512 },
  { q: 25, fps: 10, secs: 5, size: 384 },
  { q: 15, fps: 8, secs: 4, size: 320 },
];

const MAX_STICKER_SECS = 30;
const FULL_LENGTH_STEPS = [
  { q: 50, fps: 12, size: 512 },
  { q: 40, fps: 10, size: 512 },
  { q: 30, fps: 8, size: 448 },
  { q: 20, fps: 6, size: 384 },
  { q: 15, fps: 5, size: 320 },
].map((step) => ({ ...step, secs: MAX_STICKER_SECS }));

const fitFilter = (size) =>
  `scale=${size}:${size}:flags=lanczos:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000,setsar=1`;

function encodeVideoSticker(file, { q, fps, secs, size }) {
  return runFfmpeg(
    ffmpeg(file)
      .duration(secs)
      .noAudio()
      .videoFilters(`fps=${fps},${fitFilter(size)}`)
      .outputOptions(["-y", "-vcodec libwebp", "-lossless 0", `-q:v ${q}`, "-compression_level 4", "-loop 0"]),
    uniqueTempPath("st.webp"),
  );
}

async function fitSteps(file, steps) {
  let best = null;
  for (let i = 0; i < steps.length; ) {
    const path = await encodeVideoSticker(file, steps[i]);
    const size = fs.statSync(path).size;
    if (!best || size < best.size) {
      if (best) fs.unlink(best.path, () => {});
      best = { path, size, secs: steps[i].secs };
    } else {
      fs.unlink(path, () => {});
    }
    if (size <= MAX_ANIMATED_STICKER) break;
    i += size > MAX_ANIMATED_STICKER * 2 ? 2 : 1;
  }
  return best;
}

async function videoSticker(file, { fullLength = false } = {}) {
  if (fullLength) {
    const full = await fitSteps(file, FULL_LENGTH_STEPS);
    if (full.size <= MAX_ANIMATED_STICKER) return full;
    fs.unlink(full.path, () => {});
  }
  return fitSteps(file, VIDEO_STICKER_STEPS);
}

async function sticker(file, type = "image") {
  if (type !== "video") {
    return runFfmpeg(
      ffmpeg(file).outputOptions(["-y", "-vcodec libwebp"]).videoFilters(STICKER_FILTER),
      uniqueTempPath("st.webp"),
    );
  }
  return (await videoSticker(file)).path;
}

async function rotate(video, angle) {
  const rotated = await runFfmpeg(
    ffmpeg(video).withVideoFilter("transpose=" + angle),
    uniqueTempPath("rotate.mp4"),
  );
  if (angle !== "3") return rotated;
  try {
    return await runFfmpeg(
      ffmpeg(rotated).withVideoFilter("transpose=2"),
      uniqueTempPath("flip.mp4"),
    );
  } finally {
    fs.unlink(rotated, () => {});
  }
}

async function avMix(video, audio) {
  const command = ffmpeg()
    .addInput(video)
    .addInput(audio)
    .addInput(audio)
    .complexFilter([
      "[1]volume=0.1[a1]",
      "[2]volume=0.9[a2]",
      "[a1][a2]amix=inputs=2[a]",
    ])
    .addOptions(["-map 0:v", "-map [a]", "-c:v copy"])
    .format("mp4");
  const mergedPath = await runFfmpeg(command, uniqueTempPath("merged.mp4"));
  try {
    return fs.readFileSync(mergedPath);
  } finally {
    fs.unlink(mergedPath, () => {});
  }
}
function parseTime(t) {
  if (!t && t !== 0) return null;
  if (typeof t !== "string") t = String(t);
  t = t.trim();
  if (!t) return null;
  if (/^\d+$/.test(t)) return parseInt(t, 10);
  const parts = t.split(":").map((x) => x.trim());
  if (parts.some((p) => p === "" || isNaN(p))) return null;
  let s = 0;
  if (parts.length === 2) {
    s = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  } else if (parts.length === 3) {
    s =
      parseInt(parts[0], 10) * 3600 +
      parseInt(parts[1], 10) * 60 +
      parseInt(parts[2], 10);
  } else {
    return null;
  }
  return s;
}
async function trim(input, start, end, output) {
  const s = parseTime(start);
  const e = parseTime(end);
  if (s === null || e === null || isNaN(s) || isNaN(e) || e <= s) {
    throw new Error("Invalid time range");
  }
  const duration = e - s;
  const isAudio =
    output.endsWith(".m4a") ||
    output.endsWith(".mp3") ||
    output.endsWith(".ogg");

  const cmd = ffmpeg(input)
    .seekInput(s)
    .outputOptions(["-t", String(duration)]);

  if (isAudio && output.endsWith(".m4a")) {
    cmd.audioCodec("aac").outputOptions(["-movflags", "faststart"]).noVideo();
  } else if (isAudio) {
    cmd.noVideo();
  } else {
    cmd.videoCodec("copy").audioCodec("copy");
  }

  return runFfmpeg(cmd, output);
}

function probeDuration(file) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(file, (err, data) => {
      if (err) return reject(err);
      const seconds = parseFloat(data?.format?.duration);
      resolve(Number.isFinite(seconds) ? seconds : 0);
    });
  });
}

const MAX_INTERP_SECONDS = 30;

async function interpolationLimit(file) {
  const seconds = await probeDuration(file).catch(() => null);
  if (seconds === null) return "_Could not read this video_";
  if (seconds > MAX_INTERP_SECONDS)
    return `_Video is ${Math.round(seconds)}s long. Motion interpolation is limited to ${MAX_INTERP_SECONDS}s because it needs a lot of CPU. Trim the video first._`;
  return null;
}

function mergeVideos(files, output) {
  return new Promise((resolve, reject) => {
    const command = ffmpeg({ priority: 20 }).fps(29.7);
    for (const file of files) command.input(file);
    command
      .on("end", () => resolve(output))
      .on("error", (err) => reject(err))
      .mergeToFile(output);
  });
}

const STAGING_MAX_AGE_MS = 10 * 60 * 1000;

function removeDir(dir) {
  return fs.promises.rm(dir, { recursive: true, force: true });
}

async function stagingDir(kind, key) {
  const root = getTempSubdir(kind);
  const cutoff = Date.now() - STAGING_MAX_AGE_MS;
  for (const entry of await fs.promises.readdir(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const full = path.join(root, entry.name);
    try {
      if ((await fs.promises.stat(full)).mtimeMs < cutoff) await removeDir(full);
    } catch (_) {}
  }
  const dir = path.join(root, crypto.createHash("sha1").update(key).digest("hex").slice(0, 16));
  await fs.promises.mkdir(dir, { recursive: true });
  return dir;
}

async function webp2mp4(inputPath, outputPath, options = {}) {
  if (!inputPath || !outputPath) {
    throw new Error("Input path and output path are required.");
  }
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file does not exist: ${inputPath}`);
  }
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const mp4 = await require("../../core/private").webpToMp4(inputPath, options);
  await fs.promises.writeFile(outputPath, mp4);
  return true;
}
async function addID3(inputFile, title, artist, description, image) {
  try {
    const { ID3Writer } = await import("browser-id3-writer");
    const id3 = new ID3Writer(fs.readFileSync(inputFile));
    id3.setFrame("TIT2", title).setFrame("TPE1", [artist]).setFrame("APIC", {
      type: 3,
      data: image,
      description: description,
    });
    id3.addTag();
    var result = Buffer.from(id3.arrayBuffer);
    return result;
  } catch (error) {
    throw new Error(`Failed to process ID3 tags: ${error.message}`);
  }
}
module.exports = {
  addExif,
  bass,
  circle,
  blur,
  sticker,
  videoSticker,
  rotate,
  avMix,
  webp2mp4,
  addID3,
  attp,
  trim,
  probeDuration,
  interpolationLimit,
  mergeVideos,
  stagingDir,
  removeDir,
  clampInt,
  withDownload,
};
