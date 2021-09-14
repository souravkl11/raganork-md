const Asena = require('../events');
const {MessageType, Mimetype} = require('@adiwajshing/baileys');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const {execFile} = require('child_process');
const cwebp = require('cwebp-bin');
const Language = require('../language');
const Lang = Language.getString('spammer');

Asena.addCommand({pattern: 'audio spam$', fromMe: true, desc: Lang.AU_DESC}, (async (message, match) => {
    
    if (!message.reply_message) return await message.client.sendMessage(message.jid, Lang.AU_REP, MessageType.text);

    var location = await message.client.downloadAndSaveMediaMessage({
        key: {
            remoteJid: message.reply_message.jid,
            id: message.reply_message.id
        },
        message: message.reply_message.data.quotedMessage
    });

    ffmpeg(location)
        .format('mp3')
        .save('output.mp3')
        .on('end', async () => {
            setInterval(async () => {
                await message.sendMessage(fs.readFileSync('output.mp3'), MessageType.audio, {mimetype: Mimetype.mp4Audio});
            }, 200)
        });
}));
