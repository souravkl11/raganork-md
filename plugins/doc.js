let f = require('fs')
let p = require('path')
let { MessageType } = require('@adiwajshing/baileys')
let e = require('../events');
let c = require('../config');
let i = require('raganork-bot');
const { fromBuffer } = require('file-type')
let fm = c.WORKTYPE == 'public' ? false : true
e.addCommand({ pattern: 'doc', fromMe: fm, desc: 'Converts media messages to documents with given filenames' }, async (m, q) => {
let fnm = !q[1] ? 'File' : q[1]
let fn1 = await m.client.downloadAndSaveMediaMessage({key: {remoteJid: m.reply_message.jid,id: m.reply_message.id},message: m.reply_message.data.quotedMessage})
let fn = await m.client.downloadMediaMessage({key: {remoteJid: m.reply_message.jid,id: m.reply_message.id},message: m.reply_message.data.quotedMessage})
let mime = await fromBuffer(fn)
await m.client.sendMessage(m.jid,fn, MessageType.document, {filename: fnm+p.extname(fn1), mimetype: mime.mime});
})