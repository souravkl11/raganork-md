/* (c) souravkl11/raganork
You may not use this file except compliance with license!*/
let e = require('../events');
let { MessageType, Mimetype } = require('@adiwajshing/baileys');
let w = require('../config');
let v = w.SUPPORT3
let i = require('raganork-bot');
let a = w.WORKTYPE == 'public' ? false : true;
let ffmpeg = require('fluent-ffmpeg');
const h = require('heroku-client');
const he = new h({token: w.HEROKU.API_KEY});
let ur = '/apps/' + w.HEROKU.APP_NAME;
e.addCommand({pattern: 'take ?(.*)', fromMe: a, desc:'Changes sticker/audio pack & author name. Title, artist, thumbnail etc.'}, (async (m, match) => { 
if (!m.reply_message.data.quotedMessage) return await m.sendMessage('_Reply to an audio or a sticker_')
var audiomsg = m.reply_message.data.quotedMessage.audioMessage;
var stickermsg = m.reply_message.data.quotedMessage.stickerMessage;
var q = await m.client.downloadAndSaveMediaMessage({key: {remoteJid: m.reply_message.jid,id: m.reply_message.id},message: m.reply_message.data.quotedMessage});
if (stickermsg) {
var s = w.SOURAVKL11.split('|');
var au = s[1];
var p = s[0];
if (!w.take_key) return await m.sendMessage('_No API key given! Get your key from https://api.imgbb.com/ and add setvar TAKE_KEY:key_')
var res = await i.query.sticker(q,au,p,w.take_key,v)
await m.client.sendMessage(m.jid, await i.query.skbuffer(res),MessageType.sticker,{quoted:m.data});
} 
if (!stickermsg && audiomsg) {
ffmpeg(q)
.save('info.mp3')
.on('end', async () => {
var spl = w.AUDIO_DATA.split(';')
        var res = await i.query.addInfo('info.mp3',spl[0],spl[1],'Raganork Engine', await i.query.skbuffer(spl[2]),w.SESSION)
        await m.client.sendMessage(m.jid, res, MessageType.audio, {quoted:m.data,mimetype: Mimetype.mp4Audio, ptt: false});
    });
    
}
if (!audiomsg && !stickermsg) return await m.client.sendMessage(m.jid,'_Reply to an audio or a sticker_',MessageType.text,{quoted: m.data})
}));
e.addCommand({pattern: 'wm ?(.*)', fromMe: a, desc:'Sets sticker pack & author name with given ones.'}, (async (m, t) => { 
var q = await m.client.downloadAndSaveMediaMessage({key: {remoteJid: m.reply_message.jid,id: m.reply_message.id},message: m.reply_message.data.quotedMessage});
var au,p;
if (t[1].includes('|')) {
var s = t[1].split('|');
au = s[1];
p = s[0];}
else {
p = t[1]}
var res = await i.query.sticker(q,au,p,w.take_key,v)
await m.client.sendMessage(m.jid, await i.query.skbuffer(res),MessageType.sticker,{quoted:m.data});}));
e.addCommand({pattern: 'crop ?(.*)', fromMe: a, desc:'Crops sticker'}, (async (m, t) => { 
var q = await m.client.downloadAndSaveMediaMessage({key: {remoteJid: m.reply_message.jid,id: m.reply_message.id},message: m.reply_message.data.quotedMessage});
var au,p;
var s = w.SOURAVKL11.split('|');
var au = s[1];
var p = s[0];
var res = await i.query.stickercrop(q,au,p,v)
await m.client.sendMessage(m.jid, await i.query.skbuffer(res),MessageType.sticker,{quoted:m.data});}));
e.addCommand({ pattern: 'setexif ?(.*)', fromMe: true}, (async (m, qu) => {
if (!qu[1]) {return await m.client.sendMessage(m.jid,'_Need some data \n Example: \n .setexif Name|Author_',MessageType.text,{quoted:m.data})}
await m.client.sendMessage(m.jid, '_Added new exif!_',MessageType.text,{quoted:m.data});
await he.patch(ur + '/config-vars', { body: {['STICKER_DATA']: qu[1]}});}));
e.addCommand({ pattern: 'audinfo ?(.*)', fromMe: true}, (async (m, qu) => {
if (!qu[1]) {return await m.client.sendMessage(m.jid,'_Need some data like: *.audinfo Title;Artist;Imagelink*_',MessageType.text,{quoted:m.data})}
await m.client.sendMessage(m.jid, '_Added new audio info!_',MessageType.text,{quoted:m.data});
await he.patch(ur + '/config-vars', { body: {['AUDIO_DATA']: qu[1]}});}));
        
