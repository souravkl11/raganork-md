let generateWAMessageFromContent,
  generateWAMessageContent,
  proto,
  prepareWAMessageMedia,
  generateForwardMessageContent,
  getContentType,
  downloadMediaMessage;
const { loadBaileys } = require("../helpers");
const identity = require("../identity");
const baileysPromise = loadBaileys()
  .then((baileys) => {
    ({
      generateWAMessageFromContent,
      generateWAMessageContent,
      proto,
      prepareWAMessageMedia,
      generateForwardMessageContent,
      getContentType,
      downloadMediaMessage,
    } = baileys);
  })
  .catch((err) => {
    console.error("Failed to load baileys:", err.message);
  });
const Base = require("./base");
let config = require("../../config");
const ReplyMessage = require("./reply-message");
const fs = require("fs");
const { genThumb } = require("../helpers");
const { forwardMessage } = require("../session/features/forward");
const { sendStickerAudio, sendZap, isSpoiler, isZap, isStickerAudio } = require("../session/features/new-media");
const { uniqueTempPath } = require("../helpers");

class Message extends Base {
  constructor(client, data) {
    super(client);
    if (data) this._patch(data);
  }
  _patch(data) {
    this.id = data.key.id === undefined ? undefined : data.key.id;
    this.jid = data.key.remoteJid;
    this.isGroup = identity.isGroup(data.key.remoteJid);
    this.fromMe = data.key.fromMe;
    this.fromBot = data.key.id?.startsWith("3EB0");

    this.sender = identity.messageSender(data.key);

    const botNumeric = identity.botIds(this.client).lid;

    this.fromOwner = data.key.fromMe || identity.isSudo(this.sender);

    this.senderName = data.pushName;
    this.myjid = botNumeric;
    this.message =
      data.message?.extendedTextMessage?.text ??
      data.message?.conversation ??
      "";
    this.text = this.message;
    this.timestamp = data.messageTimestamp;
    this.data = data;

    this.ephemeral = this._extractEphemeralSettings(data);
    this.spoiler = isSpoiler(data.message);
    this.zap = isZap(data.message);
    this.stickerAudio = isStickerAudio(data.message);

    this.reply_message = false;
    this.quoted = false;

    const contextInfo =
      data.message?.extendedTextMessage?.contextInfo ||
      data.message?.stickerMessage?.contextInfo;

    if (contextInfo?.quotedMessage) {
      contextInfo.remoteJid = contextInfo.remoteJid || this.jid;
      this.reply_message = new ReplyMessage(this.client, contextInfo);

      const quotedParticipantJid = contextInfo.participant;
      this.quoted = {
        key: {
          remoteJid: contextInfo.remoteJid,
          fromMe: this.reply_message.fromMe,
          id: this.reply_message.id,
          participant: quotedParticipantJid,
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
        data.message.interactiveResponseMessage.contextInfo.participant.split(
          "@"
        )[0] === this.myjid;
    } else if (data.message.listResponseMessage?.singleSelectReply?.selectedRowId) {
      this.list = data.message.listResponseMessage.singleSelectReply.selectedRowId;
      this.isOwnResponse =
        data.message.listResponseMessage.contextInfo?.participant?.split("@")[0] === this.myjid;
    } else {
      this.list = null;
    }
    if (data.message.hasOwnProperty("templateButtonReplyMessage")) {
      this.button = data.message.templateButtonReplyMessage.selectedId;
    } else if (data.message.buttonsResponseMessage?.selectedButtonId) {
      this.button = data.message.buttonsResponseMessage.selectedButtonId;
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

    this.reply = this.sendReply;

    return super._patch(data);
  }

  useCaptionMedia() {
    const content = this.data.message;
    const own = ["imageMessage", "videoMessage", "documentMessage", "documentWithCaptionMessage"];
    if (this.reply_message || !own.some((k) => content?.[k])) return;
    const media = new ReplyMessage(this.client, {
      stanzaId: this.data.key.id,
      remoteJid: this.jid,
      quotedMessage: content,
    });
    media.fromMe = media.data.key.fromMe = Boolean(this.data.key.fromMe);
    media.data.key.participant = this.data.key.participant;
    media.message = media.caption = "";
    this.reply_message = media;
    this.quoted = { key: this.data.key, message: content };
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

  async react(emoji, key = this.data.key) {
    if (!emoji) throw new Error("Emoji is required for reaction.");
    return await this.client.sendMessage(key.remoteJid, {
      react: { text: emoji, key },
    });
  }

  _isGroupStatusType(type = "") {
    if (!type || typeof type !== "string") return false;
    const normalized = type.toLowerCase();
    return [
      "groupstatus",
      "group-status",
      "group_status",
      "groupstatusmessage",
      "groupstatusmessagev2",
      "gstatus",
      "gs",
    ].includes(normalized);
  }

  _buildGroupStatusPayload(content, messageOptions = {}) {
    const source =
      content &&
      typeof content === "object" &&
      !Buffer.isBuffer(content) &&
      content.groupStatusMessage
        ? content.groupStatusMessage
        : content;

    if (typeof source === "string") {
      return { text: source, ...messageOptions };
    }

    if (Buffer.isBuffer(source) || source instanceof Uint8Array) {
      const mediaType = (messageOptions.mediaType || "image").toLowerCase();
      const payload = { ...messageOptions };
      delete payload.mediaType;

      if (mediaType === "video") {
        payload.video = source;
      } else if (mediaType === "audio") {
        payload.audio = source;
      } else {
        payload.image = source;
      }
      return payload;
    }

    if (source && typeof source === "object") {
      return { ...source, ...messageOptions };
    }

    return { text: "", ...messageOptions };
  }

  async sendGroupStatus(content, options = {}) {
    await baileysPromise;

    if (!this.jid.endsWith("@g.us")) {
      throw new Error("Group status can only be sent to a group chat.");
    }

    if (
      typeof generateWAMessageFromContent !== "function" ||
      typeof generateWAMessageContent !== "function"
    ) {
      throw new Error("Baileys helpers are not ready to send group status.");
    }

    const { quoted, ...messageOptions } = options;
    const payload = this._buildGroupStatusPayload(content, messageOptions);

    if ((payload.image || payload.video) && payload.text && !payload.caption) {
      payload.caption = payload.text;
      delete payload.text;
    }

    const userJid = this.client.user?.id || this.client.user?.jid;
    const waMsgContent =
      payload.message && typeof payload.message === "object"
        ? payload.message
        : await generateWAMessageContent(payload, {
            upload: this.client.waUploadToServer,
            mediaCache: this.client.mediaCache,
            options: this.client.options,
            logger: this.client.logger,
            userJid,
            jid: this.jid,
          });

    const groupStatusContent = {
      groupStatusMessageV2: {
        message: waMsgContent.message || waMsgContent,
      },
    };

    const waMessage = generateWAMessageFromContent(
      this.jid,
      groupStatusContent,
      {
        quoted,
        userJid,
      }
    );

    await this.client.relayMessage(this.jid, waMessage.message, {
      messageId: waMessage.key.id,
    });

    return waMessage;
  }

  async revokeGroupStatus(key) {
    if (!this.jid.endsWith("@g.us")) {
      throw new Error("Group status can only be revoked in a group chat.");
    }
    // the author without a device suffix (8362502684674:84@lid -> 8362502684674@lid)
    const author = (key.participant || "").replace(/:\d+@/, "@");
    if (!author) throw new Error("Revoking a group status needs its author (key.participant).");
    const { relayGroupStatusStanza } = require("../session/features/status-stanza");
    return await relayGroupStatusStanza(
      this.client,
      this.jid,
      {
        protocolMessage: {
          key: { remoteJid: this.jid, fromMe: false, id: key.id, participant: author },
          type: 0, // REVOKE
        },
        messageContextInfo: {},
      },
      { edit: "8" }
    );
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

    const hasGroupStatusPayload =
      content &&
      typeof content === "object" &&
      !Buffer.isBuffer(content) &&
      content.groupStatusMessage;

    if (this._isGroupStatusType(type) || hasGroupStatusPayload) {
      return await this.sendGroupStatus(content, {
        ...messageOptions,
        quoted: realOptions.quoted,
      });
    }

    if (type == "text") {
      const textMessage = { text: content, ...messageOptions };
      return await this.client.sendMessage(this.jid, textMessage, realOptions);
    }
    if ((type == "image" || type == "video") && messageOptions.zap) {
      return await sendZap(this.client, this.jid, content, type, {
        caption: messageOptions.caption,
        quoted: realOptions.quoted,
        ephemeralExpiration: realOptions.ephemeralExpiration,
      });
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
        { audio: content, mimetype: "audio/mp4", ...messageOptions },
        realOptions
      );
    }
    if (type == "sticker") {
      if (messageOptions.audio) {
        const { audio, emojis } = messageOptions;
        return await sendStickerAudio(this.client, this.jid, content, audio, {
          emojis,
          quoted: realOptions.quoted,
          ephemeralExpiration: realOptions.ephemeralExpiration,
        });
      }
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

    const ext =
      this.data.message[Object.keys(this.data.message)[0]].mimetype?.split(
        "/"
      )[1];
    const filename = uniqueTempPath(`temp.${ext}`);

    if (type === "buffer") {
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

  async sendReply(content, type = "text", options = {}) {
    const optionsWithQuoted = {
      ...options,
      quoted: options.quoted || this.data,
    };
    return await this.sendMessage(content, type, optionsWithQuoted);
  }
  async edit(text = "", _jid = this.jid, _key = false) {
    return await this.client.sendMessage(_jid, {
      text,
      edit: _key,
    });
  }
  async getThumb(url) {
    return await genThumb(url);
  }

  // @deprecated
  async sendInteractiveMessage(jid, list, options) {
    return null;
  }

  // raw native-flow sender (always interactive, throws on failure)
  async sendButtonMessage(content, options = {}) {
    await baileysPromise;
    const ui = require("../ui");
    const ephemeralExpiration =
      content.ephemeralExpiration || (this.ephemeral ? this.ephemeral.expiration : null);
    const sent = await ui.sendInteractive(this.client, this.jid, content, {
      quoted: content.quoted || null,
      ephemeralExpiration,
    });
    return sent.key.id;
  }

  // list when BUTTONS is on, opts.text otherwise; quotes this message by default
  async sendList(opts, { quoted = this.data } = {}) {
    return require("../ui").sendList(this.client, this.jid, opts, { quoted });
  }

  // buttons when BUTTONS is on, opts.text otherwise; quotes this message by default
  async sendButtons(opts, { quoted = this.data } = {}) {
    return require("../ui").sendButtons(this.client, this.jid, opts, { quoted });
  }

  // @deprecated
  async forwardMessage(jid, message, options = {}) {
    return forwardMessage(this.client, jid, message, options, { legacy: true });
  }

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

  hasEphemeralMessages() {
    return this.ephemeral !== null;
  }

  getEphemeralExpiration() {
    return this.ephemeral ? this.ephemeral.expiration : null;
  }
}

module.exports = Message;
