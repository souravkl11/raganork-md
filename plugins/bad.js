const Asena = require('../events');
const {MessageType} = require('@adiwajshing/baileys');
const Config = require('../config')
const Heroku = require('heroku-client');
const heroku = new Heroku({
    token: Config.HEROKU.API_KEY
});
let baseURI = '/apps/' + Config.HEROKU.APP_NAME;


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
var therikick_var = ''
async function notheri() {
    await heroku.get(baseURI + '/config-vars').then(async (vars) => {
        therikick_var = vars.THERI_KICK
    });
}
notheri()
var msg = ''
if (Config.LANG == 'ML') msg = 'ക്ഷമിക്കണം, ഇത് ഇവിടെ അനുവദനീയമല്ല ❌'
if (!Config.LANG == 'ML') msg = 'Sorry, this is not allowed here ❌'
Asena.addCommand({on: 'text', fromMe: false, deleteCommand: false}, (async (message, match) => {
    if (therikick_var == 'true') {
        let word_array = ['Andi','poorr','myrr','Myr','Myree','oomb','oomp','Kundi','endi','Endi','andi','ombikko','Myre','Kunna','Thayoli','Thendi']
        if (word_array.includes(message.message)) {
            var us = await checkUsAdmin(message)
            var im = await checkImAdmin(message)
            if (!im) return;
            if (us) return;
               await message.client.sendMessage(message.jid,msg, MessageType.text, {quoted: message.data })
               await message.client.groupRemove(message.jid, [message.data.participant]);         
        } 
        
               
    }
}));
