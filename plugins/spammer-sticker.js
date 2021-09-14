const Asena = require('../events');
const {MessageType, Mimetype} = require('@adiwajshing/baileys');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const {execFile} = require('child_process');
const cwebp = require('cwebp-bin');

const Language = require('../language');
const Lang = Language.getString('spammer');


Asena.addCommand({pattern: 'sticker spam$', fromMe: true, desc: Lang.ST_DESC }, (async (message, match) => {    

    if (!message.reply_message) return await message.client.sendMessage(message.jid,Lang.ST_NEED, MessageType.text);
    if (message.reply_message.sticker) return await message.client.sendMessage(message.jid, Lang.ST_ST, MessageType.text);

    var locspam = await message.client.downloadAndSaveMediaMessage({
        key: {
            remoteJid: message.reply_message.jid,
            id: message.reply_message.id
        },
        message: message.reply_message.data.quotedMessage
    });

    if (message.reply_message.video === false && message.reply_message.image) {
        execFile(cwebp, [locspam, '-o', 'output.webp'], async err => {
            if (err) {
                throw err;
            }
            setInterval(async () => {
                await message.sendMessage(fs.readFileSync('./output.webp'), MessageType.sticker)
            }, 200)
        });
    }

    ffmpeg(locspam)
        .outputOptions(["-y", "-vcodec libwebp", "-lossless 1", "-qscale 1", "-preset default", "-loop 0", "-an", "-vsync 0", "-s 512x512"])
        .save('sticker.webp')
        .on('end', async () => {
            setInterval(async () => {
                await message.sendMessage(fs.readFileSync('sticker.webp'), MessageType.sticker);
            }, 200)
        });
}));
