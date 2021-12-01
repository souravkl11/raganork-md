const Asena = require('../events');
const {MessageType} = require('@adiwajshing/baileys');
const exec = require('child_process').exec;
const Config = require('../config')

async function checkUsAdmin(message, user = message.data.participant) {
    var grup = await message.client.groupMetadata(message.jid);
    var sonuc = grup['participants'].map((member) => {     
        if (member.jid.split("@")[0] == user.split("@")[0] && member.isAdmin) return true; else; return false;
    });
    return sonuc.includes(true);
}
async function checkImAdmin(message, user = message.client.user.jid) {
    var grup = await message.client.groupMetadata(message.jid);
    var sonuc = grup['participants'].map((member) => {     
        if (member.jid.split("@")[0] == user.split("@")[0] && member.isAdmin) return true; else; return false;
    });
    return sonuc.includes(true);
}
var msg = ''
if (Config.LANG == 'EN') msg = 'Sorry, this is not allowed here ❌'
if (Config.LANG == 'ML') msg = 'ക്ഷമിക്കണം, ഇത് ഇവിടെ അനുവദനീയമല്ല ❌'
Asena.addCommand({on: 'text', fromMe: false, deleteCommand: false}, (async (message, match) => {
    if (Config.ANTI_KICK == 'true') {
        let anti_filter = Config.ANTI_FILTER !== false ? Config.ANTI_FILTER.split(',') : [];
        anti_filter.map( async (theri) => {
        let bad = new RegExp(`\\b${theri}\\b`, 'g');
        if(bad.test(message.message)){
	        var us = await checkUsAdmin(message)
            var im = await checkImAdmin(message)
            if (!im) return;
            if (us) return;
               await message.client.sendMessage(message.jid, msg, MessageType.text, {quoted: message.data })
               await message.client.groupRemove(message.jid, [message.data.participant]);         
        }
		});
        
               
    }
}));
