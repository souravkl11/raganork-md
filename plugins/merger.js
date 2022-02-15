var e = require('../events')
var fs = require('fs')
var {MessageType,Mimetype} = require('@adiwajshing/baileys')
const c = require('../config')
var {query} = require('raganork-bot')
var v = c.SESSION
var fm = c.WORKTYPE == 'public' ? false : true
e.addCommand({pattern: 'avmix ?(.*)', fromMe: fm}, (async (m, match) => {    
var rm = m.reply_message;
var am = m.reply_message.data.quotedMessage.audioMessage;
var vm = m.reply_message.data.quotedMessage.videoMessage;
var q = await m.client.downloadMediaMessage({key: { remoteJid: m.reply_message.jid,id: m.reply_message.id}, message: m.reply_message.data.quotedMessage});
if (!rm) return await m.client.sendMessage(m.jid, '_Reply to an audio or video!_', MessageType.text, {quoted: m.data})
if (!am && !vm) return await m.client.sendMessage(m.jid, '_Reply to an audio or video!_', MessageType.text, {quoted: m.data})
if (rm && am && !fs.existsSync('aud.mpeg')) {
await fs.writeFileSync('aud.mpeg',q)
await m.client.sendMessage(m.jid, '_Saved audio! Next, reply to the video to be mixed_', MessageType.text, {quoted: m.data})}
if (rm && vm && !fs.existsSync('vid.mp4')) {
await fs.writeFileSync('vid.mp4',q)
await m.client.sendMessage(m.jid, '_Saved video! Next, reply to the audio to be mixed_', MessageType.text, {quoted: m.data})}
if (rm && vm && fs.existsSync('aud.mpeg') && fs.existsSync('vid.mp4')) {
query.AVmix('vid.mp4','aud.mpeg','AV_mix.mp4',v, async function(video) {
return await m.client.sendMessage(m.jid, video, MessageType.video, { mimetype: Mimetype.mp4, quoted: m.data});
});    
}
}));
