var e = require('../events')
var fs = require('fs')
var ffmpeg = require('fluent-ffmpeg')
var {MessageType,Mimetype} = require('@adiwajshing/baileys')
const c = require('../config')
var {AVmix,MixAudio} = require('raganork-bot')
var v = c.SESSION
var fm = c.WORKTYPE == 'public' ? false : true
e.addCommand({pattern: 'avmix ?(.*)', fromMe: fm,desc:'Mixes audio and video'}, (async (m, match) => {    
var rm = m.reply_message;
var am = m.reply_message.data.quotedMessage.audioMessage;
var vm = m.reply_message.data.quotedMessage.videoMessage;
var q = await m.client.downloadAndSaveMediaMessage({key: { remoteJid: m.reply_message.jid,id: m.reply_message.id}, message: m.reply_message.data.quotedMessage});
var qb = await m.client.downloadMediaMessage({key: { remoteJid: m.reply_message.jid,id: m.reply_message.id}, message: m.reply_message.data.quotedMessage});
if (!rm) return await m.client.sendMessage(m.jid, '_Reply to an audio or video!_', MessageType.text, {quoted: m.data})
if (!am && !vm) return await m.client.sendMessage(m.jid, '_Reply to an audio or video!_', MessageType.text, {quoted: m.data})
if (rm && am && !fs.existsSync('audio_v.mp3')) {
ffmpeg(q)
.format('mp3')
.save('audio_v.mp3')
.on('end', async () => {
await m.client.sendMessage(m.jid, '_Saved audio! Next, reply to the video to be mixed_', MessageType.text, {quoted: m.data})})}
if (rm && vm && !fs.existsSync('vid.mp4')) {
await fs.writeFileSync('vid.mp4',qb)
await m.client.sendMessage(m.jid, '_Saved video! Next, Processing.._', MessageType.text, {quoted: m.data})}
if (rm && vm && fs.existsSync('audio_v.mp3') && fs.existsSync('vid.mp4')) {
AVmix('vid.mp4','audio_v.mp3','AV_mix.mp4',v, async function(video) {
await m.client.sendMessage(m.jid, video, MessageType.video, { mimetype: Mimetype.mp4, quoted: m.data});
await fs.unlinkSync('vid.mp4')
await fs.unlinkSync('audio_2.m4a')
await fs.unlinkSync('AV_mix.mp4')
return;
});    
}
}));
e.addCommand({pattern: 'aamix ?(.*)', fromMe: fm}, (async (m, match) => {    
var rm = m.reply_message;
var am = m.reply_message.data.quotedMessage.audioMessage;
var q = await m.client.downloadAndSaveMediaMessage({key: { remoteJid: m.reply_message.jid,id: m.reply_message.id}, message: m.reply_message.data.quotedMessage});
if (!rm) return await m.client.sendMessage(m.jid, '_Reply to an audio or video!_', MessageType.text, {quoted: m.data})
if (!am) return await m.client.sendMessage(m.jid, '_Reply to an audio or video!_', MessageType.text, {quoted: m.data})
if (rm && am && !fs.existsSync('audio_1.m4a') && !fs.existsSync('audio_2.m4a')) {
ffmpeg(q)
.format('m4a')
.save('audio_1.m4a')
.on('end', async () => {
await m.client.sendMessage(m.jid, '_Saved audio 1_', MessageType.text, {quoted: m.data})})}
if (rm && am && fs.existsSync('audio_1.m4a') && !fs.existsSync('audio_2.m4a')) {
ffmpeg(q)
.format('m4a')
.save('audio_2.m4a')
.on('end', async () => {
await m.client.sendMessage(m.jid, '_Saved audio 2. Processing..._', MessageType.text, {quoted: m.data})})}
if (rm && am && fs.existsSync('audio_1.m4a') && fs.existsSync('audio_2.m4a')) {
MixAudio('audio_2.m4a','audio_1.m4a','amix.mp3',v, async function(audio) {
await m.client.sendMessage(m.jid, audio, MessageType.audio, { mimetype: 'audio/m4a', quoted: m.data});
await fs.unlinkSync('audio_1.m4a')
await fs.unlinkSync('audio_2.m4a')
await fs.unlinkSync('amix.mp3')
return;
});    
}
}));
e.addCommand({pattern: 'black ?(.*)', fromMe: fm,desc:'Converts audio to black video'}, (async (m, match) => {    
var rm = m.reply_message;
var am = m.reply_message.data.quotedMessage.audioMessage;
var q = await m.client.downloadAndSaveMediaMessage({key: { remoteJid: m.reply_message.jid,id: m.reply_message.id}, message: m.reply_message.data.quotedMessage});
var qb = await m.client.downloadMediaMessage({key: { remoteJid: m.reply_message.jid,id: m.reply_message.id}, message: m.reply_message.data.quotedMessage});
if (!rm) return await m.client.sendMessage(m.jid, '_Reply to an audio!_', MessageType.text, {quoted: m.data})
if (!am) return await m.client.sendMessage(m.jid, '_Reply to an audio!_', MessageType.text, {quoted: m.data})
ffmpeg(q)
.format('mp3')
.save('b_a.mp3')
.on('end', async () => {
await m.client.sendMessage(m.jid, '_Generating.._', MessageType.text, {quoted: m.data})})
await fs.writeFileSync('bla.mp4',await skbuffer('https://i.imgur.com/uzBuGGn.mp4'));
AVmix('bla.mp4','b_a.mp3','black.mp4',v, async function(video) {
await m.client.sendMessage(m.jid, video, MessageType.video, { mimetype: Mimetype.mp4, quoted: m.data});
return;
});    
}));    