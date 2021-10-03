const Asena = require('../events');
const { MessageType, MessageOptions, Mimetype } = require('@adiwajshing/baileys');
const fs = require('fs');
const axios = require('axios');
const NEED_WORD = "*Must Enter some Words*"


Asena.addCommand({ pattern: 'random ?(.*)', fromMe: false, desc: 'word image' }, (async (message, match) => {

    var r_text = new Array ();

    r_text[0] = `https://api.xteam.xyz/textpro/neon?text=${match[1]}&APIKEY=ba33b82cd3755c3e`
    r_text[1] = `https://api.xteam.xyz/textpro/snowtext?text=${match[1]}&APIKEY=72404708ebbadaee`
    r_text[2] = `https://api.xteam.xyz/textpro/3dgradient?text=${match[1]}&APIKEY=fb3afa34fd0eddbf`
    r_text[3] = `https://api.xteam.xyz/textpro/3dluxury?text=${match[1]}&APIKEY=ba69027eb3dc7987`
    r_text[4] = `https://api.xteam.xyz/textpro/3dgradient?text=${match[1]}&APIKEY=00e0e1bf4c7dde0d`
    r_text[5] = `https://api.xteam.xyz/textpro/blackpink?text=${match[1]}&APIKEY=8a8ebc8d8b932805`
    r_text[6] = `https://api.xteam.xyz/textpro/realisticvintage?text=${match[1]}&APIKEY=98b033c6ef54b61a`
    r_text[7] = `https://api.xteam.xyz/textpro/cloudsky?text=${match[1]}&APIKEY=8a2b52654b55c3f6`
    r_text[8] = `https://api.xteam.xyz/textpro/sandsummerbeach?text=${match[1]}&APIKEY=79cf7ab4e6598752`
    r_text[9] = `https://api.xteam.xyz/textpro/glitch?text=${match[1]}&APIKEY=2d7fce02fc14400a`
    r_text[10] = `https://api.xteam.xyz/textpro/metaldarkgold?text=${match[1]}&APIKEY=981a4ef70f9f08c4`
    r_text[11] = `https://api.xteam.xyz/textpro/goldfoilballon?text=${match[1]}&APIKEY=2376fa7786a47519` 

    var i = Math.floor(12*Math.random())
    if (match[1] === '') return await message.sendMessage(NEED_WORD);
    console.log(match[1])

    var ttinullimage = await axios.get(`${r_text[i]}`, { responseType: 'arraybuffer' })

    await message.client.sendMessage(message.jid,Buffer.from(ttinullimage.data), MessageType.image, { mimetype: Mimetype.jpg, caption: '```PublicBot```' })

}));
