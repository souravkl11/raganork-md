const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawn } = require("child_process");
// jimp is heavy: required inside the functions that use it
const webp = require("node-webpmux");
const { getBuffer } = require("./misc");
const { getString } = require("./lang");
const Lang = getString("utils");
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
    return await message.sendReply(Lang.CIRCLE_NEED);
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
const MAX_ANIMATED_STICKER = (Number(process.env.STICKER_MAX_KB) || 490) * 1024;
const VIDEO_STICKER_STEPS = [
  { q: 50, fps: 20, secs: 10, size: 512 },
  { q: 35, fps: 20, secs: 10, size: 512 },
  { q: 30, fps: 20, secs: 10, size: 448 },
  { q: 25, fps: 20, secs: 8, size: 384 },
  { q: 20, fps: 15, secs: 6, size: 384 },
  { q: 15, fps: 15, secs: 5, size: 320 },
];

const MAX_STICKER_SECS = 30;
const FULL_LENGTH_STEPS = [
  { q: 50, fps: 20, size: 512 },
  { q: 35, fps: 20, size: 448 },
  { q: 25, fps: 20, size: 384 },
  { q: 20, fps: 15, size: 384 },
  { q: 15, fps: 15, size: 320 },
  { q: 10, fps: 12, size: 288 },
  { q: 5, fps: 10, size: 224 },
  { q: 5, fps: 8, size: 192 },
].map((step) => ({ ...step, secs: MAX_STICKER_SECS }));

const fitFilter = (size) =>
  `scale=${size}:${size}:flags=lanczos:force_original_aspect_ratio=decrease,format=rgba,pad=${size}:${size}:(ow-iw)/2:(oh-ih)/2:color=#00000000,setsar=1`;

const SAMPLE_SECS = 2;

function encodeVideoSticker(file, { q, fps, secs, size }, start = 0) {
  const command = ffmpeg(file);
  if (start) command.seekInput(start);
  return runFfmpeg(
    command
      .duration(secs)
      .noAudio()
      .videoFilters(`fps=${fps},${fitFilter(size)}`)
      .outputOptions(["-y", "-vcodec libwebp", "-lossless 0", `-q:v ${q}`, "-compression_level 2", "-loop 0"]),
    uniqueTempPath("st.webp"),
  );
}

// predicts each step's full size from a short sample so only one full encode is usually needed
async function predictStep(file, steps, duration) {
  const start = Math.max(0, duration / 2 - SAMPLE_SECS / 2);
  const fits = async (step) => {
    const path = await encodeVideoSticker(file, { ...step, secs: SAMPLE_SECS }, start);
    const size = fs.statSync(path).size;
    fs.unlink(path, () => {});
    return (size / SAMPLE_SECS) * Math.min(duration, step.secs) <= MAX_ANIMATED_STICKER * 0.9;
  };
  let lo = 0, hi = steps.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (await fits(steps[mid])) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}

