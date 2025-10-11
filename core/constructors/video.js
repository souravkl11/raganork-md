const Base = require("./base");
const Message = require("./message");
const ReplyMessage = require("./reply-message");

class Video extends Base {
  constructor(client, data) {
    super(client);
    if (data) this._patch(data);
  }

  _patch(data) {
    this.id = data.key.id;
    this.jid = data.key.remoteJid;
    this.fromMe = data.key.fromMe;
    this.sender = data.key.remoteJid.endsWith("@g.us")
      ? data.key.participant
      : data.key.remoteJid;
    this.data = data;
    this.message = data.message.videoMessage;
    this.mimetype = this.message.mimetype;
    return super._patch(data);
  }

  async sendMessage(content, type, options) {
    return await this.client.sendMessage(this.jid, content, type, options);
  }

  async sendTyping() {
    return await this.client.updatePresence(this.jid, Presence.composing);
  }

  async sendRead() {
    return await this.client.chatRead(this.jid);
  }

  async download() {
    await this.client.downloadMediaMessage(this.data, "buffer");
    return this.id + "." + this.mimetype.split("/")[1];
  }
}

module.exports = Video;
