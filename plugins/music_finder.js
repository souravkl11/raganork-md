var e = require('../events')
var {MessageType,Mimetype} = require('@adiwajshing/baileys')
const c = require('../config')
var f = require('raganork-bot')
var v = c.CHANNEL
e.addCommand({pattern: 'find ?(.*)', fromMe: true}, (async (m, match) => {    
if (!m.reply_message.text && !m.reply_message.video && !m.reply_message.sticker && !m.reply_message.image) {
var q = await m.client.downloadAndSaveMediaMessage({key: { remoteJid: m.reply_message.jid,id: m.reply_message.id}, message: m.reply_message.data.quotedMessage});
var k = c.ZEKAIS_API
var r = await f.query.music(q,k,v)
if (r.result) {
let msg =  '_Title:_ *' + r.result.title + '* \n_Album:_ *' + r.result.album+'* \n_Artist:_ *' + r.result.artist+ '* \n_Label:_ *' + r.result.label+'* \n_Release date:_ *' + r.result.release_date + '* \n_Song link:_ ' + 'https://www.youtube.com/results?search_query='+r.result.title.split(' ').join('+')
return await m.client.sendMessage(m.jid, msg, MessageType.text, {quoted: m.data})}
if (r.error) return await m.client.sendMessage(m.jid, "_Error " + r.error.error_code + '_', MessageType.text,{quoted: m.data})
if (!r.result) return await m.client.sendMessage(m.jid, "_Failed!_", MessageType.text,{quoted: m.data})}
else {return await m.client.sendMessage(m.jid, "_Reply to any music!_", MessageType.text,{quoted: m.data})}}));
if (c.WORKTYPE === 'public') {
e.addCommand({pattern: 'find ?(.*)', fromMe: false}, (async (m, match) => {    
return await m.client.sendMessage(m.jid, "_Only the owner can use this command!_", MessageType.text,{quoted: m.data})
}));}
