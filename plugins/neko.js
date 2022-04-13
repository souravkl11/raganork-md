/*
Nekobin for WhatsAsena - W4RR10R

Licensed under the GPL-3.0 License;
you may not use this file except in compliance with the License.

WhatsAsena - Yusuf Usta
*/

const Asena = require('../events');
const {MessageType} = require('@adiwajshing/baileys');
const got = require('got');
const Config = require('../config');
const raganork = require('nekobin');
const Language = require('../language');
const Lang = Language.getString('nekobin');
let sk = Config.WORKTYPE == 'public' ? false : true

 Asena.addCommand({pattern: 'neko', fromMe: sk, desc: Lang.NEKO_DESC}, (async (message, match) => {

        if (!message.reply_message) return await message.sendMessage(Lang.NEED_REPLY);
        if (!message.reply_message.text) return await message.sendMessage(Lang.MUST_TEXT);
        try {
            raganork.nekobin(message.reply_message.message).then(async (data) => {
              await message.client.sendMessage(message.jid,'Text saved to: '+data.url,MessageType.text,{quoted:message.data})
            })        
        } catch (err) {
            await message.reply(err.message, MessageType.text);
            console.log(err.message);
        }
       
    }));
