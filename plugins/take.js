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
const { Module } = require("../main");
const { helpPrefix } = require("../core/plugins/registry");
let config = require("../config");
let fs = require("fs");

const DEFAULT_IMAGE = "https://i.ibb.co/s98DyMMq/NL-1.png";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const removeFiles = (...files) =>
  Promise.all(files.filter(Boolean).map((f) => fs.promises.unlink(f).catch(() => {})));

// a URL typed by a user is fetched only if it is a public https address, unless the owner typed it
async function fetchImage(url, fromUser) {
  if (!fromUser) return await getBuffer(url);
  if (!/^https:\/\//i.test(url)) throw new Error("Only https image URLs are accepted");
  return await fetchPublicBuffer(url, { maxBytes: MAX_IMAGE_BYTES, timeout: 30000 });
}

Module(
  {
    pattern: "take ?(.*)",
    use: "edit",
    desc: "Changes sticker/audio pack & author name. Title, artist, thumbnail etc.",
  },
  async (m, match) => {
    const reply = m.reply_message;
    if (!reply || (!reply.sticker && !reply.audio))
      return await m.sendReply("_Reply to an audio or a sticker_");
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
        ? `Ryzn- Audio title here;Raganork - Artist;${DEFAULT_IMAGE}`
        : config.AUDIO_DATA;
    if (usingDefault) {
      await m.sendReply(
        `_Using default audio metadata, use ${helpPrefix()}setvar AUDIO_DATA=title;artist;imageurl to change_`,
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
      return await m.sendReply(`_Could not fetch the thumbnail: ${e.message}_`);
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
Module(
  {
    pattern: "mp4 ?(.*)",
    use: "edit",
    desc: "Converts animated sticker to video",
  },
  async (m, t) => {
    if (!m.reply_message?.sticker)
      return await m.sendReply("_Reply to an animated sticker!_");
    const q = await m.reply_message.download();
    try {
      await withTempFile("mp4.mp4", async (out) => {
        await webp2mp4(q, out);
        await m.client.sendMessage(
          m.jid,
          { video: { url: out } },
          { quoted: m.quoted },
        );
      });
    } catch (e) {
      console.log(e);
      return await m.sendReply("*Failed*");
    } finally {
      await removeFiles(q);
    }
  },
);

Module(
  {
    pattern: "url ?(.*)",
    desc: "Uploads image to imgbb and sends a url",
    use: "edit",
  },
  async (m, match) => {
    const reply = m.reply_message;
    const isImage = reply?.image || reply?.sticker;
    if (!isImage && !reply?.video && !reply?.document && !reply?.audio)
      return await m.sendReply(
        "_Reply to an image, sticker, video, audio or document to get a link_",
      );
    const file = await reply.download();
    try {
      const result = isImage ? await uploadToImgbb(file) : await uploadToCatbox(file);
      if (!result?.url) throw new Error(result?.error || "no link returned");
      return await m.sendReply(result.url);
    } catch (e) {
      console.error("url upload failed:", e.message);
      return await m.sendReply(`_Upload failed: ${e.message}_`);
    } finally {
      await removeFiles(file);
    }
  },
);
