
/* Copyright (C) 2022 Sourav KL11.
Licensed under the  GPL-3.0 License;
you may not use this file except in compliance with the License.
Raganork - Sourav KL11
*/
const {addCommand} = require('../events')
const {Fancy} = require('raganork-bot')
const {WORKTYPE} = require('../config');
var w = WORKTYPE == 'public'? false:true
addCommand({pattern: 'fancy ?(.*)', fromMe: w, desc: 'Creates fancy text fonts'}, (async (message, match) => {
if (!match[1]||!message.reply_message.message) return await message.sendReply("Reply to any message with .fancy number\n"+Fancy("example","32"))
try { var result = Fancy(message.reply_message.message,match[1]) } catch (e) {return await message.sendReply(e.message)}
await message.reply(result)
     }))
