const { Module, UserError } = require("../main");
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
const { sendZap, sendSpoiler } = require("../core/session/features/new-media");
const { getFullMessage } = require("../core/store");
const { ReplyMessage } = require("../core/constructors");
const { helpPrefix } = require("../core/plugins/registry");
const { fetchPublic } = require("./utils/upload");
const {
  withDownload,
  videoSticker,
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
    desc: Lang.SEARCHES_FOR_AN_IMAGE_ON,
  },
  async (message, match) => {
    if (!match[1]) return await message.send(Lang.NEED_A_SEARCH_TERM);
    let splitInput = match[1].split(",");
    let count = clampInt(splitInput[1], 1, 10, 5);
    await message.send(Lang.SEARCHING_FOR_IMAGES.format(count));

    const buffer = Math.ceil(count * 0.5);
    let results = await gis(splitInput[0], count + buffer);
    if (results.length < 1) return await message.send(Lang.NO_RESULTS_FOUND);

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
      return await message.send(Lang.FAILED_TO_DOWNLOAD_ANY_IMAGES);
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
        Lang.ONLY_ABLE_TO_DOWNLOAD_IMAGES.format(successCount, count)
      );
    }
  }
);

Module(
  {
    pattern: "sticker(?!audio) ?(.*)",
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
        if (allFiles.length === 0) return await message.send(Lang.NO_MEDIA_IN_ALBUM);

        await message.send(Lang.CONVERTING_STICKERS.format(allFiles.length));
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

    const reply = message.reply_message;
    // some clients send a .webp file as application/octet-stream, so the name counts too
    const docKind = !reply.document
      ? null
      : /^image\//.test(reply.mimetype) || /\.(webp|png|jpe?g)$/i.test(reply.fileName || "")
        ? "image"
        : /^video\//.test(reply.mimetype) || /\.(mp4|mkv|mov|webm|gif)$/i.test(reply.fileName || "")
          ? "video"
          : null;
    if (!reply.image && !reply.video && !reply.sticker && !docKind)
      return await message.send(Lang.STICKER_NEED_REPLY);
    const type = reply.image || docKind === "image" ? "image" : "video";

    await withDownload(reply, async (savedFile) => {
      let buffer;
      try {
        buffer = await toStickerBuffer(savedFile, type, exif);
      } catch (err) {
        console.error("sticker conversion failed:", err);
        throw new UserError(Lang.STICKER_CONVERT_FAILED, { cause: err });
      }
      await message.sendMessage(buffer, "sticker", { quoted: message.quoted });
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
          return await message.send(Lang.NO_VIDEO_FILES_IN_ALBUM);
        }

        await message.send(Lang.CONVERTING_FILES_TO_MP3.format(videoFiles.length));
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
          Lang.NO_VIDEO_FILES_IN_ALBUM_2.format(label)
        );
      }

      await message.send(Lang.FILES.format(progress, videoFiles.length));
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
      Lang.ALERT_DURATION_MORE_THAN_2
    );
  await withDownload(reply, async (savedFile) => {
    let audio;
    try {
      audio = await convert(savedFile);
    } catch (err) {
      console.error(`${label} failed:`, err.message);
      return await message.sendReply(Lang.FAILED_TO_PROCESS_THIS_FILE);
    }
    await message.sendMessage(audio, "audio", { quoted: message.quoted });
  });
}

async function slowMotion(message) {
  if (!message.reply_message || !message.reply_message.video)
    return await message.sendReply(Lang.REPLY_TO_A_VIDEO);
  await withDownload(message.reply_message, async (savedFile) => {
    const limit = await interpolationLimit(savedFile);
    if (limit) return await message.sendReply(limit);
    await message.sendReply(Lang.MOTION_INTERPOLATING_AND_RENDERING);
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
        return await message.sendReply(Lang.FAILED_TO_RENDER_PLEASE_TRY);
      }
      await message.send(fs.readFileSync(out), "video");
    });
  });
}

