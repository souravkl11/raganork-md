let f = require('fs')
let p = require('path')
let { MessageType } = require('@adiwajshing/baileys')
let e = require('../events');
let c = require('../config');
let i = require('raganork-bot');
let fm = c.WORKTYPE == 'public' ? false : true
e.addCommand({ pattern: 'doc', fromMe: fm, desc: 'Converts media messages to documents with given filenames' }, async (m, q) => {
let fn = await m.client.downloadAndSaveMediaMessage({key: {remoteJid: m.reply_message.jid,id: m.reply_message.id},message: m.reply_message.data.quotedMessage})
let fnm = q[1] ? q[1] : 'File'
await m.client.sendMessage(m.jid,f.readFileSync(fn), MessageType.document, {filename: fm+p.extname(fn)});
})