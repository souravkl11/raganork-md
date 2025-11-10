const { Module } = require("../main");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const { getTempPath, getTempSubdir } = require("../core/helpers");

const config = require("../config"),
  MODE = config.MODE;
const { getString } = require("./utils/lang");
const { avMix, circle, rotate, trim } = require("./utils");
const acrcloud = require("acrcloud");
const acr = new acrcloud({
  host: "identify-eu-west-1.acrcloud.com",
  access_key: config.ACR_A,
  access_secret: config.ACR_S,
});
var handler = config.HANDLERS !== "false" ? config.HANDLERS.split("")[0] : "";
async function findMusic(file) {
  return new Promise((resolve, reject) => {
    acr.identify(file).then((result) => {
      var data = result.metadata?.music[0];
      resolve(data);
    });
  });
}
const Lang = getString("media");
const fromMe = MODE == "public" ? false : true;
Module(
  {
    pattern: "trim ?(.*)",
    fromMe: fromMe,
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
        message.reply_message.audio ? Lang.TRIM_NEED : Lang.TRIM_VIDEO_NEED
      );
    const parts = match[1].split(",");
    const start = parts[0]?.trim();
    const end = parts[1]?.trim();
    const savedFile = await message.reply_message.download();
    await message.sendMessage("_Processing trim..._");
    if (message.reply_message.audio) {
      const out = getTempPath("trim.ogg");
      await trim(savedFile, start, end, out);
      await message.sendReply({stream: fs.createReadStream(out)}, "audio");
    } else if (message.reply_message.video) {
      const out = getTempPath("trim.mp4");
      await trim(savedFile, start, end, out);
      await message.send({stream: fs.createReadStream(out)}, "video");
    }
  }
);
Module(
  {
    pattern: "black",
    fromMe: fromMe,
    desc: "Audio to black video",
    use: "edit",
  },
  async (message, match) => {
    if (!message.reply_message || !message.reply_message.audio)
      return await message.send("_Need audio!_");

    try {
      const processingMsg = await message.sendReply(
        "_Processing audio to black video..._"
      );
      const audioFile = await message.reply_message.download();
      const outputPath = getTempPath(`black_${Date.now()}.mp4`);

      await new Promise((resolve, reject) => {
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
          .format("mp4")
          .save(outputPath)
          .on("end", resolve)
          .on("error", reject);
      });

      const videoBuffer = fs.readFileSync(outputPath);
      await message.send(videoBuffer, "video");
      await message.edit(
        "_Black video created successfully!_",
        message.jid,
        processingMsg.key
      );
      if (fs.existsSync(audioFile)) fs.unlinkSync(audioFile);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    } catch (error) {
      console.error("Black video creation error:", error);
      await message.send("_Failed to create black video. Please try again._");
    }
  }
);
Module(
  {
    pattern: "avmix",
    fromMe: fromMe,
    desc: Lang.AVMIX_DESC,
    use: "edit",
  },
  async (message, match) => {
    const avmixDir = getTempSubdir("avmix");
    let files = fs.readdirSync(avmixDir);
    if (
      (!message.reply_message && files.length < 2) ||
      (message.reply_message &&
        !message.reply_message.audio &&
        !message.reply_message.video)
    )
      return await message.send(Lang.AVMIX_NEED_FILES);
    if (message.reply_message.audio) {
      var savedFile = await message.reply_message.download();
      await fs.writeFileSync(
        getTempPath("avmix/audio.mp3"),
        fs.readFileSync(savedFile)
      );
      return await message.sendReply(Lang.AVMIX_AUDIO_ADDED);
    }
    if (message.reply_message.video) {
      var savedFile = await message.reply_message.download();
      await fs.writeFileSync(
        getTempPath("avmix/video.mp4"),
        fs.readFileSync(savedFile)
      );
      return await message.sendReply(Lang.AVMIX_VIDEO_ADDED);
    }
    if (files.length >= 2 || !message.reply_message) {
      let video = await avMix(
        getTempPath("avmix/video.mp4"),
        getTempPath("avmix/audio.mp3")
      );
      await message.sendReply(video, "video");
      await fs.unlinkSync(getTempPath("avmix/video.mp4"));
      await fs.unlinkSync(getTempPath("avmix/audio.mp3"));
      await fs.unlinkSync("./merged.mp4");
      return;
    }
  }
);
Module(
  {
    pattern: "vmix ?(.*)",
    fromMe: fromMe,
    desc: "Merges/Joins two videos",
    use: "edit",
  },
  async (message, match) => {
    const vmixDir = getTempSubdir("vmix");
    let files = fs.readdirSync(vmixDir);
    if (
      (!message.reply_message && files.length < 2) ||
      (message.reply_message && !message.reply_message.video)
    )
      return await message.send("Give me videos");
    if (message.reply_message.video && files.length == 1) {
      var savedFile = await message.reply_message.download();
      await fs.writeFileSync(
        getTempPath("vmix/video1.mp4"),
        fs.readFileSync(savedFile)
      );
      return await message.sendReply(
        "*Added video 2. Type .vmix again to process!*"
      );
    }
    if (message.reply_message.video && files.length == 0) {
      var savedFile = await message.reply_message.download();
      await fs.writeFileSync(
        getTempPath("vmix/video2.mp4"),
        fs.readFileSync(savedFile)
      );
      return await message.sendReply("*Added video 1*");
    }
    async function merge(files, folder, filename) {
      return new Promise((resolve, reject) => {
        var cmd = ffmpeg({ priority: 20 })
          .fps(29.7)
          .on("error", function (err) {
            resolve();
          })
          .on("end", function () {
            resolve(fs.readFileSync(folder + "/" + filename));
          });

        for (var i = 0; i < files.length; i++) {
          cmd.input(files[i]);
        }

        cmd.mergeToFile(folder + "/" + filename, folder);
      });
    }
    if (files.length === 2) {
      await message.sendReply("*Merging videos..*");
      await message.send(
        await merge(
          [getTempPath("vmix/video1.mp4"), getTempPath("vmix/video2.mp4")],
          getTempSubdir(""),
          "merged.mp4"
        ),
        "video"
      );
      await fs.unlinkSync(getTempPath("vmix/video1.mp4"));
      await fs.unlinkSync(getTempPath("vmix/video2.mp4"));
      return;
    }
  }
);
Module(
  {
    pattern: "slowmo",
    fromMe: fromMe,
    desc: "Video to smooth slow motion",
    use: "edit",
  },
  async (message, match) => {
    if (!message.reply_message || !message.reply_message.video)
      return await message.sendReply("*Reply to a video*");
    var savedFile = await message.reply_message.download();
    await message.sendReply("*Motion interpolating and rendering..*");
    ffmpeg(savedFile)
      .videoFilters("minterpolate=fps=120")
      .videoFilters("setpts=4*PTS")
      .noAudio()
      .format("mp4")
      .save(getTempPath("slowmo.mp4"))
      .on("end", async () => {
        return await message.send(
          fs.readFileSync(getTempPath("slowmo.mp4")),
          "video"
        );
      });
  }
);
Module(
  {
    pattern: "circle",
    fromMe: fromMe,
    desc: "Sticker/photo to circle crop",
    use: "edit",
  },
  async (message, match) => {
    await circle(message);
  }
);
Module(
  {
    pattern: "gif",
    fromMe: fromMe,
    desc: "Video to gif with audio",
  },
  async (message, match) => {
    if (!message.reply_message || !message.reply_message.video)
      return await message.sendReply("*Reply to a video*");
    var savedFile = await message.reply_message.download();
    await message.sendReply("*Rendering..*");
    ffmpeg(savedFile)
      .fps(13)
      .videoBitrate(500)
      .save(getTempPath("agif.mp4"))
      .on("end", async () => {
        return await message.client.sendMessage(message.jid, {
          video: fs.readFileSync(getTempPath("agif.mp4")),
          gifPlayback: true,
        });
      });
  }
);
Module(
  {
    pattern: "interp ?(.*)",
    fromMe: fromMe,
    desc: "Increases video's frame rate (FPS)",
    use: "edit",
  },
  async (message, match) => {
    if (!message.reply_message || !message.reply_message.video)
      return await message.sendReply("*Reply to a video*");
    if (match[1] <= 10)
      return await message.send("*Low FPS Value ⚠️*\n*Minimun = 10*");
    if (match[1] >= 500)
      return await message.send("*High FPS Value ⚠️*\n*Maximum = 500*");
    var savedFile = await message.reply_message.download();
    await message.sendReply("*Motion interpolating and rendering..*");
    ffmpeg(savedFile)
      .videoFilters(`minterpolate=fps=${match[1]}:mi_mode=mci:me_mode=bidir`)
      .format("mp4")
      .save(getTempPath("interp.mp4"))
      .on("end", async () => {
        return await message.send(
          fs.readFileSync(getTempPath("interp.mp4")),
          "video"
        );
      });
  }
);
Module(
  {
    pattern: "find ?(.*)",
    fromMe: fromMe,
    desc: "Finds music name using AI",
    usage: ".find reply to a music",
    use: "search",
  },
  async (message, match) => {
    if (!message.reply_message?.audio)
      return await message.sendReply("_Reply to a music_");
    if (message.reply_message.duration > 60)
      return await message.send(
        "_Audio too large! Use .trim command and cut the audio to < 60 secs_"
      );
    var audio = await message.reply_message.download("buffer");
    var data = await findMusic(audio);
    if (!data) return await message.sendReply("_No matching results found!_");
    var buttons = [];
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
Spotify: ${"spotify" in data.external_metadata ? "Available" : "Unavailable"}\n
YouTube: ${
        "youtube" in data.external_metadata
          ? "https://youtu.be/" + data.external_metadata.youtube.vid
          : "Unavailable"
      }\n`,
      //    footer: '🎼 Listen to full music on',
      //    buttons,
      //    headerType:1
    };
    await message.client.sendMessage(message.jid, Message);
  }
);
Module(
  {
    pattern: "rotate ?(.*)",
    fromMe: fromMe,
    desc: "Rotates video (left/right)",
  },
  async (message, match) => {
    if (!match[1] || !message.reply_message || !message.reply_message.video)
      return await message.sendReply(
        "*Reply to a video*\n*.rotate left|right|flip*"
      );
    var file = await message.reply_message.download();
    var angle = "1";
    if (match[1] === "left") angle = "2";
    if (match[1] === "flip") angle = "3";
    await message.send("_Processing..._");
    await message.sendReply(
      fs.readFileSync(await rotate(file, angle)),
      "video"
    );
  }
);
Module(
  { pattern: "flip ?(.*)", fromMe: fromMe, desc: "Flips video" },
  async (message, match) => {
    if (!message.reply_message || !message.reply_message.video)
      return await message.sendReply("*Reply to a video*");
    var file = await message.reply_message.download();
    var angle = "3";
    await message.send("_Processing..._");
    await message.sendReply(
      fs.readFileSync(await rotate(file, angle)),
      "video"
    );
  }
);
