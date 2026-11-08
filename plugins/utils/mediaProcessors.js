const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");
const jimp = require("jimp");
const webp = require("node-webpmux");
const { getBuffer } = require("./misc");
const axios = require("axios");
const {
  getTempPath,
  getTempSubdir,
  uniqueTempPath,
  runFfmpeg,
} = require("../../core/helpers");
// Removed: const { ID3Writer } = require('browser-id3-writer');

// Add EXIF data to stickers
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

// Apply bass boost to audio
function bass(file, amount, callback) {
  const count = amount || "20";
  const bassPath = uniqueTempPath("bass.mp3");
  return runFfmpeg(ffmpeg().input(file).outputOptions(`-af bass=g=${count}`), bassPath)
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

// Create circular image/sticker
async function circle(message) {
  if (!message.reply_message) {
    return await message.sendReply("Reply to a sticker or photo");
  }

  const savedFile = await message.reply_message.download();

  if (savedFile.endsWith("webp")) {
    const outputPng = uniqueTempPath("output.png");
    const toStickerJpg = uniqueTempPath("tosticker.jpg");
    const stWebp = uniqueTempPath("st.webp");
    try {
      await runFfmpeg(ffmpeg(savedFile).fromFormat("webp_pipe"), outputPng);
      const img = await jimp.read(outputPng);
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
    const img = await jimp.read(savedFile);
    img.resize(480, 480);
    img.circle();
    await message.sendReply(await img.getBufferAsync("image/png"), "image");
  }
}

// Apply blur effect
async function blur(file, count = 5) {
  const image = await jimp.read(file);
  image.blur(parseInt(count));

  return new Promise((resolve) => {
    image.getBuffer("image/png", (err, buffer) => {
      resolve(buffer);
    });
  });
}

const attp = (text) => require("../../core/private").attp(text);

// Create sticker from media
async function sticker(file, type = "image") {
  const opt =
    type === "video"
      ? [
          "-y",
          "-vcodec libwebp",
          "-lossless 1",
          "-qscale 1",
          "-preset default",
          "-loop 0",
          "-an",
          "-vsync 0",
          "-s 600x600",
        ]
      : ["-y", "-vcodec libwebp"];

  const fil =
    type === "video"
      ? "scale=600:600:flags=lanczos:force_original_aspect_ratio=decrease,format=rgba,pad=600:600:(ow-iw)/2:(oh-ih)/2:color=#00000000,setsar=1"
      : STICKER_FILTER;

  return runFfmpeg(
    ffmpeg(file).outputOptions(opt).videoFilters(fil),
    uniqueTempPath("st.webp"),
  );
}

// Rotate video
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

// Mix audio and video
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

  return new Promise((resolve, reject) => {
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

    cmd
      .on("end", () => resolve(output))
      .on("error", (err) => reject(err))
      .save(output);
  });
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
  rotate,
  avMix,
  webp2mp4,
  addID3,
  attp,
  trim,
};
