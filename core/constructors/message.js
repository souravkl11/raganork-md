let generateWAMessageFromContent,
  proto,
  prepareWAMessageMedia,
  generateForwardMessageContent,
  getContentType,
  downloadMediaMessage;
const { loadBaileys } = require("../helpers");
const baileysPromise = loadBaileys()
  .then((baileys) => {
    ({
      generateWAMessageFromContent,
      proto,
      prepareWAMessageMedia,
      generateForwardMessageContent,
      getContentType,
      downloadMediaMessage,
    } = baileys);
  })
  .catch((err) => {
    console.error("Failed to load baileys:", err.message);
    process.exit(1);
  });
const Base = require("./base");
let config = require("../../config");
const ReplyMessage = require("./reply-message");
const fs = require("fs");
const {
  isLid,
  isJid,
  getBotId,
  getBotJid,
  getBotLid,
  getBotNumericId,
  getNumericId,
  isSudo,
  isFromOwner,
  isPrivateMessage,
  isLidParticipant,
} = require("../../plugins/utils/lid-helper");

const { genThumb } = require("../helpers");

class Message extends Base {
  constructor(client, data) {
    super(client);
    if (data) this._patch(data);
  }
  _patch(data) {
    this.id = data.key.id === undefined ? undefined : data.key.id;
    this.jid = data.key.remoteJid;
    this.isGroup = data.key.remoteJid.endsWith("@g.us");
    this.fromMe = data.key.fromMe;
    this.isLid = this.isGroup && isLid(data.key.participant);
    this.sender = this.isGroup ? data.key.participant : data.key.remoteJid;
    this.fromOwner = isFromOwner(data, this.client, config.SUDO);
    this.senderName = data.pushName;
    this.myjid = getBotNumericId(data, this.client);
    this.message =
      (data.message?.extendedTextMessage === null
        ? data.message?.conversation
        : data.message?.extendedTextMessage?.text) || "";
    this.text = this.message;
    this.timestamp = data.messageTimestamp;
    this.data = data;

    this.ephemeral = this._extractEphemeralSettings(data);

    this.reply_message = false;
    this.quoted = false;

    const contextInfo =
      data.message?.extendedTextMessage?.contextInfo ||
      data.message?.stickerMessage?.contextInfo;

    if (contextInfo?.quotedMessage) {
      contextInfo.remoteJid = contextInfo.remoteJid || this.jid;
      this.reply_message = new ReplyMessage(this.client, contextInfo);
      this.quoted = {
        key: {
          remoteJid: contextInfo.remoteJid,
          fromMe:
            contextInfo.participant === getBotJid(this.client) ||
            contextInfo.participant === getBotLid(this.client),
          id: this.reply_message.id,
          participant: contextInfo.participant,
        },
        message: this.reply_message.data.message,
      };
    }
    if (data.message.hasOwnProperty("interactiveResponseMessage")) {
      this.list = JSON.parse(
        data.message.interactiveResponseMessage.nativeFlowResponseMessage
          .paramsJson
      ).id;
      this.isOwnResponse =
        data.message.interactiveResponseMessage?.contextInfo?.participant &&
        getNumericId(
          data.message.interactiveResponseMessage.contextInfo.participant
        ) === this.myjid;
    } else {
      this.list = null;
    }
    if (data.message.hasOwnProperty("templateButtonReplyMessage")) {
      this.button = data.message.templateButtonReplyMessage.selectedId;
    } else {
      this.button = null;
    }
    if (data.hasOwnProperty("messageStubType")) {
      this.update = data.messageStubType;
      this.participant = data.messageStubParameters;
    } else {
      this.update = null;
    }
    if (
      data.message.hasOwnProperty("extendedTextMessage") &&
      data.message.extendedTextMessage.hasOwnProperty("contextInfo") === true &&
      data.message.extendedTextMessage.contextInfo.hasOwnProperty(
        "mentionedJid"
      )
    ) {
      this.mention = data.message.extendedTextMessage.contextInfo.mentionedJid;
    } else {
      this.mention = null;
    }

    return super._patch(data);
  }

