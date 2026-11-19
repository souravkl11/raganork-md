const { Module } = require("../main");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const {
  bass,
  sticker,
  addExif,
  attp,
  gtts,
  gis,
  aiTTS,
  getBuffer,
  withTempFile,
} = require("./utils");
const config = require("../config");
const { runFfmpeg } = require("../core/helpers");
const { helpPrefix } = require("../core/plugins/registry");
const { fetchPublic } = require("./utils/upload");
const {
  withDownload,
  clampInt,
  interpolationLimit,
} = require("./utils/mediaProcessors");

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

const getFileType = async (buffer) => {
  try {
    const fileType = require("file-type");
    if (fileType.fileTypeFromBuffer) {
      return await fileType.fileTypeFromBuffer(buffer);
    }

    if (fileType.fromBuffer) {
      return await fileType.fromBuffer(buffer);
    }

    return await fileType(buffer);
  } catch (error) {
    console.log("file-type detection failed:", error);
    return null;
  }
};
const { getString } = require("./utils/lang");
const Lang = getString("converters");

const unlinkAll = (files) =>
  Promise.all(files.map((f) => fs.promises.unlink(f).catch(() => {})));

const stickerExif = (message) => ({
  author: config.STICKER_DATA.split(";")[1] || "",
  packname: message.senderName,
  categories: config.STICKER_DATA.split(";")[2] || "😂",
  android: "https://github.com/souravkl11/Raganork-md/",
  ios: "https://github.com/souravkl11/Raganork-md/",
});

async function withExif(media, exif) {
  const out = await addExif(media, exif);
  if (Buffer.isBuffer(out)) return out;
  try {
    return fs.readFileSync(out);
  } finally {
    if (out !== media) fs.unlink(out, () => {});
  }
}

async function toStickerBuffer(file, type, exif) {
  const webp = await sticker(file, type);
  try {
    return await withExif(webp, exif);
  } finally {
    fs.unlink(webp, () => {});
  }
}

Module(
  {
    pattern: "img ?(.*)",
    use: "search",
    desc: "Searches for an image on Google Images and sends the requested number of results (max 10).",
  },
  async (message, match) => {
    if (!match[1]) return await message.send("*_Need a search term!_*");
    let splitInput = match[1].split(",");
    let count = clampInt(splitInput[1], 1, 10, 5);
    await message.send(`*_Searching for ${count} images..._*`);

    const buffer = Math.ceil(count * 0.5);
    let results = await gis(splitInput[0], count + buffer);
    if (results.length < 1) return await message.send("*_No results found!_*");

    let successCount = 0;
    let i = 0;
    const imagesToSend = [];

    while (successCount < count && i < results.length) {
      try {
        const imageBuffer = await getBuffer(results[i]);
        imagesToSend.push({ image: imageBuffer });
        successCount++;
      } catch (e) {
        console.log(`Failed to buffer image ${i + 1}:`, e.message);
        if (i === results.length - 1 && successCount < count) {
          let moreResults = await gis(splitInput[0], buffer, {
            page: Math.floor(i / 10) + 1,
          });
          if (moreResults.length > 0) {
            results = results.concat(moreResults);
          }
        }
      }
      i++;
    }

    if (imagesToSend.length === 0) {
      return await message.send("*_Failed to download any images_*");
    }

    try {
      await message.client.albumMessage(
        message.jid,
        imagesToSend,
        message.data
      );
    } catch (e) {
      console.log("Album send failed:", e.message);
      for (const img of imagesToSend) {
        try {
          await message.sendMessage(img, "image", { quoted: message.data });
        } catch (sendErr) {
          console.log("Failed to send individual image:", sendErr.message);
        }
      }
    }

    if (successCount < count) {
      await message.send(
        `*_Only able to download ${successCount}/${count} images. Some URLs had access issues._*`
      );
    }
  }
);

