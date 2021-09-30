const Asena = require('../events');
const {MessageType, MessageOptions, Mimetype} = require('@adiwajshing/baileys');
const axios = require('axios');

const Language = require('../language');
const Lang = Language.getString('wallpaper');

Asena.addCommand({pattern: 'git', fromMe: false, desc: Lang.WP}, (async (message, match) => {

    var r_text = new Array ();
    
    
   
  r_text[0] = "https://github.com/ameer-kallumthodi/pikachu/blob/master/media/gif/Aisu.mp4";
    
    
    var i = Math.floor(1*Math.random())

    var respoimage = await axios.get(`${r_text[i]}`, { responseType: 'arraybuffer' })

    message.sendMessage(fs.readFileSync('Aisu.mp4'), MessageType.video, {mimetype: Mimetype.mpeg, caption: `NEW BOT RELEASING>>>!*
    
    ⚡𝙆𝙞𝙡𝙡𝙖𝙙𝙞𝙨𝙢 𝙣𝙚𝙫𝙚𝙧 𝙚𝙣𝙙𝙨⚡
`}) 

}));
