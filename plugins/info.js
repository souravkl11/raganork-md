//PLUGIN BY SOURAVKL11 COPY WITH CREDIT

const Asena = require('../events');
const {MessageType, MessageOptions, Mimetype} = require('@adiwajshing/baileys');
const Config = require('../config');
const axios = require('axios');
const Language = require('../language');
const Lang = Language.getString('wallpaper');

let sk = Config.WORKTYPE == 'public' ? false : true
Asena.addCommand({pattern: 'info', fromMe: sk, desc: 'Shows bot information and creator info'}, (async (message, match) => {
    var respoimage = await axios.get(Config.LOGOSK, { responseType: 'arraybuffer' })
    await message.sendMessage(Buffer(respoimage.data), MessageType.image, {mimetype: Mimetype.png, caption: `` + Config.BOTSK + ` *BOT CREATED BY* ` + Config.PLK +`
    
    ----- ` + Config.BOTSK + ` -----
    
╭─➤ 𝗜𝗡𝗙𝗢 𝗗𝗘𝗩𝗘𝗟𝗢𝗣𝗘𝗥 »
│❖ *ᴀᴜᴛʜᴏʀ* : ` + Config.PLK + `
│❖ *ᴋᴇʀɴᴇʟ* : ʟɪɴᴜx
│❖ *ɪɴꜱᴛᴀɢʀᴀᴍ* : ` + Config.SLINK + `
│❖ *ᴡʜᴀᴛꜱᴀᴘᴘ* : ` + Config.NBSK + `
╰────────────────❋ཻུ۪۪➹
⌕ ❙❘❙❙❘❙❚❙❘❙❙❚❙❘❙❘❙❚❙❘❙❙❚❙❘❙❙❘❙❚❙❘
               ` + Config.BOTSK + `
    
    ⚡ ` + Config.SKDL + ` ⚡
`}) 
}));
