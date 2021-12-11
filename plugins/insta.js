const skl = require('../events');
const { MessageType, MessageOptions, Mimetype } = require('@adiwajshing/baileys');
const fs = require('fs');
const axios = require('axios');
const setting = require('../config');
const get = require('../buffer');
const post = require('../insta_scrap');
const Config = require('../config');
const need = "_Need instagram link!_*";
let sourav = setting.WORKTYPE == 'public' ? false : true
skl.addCommand({ pattern: 'insta ?(.*)', fromMe: sourav,dontAddCommandList: true }, (async (msg, query) => {
    if (query[1] === '') return await msg.client.sendMessage(msg.jid, need, MessageType.text, {quoted: msg.data});
    if (!query[1].includes('instagram.com')) return await msg.client.sendMessage(msg.jid, need, MessageType.text, {quoted: msg.data});
    var res = await post.getInsta(query[1])
    var buffer = await get.skbuffer(res.links[0].url)
    if (res.links[0].url.includes('mp4')) return await msg.client.sendMessage(msg.jid, buffer, MessageType.video, { mimetype: Mimetype.mp4, caption: '_Caption:_ ' + `${res.caption}` + '\n\n _Username:_ *' + `${res.username}` + '*\n _Name:_ *' + `${res.name}` + '*\n _Likes:_ *' + `${res.likes}` + '*\n _Comments:_ *' + `${res.comment_count}` + '*', quoted: msg.data});
    if (res.links[0].url.includes('jpg')) return await msg.client.sendMessage(msg.jid, buffer, MessageType.image, { mimetype: Mimetype.jpg, caption: '_Caption:_ ' + `${res.caption}` + '\n\n _Username:_ *' + `${res.username}` + '*\n _Name:_ *' + `${res.name}` + '*\n _Likes:_ *' + `${res.likes}` + '*\n _Comments:_ *' + `${res.comment_count}` + '*', quoted: msg.data});
    }));
