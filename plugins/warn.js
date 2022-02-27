/* (c) Warn: souravkl11/raganork
You may not use this file except compliance with license!*/
let e = require('../events');
let { MessageType, Mimetype } = require('@adiwajshing/baileys');
let w = require('../config');
let v = w.SESSION
let cnt = w.warn_count
let {query} = require('raganork-bot');
e.addCommand({pattern: 'warn ?(.*)', fromMe: true, desc:'Warns user. Removes user after maximum number of warns'}, (async (m, mat) => { 
var par = m.reply_message.jid
var me = m.client.user.jid
var chat = m.jid
if (!chat.endsWith('@g.us')) return await m.sendMessage('_Only works in groups!_')
var warn = await query.setwarn(me,chat,par,cnt,v)
var reason = mat[1] ? mat[1] : 'Replied message'
var msg = "```Warning ⚠️```"+ '\n' +
"User: " +'@'+par.split('@')[0] + '\n' +
"Reason:" +' *' + reason+ '*\n' +
"Remaining:" +' *' + warn + '*\n' +
"Career:" +' *' + res.phones[0].carrier + '*\n'
if (warn !== 0) {
    return await m.client.sendMessage(chat,msg,MessageType.text,{quoted:m.data})
} else {
    return await m.client.sendMessage(chat,'_Warn limit() exceeded. Removing @'+par.split('@')[0]+ '_',MessageType.text,{quoted:m.data})
}
}));
