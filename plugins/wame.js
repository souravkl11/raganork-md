const Asena = require('../events');
const {MessageType} = require('@adiwajshing/baileys');
const Config = require('../config');
const fs = require('fs');
const WAME_DESC = "Get a link to the user chat."
const NEED_UWONG = "*Give me a user!*"
let sourav = Config.WORKTYPE == 'public' ? false : true
    
    Asena.addCommand({pattern: 'wame ?(.*)', fromMe: sourav, desc: WAME_DESC}, (async (message, match) => {    
        if (message.reply_message !== false) {
            await message.client.sendMessage(message.jid, 'https://wa.me/' + message.reply_message.jid.split('@')[0], MessageType.text, {
                quoted: message.data
            });
        } else if (message.mention !== false) {
            message.mention.map(async user => {
                await message.client.sendMessage(message.jid, 'https://wa.me/' + user.split('@')[0], MessageType.text, {
                    quoted: message.data
                }); 
            });
        } else {
            await message.client.sendMessage(message.jid, NEED_UWONG, MessageType.text);
        }
    }));
