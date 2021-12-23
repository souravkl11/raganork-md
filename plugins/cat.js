const Raganork = require('../events');
const {MessageType, Mimetype} = require('@adiwajshing/baileys');
const image = require('../Data/Buffer');
const Config = require('../config');
let sourav = Config.WORKTYPE == 'public' ? false : true
Raganork.addCommand({pattern: 'cat ?(.*)', fromMe: sourav, desc: 'Sends random car wallpaper' , dontAddCommandList: true }, async (message, match) => {
await message.client.sendMessage(message.jid, await image.skbuffer('https://server-api-rey.herokuapp.com/api/wallpaper/kucing?apikey=apirey'), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})});
Raganork.addCommand({pattern: 'car ?(.*)', fromMe: sourav, desc: 'Sends random car wallpaper' , dontAddCommandList: true }, async (message, match) => {
await message.client.sendMessage(message.jid, await image.skbuffer('https://server-api-rey.herokuapp.com/api/wallpaper/mobil?apikey=apirey'), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})})