  _extractEphemeralSettings(data) {
    const contextInfo =
      data.message?.extendedTextMessage?.contextInfo ||
      data.message?.conversation?.contextInfo ||
      data.message?.imageMessage?.contextInfo ||
      data.message?.videoMessage?.contextInfo ||
      data.message?.audioMessage?.contextInfo ||
      data.message?.documentMessage?.contextInfo ||
      data.message?.stickerMessage?.contextInfo;

    if (contextInfo && contextInfo.expiration) {
      return {
        expiration: contextInfo.expiration,
        ephemeralSettingTimestamp: contextInfo.ephemeralSettingTimestamp,
        disappearingMode: contextInfo.disappearingMode,
      };
    }
    return null;
  }

  async sendMessage(content, type = "text", options = {}) {
    const { ephemeralExpiration, quoted, ...messageOptions } = options;

    const realOptions = {};
    if (this.ephemeral && !ephemeralExpiration) {
      realOptions.ephemeralExpiration = this.ephemeral.expiration;
    } else if (ephemeralExpiration) {
      realOptions.ephemeralExpiration = ephemeralExpiration;
    }
    if (quoted) {
      realOptions.quoted = quoted;
    }

    if (type == "text") {
      const textMessage = { text: content, ...messageOptions };
      return await this.client.sendMessage(this.jid, textMessage, realOptions);
    }
    if (type == "image") {
      const { thumbnail, ...otherOptions } = messageOptions;
      const imageMessage = { image: content, ...otherOptions };

      if (thumbnail) {
        const thumbBuffer = await genThumb(thumbnail);
        imageMessage.jpegThumbnail = thumbBuffer;
      }

      return await this.client.sendMessage(this.jid, imageMessage, realOptions);
    }
    if (type == "video") {
      const { thumbnail, ...otherOptions } = messageOptions;
      let msgContent = { video: content, ...otherOptions };
      if (thumbnail) {
        const thumbBuffer = await genThumb(thumbnail);
        msgContent.jpegThumbnail = thumbBuffer;
      }
      return await this.client.sendMessage(this.jid, msgContent, realOptions);
    }
    if (type == "audio") {
      if (messageOptions.ptt) {
        try {
          const { toBuffer, convertToOgg } = require("../helpers");
          const inputBuffer = await toBuffer(content);
          let oggBuffer = null;
          if (inputBuffer) {
            try {
              oggBuffer = await convertToOgg(inputBuffer);
            } catch (e) {
              console.error(
                "PTT conversion failed, falling back to original content:",
                e
              );
            }
          }

          if (oggBuffer && Buffer.isBuffer(oggBuffer)) {
            return await this.client.sendMessage(
              this.jid,
              {
                audio: oggBuffer,
                mimetype: "audio/ogg; codecs=opus",
                ptt: true,
                ...messageOptions,
              },
              realOptions
            );
          }
          return await this.client.sendMessage(
            this.jid,
            {
              audio: content,
              mimetype: "audio/ogg",
              ptt: true,
              ...messageOptions,
            },
            realOptions
          );
        } catch (err) {
          console.error("Error preparing ptt audio:", err);
          return await this.client.sendMessage(
            this.jid,
            { audio: content, mimetype: "audio/ogg", ...messageOptions },
            realOptions
          );
        }
      }

      return await this.client.sendMessage(
        this.jid,
        { audio: content, mimetype: "audio/ogg", ...messageOptions },
        realOptions
      );
    }
    if (type == "sticker") {
      return await this.client.sendMessage(
        this.jid,
        { sticker: content, ...messageOptions },
        realOptions
      );
    }
    if (type == "document") {
      const { fileName, mimetype, ...otherOptions } = messageOptions;
      const documentMessage = {
        document: content,
        fileName: fileName || "document",
        mimetype: mimetype || "application/octet-stream",
        ...otherOptions,
      };

      return await this.client.sendMessage(
        this.jid,
        documentMessage,
        realOptions
      );
    }
  }
  async send(content, type = "text", options = {}) {
    return await this.sendMessage(content, type, options);
  }

