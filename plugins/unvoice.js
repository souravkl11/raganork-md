const Asena = require('../events');
const {MessageType,Mimetype} = require('@adiwajshing/baileys');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const Config = require('../config');
const Language = require('../language');
const Lang = Language.getString('unvoice');
let sourav = Config.WORKTYPE == 'public' ? false : true

Asena.addCommand({pattern: 'unvoice', fromMe: sourav, desc: Lang.UV_DESC}, (async (message, match) => {    
    if (!message.reply_message) return;
    var location = await message.client.downloadAndSaveMediaMessage({key: {remoteJid: message.reply_message.jid,id: message.reply_message.id },message: message.reply_message.data.quotedMessage});
    ffmpeg(location)
        .format('mp3')
        .save('output.mp3')
        .on('end', async () => {
            await message.sendMessage(fs.readFileSync('output.mp3'), MessageType.audio, {mimetype: Mimetype.mp4Audio, ptt: true});});}));