Module(
  {
    pattern: "slow ?(.*)",
    use: "edit",
    desc: Lang.SLOWS_DOWN_MUSIC_DECREASES_PITCH,
  },
  async (message, match) => {
    if (
      (match[1] || "").trim().toLowerCase() === "mo"
    )
      return await slowMotion(message);
    await changeRate(message, 0.9, { label: Lang.SLOW, progress: Lang.SLOWING });
  }
);
Module(
  {
    pattern: "sped ?(.*)",
    use: "edit",
    desc: Lang.SPEEDS_UP_MUSIC_INCREASES_PITCH,
  },
  async (message, match) => {
    await changeRate(message, 1.2, { label: Lang.SPED, progress: Lang.SPEEDING });
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
          return await message.send(Lang.NO_VIDEO_FILES_IN_ALBUM_3);
        }

        await message.send(Lang.ADDING_BASS_TO_FILES.format(videoFiles.length));
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
        return await message.sendReply(Lang.FAILED_TO_PROCESS_THIS_FILE);
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
    desc: Lang.TEXT_TO_ANIMATED_STICKER,
  },
  async (message, match) => {
    if (match[1] == "") return await message.send(Lang.NEED_TEXT);
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
            ttsResult && ttsResult.error ? ttsResult.error : Lang.AI_TTS_FAILED
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
    desc: Lang.CONVERTS_REPLIED_MEDIA_TO_DOCUMENT,
  },
  async (message, match) => {
    if (message.reply_message === false)
      return await message.send(
        Lang.REPLY_TO_A_MEDIA_FILE
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
        Lang.REPLY_TO_A_MEDIA_FILE
      );
    }

    if (message.reply_message.album) {
      const albumData = await message.reply_message.download();
      const allFiles = [...(albumData.images || []), ...(albumData.videos || [])];
      try {
        if (allFiles.length === 0) return await message.send(Lang.NO_MEDIA_IN_ALBUM);

        await message.send(Lang.CONVERTING_FILES_TO_DOCUMENTS.format(allFiles.length));
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
              caption: Lang.CONVERTED_TO_DOCUMENT,
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
        return await message.send(Lang.FILE_TOO_LARGE_MAXIMUM_SIZE);
      }
      const processingMsg = await message.send(Lang.CONVERTING_TO_DOCUMENT);

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
          caption: match[1] ? "" : Lang.CONVERTED_TO_DOCUMENT,
        });
      });

      await message.edit(
        Lang.DOCUMENT_CONVERSION_COMPLETE,
        message.jid,
        processingMsg.key
      );
    } catch (error) {
      console.error("Doc conversion error:", error);
      if (error.message.includes("download")) {
        await message.send(
          Lang.FAILED_TO_DOWNLOAD_MEDIA_FILE
        );
      } else if (
        error.message.includes("large") ||
        error.message.includes("memory")
      ) {
        await message.send(Lang.FILE_TOO_LARGE_TO_PROCESS);
      } else {
        await message.send(Lang.FAILED_TO_CONVERT_MEDIA_TO);
      }
    }
  }
);
Module(
  {
    pattern: "upload ?(.*)",
    use: "utility",
    desc: Lang.DOWNLOADS_FILE_FROM_URL_AND,
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
        Lang.PLEASE_PROVIDE_A_VALID_URL
      );
    }

    try {
      await message.send(Lang.DOWNLOADING_FILE);

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
        caption: Lang.DOWNLOADED_FROM.format(url),
      });
    } catch (error) {
      console.error("Upload error:", error);
      if (/too large/i.test(error.message)) {
        await message.send(Lang.FILE_IS_TOO_LARGE_MAXIMUM);
      } else if (/public http/i.test(error.message)) {
        await message.send(Lang.THAT_URL_IS_NOT_ALLOWED);
      } else if (error.code === "ECONNABORTED") {
        await message.send(
          Lang.DOWNLOAD_TIMEOUT_FILE_MIGHT_BE
        );
      } else if (error.response && error.response.status === 404) {
        await message.send(Lang.FILE_NOT_FOUND_404_PLEASE);
      } else if (error.response && error.response.status >= 400) {
        await message.send(
          Lang.DOWNLOAD_FAILED_WITH_STATUS.format(error.response.status)
        );
      } else {
        await message.send(
          Lang.FAILED_TO_DOWNLOAD_FILE_PLEASE
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
      processed ? Lang.PROCESSED_SUCCESSFULLY_BUT_FAILED_TO : failText
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
    desc: Lang.CROPS_VIDEO_IMAGE_TO_1,
  },
  async (message, match) => {
    if (
      !message.reply_message ||
      (!message.reply_message.video && !message.reply_message.image)
    ) {
      return await message.sendReply(
        Lang.REPLY_TO_A_VIDEO_OR
      );
    }

    await convertMedia(message, {
      name: "square",
      startText: Lang.PROCESSING_MEDIA_TO_SQUARE_FORMAT,
      failText: Lang.FAILED_TO_PROCESS_MEDIA_PLEASE,
      configure: (command, isVideo) => {
        command.videoFilters([
          "scale='min(iw,ih)':'min(iw,ih)':force_original_aspect_ratio=increase",
          "crop='min(iw,ih)':'min(iw,ih)'",
        ]);
        encodeFast(command, isVideo);
      },
      caption: () => Lang.CROPPED_TO_SQUARE_FORMAT,
      doneText: () => Lang.SQUARE_CROPPING_COMPLETED,
    });
  }
);

Module(
  {
    pattern: "resize ?(.*)",
    use: "edit",
    desc: Lang.CHANGE_VIDEO_IMAGE_ASPECT_RATIO,
  },
  async (message, match) => {
    if (
      !message.reply_message ||
      (!message.reply_message.video && !message.reply_message.image)
    ) {
      return await message.sendReply(
        Lang.REPLY_TO_A_VIDEO_OR_2
      );
    }

    if (!match[1]) {
      return await message.send(
        Lang.PLEASE_SPECIFY_ASPECT_RATIO_EXAMPLES.replaceAll("{p}", helpPrefix())
      );
    }

    const input = match[1].trim();

    if (!input.includes(":")) {
      return await message.send(
        Lang.INVALID_FORMAT_USE_ASPECT_RATIOS
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
        Lang.INVALID_ASPECT_RATIO_USE_POSITIVE
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
      startText: Lang.RESIZING_TO_ASPECT_RATIO.format(input),
      failText:
        Lang.FAILED_TO_RESIZE_MEDIA_PLEASE,
      configure: (command, isVideo) => {
        command.videoFilters([
          `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=increase`,
          `crop=${targetWidth}:${targetHeight}`,
        ]);
        encodeFast(command, isVideo);
      },
      caption: () =>
        Lang.RESIZED_TO_ASPECT_RATIO_X.format(input, targetWidth, targetHeight),
      doneText: () => Lang.ASPECT_RATIO_CHANGE_TO_COMPLETED.format(input),
    });
  }
);
Module(
  {
    pattern: "compress ?(.*)",
    use: "edit",
    desc: Lang.COMPRESS_VIDEO_IMAGE_BY_PERCENTAGE,
  },
  async (message, match) => {
    if (
      !message.reply_message ||
      (!message.reply_message.video && !message.reply_message.image)
    ) {
      return await message.sendReply(
        Lang.REPLY_TO_A_VIDEO_OR_3
      );
    }

    if (!match[1]) {
      return await message.send(
        Lang.PLEASE_SPECIFY_COMPRESSION_PERCENTAGE_EXAMPLES.replaceAll("{p}", helpPrefix())
      );
    }

    const compressionPercent = parseInt(match[1].trim());

    if (
      isNaN(compressionPercent) ||
      compressionPercent < 10 ||
      compressionPercent > 95
    ) {
      return await message.send(
        Lang.INVALID_COMPRESSION_PERCENTAGE_USE_VALUES
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
      startText: Lang.COMPRESSING_BY.format(compressionPercent),
      failText: Lang.FAILED_TO_COMPRESS_MEDIA_PLEASE,
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
        Lang.COMPRESSED_BY.format(reduction(stats), formatSize(
          stats.originalSize
        ), formatSize(stats.size)),
      doneText: (stats) =>
        Lang.COMPRESSION_COMPLETED_REDUCTION.format(reduction(stats)),
    });
  }
);

const pendingStickerAudio = new Map();
const PENDING_TTL_MS = 10 * 60 * 1000;

function takePending(key) {
  const entry = pendingStickerAudio.get(key);
  if (!entry || Date.now() - entry.at > PENDING_TTL_MS) {
    pendingStickerAudio.delete(key);
    return {};
  }
  return entry;
}

async function extractAudioTrack(file, secs) {
  return await withTempFile("sticker-audio.ogg", async (out) => {
    const command = ffmpeg(file).noVideo().audioCodec("libopus").format("ogg");
    if (secs) command.duration(secs);
    await runFfmpeg(command, out);
    const buf = fs.readFileSync(out);
    return buf.length > 1024 ? buf : null;
  }).catch(() => null);
}

function mediaKind(msg) {
  if (!msg) return null;
  for (const kind of ["sticker", "image", "video", "audio"]) if (msg[kind]) return kind;
  const type = msg.document && msg.mimetype?.split("/")[0];
  return ["image", "video", "audio"].includes(type) ? type : null;
}

async function absorbStickerAudio(msg, state, exif) {
  const kind = mediaKind(msg);
  if (kind === "audio") {
    state.audioBuf = await msg.download("buffer");
  } else if (kind === "video" && state.stickerBuf && !state.audioBuf) {
    state.audioBuf = await withDownload(msg, extractAudioTrack);
    if (!state.audioBuf) return Lang.THAT_VIDEO_HAS_NO_AUDIO;
  } else if (kind === "sticker") {
    state.stickerBuf = await msg.download("buffer");
  } else if (kind === "image") {
    await withDownload(msg, async (file) => {
      state.stickerBuf = await toStickerBuffer(file, "image", exif);
    });
  } else if (kind === "video") {
    await withDownload(msg, async (file) => {
      const ownAudio = !state.audioBuf;
      const { path: webp, secs } = await videoSticker(file, { fullLength: ownAudio });
      try {
        state.stickerBuf = await withExif(webp, exif);
      } finally {
        fs.unlink(webp, () => {});
      }
      if (ownAudio) state.audioBuf = await extractAudioTrack(file, secs);
    });
  }
}

async function quotedOfReply(message) {
  const reply = message.reply_message;
  const stored = reply.id ? await getFullMessage(reply.id) : null;
  const content = stored?.found ? stored.messageData.message : reply.data?.message;
  const ctx = Object.values(content || {}).find((v) => v?.contextInfo?.quotedMessage)?.contextInfo;
  if (!ctx) return null;
  const original = ctx.stanzaId ? await getFullMessage(ctx.stanzaId) : null;
  return new ReplyMessage(message.client, {
    stanzaId: ctx.stanzaId,
    participant: ctx.participant,
    remoteJid: ctx.remoteJid || message.jid,
    quotedMessage: original?.found ? original.messageData.message : ctx.quotedMessage,
  });
}

Module(
  {
    pattern: "stickeraudio ?(.*)",
    use: "edit",
    desc: Lang.MAKES_A_STICKER_THAT_PLAYS,
  },
  async (message, match) => {
    const reply = message.reply_message;
    const key = `${message.jid}:${message.sender}`;
    const label = match[1]?.trim() || undefined;
    const usage = Lang.STICKERAUDIO_USAGE;
    if (!mediaKind(reply))
      return await message.send(usage);

    const pending = takePending(key);
    const exif = stickerExif(message);
    const state = { stickerBuf: pending.stickerBuf, audioBuf: pending.audioBuf };

    const error = await absorbStickerAudio(reply, state, exif);
    if (error) return await message.send(error);

    if (!state.stickerBuf || !state.audioBuf) {
      const inner = await quotedOfReply(message).catch(() => null);
      const innerKind = mediaKind(inner);
      const fills = state.stickerBuf ? ["audio", "video"].includes(innerKind) : !!innerKind && innerKind !== "audio";
      if (fills) await absorbStickerAudio(inner, state, exif).catch(() => null);
    }
    const { stickerBuf, audioBuf } = state;

    if (!stickerBuf || !audioBuf) {
      pendingStickerAudio.set(key, {
        stickerBuf,
        audioBuf,
        label: label || pending.label,
        at: Date.now(),
      });
      return await message.send(
        stickerBuf
          ? Lang.GOT_THE_STICKER_NOW_REPLY
          : Lang.GOT_THE_AUDIO_NOW_REPLY
      );
    }

    pendingStickerAudio.delete(key);
    await message.sendMessage(stickerBuf, "sticker", {
      audio: audioBuf,
      emojis: label || pending.label,
      quoted: message.data,
    });
  }
);

Module(
  {
    pattern: "zap ?(.*)",
    use: "edit",
    desc: Lang.RESENDS_A_REPLIED_PHOTO_OR,
  },
  async (message, match) => {
    const reply = message.reply_message;
    if (!reply || !(reply.image || reply.video))
      return await message.send(Lang.REPLY_TO_A_PHOTO_OR);
    const words = (match[1] || "").trim().split(/\s+/).filter(Boolean);
    const targets = words.filter((w) => w.includes("@"));
    const caption = words.filter((w) => !w.includes("@")).join(" ") || undefined;
    if (targets.length && !message.fromOwner)
      return await message.send(Lang.ONLY_THE_OWNER_CAN_ZAP);
    const type = reply.image ? "image" : "video";
    const media = await reply.download("buffer");
    if (!targets.length) {
      return await message.sendMessage(media, type, { zap: true, caption });
    }
    for (const jid of targets) {
      await sendZap(message.client, jid, media, type, { caption });
    }
    await message.send(Lang.ZAP_SENT_TO_CHAT.format(targets.length, targets.length > 1 ? Lang.PLURAL_S : ""));
  }
);

Module(
  {
    pattern: "spoiler ?(.*)",
    use: "edit",
    desc: Lang.SENDS_A_PHOTO_VIDEO_OR,
  },
  async (message, match) => {
    const reply = message.reply_message;
    const text = match[1]?.trim();
    if (reply && (reply.image || reply.video)) {
      const media = await reply.download("buffer");
      return await sendSpoiler(message.client, message.jid, media, reply.image ? "image" : "video", {
        caption: text || reply.caption || undefined,
      });
    }
    const body = text || reply?.text;
    if (!body) return await message.send(Lang.REPLY_TO_A_PHOTO_VIDEO);
    await sendSpoiler(message.client, message.jid, body, "text");
  }
);
