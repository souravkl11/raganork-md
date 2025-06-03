const {downloadMediaMessage} = require('baileys'); 
const fs = require('fs');
const Base = require('./base');

class ReplyMessage extends Base {
    constructor(client, data) {
        super(client);
        if (data) this._patch(data);
    }

    _patch(data) {
        this.id = data.stanzaId;
        this.jid = data.participant; 
        this.remoteJid = data.remoteJid; 

        this.message = '';
        this.caption = '';
        this.url = null;
        this.mimetype = null;
        this.height = null;
        this.width = null;
        this.mediaKey = null;
        this.animated = null;
        this.duration = null;
        this.ptt = null;

        this.sticker = false;
        this.audio = false;
        this.image = false;
        this.video = false;
        this.text = null; 

        if (data.quotedMessage) {
            const quotedMsg = data.quotedMessage;

            if (quotedMsg.imageMessage) {
                this.message = quotedMsg.imageMessage.caption || ''; 
                this.caption = quotedMsg.imageMessage.caption || '';
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
            } else if (quotedMsg.videoMessage) {
                this.message = quotedMsg.videoMessage.caption || ''; 
                this.caption = quotedMsg.videoMessage.caption || '';
                this.url = quotedMsg.videoMessage.url;
                this.mimetype = quotedMsg.videoMessage.mimetype;
                this.height = quotedMsg.videoMessage.height;
                this.width = quotedMsg.videoMessage.width;
                this.mediaKey = quotedMsg.videoMessage.mediaKey;
                this.video = true;
            } else if (quotedMsg.conversation) {
                this.message = quotedMsg.conversation;
                this.text = quotedMsg.conversation;
            } else if (quotedMsg.extendedTextMessage) {
                this.message = quotedMsg.extendedTextMessage.text;
                this.text = quotedMsg.extendedTextMessage.text;
            }
        }

        this.data = {
            key: {
                "remoteJid": data.remoteJid,
                "fromMe": data.fromMe, 
                "id": data.stanzaId,
                "participant": this.jid 
            },
            message: data.quotedMessage
        };
        return super._patch(data);
    }

    async download(returnType = 'file') { 

        if (this.data.message.ptvMessage) {
            this.data.message = JSON.parse(JSON.stringify(this.data.message).replace("ptvMessage","videoMessage"));
        } 

        const buffer = await downloadMediaMessage(this.data, 'buffer');    
        if (returnType === 'buffer') return buffer;

        let filename = './temp/temp.';

        const mediaMessageType = Object.keys(this.data.message)[0];
        if (this.data.message[mediaMessageType]?.mimetype) {
            filename += this.data.message[mediaMessageType].mimetype.split("/")[1];
        } else if (this.mimetype) { 
             filename += this.mimetype.split("/")[1];
        } else {
            filename += 'bin'; 
        }

        await fs.writeFileSync(filename, buffer);
        return filename;
    }
}

module.exports = ReplyMessage;