async function fitSteps(file, steps) {
  const duration = await probeDuration(file).catch(() => 0);
  const predicted = duration > SAMPLE_SECS * 3 ? await predictStep(file, steps, duration) : 0;
  let best = null;
  let i = predicted;
  for (; i < steps.length; i++) {
    const path = await encodeVideoSticker(file, steps[i]);
    const size = fs.statSync(path).size;
    if (!best || size < best.size) {
      if (best) fs.unlink(best.path, () => {});
      best = { path, size, secs: steps[i].secs };
    } else {
      fs.unlink(path, () => {});
    }
    if (size <= MAX_ANIMATED_STICKER) break;
  }
  if (i === predicted && i > 0 && best.size < MAX_ANIMATED_STICKER * 0.75) {
    const path = await encodeVideoSticker(file, steps[i - 1]);
    const size = fs.statSync(path).size;
    if (size <= MAX_ANIMATED_STICKER) {
      fs.unlink(best.path, () => {});
      best = { path, size, secs: steps[i - 1].secs };
    } else {
      fs.unlink(path, () => {});
    }
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

function isWebpFile(file) {
  const fd = fs.openSync(file, "r");
  try {
    const head = Buffer.alloc(12);
    const read = fs.readSync(fd, head, 0, 12, 0);
    return read === 12 && head.toString("ascii", 0, 4) === "RIFF" && head.toString("ascii", 8, 12) === "WEBP";
  } finally {
    fs.closeSync(fd);
  }
}

async function sticker(file, type = "image") {
  // ffmpeg can't decode animated WebP (exit 69, frame=0)
  if (isWebpFile(file)) {
    await webp.Image.initLib();
    const img = new webp.Image();
    await img.load(file);
    if (!img.hasAnim) {
      type = "image";
    } else {
      const mp4 = uniqueTempPath("st.mp4");
      try {
        await webp2mp4(file, mp4);
        return (await videoSticker(mp4, { fullLength: true })).path;
      } finally {
        fs.unlink(mp4, () => {});
      }
    }
  }
  if (type !== "video") {
    return runFfmpeg(
      ffmpeg(file).outputOptions(["-y", "-vcodec libwebp"]).videoFilters(STICKER_FILTER),
      uniqueTempPath("st.webp"),
    );
  }
  return (await videoSticker(file, { fullLength: true })).path;
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
  if (seconds === null) return Lang.CANT_READ_VIDEO;
  if (seconds > MAX_INTERP_SECONDS)
    return Lang.INTERP_TOO_LONG.format(Math.round(seconds), MAX_INTERP_SECONDS);
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

function compositeFrame(canvas, width, rgba, fr) {
  const x0 = fr.x * 2, y0 = fr.y * 2;
  for (let y = 0; y < fr.height; y++) {
    for (let x = 0; x < fr.width; x++) {
      const s = (y * fr.width + x) * 4, d = ((y0 + y) * width + x0 + x) * 4;
      const a = rgba[s + 3];
      if (!fr.blend || a === 255) {
        canvas[d] = rgba[s]; canvas[d + 1] = rgba[s + 1]; canvas[d + 2] = rgba[s + 2]; canvas[d + 3] = a;
      } else if (a) {
        const k = a / 255;
        for (let c = 0; c < 3; c++) canvas[d + c] = rgba[s + c] * k + canvas[d + c] * (1 - k);
        canvas[d + 3] = a + canvas[d + 3] * (1 - k);
      }
    }
  }
}

function clearRect(canvas, width, fr) {
  const x0 = fr.x * 2, y0 = fr.y * 2;
  for (let y = 0; y < fr.height; y++) canvas.fill(0, ((y0 + y) * width + x0) * 4, ((y0 + y) * width + x0 + fr.width) * 4);
}

function webpFrameRate(frames) {
  const avg = frames.reduce((sum, f) => sum + (f.delay || 100), 0) / frames.length;
  return Math.min(30, Math.max(1, Math.round(1000 / avg)));
}

async function webpToMp4Local(inputPath, outputPath) {
  await webp.Image.initLib();
  const img = new webp.Image();
  await img.load(inputPath);
  if (!img.hasAnim) throw new Error("not an animated webp");
  const { width, height, frames } = img;
  const fps = webpFrameRate(frames);
  const canvas = Buffer.alloc(width * height * 4);
  const proc = spawn(process.env.FFMPEG_PATH || "ffmpeg", [
    "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${width}x${height}`, "-r", String(fps), "-i", "pipe:0",
    "-vf", "pad=ceil(iw/2)*2:ceil(ih/2)*2", "-c:v", "libx264", "-preset", "veryfast", "-threads", "1",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart", outputPath,
  ], { stdio: ["pipe", "ignore", "pipe"] });
  let stderr = "";
  proc.stderr.on("data", (d) => (stderr = (stderr + d).slice(-500)));
  const exited = new Promise((resolve, reject) => {
    proc.on("error", reject);
    proc.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}: ${stderr}`))));
  });
  const write = (buf) => new Promise((resolve, reject) => proc.stdin.write(buf, (err) => (err ? reject(err) : resolve())));
  try {
    for (let i = 0; i < frames.length; i++) {
      const fr = frames[i];
      compositeFrame(canvas, width, await img.getFrameData(i), fr);
      const repeat = Math.max(1, Math.round(((fr.delay || 100) * fps) / 1000));
      for (let r = 0; r < repeat; r++) await write(canvas);
      if (fr.dispose) clearRect(canvas, width, fr);
    }
  } finally {
    proc.stdin.end();
  }
  await exited;
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

  try {
    return await webpToMp4Local(inputPath, outputPath).then(() => true);
  } catch (err) {
    console.error("local webp to mp4 failed, using api:", err.message);
  }
  if (!options.framerate) {
    const img = new webp.Image();
    await img.load(inputPath);
    if (img.hasAnim) options = { ...options, framerate: webpFrameRate(img.frames) };
  }
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
