const Raganork = require('../events');
const {MessageType,Mimetype} = require('@adiwajshing/baileys');
const i = require('raganork-bot');
const Config = require('../config');
Raganork.addCommand({pattern: 'owner ?(.*)', fromMe: true}, (async (message, match) => {    
return;
}))