  async download(type = "file") {
    if (this.data.message.ptvMessage)
      this.data.message = JSON.parse(
        JSON.stringify(this.data.message).replace("ptvMessage", "videoMessage")
      );
    const buffer = await downloadMediaMessage(this.data, "buffer");
    if (type === "buffer") return buffer;
    var filename =
      "./temp/temp." +
      this.data.message[Object.keys(this.data.message)[0]].mimetype?.split(
        "/"
      )[1];
    await fs.writeFileSync(filename, buffer);
    return filename;
  }

  async sendReply(content, type = "text", options = {}) {
    const { ephemeralExpiration, quoted, ...messageOptions } = options;

    const realOptions = { quoted: quoted || this.data };
    if (this.ephemeral && !ephemeralExpiration) {
      realOptions.ephemeralExpiration = this.ephemeral.expiration;
    } else if (ephemeralExpiration) {
      realOptions.ephemeralExpiration = ephemeralExpiration;
    }

    if (type == "text") {
      return await this.client.sendMessage(
        this.jid,
        { text: content, ...messageOptions },
        realOptions
      );
    }
    if (type == "image") {
      const { thumbnail, ...otherOptions } = messageOptions;
      const imageMessage = { image: content, ...otherOptions };

      if (thumbnail) {
        const thumbBuffer = await genThumb(thumbnail);
        imageMessage.jpegThumbnail = thumbBuffer;
      }

      return await this.client.sendMessage(this.jid, imageMessage, realOptions);
    }
    if (type == "video") {
      const { thumbnail, ...otherOptions } = messageOptions;
      const messageContent = { video: content, ...otherOptions };

      if (thumbnail) {
        const thumbBuffer = await genThumb(thumbnail);
        messageContent.jpegThumbnail = thumbBuffer;
      }

      return await this.client.sendMessage(
        this.jid,
        messageContent,
        realOptions
      );
    }
    if (type == "audio") {
      return await this.client.sendMessage(
        this.jid,
        { audio: content, mimetype: "audio/mp4", ...messageOptions },
        realOptions
      );
    }
    if (type == "sticker") {
      return await this.client.sendMessage(
        this.jid,
        { sticker: content, ...messageOptions },
        realOptions
      );
    }
  }
  async reply(content, type = "text") {
    const options = this.ephemeral
      ? { quoted: this.data, ephemeralExpiration: this.ephemeral.expiration }
      : { quoted: this.data };

    if (type == "text") {
      return await this.client.sendMessage(
        this.jid,
        { text: content },
        options
      );
    }
    if (type == "image") {
      return await this.client.sendMessage(
        this.jid,
        { image: content },
        options
      );
    }
    if (type == "video") {
      return await this.client.sendMessage(
        this.jid,
        { video: content },
        options
      );
    }
    if (type == "audio") {
      return await this.client.sendMessage(
        this.jid,
        { audio: content, mimetype: "audio/mp4", ...options },
        options
      );
    }
    if (type == "sticker") {
      return await this.client.sendMessage(
        this.jid,
        { sticker: content },
        options
      );
    }
  }
  async edit(text = "", _jid = false, _key = false) {
    return await this.client.relayMessage(
      _jid || this.jid,
      {
        protocolMessage: {
          key: _key,
          type: 14,
          editedMessage: {
            conversation: text,
          },
        },
      },
      {}
    );
  }

