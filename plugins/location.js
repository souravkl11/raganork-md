/* Codded by @phaticusthiccy
Telegram: t.me/phaticusthiccy
Instagram: www.instagram.com/kyrie.baran
*/

const Asena = require('../events');
const {MessageType, GroupSettingChange} = require('@adiwajshing/baileys'); // Boredom 😬

const Language = require('../language');
const Lang = Language.getString('locate'); // Language supp. 😉


    Asena.addCommand({pattern: 'locate', fromMe: true, desc: Lang.L_DESC, warn: Lang.L_WARN}, (async (message, match) => {
    await message.sendMessage(message.jid, {degreesLatitude: null, degreesLongitude: null}, MessageType.location); // It sends ur location. Cool tho 😱

}));
