var e = require('../events')
var {MessageType,Mimetype} = require('@adiwajshing/baileys')
const c = require('../config')
var {music} = require('raganork-bot')
var v = c.SESSION
var fm = c.WORKTYPE == 'public' ? false : true
e.addCommand({pattern: 'find ?(.*)', fromMe: fm}, (async (m, match) => {    
if (!m.reply_message.text && !m.reply_message.video && !m.reply_message.sticker && !m.reply_message.image) {
var q = await m.client.downloadAndSaveMediaMessage({key: { remoteJid: m.reply_message.jid,id: m.reply_message.id}, message: m.reply_message.data.quotedMessage});
var k = c.find_key
var r = await music(q,k,v)
if (r.result) {
let msg =  '_Title:_ *' + r.result.title + '* \n_Album:_ *' + r.result.album+'* \n_Artist:_ *' + r.result.artist+ '* \n_Label:_ *' + r.result.label+'* \n_Release date:_ *' + r.result.release_date + '* \n_Song link:_ ' + 'https://www.youtube.com/results?search_query='+r.result.title.split(' ').join('+')
return await m.client.sendMessage(m.jid, msg, MessageType.text, {quoted: m.data})}
if (r.error && r.error.error_code == '900') return await m.client.sendMessage(m.jid, "_API Key expired! Get new api key from https://audd.io and setvar FIND_KEY:key_", MessageType.text,{quoted: m.data})
if (!r.result) return await m.client.sendMessage(m.jid, "_Not found!_", MessageType.text,{quoted: m.data})}
else {return await m.client.sendMessage(m.jid, "_Reply to any music!_", MessageType.text,{quoted: m.data})}}));