Module(
  {
    pattern: "sticker ?(.*)",
    use: "edit",
    desc: Lang.STICKER_DESC,
  },
  async (message, match) => {
    if (match[1] && match[1].trim() !== "") {
      var result = await attp(match[1].trim());
      return await message.sendMessage(
        await withExif(result, stickerExif(message)),
        "sticker"
      );
    }

    if (message.reply_message === false)
      return await message.send(Lang.STICKER_NEED_REPLY);

    const exif = stickerExif(message);

    if (message.reply_message.album) {
      const albumData = await message.reply_message.download();
      const allFiles = [...(albumData.images || []), ...(albumData.videos || [])];
      try {
        if (allFiles.length === 0) return await message.send("_No media in album_");

        await message.send(`_Converting ${allFiles.length} stickers..._`);
        for (const file of allFiles) {
          try {
            const isVideo = albumData.videos?.includes(file);
            await message.sendMessage(
              await toStickerBuffer(file, isVideo ? "video" : "image", exif),
              "sticker",
              { quoted: message.quoted }
            );
          } catch (err) {
            console.error("Failed to convert album sticker:", err);
          }
        }
      } finally {
        await unlinkAll(allFiles);
      }
      return;
    }

    await withDownload(message.reply_message, async (savedFile) => {
      await message.sendMessage(
        await toStickerBuffer(
          savedFile,
          message.reply_message.image === true ? "image" : "video",
          exif
        ),
        "sticker",
        { quoted: message.quoted }
      );
    });
  }
);
Module(
  {
    pattern: "mp3 ?(.*)",
    use: "edit",
    desc: Lang.MP3_DESC,
  },
  async (message) => {
    if (
      !message.reply_message ||
      (!message.reply_message.video &&
        !message.reply_message.audio &&
        !message.reply_message.document &&
        !message.reply_message.album)
    )
      return await message.sendReply(Lang.MP3_NEED_REPLY);

    if (message.reply_message.album) {
      const albumData = await message.reply_message.download();
      const videoFiles = albumData.videos || [];
      try {
        if (videoFiles.length === 0) {
          return await message.send("_No video files in album. MP3 requires video/audio files._");
        }

        await message.send(`_Converting ${videoFiles.length} files to mp3..._`);
        for (const file of videoFiles) {
          try {
            await withTempFile("album.mp3", async (outputPath) => {
              await runFfmpeg(ffmpeg(file), outputPath);
              await message.sendMessage(
                fs.readFileSync(outputPath),
                "audio",
                { quoted: message.quoted }
              );
            });
          } catch (err) {
            console.error("Failed to convert album mp3:", err);
          }
        }
      } finally {
        await unlinkAll([...(albumData.images || []), ...videoFiles]);
      }
      return;
    }

    await withDownload(message.reply_message, (savedFile) =>
      withTempFile("audio.m4a", async (audioPath) => {
        try {
          await runFfmpeg(
            ffmpeg(savedFile)
              .audioCodec("aac")
              .outputOptions(["-movflags", "faststart", "-q:a", "100"])
              .noVideo(),
            audioPath
          );
        } catch (err) {
          console.error("FFmpeg error:", err);
          return await message.sendReply(Lang.MP3_NEED_REPLY);
        }
        const stream = fs.createReadStream(audioPath);
        try {
          await message.sendReply({ stream }, "audio", {
            mimetype: "audio/mp4",
          });
        } finally {
          stream.destroy();
        }
      })
    );
  }
);

// changes pitch and speed together: asetrate below 44100 slows down, above speeds up
async function changeRate(message, rate, { label, progress }) {
  const reply = message.reply_message;
  if (!reply || (!reply.audio && !reply.video && !reply.album))
    return await message.sendReply(Lang.MP3_NEED_REPLY);

  const convert = (file) =>
    withTempFile("rate.mp3", async (out) => {
      await runFfmpeg(
        ffmpeg(file).outputOptions(["-y", "-af", `asetrate=44100*${rate}`]),
        out
      );
      return fs.readFileSync(out);
    });

  if (reply.album) {
    const albumData = await reply.download();
    const videoFiles = albumData.videos || [];
    try {
      if (videoFiles.length === 0) {
        return await message.send(
          `_No video files in album. ${label} requires video/audio files._`
        );
      }

      await message.send(`_${progress} ${videoFiles.length} files..._`);
      for (const file of videoFiles) {
        try {
          await message.sendMessage(await convert(file), "audio", {
            quoted: message.quoted,
          });
        } catch (err) {
          console.error(`Failed to ${label.toLowerCase()} album audio:`, err);
        }
      }
    } finally {
      await unlinkAll([...(albumData.images || []), ...videoFiles]);
    }
    return;
  }

  const seconds =
    message.quoted?.message?.[Object.keys(message.quoted.message)[0]]?.seconds;
  if (seconds > 120)
    await message.sendReply(
      `_Alert: Duration more than 2 mins. This process may fail or take much more time!_`
    );
  await withDownload(reply, async (savedFile) => {
    let audio;
    try {
      audio = await convert(savedFile);
    } catch (err) {
      console.error(`${label} failed:`, err.message);
      return await message.sendReply("_Failed to process this file_");
    }
    await message.sendMessage(audio, "audio", { quoted: message.quoted });
  });
}

