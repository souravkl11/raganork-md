const Asena = require('../events');
const {MessageType, Mimetype} = require('@adiwajshing/baileys');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const {execFile} = require('child_process');
const cwebp = require('cwebp-bin');
const Config = require('../config');
let w = require('../config');
let v = w.SUPPORT3
let {skbuffer,sticker} = require('raganork-bot');
const Language = require('../language');
const Lang = Language.getString('sticker');

let sk = Config.WORKTYPE == 'public' ? false : true

Asena.addCommand({pattern: 'sticker$', fromMe: sk, desc: Lang.STICKER_DESC}, (async (message, match) => {    

        if (message.reply_message === false) return await message.client.sendMessage(message.jid,Lang.NEED_REPLY, MessageType.text);
        var downloading = await message.client.sendMessage(message.jid,Lang.DOWNLOADING,MessageType.text);
        var location = await message.client.downloadAndSaveMediaMessage({
            key: {
                remoteJid: message.reply_message.jid,
                id: message.reply_message.id
            },
            message: message.reply_message.data.quotedMessage
        });

        if (message.reply_message.video === false && message.reply_message.image) {
            ffmpeg(location)
                .outputOptions(["-y", "-vcodec libwebp"])
                .videoFilters('scale=2000:2000:flags=lanczos:force_original_aspect_ratio=decrease,format=rgba,pad=2000:2000:(ow-iw)/2:(oh-ih)/2:color=#00000000,setsar=1')
                .save('st.webp')
                .on('end', async () => {
                    if (w.def_st_name === 'true') {
                        var s = w.SOURAVKL11.split('|');
                        var au = s[1];
                        var p = s[0];
                        var res = await sticker('st.webp',au,p,w.take_key,v)
                        await message.client.sendMessage(message.jid,await skbuffer(res), MessageType.sticker);
                    }
                    else await message.sendMessage(fs.readFileSync('st.webp'), MessageType.sticker);
            });
        return await message.client.deleteMessage(message.jid, {id: downloading.key.id, remoteJid: message.jid, fromMe: true})

        }

        ffmpeg(location)
            .outputOptions(["-y", "-vcodec libwebp", "-lossless 1", "-qscale 1", "-preset default", "-loop 0", "-an", "-vsync 0", "-s 600x600"])
            .videoFilters('scale=600:600:flags=lanczos:force_original_aspect_ratio=decrease,format=rgba,pad=600:600:(ow-iw)/2:(oh-ih)/2:color=#00000000,setsar=1')
            .save('sticker.webp')
            .on('end', async () => {
                if (w.def_st_name === 'true') {
                    var s = w.SOURAVKL11.split('|');
                    var au = s[1];
                    var p = s[0];
                    var res = await sticker('sticker.webp',au,p,w.take_key,v)
                    await message.client.sendMessage(message.jid,await skbuffer(res), MessageType.sticker);
                }
                else await message.sendMessage(fs.readFileSync('sticker.webp'), MessageType.sticker);
            });
        return await message.client.deleteMessage(message.jid, {id: downloading.key.id, remoteJid: message.jid, fromMe: true})
    }));
