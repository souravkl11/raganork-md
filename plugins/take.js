const {
  addExif,
  webp2mp4,
  addID3,
  getBuffer,
  uploadToImgbb,
  uploadToCatbox,
  withTempFile,
} = require("./utils");
const { fetchPublicBuffer } = require("./utils/upload");
const ffmpeg = require("fluent-ffmpeg");
const webp = require("node-webpmux");
const { runFfmpeg, loadBaileys } = require("../core/helpers");
const { findStickerAudio: stickerAudioOf, sendStickerAudio } = require("../core/session/features/new-media");
const { Module } = require("../main");
const { helpPrefix } = require("../core/plugins/registry");
const { getString } = require("./utils/lang");
const Lang = getString("take");
let config = require("../config");
let fs = require("fs");

const DEFAULT_IMAGE = "https://i.ibb.co/s98DyMMq/NL-1.png";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const removeFiles = (...files) =>
  Promise.all(files.filter(Boolean).map((f) => fs.promises.unlink(f).catch(() => {})));

// a URL typed by a user is fetched only if it is a public https address, unless the owner typed it
async function fetchImage(url, fromUser) {
  if (!fromUser) return await getBuffer(url);
  if (!/^https:\/\//i.test(url)) throw new Error(Lang.HTTPS_ONLY);
  return await fetchPublicBuffer(url, { maxBytes: MAX_IMAGE_BYTES, timeout: 30000 });
}

Module(
  {
    pattern: "take ?(.*)",
    use: "edit",
    desc: Lang.TAKE_DESC,
  },
  async (m, match) => {
    const reply = m.reply_message;
    if (!reply || (!reply.sticker && !reply.audio))
      return await m.sendReply(Lang.NEED_REPLY);
    const input = (match[1] || "").trim();

    if (reply.sticker) {
      const exif = input
        ? {
            author: input.includes(";") ? input.split(";")[1] : "",
            packname: input.includes(";") ? input.split(";")[0] : input,
            categories: config.STICKER_DATA.split(";")[2] || "😂",
            android: "https://github.com/souravkl11/raganork-md/",
            ios: "https://github.com/souravkl11/raganork-md/",
          }
        : {
            author: config.STICKER_DATA.split(";")[1] || "",
            packname: config.STICKER_DATA.split(";")[0] || "",
            categories: config.STICKER_DATA.split(";")[2] || "😂",
            android: "https://github.com/souravkl11/raganork-md/",
            ios: "https://github.com/souravkl11/raganork-md/",
          };
      const file = await reply.download();
      let out;
      try {
        out = await addExif(file, exif);
        const audio = await stickerAudioOf(reply);
        if (audio) {
          return await sendStickerAudio(m.client, m.jid, fs.readFileSync(out), audio.audioMessage, {
            emojis: reply.data.message?.stickerMessage?.emojis,
            quoted: m.quoted,
          });
        }
        return await m.client.sendMessage(
          m.jid,
          { sticker: fs.readFileSync(out) },
          { quoted: m.quoted },
        );
      } finally {
        await removeFiles(file, out !== file && out);
      }
    }

    const usingDefault = !input && config.AUDIO_DATA === "default";
    const inf = input
      ? input
      : usingDefault
        ? Lang.DEFAULT_AUDIO_DATA.format(DEFAULT_IMAGE)
        : config.AUDIO_DATA;
    if (usingDefault) {
      await m.sendReply(
        Lang.USING_DEFAULT.format(helpPrefix()),
      );
    }
    const spl = inf.split(";");
    let image;
    try {
      const botImage = config.BOT_INFO.split(";")[3];
      image = spl[2]
        ? await fetchImage(spl[2].trim(), Boolean(input) && !m.fromOwner)
        : await getBuffer(!botImage || botImage === "default" ? DEFAULT_IMAGE : botImage);
    } catch (e) {
      return await m.sendReply(Lang.THUMB_FAILED.format(e.message));
    }
    const file = await reply.download();
    let res;
    try {
      res = await addID3(
        file,
        spl[0],
        spl[1] ? spl[1] : config.AUDIO_DATA.split(";")[1],
        "Raganork Engine",
        image,
      );
    } finally {
      await removeFiles(file);
    }
    await m.client.sendMessage(
      m.jid,
      {
        audio: res,
        mimetype: "audio/mp4",
      },
      {
        quoted: m.quoted,
        ptt: false,
      },
    );
  },
);
async function isAnimatedWebp(file) {
  const img = new webp.Image();
  await img.load(file);
  return img.hasAnim;
}


async function stickerAudioToMp4({ audioMessage, key }, animated, webpPath, out) {
  const { downloadMediaMessage } = await loadBaileys();
  const audio = await downloadMediaMessage({ key, message: { audioMessage } }, "buffer", {});
  await withTempFile("sticker-audio.ogg", async (audioPath) => {
    await fs.promises.writeFile(audioPath, audio);
    const secs =
      audioMessage.seconds ||
      (await new Promise((resolve, reject) =>
        ffmpeg.ffprobe(audioPath, (err, data) => (err ? reject(err) : resolve(data.format.duration))),
      ));
    const mux = (video, inputOptions, videoOptions) =>
      runFfmpeg(
        ffmpeg()
          .input(video)
          .inputOptions(inputOptions)
          .input(audioPath)
          .outputOptions(["-map 0:v", "-map 1:a", ...videoOptions, "-c:a aac", `-t ${secs}`]),
        out,
      );
    if (!animated) {
      return mux(webpPath, ["-loop 1"], [
        "-c:v libx264",
        "-tune stillimage",
        "-pix_fmt yuv420p",
        "-vf scale=trunc(iw/2)*2:trunc(ih/2)*2",
      ]);
    }
    await withTempFile("sticker.mp4", async (video) => {
      await webp2mp4(webpPath, video);
      await mux(video, ["-stream_loop -1"], ["-c:v copy"]);
    });
  });
}

Module(
  {
    pattern: "mp4 ?(.*)",
    use: "edit",
    desc: Lang.MP4_DESC,
  },
  async (m, t) => {
    const reply = m.reply_message;
    if (!reply?.sticker)
      return await m.sendReply(Lang.NEED_ANIMATED);
    const q = await reply.download();
    try {
      await withTempFile("mp4.mp4", async (out) => {
        const audio = await stickerAudioOf(reply);
        if (audio) await stickerAudioToMp4(audio, await isAnimatedWebp(q), q, out);
        else await webp2mp4(q, out);
        await m.client.sendMessage(
          m.jid,
          { video: { url: out } },
          { quoted: m.quoted },
        );
      });
    } catch (e) {
      console.log(e);
      return await m.sendReply(Lang.FAILED);
    } finally {
      await removeFiles(q);
    }
  },
);

Module(
  {
    pattern: "url ?(.*)",
    desc: Lang.URL_DESC,
    use: "edit",
  },
  async (m, match) => {
    const reply = m.reply_message;
    const isImage = reply?.image || reply?.sticker;
    if (!isImage && !reply?.video && !reply?.document && !reply?.audio)
      return await m.sendReply(
        Lang.URL_NEED_REPLY,
      );
    const file = await reply.download();
    try {
      const result = isImage ? await uploadToImgbb(file) : await uploadToCatbox(file);
      if (!result?.url) throw new Error(result?.error || "no link returned");
      return await m.sendReply(result.url);
    } catch (e) {
      console.error("url upload failed:", e.message);
      return await m.sendReply(Lang.UPLOAD_FAILED.format(e.message));
    } finally {
      await removeFiles(file);
    }
  },
);