  async getThumb(url) {
    return await genThumb(url);
  }
  async sendInteractiveMessage(jid, list, options) {
    if (!jid.includes("@")) throw "Invalid JID";
    let media;
    if (options.image) {
      media = await prepareWAMessageMedia(
        { image: options.image },
        { upload: this.client.waUploadToServer }
      );
    }
    if (options.video) {
      media = await prepareWAMessageMedia(
        { video: options.video },
        { upload: this.client.waUploadToServer }
      );
    }
    let buttons = [
      {
        name: list.type,
        buttonParamsJson: JSON.stringify(list.body),
      },
    ];
    if (list.type == "quick_reply") {
      buttons = list.body;
    }
    const msg = generateWAMessageFromContent(
      jid,
      {
        viewOnceMessage: {
          message: {
            messageContextInfo: {
              deviceListMetadata: {},
              deviceListMetadataVersion: 2,
            },
            interactiveMessage: proto.Message.InteractiveMessage.create({
              body: proto.Message.InteractiveMessage.Body.create({
                text: list.head.subtitle,
              }),
              footer: proto.Message.InteractiveMessage.Footer.create({
                text: list.head.footer,
              }),
              header: proto.Message.InteractiveMessage.Header.create({
                ...media,
                title: list.head.title,
                subtitle: list.head.subtitle,
                hasMediaAttachment: false,
              }),
              nativeFlowMessage:
                proto.Message.InteractiveMessage.NativeFlowMessage.create({
                  buttons: buttons.map((button) => ({
                    name: button.name,
                    buttonParamsJson: button.buttonParamsJson,
                  })),
                }),
            }),
          },
        },
      },
      {}
    );

    await this.client.relayMessage(jid, msg.message, {
      messageId: msg.key.id,
    });
  }
  async forwardMessage(jid, message, options = {}) {
    let vtype;
    let mtype = getContentType(message.message);
    if (options.readViewOnce) {
      message.message =
        message.message &&
        message.message.ephemeralMessage &&
        message.message.ephemeralMessage.message
          ? message.message.ephemeralMessage.message
          : message.message || undefined;
      vtype = Object.keys(message.message.viewOnceMessage.message)[0];
      delete (message.message && message.message.ignore
        ? message.message.ignore
        : message.message || undefined);
      delete message.message.viewOnceMessage.message[vtype].viewOnce;
      message.message = {
        ...message.message.viewOnceMessage.message,
      };
    }

    if (options.mentions) {
      message.message[mtype].contextInfo.mentionedJid = options.mentions;
    }
    let content = generateForwardMessageContent(message, false);
    let content_type = getContentType(content);
    if (options.ptt) {
      content[content_type].ptt = options.ptt;
    }
    if (options.audiowave) {
      content[content_type].waveform = options.audiowave;
    }
    if (options.seconds) {
      content[content_type].seconds = options.seconds;
    }
    if (options.fileLength) {
      content[content_type].fileLength = options.fileLength;
    }
    if (options.caption) {
      content[content_type].caption = options.caption;
    }
    if (options.contextInfo) {
      content[content_type].contextInfo = options.contextInfo;
    }
    if (options.mentions) {
      content[content_type].contextInfo.mentionedJid = options.mentions;
    }
    let context = {};
    if (mtype != "conversation") context = message.message[mtype].contextInfo;
    content[content_type].contextInfo = {
      ...context,
      ...content[content_type].contextInfo,
    };
    var waMessage = generateWAMessageFromContent(
      jid,
      content,
      options
        ? {
            ...content[content_type],
            ...options,
            ...(options.contextInfo
              ? {
                  contextInfo: {
                    ...content[content_type].contextInfo,
                    ...options.contextInfo,
                  },
                }
              : {}),
          }
        : {}
    );
    await this.client.relayMessage(jid, waMessage.message, {
      messageId: waMessage.key.id,
    });
    return waMessage;
  }

  /**
   * Set ephemeral expiration for messages
   * @param {number} expiration - Expiration time in seconds (e.g., 604800 for 7 days)
   */
  setEphemeral(expiration) {
    this.ephemeral = {
      expiration: expiration,
      ephemeralSettingTimestamp: Math.floor(Date.now() / 1000).toString(),
      disappearingMode: {
        initiator: "CHANGED_IN_CHAT",
        trigger: "CHAT_SETTING",
        initiatedByMe: true,
      },
    };
  }

  /**
   * Check if the current chat has disappearing messages enabled
   * @returns {boolean}
   */
  hasEphemeralMessages() {
    return this.ephemeral !== null;
  }

  /**
   * Get ephemeral expiration time
   * @returns {number|null} - Expiration time in seconds or null if not set
   */
  getEphemeralExpiration() {
    return this.ephemeral ? this.ephemeral.expiration : null;
  }
}

module.exports = Message;
