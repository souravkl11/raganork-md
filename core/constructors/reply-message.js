let downloadMediaMessage;

const { loadBaileys } = require("../helpers");

const baileysPromise = loadBaileys()
  .then((baileys) => {
    ({ downloadMediaMessage } = baileys);
  })
  .catch((err) => {
    console.error("Failed to load baileys:", err.message);
    process.exit(1);
  });
const fs = require("fs");
const Base = require("./base");
const { getTempPath } = require("../helpers");

class ReplyMessage extends Base {
  constructor(client, data) {
    super(client);
    if (data) this._patch(data);
  }

  _patch(data) {
    this.id = data.stanzaId;
    this.jid = data.participant;
    this.remoteJid = data.remoteJid;

    this.message = "";
    this.caption = "";
    this.url = null;
    this.mimetype = null;
    this.height = null;
    this.width = null;
    this.mediaKey = null;
    this.animated = null;
    this.duration = null;
    this.ptt = null;
    this.fromMe = null;
    this.sticker = false;
    this.audio = false;
    this.image = false;
    this.video = false;
    this.text = null;
    this.album = false;

    if (data.quotedMessage) {
      if (data.quotedMessage.documentWithCaptionMessage)
        data.quotedMessage.documentMessage =
          data.quotedMessage.documentWithCaptionMessage.message.documentMessage;
      const quotedMsg = data.quotedMessage;
      this.fromMe =
        (data.participant?.includes("lid") &&
          data.participant?.startsWith(this.client.user.lid.split(":")[0])) ||
        (data.participant?.includes("s.whatsapp.net") &&
          data.participant?.startsWith(this.client.user.id.split(":")[0]));
      if (quotedMsg.imageMessage) {
        this.message = quotedMsg.imageMessage.caption || "";
        this.caption = quotedMsg.imageMessage.caption || "";
        this.url = quotedMsg.imageMessage.url;
        this.mimetype = quotedMsg.imageMessage.mimetype;
        this.height = quotedMsg.imageMessage.height;
        this.width = quotedMsg.imageMessage.width;
        this.mediaKey = quotedMsg.imageMessage.mediaKey;
        this.image = true;
      } else if (quotedMsg.stickerMessage) {
        this.animated = quotedMsg.stickerMessage.isAnimated;
        this.sticker = true;
      } else if (quotedMsg.audioMessage) {
        this.duration = quotedMsg.audioMessage.duration;
        this.ptt = quotedMsg.audioMessage.ptt;
        this.mimetype = quotedMsg.audioMessage.mimetype;
        this.mediaKey = quotedMsg.audioMessage.mediaKey;
        this.url = quotedMsg.audioMessage.url;
        this.audio = true;
      } else if (quotedMsg.documentMessage) {
        this.message = quotedMsg.documentMessage.caption || "";
        this.caption = quotedMsg.documentMessage.caption || "";
        this.url = quotedMsg.documentMessage.url;
        this.mimetype = quotedMsg.documentMessage.mimetype || "";
        this.fileName = quotedMsg.documentMessage.fileName || "";
        this.height = quotedMsg.documentMessage.height;
        this.width = quotedMsg.documentMessage.width;
        this.mediaKey = quotedMsg.documentMessage.mediaKey;
        this.document = true;
      } else if (quotedMsg.videoMessage) {
        this.message = quotedMsg.videoMessage.caption || "";
        this.caption = quotedMsg.videoMessage.caption || "";
        this.url = quotedMsg.videoMessage.url;
        this.mimetype = quotedMsg.videoMessage.mimetype;
        this.height = quotedMsg.videoMessage.height;
        this.width = quotedMsg.videoMessage.width;
        this.mediaKey = quotedMsg.videoMessage.mediaKey;
        this.video = true;
      } else if (quotedMsg.albumMessage) {
        this.album = true;
      } else if (quotedMsg.conversation) {
        this.message = quotedMsg.conversation;
        this.text = quotedMsg.conversation || "";
      } else if (quotedMsg.extendedTextMessage) {
        this.message = quotedMsg.extendedTextMessage.text;
        this.text = quotedMsg.extendedTextMessage.text || "";
      }
    }
    this.data = {
      key: {
        remoteJid: data.remoteJid,
        fromMe: this.fromMe,
        id: data.stanzaId,
        participant: this.jid,
      },
      message: data.quotedMessage,
    };
    return super._patch(data);
  }

  async download(returnType = "file") {
    if (this.album) {
      const albumData = await this.client.getAlbumMessages(this.id);
      const result = {
        images: [],
        videos: [],
        complete: albumData.complete,
      };

      for (const imgMsg of albumData.images) {
        const msgData = {
          key: imgMsg.key,
          message: imgMsg.message,
        };
        try {
          if (returnType === "stream") {
            const stream = await downloadMediaMessage(msgData, "stream");
            result.images.push(stream);
          } else {
            const ext =
              imgMsg.message.imageMessage?.mimetype?.split("/")[1] || "jpg";
            const filename = getTempPath(`album_img_${imgMsg.key.id}.${ext}`);
            const stream = await downloadMediaMessage(msgData, "stream");
            const writeStream = fs.createWriteStream(filename);
            stream.pipe(writeStream);
            await new Promise((resolve, reject) => {
              writeStream.on("finish", resolve);
              writeStream.on("error", reject);
            });
            result.images.push(filename);
          }
        } catch (err) {
          console.error("Failed to download album image:", err);
        }
      }

      for (const vidMsg of albumData.videos) {
        const msgData = {
          key: vidMsg.key,
          message: vidMsg.message,
        };
        try {
          if (returnType === "stream") {
            const stream = await downloadMediaMessage(msgData, "stream");
            result.videos.push(stream);
          } else {
            const ext =
              vidMsg.message.videoMessage?.mimetype?.split("/")[1] || "mp4";
            const filename = getTempPath(`album_vid_${vidMsg.key.id}.${ext}`);
            const stream = await downloadMediaMessage(msgData, "stream");
            const writeStream = fs.createWriteStream(filename);
            stream.pipe(writeStream);
            await new Promise((resolve, reject) => {
              writeStream.on("finish", resolve);
              writeStream.on("error", reject);
            });
            result.videos.push(filename);
          }
        } catch (err) {
          console.error("Failed to download album video:", err);
        }
      }

      return result;
    }

    if (this.data.message.ptvMessage) {
      this.data.message = JSON.parse(
        JSON.stringify(this.data.message).replace("ptvMessage", "videoMessage")
      );
    }

    let ext = "bin";
    const mediaMessageType = Object.keys(this.data.message)[0];
    if (this.data.message[mediaMessageType]?.mimetype) {
      ext = this.data.message[mediaMessageType].mimetype.split("/")[1];
    } else if (this.mimetype) {
      ext = this.mimetype.split("/")[1];
    }

    const filename = getTempPath(`temp.${ext}`);

    if (returnType === "buffer") {
      const buffer = await downloadMediaMessage(this.data, "buffer");
      return buffer;
    } else {
      const stream = await downloadMediaMessage(this.data, "stream");
      const writeStream = fs.createWriteStream(filename);
      stream.pipe(writeStream);
      await new Promise((resolve, reject) => {
        writeStream.on("finish", resolve);
        writeStream.on("error", reject);
      });
      return filename;
    }
  }
}

module.exports = ReplyMessage;
