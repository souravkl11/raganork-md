const Asena = require('../events');
const {MessageType, MessageOptions, Mimetype} = require('@adiwajshing/baileys');
const config = require('../config');
const axios = require('axios');

const Language = require('../language');
const Lang = Language.getString('wallpaper');

Asena.addCommand({pattern: 'git', fromMe: false, desc: Lang.WP}, (async (message, match) => {

    var r_text = new Array ();
    
    
   
  r_text[0] = config.LOGOSK;
    
    
    var i = Math.floor(1*Math.random())

    var respoimage = await axios.get(`${r_text[i]}`, { responseType: 'arraybuffer' })

    await message.sendMessage(Buffer(respoimage.data), MessageType.image, {mimetype: Mimetype.png, caption: `*RAGANORK* BOT CREATED BY SOURAVKL11
    
    *https://github.com/souravkl11/Raganork*
    
    ⚡𝙆𝙞𝙡𝙡𝙖𝙙𝙞𝙨𝙢 𝙣𝙚𝙫𝙚𝙧 𝙚𝙣𝙙𝙨⚡
`}) 

}));
