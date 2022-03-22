/* (c) souravkl11/raganork
You may not use this file except compliance with license!*/
let {addCommand} = require('../events');
let { MessageType, Mimetype } = require('@adiwajshing/baileys');
let w = require('../config');
let {SESSION,take_key} = require('../config');
let v = w.SUPPORT3
let {addInfo,skbuffer,sticker,stickercrop,webp2mp4} = require('raganork-bot');
let a = w.WORKTYPE == 'public' ? false : true;
let ffmpeg = require('fluent-ffmpeg');
const h = require('heroku-client');
const he = new h({token: w.HEROKU.API_KEY});
let ur = '/apps/' + w.HEROKU.APP_NAME;
addCommand({pattern: 'take ?(.*)', fromMe: a, desc:'Changes sticker/audio pack & author name. Title, artist, thumbnail etc.'}, (async (m, match) => { 
if (!m.reply_message.data.quotedMessage) return await m.sendMessage('_Reply to an audio or a sticker_')
var audiomsg = m.reply_message.data.quotedMessage.audioMessage;
var stickermsg = m.reply_message.data.quotedMessage.stickerMessage;
var q = await m.client.downloadAndSaveMediaMessage({key: {remoteJid: m.reply_message.jid,id: m.reply_message.id},message: m.reply_message.data.quotedMessage});
if (stickermsg) {
let inf = match[1] ? match[1] : w.SOURAVKL11        
var s = inf.split('|');
var au = s[1] ? s[1] : w.SOURAVKL11.split('|')[1]
var p =  s[0] ? s[0] : w.SOURAVKL11.split('|')[0]
if (!w.take_key) return await m.sendMessage('_No API key given! Get your key from https://api.imgbb.com/ and add setvar TAKE_KEY:key_')
var res = await sticker(q,au,p,w.take_key,v)
await m.client.sendMessage(m.jid, await skbuffer(res),MessageType.sticker,{quoted:m.data});
} 
if (!stickermsg && audiomsg) {
ffmpeg(q)
.save('info.mp3')
.on('end', async () => {
let inf = match[1] ? match[1] : w.AUDIO_DATA        
var spl = inf.split(';')
let im = spl[2].startsWith('http') ? spl[2] : w.LOGOSK
let tit = spl[0] ? spl[0] : w.AUDIO_DATA.split(';')[0]
let auth = spl[1] ? spl[1] : w.AUDIO_DATA.split(';')[1]
var res = await addInfo('info.mp3',tit,auth,'Raganork Engine', await skbuffer(im),w.SESSION)
await m.client.sendMessage(m.jid, res, MessageType.audio, {quoted:m.data,mimetype: Mimetype.mp4Audio, ptt: false});});}
if (!audiomsg && !stickermsg) return await m.client.sendMessage(m.jid,'_Reply to an audio or a sticker_',MessageType.text,{quoted: m.data})}));
addCommand({pattern: 'wm ?(.*)', fromMe: a, desc:'Sets sticker pack & author name with given ones.'}, (async (m, t) => { 
var q = await m.client.downloadAndSaveMediaMessage({key: {remoteJid: m.reply_message.jid,id: m.reply_message.id},message: m.reply_message.data.quotedMessage});
var au,p;
if (t[1].includes('|')) {
var s = t[1].split('|');
au = s[1];
p = s[0];}
else {p = t[1]}
var res = await sticker(q,au,p,w.take_key,v)
await m.client.sendMessage(m.jid, await skbuffer(res),MessageType.sticker,{quoted:m.data});}));
addCommand({pattern: 'crop ?(.*)', fromMe: a, desc:'Crops sticker'}, (async (m, t) => { 
var q = await m.client.downloadAndSaveMediaMessage({key: {remoteJid: m.reply_message.jid,id: m.reply_message.id},message: m.reply_message.data.quotedMessage});
var au,p;
var s = w.SOURAVKL11.split('|');
var au = s[1];
var p = s[0];
var res = await stickercrop(q,au,p,v)
await m.client.sendMessage(m.jid, await skbuffer(res),MessageType.sticker,{quoted:m.data});}));
addCommand({ pattern: 'setexif ?(.*)', fromMe: true}, (async (m, qu) => {
if (!qu[1]) {return await m.client.sendMessage(m.jid,'_Need some data \n Example: \n .setexif Name|Author_',MessageType.text,{quoted:m.data})}
await m.client.sendMessage(m.jid, '_Added new exif!_',MessageType.text,{quoted:m.data});
await he.patch(ur + '/config-vars', { body: {['STICKER_DATA']: qu[1]}});}));
addCommand({ pattern: 'audinfo ?(.*)', fromMe: true}, (async (m, qu) => {
if (!qu[1]) {return await m.client.sendMessage(m.jid,'_Need some data like: *.audinfo Title;Artist;Imagelink*_',MessageType.text,{quoted:m.data})}
await m.client.sendMessage(m.jid, '_Added new audio info!_',MessageType.text,{quoted:m.data});
await he.patch(ur + '/config-vars', { body: {['AUDIO_DATA']: qu[1]}});}));
addCommand({pattern: 'mp4 ?(.*)', fromMe: a, desc:'Converts animated sticker to video'}, (async (m, t) => { 
var q = await m.client.downloadAndSaveMediaMessage({key: {remoteJid: m.reply_message.jid,id: m.reply_message.id},message: m.reply_message.data.quotedMessage});
await m.client.sendMessage(m.jid, await webp2mp4(take_key.endsWith('net')?'4bc0575f8bb479527cd1d13a194c3fed':take_key,q,SESSION),MessageType.video,{quoted:m.data});}));
    
