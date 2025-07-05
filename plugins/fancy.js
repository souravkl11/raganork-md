const { Module } = require('../main');
const isPrivateMode = require('../config').MODE !== 'public';
const { fancy } = require('./utils');
Module({
     pattern: 'fancy ?(.*)',
     fromMe: isPrivateMode,
     use: 'utility',
     desc: 'Creates fancy text fonts'
 }, (async (message, match) => {
     if (!match[1] && !message.reply_message.message) return await message.sendReply('_*Reply to a text and speicify a numeric code, or just type it.* Example:_\n\n- `.fancy 10 Hello`\n- `.fancy Hello world`\n- `.fancy <reply> 13`\n'+String.fromCharCode(8206).repeat(4001)+fancy.list('Text here',fancy));
    const id = match[1].match(/\d/g)?.join('')
     try {
        if (id === undefined && !message.reply_message){
            return await message.sendReply(fancy.list(match[1],fancy));
        }
        return await message.sendReply(fancy.apply(fancy[parseInt(id)-1],message.reply_message.text || match[1].replace(id,'')))    
    } catch {
        return await message.sendReply('_No such style!_')
     }
 }));