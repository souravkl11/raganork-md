// Plugin for raganork by souravkl11
var ra = require('../events');
var {MessageType, Mimetype} = require('@adiwajshing/baileys');
var {skbuffer} = require('raganork-bot');
ra.addCommand({pattern: 'getqr ?(.*)', fromMe: true, desc: 'Generates QR code for WhatsApp web' , dontAddCommandList: true }, async (m, q) => {
await m.client.sendMessage(m.jid, await skbuffer('https://baileys-qr.herokuapp.com/api/raganork-qr'), MessageType.image, {mimetype: Mimetype.jpg, quoted: m.data,caption:"1)You can only get session using this code \n 2) QR is only valid for 20 seconds"})});