async function slowMotion(message) {
  if (!message.reply_message || !message.reply_message.video)
    return await message.sendReply("*Reply to a video*");
  await withDownload(message.reply_message, async (savedFile) => {
    const limit = await interpolationLimit(savedFile);
    if (limit) return await message.sendReply(limit);
    await message.sendReply("*Motion interpolating and rendering..*");
    await withTempFile("slowmo.mp4", async (out) => {
      try {
        await runFfmpeg(
          ffmpeg(savedFile)
            .videoFilters("minterpolate=fps=120")
            .videoFilters("setpts=4*PTS")
            .noAudio()
            .format("mp4"),
          out
        );
      } catch (err) {
        console.error("slowmo failed:", err.message);
        return await message.sendReply("_Failed to render. Please try again._");
      }
      await message.send(fs.readFileSync(out), "video");
    });
  });
}

Module(
  {
    pattern: "slow ?(.*)",
    use: "edit",
    desc: "Slows down music & decreases pitch. For making slowed+reverb audios. Use .slow mo on a video for smooth slow motion",
  },
  async (message, match) => {
    if (
      (match[1] || "").trim().toLowerCase() === "mo"
    )
      return await slowMotion(message);
    await changeRate(message, 0.9, { label: "Slow", progress: "Slowing" });
  }
);
Module(
  {
    pattern: "sped ?(.*)",
    use: "edit",
    desc: "Speeds up music & increases pitch. For making sped-up+reverb audios",
  },
  async (message, match) => {
    await changeRate(message, 1.2, { label: "Sped", progress: "Speeding" });
  }
);
Module(
  {
    pattern: "bass ?(.*)",
    use: "edit",
    desc: Lang.BASS_DESC,
  },
  async (message, match) => {
    const reply = message.reply_message;
    if (!reply || (!reply.audio && !reply.video && !reply.album))
      return await message.sendReply(Lang.BASS_NEED_REPLY);

    if (reply.album) {
      const albumData = await reply.download();
      const videoFiles = albumData.videos || [];
      try {
        if (videoFiles.length === 0) {
          return await message.send("_No video files in album. Bass requires video/audio files._");
        }

        await message.send(`_Adding bass to ${videoFiles.length} files..._`);
        for (const file of videoFiles) {
          try {
            await message.sendMessage(await bass(file, match[1]), "audio", {
              quoted: message.data,
            });
          } catch (err) {
            console.error("Failed to add bass to album audio:", err);
          }
        }
      } finally {
        await unlinkAll([...(albumData.images || []), ...videoFiles]);
      }
      return;
    }

    await withDownload(reply, async (savedFile) => {
      let audio;
      try {
        audio = await bass(savedFile, match[1]);
      } catch (err) {
        return await message.sendReply("_Failed to process this file_");
      }
      await message.sendMessage(audio, "audio", { quoted: message.data });
    });
  }
);
Module(
  {
    pattern: "photo ?(.*)",
    use: "edit",
    desc: Lang.PHOTO_DESC,
  },
  async (message, match) => {
    if (!message.reply_message || !message.reply_message.sticker)
      return await message.send(Lang.PHOTO_NEED_REPLY);
    await withDownload(message.reply_message, (savedFile) =>
      withTempFile("photo.png", async (out) => {
        try {
          await runFfmpeg(ffmpeg(savedFile).fromFormat("webp_pipe"), out);
        } catch (err) {
          console.error("photo failed:", err.message);
          return await message.sendReply(Lang.PHOTO_NEED_REPLY);
        }
        await message.sendReply(fs.readFileSync(out), "image");
      })
    );
  }
);
Module(
  {
    pattern: "attp ?(.*)",
    use: "utility",
    desc: "Text to animated sticker",
  },
  async (message, match) => {
    if (match[1] == "") return await message.send("*Need text*");
    var result = await attp(match[1]);
    await message.sendMessage(
      await withExif(result, stickerExif(message)),
      "sticker"
    );
  }
);
Module(
  {
    pattern: "tts ?(.*)",
    desc: Lang.TTS_DESC,
    use: "utility",
  },
  async (message, match) => {
    var query = match[1] || message.reply_message.text;
    if (!query) return await message.sendReply(Lang.TTS_NEED_REPLY);
    var lng = "en";
    if (/[ഀ-ൿ]+/.test(query)) lng = "ml";
    let LANG = lng,
      ttsMessage = query,
      SPEED = 1.0,
      VOICE = "nova";
    const langMatch = query.match("\\{([a-z]{2})\\}");
    if (langMatch) {
      LANG = langMatch[1];
      ttsMessage = ttsMessage.replace(langMatch[0], "");
    }
    const speedMatch = query.match("\\{([0-9]+\\.[0-9]+)\\}");
    if (speedMatch) {
      SPEED = parseFloat(speedMatch[1]);
      ttsMessage = ttsMessage.replace(speedMatch[0], "");
    }
    const voiceMatch = query.match(
      "\\{(nova|alloy|ash|coral|echo|fable|onyx|sage|shimmer)\\}"
    );
    if (voiceMatch) {
      VOICE = voiceMatch[1];
      ttsMessage = ttsMessage.replace(voiceMatch[0], "");
    }
    let audio;

    if (LANG === "ml") {
      try {
        audio = await gtts(ttsMessage.trim(), LANG);
      } catch {
        return await message.sendReply("_" + Lang.TTS_ERROR + "_");
      }
    } else {
      try {
        const ttsResult = await aiTTS(
          ttsMessage.trim(),
          VOICE,
          SPEED.toFixed(2)
        );
        if (ttsResult && ttsResult.url) {
          audio = { url: ttsResult.url };
        } else {
          throw new Error(
            ttsResult && ttsResult.error ? ttsResult.error : "AI TTS failed"
          );
        }
      } catch (e) {
        console.error("AI TTS failed, falling back to gtts:", e);
        try {
          audio = await gtts(ttsMessage.trim(), LANG);
        } catch {
          return await message.sendReply("_" + Lang.TTS_ERROR + "_");
        }
      }
    }

    await message.sendMessage(audio, "audio", {
      quoted: message.data,
      mimetype: "audio/mpeg",
      ptt: true,
    });
  }
);
Module(
  {
    pattern: "doc ?(.*)",
    use: "edit",
    desc: "Converts replied media to document format",
  },
  async (message, match) => {
    if (message.reply_message === false)
      return await message.send(
        "_Reply to a media file (image, video, audio, sticker, or document)_"
      );

    if (
      !message.reply_message.image &&
      !message.reply_message.video &&
      !message.reply_message.audio &&
      !message.reply_message.sticker &&
      !message.reply_message.document &&
      !message.reply_message.album
    ) {
      return await message.send(
        "_Reply to a media file (image, video, audio, sticker, or document)_"
      );
    }

    if (message.reply_message.album) {
      const albumData = await message.reply_message.download();
      const allFiles = [...(albumData.images || []), ...(albumData.videos || [])];
      try {
        if (allFiles.length === 0) return await message.send("_No media in album_");

        await message.send(`_Converting ${allFiles.length} files to documents..._`);
        for (let i = 0; i < allFiles.length; i++) {
          try {
            const filePath = allFiles[i];
            const stream = fs.createReadStream(filePath);
            var randomHash = Math.random().toString(36).substring(2, 8);
            var fileName = match[1] || `album_${i}_${randomHash}`;
            var mimetype = "application/octet-stream";

            if (!fileName.includes(".")) {
              const ext = filePath.split(".").pop();
              if (ext) fileName += `.${ext}`;
            }

            await message.sendMessage({ stream: stream }, "document", {
              quoted: message.quoted,
              fileName: fileName,
              mimetype: mimetype,
              caption: "_Converted to document_",
            });
          } catch (err) {
            console.error("Failed to convert album file to document:", err);
          }
        }
      } finally {
        await unlinkAll(allFiles);
      }
      return;
    }

    try {
      const mediaMessage = message.reply_message.data.message;
      const mediaType = Object.keys(mediaMessage)[0];
      const mediaInfo = mediaMessage[mediaType];

      if (mediaInfo.fileLength && mediaInfo.fileLength > 50 * 1024 * 1024) {
        return await message.send("_File too large! Maximum size is 50MB_");
      }
      const processingMsg = await message.send("_Converting to document..._");

      await withDownload(message.reply_message, async (filePath) => {
        const stream = fs.createReadStream(filePath);
        var randomHash = Math.random().toString(36).substring(2, 8);
        var fileName = match[1];
        var mimetype = mediaInfo.mimetype || "application/octet-stream";

        if (message.reply_message.document && mediaInfo.fileName && !match[1]) {
          fileName = mediaInfo.fileName;
        } else if (!fileName) {
          fileName = `converted_file_${randomHash}`;
        }

        if (!fileName.includes(".") && mimetype) {
          const ext = mimetype.split("/")[1];
          if (ext && ext !== "octet-stream") {
            fileName += `.${ext}`;
          }
        }
        await message.sendMessage({ stream: stream }, "document", {
          quoted: message.quoted,
          fileName: fileName,
          mimetype: mimetype,
          caption: match[1] ? "" : "_Converted to document_",
        });
      });

      await message.edit(
        "_Document conversion complete!_",
        message.jid,
        processingMsg.key
      );
    } catch (error) {
      console.error("Doc conversion error:", error);
      if (error.message.includes("download")) {
        await message.send(
          "_Failed to download media. File might be corrupted or expired_"
        );
      } else if (
        error.message.includes("large") ||
        error.message.includes("memory")
      ) {
        await message.send("_File too large to process_");
      } else {
        await message.send("_Failed to convert media to document_");
      }
    }
  }
);
Module(
  {
    pattern: "upload ?(.*)",
    use: "utility",
    desc: "Downloads file from URL and sends as document",
  },
  async (message, match) => {
    var url =
      match[1] || (message.reply_message ? message.reply_message.text : "") || "";

    const urlMatch = url.match(/https?:\/\/[^\s]+/);
    if (urlMatch) {
      url = urlMatch[0];
    }

    if (!url || !url.startsWith("http")) {
      return await message.send(
        "_Please provide a valid URL or reply to a message containing a URL_"
      );
    }

    try {
      await message.send("_Downloading file..._");

      const { stream, headers, url: finalUrl } = await fetchPublic(url, {
        maxBytes: MAX_UPLOAD_BYTES,
        timeout: 60000,
      });

      var randomHash = Math.random().toString(36).substring(2, 8);
      var fileName = `downloaded_file_${randomHash}`;
      var mimetype = headers["content-type"] || "application/octet-stream";

      const contentDisposition = headers["content-disposition"];
      if (contentDisposition && contentDisposition.includes("filename=")) {
        const filenameMatch = contentDisposition.match(
          /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/
        );
        if (filenameMatch) {
          fileName = filenameMatch[1].replace(/['"]/g, "");
        }
      } else {
        const urlPath = new URL(finalUrl).pathname;
        const urlFileName = urlPath.split("/").pop();
        if (urlFileName && urlFileName.includes(".")) {
          fileName = urlFileName;
        }
      }

      if (!fileName.includes(".") && headers["content-type"]) {
        const ext = headers["content-type"].split("/")[1];
        if (ext && ext !== "octet-stream") {
          fileName += `.${ext}`;
        }
      }
      await message.sendMessage({ stream }, "document", {
        quoted: message.quoted,
        fileName: fileName,
        mimetype: mimetype,
        caption: `_Downloaded from: ${url}_`,
      });
    } catch (error) {
      console.error("Upload error:", error);
      if (/too large/i.test(error.message)) {
        await message.send("_File is too large! Maximum size is 100MB_");
      } else if (/public http/i.test(error.message)) {
        await message.send("_That URL is not allowed_");
      } else if (error.code === "ECONNABORTED") {
        await message.send(
          "_Download timeout. File might be too large or server is slow_"
        );
      } else if (error.response && error.response.status === 404) {
        await message.send("_File not found (404). Please check the URL_");
      } else if (error.response && error.response.status >= 400) {
        await message.send(
          `_Download failed with status ${error.response.status}_`
        );
      } else {
        await message.send(
          "_Failed to download file. Please check the URL and try again_"
        );
      }
    }
  }
);

async function convertMedia(message, { name, startText, failText, configure, caption, doneText }) {
  const isVideo = Boolean(message.reply_message.video);
  let processed = false;
  try {
    const processingMsg = await message.send(startText);
    let stats;
    await withDownload(message.reply_message, (savedFile) =>
      withTempFile(`${name}.${isVideo ? "mp4" : "jpg"}`, async (outputPath) => {
        const command = ffmpeg(savedFile).outputOptions(["-y"]);
        configure(command, isVideo);
        await runFfmpeg(command, outputPath);
        processed = true;
        stats = {
          originalSize: fs.statSync(savedFile).size,
          size: fs.statSync(outputPath).size,
        };
        await message.sendMessage(
          fs.readFileSync(outputPath),
          isVideo ? "video" : "image",
          { quoted: message.quoted, caption: caption(stats) }
        );
      })
    );
    await message.edit(doneText(stats), message.jid, processingMsg.key);
  } catch (error) {
    console.error(`${name} error:`, error);
    await message.send(
      processed ? "_Processed successfully but failed to send_" : failText
    );
  }
}

function encodeFast(command, isVideo) {
  if (isVideo) {
    command
      .videoCodec("libx264")
      .audioCodec("aac")
      .outputOptions(["-preset", "fast", "-crf", "23"])
      .format("mp4");
  } else {
    command.format("mjpeg").outputOptions(["-q:v", "2"]);
  }
}

Module(
  {
    pattern: "square ?(.*)",
    use: "edit",
    desc: "Crops video/image to 1:1 aspect ratio (square format)",
  },
  async (message, match) => {
    if (
      !message.reply_message ||
      (!message.reply_message.video && !message.reply_message.image)
    ) {
      return await message.sendReply(
        "_Reply to a video or image to crop it to square format_"
      );
    }

    await convertMedia(message, {
      name: "square",
      startText: "_Processing media to square format..._",
      failText: "_Failed to process media. Please try again_",
      configure: (command, isVideo) => {
        command.videoFilters([
          "scale='min(iw,ih)':'min(iw,ih)':force_original_aspect_ratio=increase",
          "crop='min(iw,ih)':'min(iw,ih)'",
        ]);
        encodeFast(command, isVideo);
      },
      caption: () => "_Cropped to square format_",
      doneText: () => "_Square cropping completed ✅_",
    });
  }
);

Module(
  {
    pattern: "resize ?(.*)",
    use: "edit",
    desc: "Change video/image aspect ratio. Usage: .resize 16:9, .resize 9:16, .resize 4:3, .resize 21:9",
  },
  async (message, match) => {
    if (
      !message.reply_message ||
      (!message.reply_message.video && !message.reply_message.image)
    ) {
      return await message.sendReply(
        "_Reply to a video or image to resize it_"
      );
    }

    if (!match[1]) {
      return await message.send(
        `_Please specify aspect ratio. Examples:_\n• \`${helpPrefix()}resize 16:9\` - Widescreen\n• \`${helpPrefix()}resize 9:16\` - Vertical/Stories\n• \`${helpPrefix()}resize 4:3\` - Classic\n• \`${helpPrefix()}resize 21:9\` - Ultrawide\n• \`${helpPrefix()}resize 1:1\` - Square`
      );
    }

    const input = match[1].trim();

    if (!input.includes(":")) {
      return await message.send(
        "_Invalid format! Use aspect ratios like 16:9, 9:16, 4:3, etc._"
      );
    }

    const [widthRatio, heightRatio] = input
      .split(":")
      .map((x) => parseInt(x.trim()));

    if (
      isNaN(widthRatio) ||
      isNaN(heightRatio) ||
      widthRatio <= 0 ||
      heightRatio <= 0
    ) {
      return await message.send(
        "_Invalid aspect ratio! Use positive numbers like 16:9, 9:16, etc._"
      );
    }

    let targetWidth, targetHeight;

    if (widthRatio >= heightRatio) {
      targetWidth = 1280;
      targetHeight = Math.round((targetWidth * heightRatio) / widthRatio);
    } else {
      targetHeight = 1280;
      targetWidth = Math.round((targetHeight * widthRatio) / heightRatio);
    }

    targetWidth = targetWidth % 2 === 0 ? targetWidth : targetWidth + 1;
    targetHeight = targetHeight % 2 === 0 ? targetHeight : targetHeight + 1;

    await convertMedia(message, {
      name: "resized",
      startText: `_Resizing to ${input} aspect ratio..._`,
      failText:
        "_Failed to resize media. Please check aspect ratio and try again_",
      configure: (command, isVideo) => {
        command.videoFilters([
          `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=increase`,
          `crop=${targetWidth}:${targetHeight}`,
        ]);
        encodeFast(command, isVideo);
      },
      caption: () =>
        `_Resized to ${input} aspect ratio (${targetWidth}x${targetHeight})_`,
      doneText: () => `_Aspect ratio change to ${input} completed ✅_`,
    });
  }
);
Module(
  {
    pattern: "compress ?(.*)",
    use: "edit",
    desc: "Compress video/image by percentage. Usage: .compress 50 (50% compression), .compress 80 (80% compression)",
  },
  async (message, match) => {
    if (
      !message.reply_message ||
      (!message.reply_message.video && !message.reply_message.image)
    ) {
      return await message.sendReply(
        "_Reply to a video or image to compress it_"
      );
    }

    if (!match[1]) {
      return await message.send(
        `_Please specify compression percentage. Examples:_\n• \`${helpPrefix()}compress 50\` - 50% compression (moderate)\n• \`${helpPrefix()}compress 70\` - 70% compression (high)\n• \`${helpPrefix()}compress 80\` - 80% compression (very high)\n• \`${helpPrefix()}compress 30\` - 30% compression (light)`
      );
    }

    const compressionPercent = parseInt(match[1].trim());

    if (
      isNaN(compressionPercent) ||
      compressionPercent < 10 ||
      compressionPercent > 95
    ) {
      return await message.send(
        "_Invalid compression percentage! Use values between 10-95._"
      );
    }

    const formatSize = (bytes) => {
      const mb = bytes / (1024 * 1024);
      return mb > 1 ? `${mb.toFixed(1)}MB` : `${(bytes / 1024).toFixed(1)}KB`;
    };
    const reduction = ({ originalSize, size }) =>
      Math.round((1 - size / originalSize) * 100);

    await convertMedia(message, {
      name: "compressed",
      startText: `_Compressing by ${compressionPercent}%..._`,
      failText: "_Failed to compress media. Please try again_",
      configure: (command, isVideo) => {
        if (isVideo) {
          const crf = Math.round(
            18 + ((compressionPercent - 10) * (45 - 18)) / (95 - 10)
          );

          command
            .videoCodec("libx264")
            .audioCodec("aac")
            .outputOptions([
              "-preset",
              "medium",
              "-crf",
              crf.toString(),
              "-profile:v",
              "main",
              "-level",
              "3.1",
            ])
            .format("mp4");
        } else {
          const quality = Math.round(
            2 + ((compressionPercent - 10) * (28 - 2)) / (95 - 10)
          );

          command.format("mjpeg").outputOptions(["-q:v", quality.toString()]);
        }
      },
      caption: (stats) =>
        `_Compressed by ${reduction(stats)}%_\n_${formatSize(
          stats.originalSize
        )} → ${formatSize(stats.size)}_`,
      doneText: (stats) =>
        `_Compression completed ✅ (${reduction(stats)}% reduction)_`,
    });
  }
);
