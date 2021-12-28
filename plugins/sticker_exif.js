/* (c) souravkl11/raganork
You may not use this file except compliance with license!*/
let e = require('../events');
let { MessageType } = require('@adiwajshing/baileys');
let w = require('../config');
let v = w.SUPPORT3
let i = require('raganork-bot');
let a = w.WORKTYPE == 'public' ? false : true;
e.addCommand({pattern: 'steal ?(.*)', fromMe: a, desc:'Uploads image to imgur.com'}, (async (m, match) => { 
var q = await m.client.downloadAndSaveMediaMessage({key: {remoteJid: m.reply_message.jid,id: m.reply_message.id},message: m.reply_message.data.quotedMessage});
var s = w.SOURAVKL11.split('|');
var au = s[1];
var p = s[0];
var res = i.query.exif(q,au,p,v)
await m.client.sendMessage(m.jid, await image.query.skbuffer(res),MessageType.sticker,{quoted:m.data});}));
    
