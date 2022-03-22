let e = require('../events');
let {MessageType,Mimetype} = require('@adiwajshing/baileys');
let w = require('../config');
let v = w.SESSION
let {trim} = require('raganork-bot');
let f = require('fs');
let i = w.WORKTYPE == 'public' ? false : true;
e.addCommand({pattern: 'trim ?(.*)', fromMe: i, desc:'Sets sticker pack & author name with given ones.'}, (async (m, t) => { 
var q = await m.client.downloadAndSaveMediaMessage({key: {remoteJid: m.reply_message.jid,id: m.reply_message.id},message: m.reply_message.data.quotedMessage});
var au,p;
if (t[1].includes(':')) {
var s = t[1].split(':');
au = s[1];
p = s[0];}
else return await m.client.sendMessage(m.jid,'_Wrong format! \n Example: \n .trim 10:20_',MessageType.text,{quoted:m.data})
await trim(q,p,au,'res.mp3',v)
await m.client.sendMessage(m.jid, f.readFileSync('res.mp3'),MessageType.audio, { mimetype: Mimetype.mp4Audio , quoted:m.data});}));