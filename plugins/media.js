const { Module } = require("../main");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const { runFfmpeg, uniqueTempPath } = require("../core/helpers");
const { helpPrefix } = require("../core/plugins/registry");
const { getString } = require("./utils/lang");
const {
  avMix,
  circle,
  rotate,
  trim,
  findMusic,
  withTempFile,
  accountKey,
} = require("./utils");
const {
  interpolationLimit,
  mergeVideos,
  stagingDir,
  removeDir,
  withDownload,
} = require("./utils/mediaProcessors");
const Lang = getString("media");

const exists = (file) =>
  fs.promises.access(file).then(
    () => true,
    () => false,
  );

// copies the replied media into a staging folder
const stageReply = (reply, target) =>
  withDownload(reply, (file) => fs.promises.copyFile(file, target));

Module(
  {
    pattern: "trim ?(.*)",
    desc: Lang.TRIM_DESC,
    usage: Lang.TRIM_USE,
    use: "edit",
  },
  async (message, match) => {
    if (
      !message.reply_message ||
      (!message.reply_message.video && !message.reply_message.audio)
    )
      return await message.sendReply(Lang.TRIM_NEED_REPLY);
    if (!match[1] || !match[1].includes(","))
      return await message.sendReply(
        message.reply_message.audio ? Lang.TRIM_NEED : Lang.TRIM_VIDEO_NEED,
      );
    const parts = match[1].split(",");
    const start = parts[0]?.trim();
    const end = parts[1]?.trim();
    const isAudio = Boolean(message.reply_message.audio);
    await withDownload(message.reply_message, async (savedFile) => {
      await message.sendMessage("_Processing trim..._");
      await withTempFile(isAudio ? "trim.m4a" : "trim.mp4", async (out) => {
        try {
          await trim(savedFile, start, end, out);
        } catch (err) {
          console.error("trim failed:", err.message);
          return await message.sendReply("_Failed to trim. Check the time range._");
        }
        if (isAudio) {
          await message.sendReply(
            { stream: fs.createReadStream(out), mimetype: "audio/mp4" },
            "audio",
          );
        } else {
          await message.send({ stream: fs.createReadStream(out) }, "video");
        }
      });
    });
  },
);
Module(
  {
    pattern: "black",
    desc: "Audio to black video",
    use: "edit",
  },
  async (message, match) => {
    if (!message.reply_message || !message.reply_message.audio)
      return await message.send("_Need audio!_");

    try {
      const processingMsg = await message.sendReply(
        "_Processing audio to black video..._",
      );
      await withDownload(message.reply_message, (audioFile) =>
        withTempFile("black.mp4", async (outputPath) => {
          await runFfmpeg(
            ffmpeg()
              .input(audioFile)
              .input("color=c=black:s=320x240:r=30")
              .inputFormat("lavfi")
              .outputOptions([
                "-shortest",
                "-c:v",
                "libx264",
                "-preset",
                "ultrafast",
                "-crf",
                "51",
                "-c:a",
                "copy",
                "-pix_fmt",
                "yuv420p",
              ])
              .format("mp4"),
            outputPath,
          );
          await message.send(fs.readFileSync(outputPath), "video");
        }),
      );
      await message.edit(
        "_Black video created successfully!_",
        message.jid,
        processingMsg.key,
      );
    } catch (error) {
      console.error("Black video creation error:", error);
      await message.send("_Failed to create black video. Please try again._");
    }
  },
);
Module(
  {
    pattern: "avmix",
    desc: Lang.AVMIX_DESC,
    use: "edit",
  },
  async (message, match) => {
    const dir = await stagingDir("avmix", accountKey(message.jid, message.sender));
    const audioPath = path.join(dir, "audio.mp3");
    const videoPath = path.join(dir, "video.mp4");
    const reply = message.reply_message;
    if (reply && !reply.audio && !reply.video)
      return await message.send(Lang.AVMIX_NEED_FILES);
    if (reply?.audio) {
      await stageReply(reply, audioPath);
      return await message.sendReply(Lang.AVMIX_AUDIO_ADDED);
    }
    if (reply?.video) {
      await stageReply(reply, videoPath);
      return await message.sendReply(Lang.AVMIX_VIDEO_ADDED);
    }
    if (!(await exists(audioPath)) || !(await exists(videoPath)))
      return await message.send(Lang.AVMIX_NEED_FILES);
    try {
      const video = await avMix(videoPath, audioPath);
      await message.sendReply(video, "video");
    } catch (err) {
      console.error("avmix failed:", err.message);
      await message.sendReply("_Failed to mix. Please try again._");
    } finally {
      await removeDir(dir);
    }
  },
);
Module(
  {
    pattern: "vmix ?(.*)",
    desc: "Merges/Joins two videos",
    use: "edit",
  },
  async (message, match) => {
    const dir = await stagingDir("vmix", accountKey(message.jid, message.sender));
    const files = await fs.promises.readdir(dir);
    const reply = message.reply_message;
    if ((!reply && files.length < 2) || (reply && !reply.video))
      return await message.send("Give me videos");
    if (reply?.video && files.length === 0) {
      await stageReply(reply, path.join(dir, "video1.mp4"));
      return await message.sendReply("*Added video 1*");
    }
    if (reply?.video && files.length === 1) {
      await stageReply(reply, path.join(dir, "video2.mp4"));
      return await message.sendReply(
        `*Added video 2. Type ${helpPrefix()}vmix again to process!*`,
      );
    }
    if (files.length !== 2) return;
    await message.sendReply("*Merging videos..*");
    const merged = uniqueTempPath("merged.mp4");
    try {
      await mergeVideos(
        [path.join(dir, "video1.mp4"), path.join(dir, "video2.mp4")],
        merged,
      );
      await message.send(fs.readFileSync(merged), "video");
    } catch (err) {
      console.error("vmix failed:", err.message);
      await message.sendReply("_Failed to merge the videos. Please try again._");
    } finally {
      fs.unlink(merged, () => {});
      await removeDir(dir);
    }
  },
);
Module(
  {
    pattern: "circle",
    desc: "Sticker/photo to circle crop",
    use: "edit",
  },
  async (message, match) => {
    await circle(message);
  },
);
Module(
  {
    pattern: "gif",
    desc: "Video to gif with audio",
  },
  async (message, match) => {
    if (!message.reply_message || !message.reply_message.video)
      return await message.sendReply("*Reply to a video*");
    await withDownload(message.reply_message, async (savedFile) => {
      await message.sendReply("*Rendering..*");
      await withTempFile("agif.mp4", async (out) => {
        try {
          await runFfmpeg(ffmpeg(savedFile).fps(13).videoBitrate(500), out);
        } catch (err) {
          console.error("gif failed:", err.message);
          return await message.sendReply("_Failed to render. Please try again._");
        }
        await message.client.sendMessage(message.jid, {
          video: fs.readFileSync(out),
          gifPlayback: true,
        });
      });
    });
  },
);
Module(
  {
    pattern: "interp ?(.*)",
    desc: "Increases video's frame rate (FPS)",
    use: "edit",
  },
  async (message, match) => {
    if (!message.reply_message || !message.reply_message.video)
      return await message.sendReply("*Reply to a video*");
    const fps = parseInt(match[1], 10);
    if (Number.isNaN(fps) || fps <= 10)
      return await message.send("*Low FPS Value ⚠️*\n*Minimun = 10*");
    if (fps >= 500)
      return await message.send("*High FPS Value ⚠️*\n*Maximum = 500*");
    await withDownload(message.reply_message, async (savedFile) => {
      const limit = await interpolationLimit(savedFile);
      if (limit) return await message.sendReply(limit);
      await message.sendReply("*Motion interpolating and rendering..*");
      await withTempFile("interp.mp4", async (out) => {
        try {
          await runFfmpeg(
            ffmpeg(savedFile)
              .videoFilters(`minterpolate=fps=${fps}:mi_mode=mci:me_mode=bidir`)
              .format("mp4"),
            out,
          );
        } catch (err) {
          console.error("interp failed:", err.message);
          return await message.sendReply("_Failed to render. Please try again._");
        }
        await message.send(fs.readFileSync(out), "video");
      });
    });
  },
);
Module(
  {
    pattern: "find ?(.*)",
    desc: "Finds music name using AI",
    usage: ".find reply to a music",
    use: "search",
  },
  async (message, match) => {
    if (!message.reply_message?.audio)
      return await message.sendReply("_Reply to a music_");
    if (message.reply_message.duration > 60)
      return await message.send(
        `_Audio too large! Use ${helpPrefix()}trim command and cut the audio to < 60 secs_`,
      );
    var audio = await message.reply_message.download("buffer");
    var data = await findMusic(audio);
    if (!data) return await message.sendReply("_No matching results found!_");
    const external = data.external_metadata || {};
    function getDuration(millis) {
      var minutes = Math.floor(millis / 60000);
      var seconds = ((millis % 60000) / 1000).toFixed(0);
      return minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
    }
    const Message = {
      text: `*Title:* ${data.title}\n
Artists: ${data.artists?.map((e) => e.name + " ")}\n
Released on: ${data.release_date}\n
Duration: ${getDuration(data.duration_ms)}\n
Album: ${data.album?.name}\n
Genres: ${data.genres?.map((e) => e.name + " ")}\n
Label: ${data.label}\n
Spotify: ${"spotify" in external ? "Available" : "Unavailable"}\n
YouTube: ${
        "youtube" in external
          ? "https://youtu.be/" + external.youtube.vid
          : "Unavailable"
      }\n`,
    };
    await message.client.sendMessage(message.jid, Message);
  },
);
async function rotateAndSend(message, angle) {
  await withDownload(message.reply_message, async (file) => {
    await message.send("_Processing..._");
    const rotated = await rotate(file, angle);
    try {
      await message.sendReply(fs.readFileSync(rotated), "video");
    } finally {
      fs.unlink(rotated, () => {});
    }
  });
}
Module(
  {
    pattern: "rotate ?(.*)",
    desc: "Rotates video (left/right)",
  },
  async (message, match) => {
    if (!match[1] || !message.reply_message || !message.reply_message.video)
      return await message.sendReply(
        `*Reply to a video*\n*${helpPrefix()}rotate left|right|flip*`,
      );
    var angle = "1";
    if (match[1] === "left") angle = "2";
    if (match[1] === "flip") angle = "3";
    await rotateAndSend(message, angle);
  },
);
Module(
  { pattern: "flip ?(.*)", desc: "Flips video" },
  async (message, match) => {
    if (!message.reply_message || !message.reply_message.video)
      return await message.sendReply("*Reply to a video*");
    await rotateAndSend(message, "3");
  },
);
