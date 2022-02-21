let f = require('fs')
let ff = require('fluent-ffmpeg');
let { MessageType } = require('@adiwajshing/baileys')
let e = require('../events');
let c = require('../config');
e.addCommand({ pattern: 'tag', fromMe: fm, desc: 'Tags replied message. Can be audio,video,text,image or sticker' },(async (m, text) => {
    let file = await m.client.downloadMediaMessage({key: {remoteJid: m.reply_message.jid,id: m.reply_message.id},message: m.reply_message.data.quotedMessage})
    let filen = await m.client.downloadAndSaveMediaMessage({key: {remoteJid: m.reply_message.jid,id: m.reply_message.id},message: m.reply_message.data.quotedMessage})
    var audiomsg = m.reply_message.data.quotedMessage.audioMessage;
    var stickermsg = m.reply_message.data.quotedMessage.stickerMessage;  
    var videomsg = m.reply_message.data.quotedMessage.videoMessage;  
    var imagemsg = m.reply_message.image;  
    var textmsg = m.reply_message.text;  
    var extextmsg = m.reply_message.extendedTextMessage;  
    grp = await m.client.groupMetadata(m.jid);
            var jids = [];
            mes = '';
            grp['participants'].map(async (usr) => {mes += '@' + usr.id.split('@')[0] + ' ';
            jids.push(usr.id.replace('c.us', 's.whatsapp.net'));
                }
            );
    if (audiomsg) {
        ff(filen)
        .format('mp3')
        .save('tag.mp3')
        .on('end', async () => {await m.client.sendMessage(m.jid,'tag.mp3', MessageType.audio,{contextInfo: {mentionedJid: jids}, previewType: 0});})}
    if (stickermsg) {await m.client.sendMessage(m.jid,file, MessageType.sticker,{contextInfo: {mentionedJid: jids}, previewType: 0});}
    if (videomsg) {await m.client.sendMessage(m.jid,file, MessageType.video,{contextInfo: {mentionedJid: jids}, previewType: 0});}
    if (imagemsg) {await m.client.sendMessage(m.jid,file, MessageType.image,{contextInfo: {mentionedJid: jids}, previewType: 0});}
    if (textmsg) {await m.client.sendMessage(m.jid,textmsg, MessageType.text,{contextInfo: {mentionedJid: jids}, previewType: 0});}
    if (extextmsg) {await m.client.sendMessage(m.jid,extextmsg, MessageType.extendedTextMessage,{contextInfo: {mentionedJid: jids}, previewType: 0});}
    }))
    