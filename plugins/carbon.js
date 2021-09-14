/* Codded by @phaticusthiccy
Telegram: t.me/phaticusthiccy
Instagram: www.instagram.com/kyrie.baran
*/

const Asena = require('../events');
const {MessageType, MessageOptions, Mimetype} = require('@adiwajshing/baileys');
const axios = require('axios');
const Config = require('../config');
const dd = "Made by WhatsAsena"
const WhatsAsenaStack = require('whatsasena-npm');
const Language = require('../language');
const Lang = Language.getString('log');
let wk = Config.WORKTYPE == 'public' ? false : true

Asena.addCommand({pattern: 'carbon$', fromMe: wk, desc: Lang.CARBON_DESC}, (async (message, match) => {
    if (!message.reply_message) return await message.client.sendMessage(message.jid,Lang.REPLY, MessageType.text);
    var theme_c = await WhatsAsenaStack.ctheme()
    var lang_c = await WhatsAsenaStack.clang()
    var rgb_c = await WhatsAsenaStack.crgb()
    var text = message.reply_message.text
    var fin = text.replace(/(?:\r\n|\r|\n)/g, '%250A')
    var pay = encodeURIComponent(fin)       
    var respoimage = await axios.get('https://thiccyscarbonapi.herokuapp.com/?code=' + pay + '&theme=' + theme_c + '&exportSize=3x&paddingVertical=200px&paddingHorizontal=200px&backgroundColor=rgba(' + rgb_c + ')&language=' + lang_c, { responseType: 'arraybuffer' })
    await message.sendMessage(Buffer.from(respoimage.data), MessageType.image, { mimetype: Mimetype.png, caption: dd})
}));

