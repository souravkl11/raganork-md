 
const {addCommand} = require('../events');
const {MessageType, Mimetype} = require('@adiwajshing/baileys');
const fs = require('fs');
const axios = require('axios');
const {sticker, skbuffer, filecheck} = require('raganork-bot');
const {take_key,WORKTYPE,BOTSK} = require('../config');
var fm = WORKTYPE=='public'?false:true
addCommand({pattern: 'emoji ?(.*)', fromMe: fm, desc: 'Converts emoji to sticker'}, (async (message, match) => {
async function getEmoji(ma){
await filecheck();
await fs.writeFileSync('emo.png',await skbuffer('https://docs-jojo.herokuapp.com/api/emoji2png?emoji='+encodeURIComponent(ma)+'&type=apple'))
return 'emo.png';}
if (!match[1]) return;
await message.client.sendMessage(message.jid,await skbuffer(await sticker(await getEmojiBuffer(match[1]),match[1].replace(/[0-9]/g, ''),BOTSK,take_key)), MessageType.sticker, {mimetype: Mimetype.webp, quoted:message.data}) 
}));
