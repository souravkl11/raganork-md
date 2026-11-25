const { Module } = require('../main');
const { fancy } = require('./utils');
const { getString } = require("./utils/lang");
const Lang = getString("fancy");
Module({
     pattern: 'fancy ?(.*)',
     use: 'utility',
     desc: Lang.DESC
 }, (async (message, match) => {
     if (!match[1] && !message.reply_message.message) return await message.sendReply(Lang.USAGE+String.fromCharCode(8206).repeat(4001)+fancy.list(Lang.SAMPLE,fancy));
    const id = match[1].match(/\d/g)?.join('')
     try {
        if (id === undefined && !message.reply_message){
            return await message.sendReply(fancy.list(match[1],fancy));
        }
        return await message.sendReply(fancy.apply(fancy[parseInt(id)-1],message.reply_message.text || match[1].replace(id,'')))    
    } catch {
        return await message.sendReply(Lang.NO_STYLE)
     }
 }));