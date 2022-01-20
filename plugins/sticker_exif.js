/* (c) souravkl11/raganork
You may not use this file except compliance with license!*/
let e = require('../events');
let { MessageType } = require('@adiwajshing/baileys');
let w = require('../config');
let v = w.SUPPORT3
let i = require('raganork-bot');
let a = w.WORKTYPE == 'public' ? false : true;
let ffmpeg = require('fluent-ffmpeg');
const h = require('heroku-client');
const he = new h({token: w.HEROKU.API_KEY});
let ur = '/apps/' + w.HEROKU.APP_NAME;
e.addCommand({pattern: 'take ?(.*)', fromMe: a, desc:'Changes sticker pack & author name!'}, (async (m, match) => { 
var q = await m.client.downloadAndSaveMediaMessage({key: {remoteJid: m.reply_message.jid,id: m.reply_message.id},message: m.reply_message.data.quotedMessage});
var s = w.SOURAVKL11.split('|');
var au = s[1];
var p = s[0];
ffmpeg(q)
.fromFormat('webp_pipe')
.save('ex.png')
.on('end', async () => {
var res = await i.query.sticker('ex.png',au,p,v)
await m.client.sendMessage(m.jid, await i.query.skbuffer(res),MessageType.sticker,{quoted:m.data});})}));
e.addCommand({pattern: 'wm ?(.*)', fromMe: a, desc:'Sets sticker pack & author name with given ones.'}, (async (m, t) => { 
var q = await m.client.downloadAndSaveMediaMessage({key: {remoteJid: m.reply_message.jid,id: m.reply_message.id},message: m.reply_message.data.quotedMessage});
var au,p;
if (t[1].includes('|')) {
var s = t[1].split('|');
au = s[1];
p = s[0];}
else {
p = t[1]}
ffmpeg(q)
.fromFormat('webp_pipe')
.save('ex.png')
.on('end', async () => {
var res = await i.query.sticker('ex.png',au,p,v)
await m.client.sendMessage(m.jid, await i.query.skbuffer(res),MessageType.sticker,{quoted:m.data});})}));
e.addCommand({pattern: 'crop ?(.*)', fromMe: a, desc:'Crops sticker'}, (async (m, t) => { 
var q = await m.client.downloadAndSaveMediaMessage({key: {remoteJid: m.reply_message.jid,id: m.reply_message.id},message: m.reply_message.data.quotedMessage});
var au,p;
var s = w.SOURAVKL11.split('|');
var au = s[1];
var p = s[0];
ffmpeg(q)
.fromFormat('webp_pipe')
.save('ex.png')
.on('end', async () => {
var res = await i.query.stickercrop('ex.png',au,p,v)
await m.client.sendMessage(m.jid, await i.query.skbuffer(res),MessageType.sticker,{quoted:m.data});})}));
e.addCommand({ pattern: 'setexif ?(.*)', fromMe: true}, (async (m, qu) => {
if (!qu[1]) {return await m.client.sendMessage(m.jid,'_Need some data \n Example: \n .setexif Name|Author_',MessageType.text,{quoted:m.data})}
await m.client.sendMessage(m.jid, '_Added new exif!_',MessageType.text,{quoted:m.data});
await he.patch(ur + '/config-vars', { body: {['STICKER_DATA']: qu[1]}});}));
    
