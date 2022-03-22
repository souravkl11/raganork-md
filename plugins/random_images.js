const Raganork = require('../events');
const {MessageType, Mimetype} = require('@adiwajshing/baileys');
const {skbuffer} = require('raganork-bot');
const Config = require('../config');
let sourav = Config.WORKTYPE == 'public' ? false : true
Raganork.addCommand({pattern: 'bts ?(.*)', fromMe: sourav, desc: 'Sends random BTS wallpaper' , dontAddCommandList: true }, async (message, match) => {
await message.client.sendMessage(message.jid, await skbuffer('https://rgnk.herokuapp.com/api/random/bts?apikey=5EzAGZL08X'), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})});
Raganork.addCommand({pattern: 'bpink ?(.*)', fromMe: sourav, desc: 'Sends random Blackpink wallpaper' , dontAddCommandList: true }, async (message, match) => {
await message.client.sendMessage(message.jid, await skbuffer('https://rgnk.herokuapp.com/api/random/blackpink?apikey=5EzAGZL08X'), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})});
Raganork.addCommand({pattern: 'xxx ?(.*)', fromMe: sourav, desc: 'Sends random Xxxtentacion wallpaper' , dontAddCommandList: true }, async (message, match) => {
await message.client.sendMessage(message.jid, await skbuffer('https://rgnk.herokuapp.com/api/random/tentacion?apikey=5EzAGZL08X'), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})})
Raganork.addCommand({pattern: 'wallpaper ?(.*)', fromMe: sourav, desc: 'Sends random Xxxtentacion wallpaper' , dontAddCommandList: true }, async (message, match) => {
await message.client.sendMessage(message.jid, await skbuffer('https://rgnk.herokuapp.com/api/random/wallpaper?apikey=5EzAGZL08X'), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})})
