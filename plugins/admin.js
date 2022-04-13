/* Copyright (C) 2020 Yusuf Usta.

Licensed under the  GPL-3.0 License;
you may not use this file except in compliance with the License.

WhatsAsena - Yusuf Usta
*/

const {MessageType, GroupSettingChange} = require('@adiwajshing/baileys');
const Asena = require('../events');
const Config = require('../config');

const Language = require('../language');
const Lang = Language.getString('admin');
const mut = Language.getString('mute');

async function checkImAdmin(message, user = message.client.user.jid) {
    var grup = await message.client.groupMetadata(message.jid);
    var sonuc = grup['participants'].map((member) => {
        
        if (member.jid.split("@")[0] == user.split("@")[0] && member.isAdmin) return true; else; return false;
    });
    return sonuc.includes(true);
}

Asena.addCommand({pattern: 'ban ?(.*)', fromMe: true, desc: Lang.BAN_DESC}, (async (message, match) => {  
    if (message.jid.endsWith('@g.us')) {
    var im = await checkImAdmin(message);
    if (!im) return await message.client.sendMessage(message.jid,Lang.IM_NOT_ADMIN,MessageType.text);

    if (Config.BANMSG == 'default') {
        if (message.reply_message !== false) {
            await message.client.sendMessage(message.jid,'@' + message.reply_message.data.participant.split('@')[0] + '```, ' + Lang.BANNED + '```', MessageType.text, {contextInfo: {mentionedJid: [message.reply_message.data.participant]}});
            await message.client.groupRemove(message.jid, [message.reply_message.data.participant]);
        } else if (message.reply_message === false && message.mention !== false) {
            var etiketler = '';
            message.mention.map(async (user) => {
                etiketler += '@' + user.split('@')[0] + ',';
            });

            await message.client.sendMessage(message.jid,etiketler + '```, ' + Lang.BANNED + '```', MessageType.text, {contextInfo: {mentionedJid: message.mention}});
            await message.client.groupRemove(message.jid, message.mention);
        } else {
            return await message.client.sendMessage(message.jid,Lang.GIVE_ME_USER,MessageType.text);
        }
    }
    else {
        if (message.reply_message !== false) {
            await message.client.sendMessage(message.jid,'@' + message.reply_message.data.participant.split('@')[0] + Config.BANMSG, MessageType.text, {contextInfo: {mentionedJid: [message.reply_message.data.participant]}});
            await message.client.groupRemove(message.jid, [message.reply_message.data.participant]);
        } else if (message.reply_message === false && message.mention !== false) {
            var etiketler = '';
            message.mention.map(async (user) => {
                etiketler += '@' + user.split('@')[0] + ',';
            });

            await message.client.sendMessage(message.jid,etiketler + Config.BANMSG, MessageType.text, {contextInfo: {mentionedJid: message.mention}});
            await message.client.groupRemove(message.jid, message.mention);
        } else {
            return await message.client.sendMessage(message.jid,Lang.GIVE_ME_USER,MessageType.text);
        }
    }
	}}));

Asena.addCommand({pattern: 'add ?(.*)', fromMe: true, desc: Lang.ADD_DESC}, (async (message, match) => {  
    if (message.jid.endsWith('@g.us')) {
	var im = await checkImAdmin(message);
    if (!im) return await message.client.sendMessage(message.jid,Lang.IM_NOT_ADMIN,MessageType.text);
if (match[1] !== '') {
    var init = match[1]
    var initt = init.split(" ").join("")
    var user = initt.replace('+','').replace(' ','').replace(' ','').replace(' ','').replace(' ','').replace('(','').replace(')','').replace('-','').replace('-','')
		var scan = await message.client.isOnWhatsApp(user)
		if (scan) {
		    console.log(`Adding ${user}@s.whatsapp.net to ${message.jid}`)
			await message.client.groupAdd(message.jid, [user + "@s.whatsapp.net"]);
            await message.client.sendMessage(message.jid,'```' + user + ' ' + Lang.ADDED +'```', MessageType.text);
	}
else {return await message.client.sendMessage(message.jid,"This number does not exist on WhatsApp!",MessageType.text);}
 	} 
        else {
            return await message.client.sendMessage(message.jid,Lang.GIVE_ME_USER,MessageType.text);
        }
    }
	}))

Asena.addCommand({pattern: 'promote ?(.*)', fromMe: true, desc: Lang.PROMOTE_DESC}, (async (message, match) => {    
    if (message.jid.endsWith('@g.us')) {
	var im = await checkImAdmin(message);
    if (!im) return await message.client.sendMessage(message.jid,Lang.IM_NOT_ADMIN,MessageType.text);

    if (Config.PROMOTEMSG == 'default') {
        if (message.reply_message !== false) {
            var checkAlready = await checkImAdmin(message, message.reply_message.data.participant);
            if (checkAlready) {
                return await message.client.sendMessage(message.jid,Lang.ALREADY_PROMOTED, MessageType.text);
            }

            await message.client.sendMessage(message.jid,'@' + message.reply_message.data.participant.split('@')[0] + Lang.PROMOTED, MessageType.text, {contextInfo: {mentionedJid: [message.reply_message.data.participant]}});
            await message.client.groupMakeAdmin(message.jid, [message.reply_message.data.participant]);
        } else if (message.reply_message === false && message.mention !== false) {
            var etiketler = '';
            message.mention.map(async (user) => {
                var checkAlready = await checkImAdmin(message, user);
                if (checkAlready) {
                    return await message.client.sendMessage(message.jid,Lang.ALREADY_PROMOTED, MessageType.text);
                }

                etiketler += '@' + user.split('@')[0] + ',';
            });

            await message.client.sendMessage(message.jid,etiketler + Lang.PROMOTED, MessageType.text, {contextInfo: {mentionedJid: message.mention}});
            await message.client.groupMakeAdmin(message.jid, message.mention);
        } else {
            return await message.client.sendMessage(message.jid,Lang.GIVE_ME_USER,MessageType.text);
        }
    }
    else {
        if (message.reply_message !== false) {
            var checkAlready = await checkImAdmin(message, message.reply_message.data.participant);
            if (checkAlready) {
                return await message.client.sendMessage(message.jid,Lang.ALREADY_PROMOTED, MessageType.text);
            }

            await message.client.sendMessage(message.jid,'@' + message.reply_message.data.participant.split('@')[0] + Config.PROMOTEMSG, MessageType.text, {contextInfo: {mentionedJid: [message.reply_message.data.participant]}});
            await message.client.groupMakeAdmin(message.jid, [message.reply_message.data.participant]);
        } else if (message.reply_message === false && message.mention !== false) {
            var etiketler = '';
            message.mention.map(async (user) => {
                var checkAlready = await checkImAdmin(message, user);
                if (checkAlready) {
                    return await message.client.sendMessage(message.jid,Lang.ALREADY_PROMOTED, MessageType.text);
                }

                etiketler += '@' + user.split('@')[0] + ',';
            });

            await message.client.sendMessage(message.jid,etiketler + Config.PROMOTEMSG, MessageType.text, {contextInfo: {mentionedJid: message.mention}});
            await message.client.groupMakeAdmin(message.jid, message.mention);
        } else {
            return await message.client.sendMessage(message.jid,Lang.GIVE_ME_USER,MessageType.text);
        }
    }
	}}));

Asena.addCommand({pattern: 'demote ?(.*)', fromMe: true, desc: Lang.DEMOTE_DESC}, (async (message, match) => {    
    if (message.jid.endsWith('@g.us')) {
	var im = await checkImAdmin(message);
    if (!im) return await message.client.sendMessage(message.jid,Lang.IM_NOT_ADMIN);

    if (Config.DEMOTEMSG == 'default') {
        if (message.reply_message !== false) {
            var checkAlready = await checkImAdmin(message, message.reply_message.data.participant.split('@')[0]);
            if (!checkAlready) {
                return await message.client.sendMessage(message.jid,Lang.ALREADY_NOT_ADMIN, MessageType.text);
            }

            await message.client.sendMessage(message.jid,'@' + message.reply_message.data.participant.split('@')[0] + Lang.DEMOTED, MessageType.text, {contextInfo: {mentionedJid: [message.reply_message.data.participant]}});
            await message.client.groupDemoteAdmin(message.jid, [message.reply_message.data.participant]);
        } else if (message.reply_message === false && message.mention !== false) {
            var etiketler = '';
            message.mention.map(async (user) => {
                var checkAlready = await checkImAdmin(message, user);
                if (!checkAlready) {
                    return await message.client.sendMessage(message.jid,Lang.ALREADY_NOT_ADMIN, MessageType.text);
                }
            
                etiketler += '@' + user.split('@')[0] + ',';
            });

            await message.client.sendMessage(message.jid,etiketler + Lang.DEMOTED, MessageType.text, {contextInfo: {mentionedJid: message.mention}});
            await message.client.groupDemoteAdmin(message.jid, message.mention);
        } else {
            return await message.client.sendMessage(message.jid,Lang.GIVE_ME_USER,MessageType.text);
        }
    }
    else {
        if (message.reply_message !== false) {
            var checkAlready = await checkImAdmin(message, message.reply_message.data.participant.split('@')[0]);
            if (!checkAlready) {
                return await message.client.sendMessage(message.jid,Lang.ALREADY_NOT_ADMIN, MessageType.text);
            }

            await message.client.sendMessage(message.jid,'@' + message.reply_message.data.participant.split('@')[0] + Config.DEMOTEMSG, MessageType.text, {contextInfo: {mentionedJid: [message.reply_message.data.participant]}});
            await message.client.groupDemoteAdmin(message.jid, [message.reply_message.data.participant]);
        } else if (message.reply_message === false && message.mention !== false) {
            var etiketler = '';
            message.mention.map(async (user) => {
                var checkAlready = await checkImAdmin(message, user);
                if (!checkAlready) {
                    return await message.client.sendMessage(message.jid,Lang.ALREADY_NOT_ADMIN, MessageType.text);
                }
            
                etiketler += '@' + user.split('@')[0] + ',';
            });

            await message.client.sendMessage(message.jid,etiketler + Config.DEMOTEMSG, MessageType.text, {contextInfo: {mentionedJid: message.mention}});
            await message.client.groupDemoteAdmin(message.jid, message.mention);
        } else {
            return await message.client.sendMessage(message.jid,Lang.GIVE_ME_USER,MessageType.text);
        }
    }
	}}));

Asena.addCommand({pattern: 'mute ?(.*)', fromMe: true, desc: Lang.MUTE_DESC}, (async (message, match) => {    
    if (message.jid.endsWith('@g.us')) {
	var im = await checkImAdmin(message);
    if (!im) return await message.client.sendMessage(message.jid,Lang.IM_NOT_ADMIN,MessageType.text);
    var mutemin = '_Group closed for ' + match[1] + ' minutes!_'
	var mutehr = '_Group closed for ' + match[1].replace('h','') + ' hour!_'
	var muteday = '_Group closed for ' + match[1].replace('d','') + ' days!_'
		
    if (!match[1]) {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid,Lang.MUTED,MessageType.text);
        }
        else if (match[1] ==='1') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, mutemin,MessageType.text);

            await new Promise(r => setTimeout(r, 60000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='2') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, mutemin,MessageType.text);

            await new Promise(r => setTimeout(r, 120000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='3') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, mutemin,MessageType.text);

            await new Promise(r => setTimeout(r, 180000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='4') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, mutemin,MessageType.text);

            await new Promise(r => setTimeout(r, 240000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='5') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, mutemin,MessageType.text);

            await new Promise(r => setTimeout(r, 300000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='6') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, mutemin,MessageType.text);

            await new Promise(r => setTimeout(r, 360000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='7') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, mutemin,MessageType.text);

            await new Promise(r => setTimeout(r, 420000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='8') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, mutemin,MessageType.text);

            await new Promise(r => setTimeout(r, 480000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='9') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, mutemin,MessageType.text);

            await new Promise(r => setTimeout(r, 540000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='10') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, mutemin,MessageType.text);

            await new Promise(r => setTimeout(r, 600000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='11') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, mutemin,MessageType.text);

            await new Promise(r => setTimeout(r, 660000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='12') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, mutemin,MessageType.text);

            await new Promise(r => setTimeout(r, 720000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='13') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, muteminE,MessageType.text);

            await new Promise(r => setTimeout(r, 780000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='14') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, mutemin,MessageType.text);

            await new Promise(r => setTimeout(r, 840000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='15') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, mutemin,MessageType.text);

            await new Promise(r => setTimeout(r, 900000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='16') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, mutemin,MessageType.text);

            await new Promise(r => setTimeout(r, 960000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='17') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, mutemin,MessageType.text);

            await new Promise(r => setTimeout(r, 1020000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='18') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, mutemin,MessageType.text);

            await new Promise(r => setTimeout(r, 1080000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='19') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, mutemin,MessageType.text);

            await new Promise(r => setTimeout(r, 1140000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='20') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, mutemin,MessageType.text);

            await new Promise(r => setTimeout(r, 1200000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='21') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, mutemin,MessageType.text);

            await new Promise(r => setTimeout(r, 1260000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='22') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, mutemin,MessageType.text);

            await new Promise(r => setTimeout(r, 1320000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='23') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, mutemin,MessageType.text);

            await new Promise(r => setTimeout(r, 1380000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='24') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, mutemin,MessageType.text);

            await new Promise(r => setTimeout(r, 1440000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='25') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, mutemin,MessageType.text);

            await new Promise(r => setTimeout(r, 1500000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='26') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, mutemin,MessageType.text);

            await new Promise(r => setTimeout(r, 1560000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='27') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, mutemin,MessageType.text);

            await new Promise(r => setTimeout(r, 1620000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='28') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, mutemin,MessageType.text);

            await new Promise(r => setTimeout(r, 1680000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='29') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, mutemin,MessageType.text);

            await new Promise(r => setTimeout(r, 1740000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='30') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, mutemin,MessageType.text);

            await new Promise(r => setTimeout(r, 1800000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='31') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, mutemin,MessageType.text);

            await new Promise(r => setTimeout(r, 1860000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='32') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, mutemin,MessageType.text);

            await new Promise(r => setTimeout(r, 1920000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='33') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, mutemin,MessageType.text);

            await new Promise(r => setTimeout(r, 1980000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='34') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, mutemin,MessageType.text);

            await new Promise(r => setTimeout(r, 2040000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='35') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, mutemin,MessageType.text);

            await new Promise(r => setTimeout(r, 2100000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='36') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, mutemin,MessageType.text);

            await new Promise(r => setTimeout(r, 2160000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='37') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, mutemin,MessageType.text);

            await new Promise(r => setTimeout(r, 2220000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='38') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, mutemin,MessageType.text);

            await new Promise(r => setTimeout(r, 2280000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='39') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, mutemin,MessageType.text);

            await new Promise(r => setTimeout(r, 2340000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='40') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, mutemin,MessageType.text);

            await new Promise(r => setTimeout(r, 2400000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='41') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, mutemin,MessageType.text);

            await new Promise(r => setTimeout(r, 2460000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='42') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, mutemin,MessageType.text);

            await new Promise(r => setTimeout(r, 2520000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='43') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, mutemin,MessageType.text);

            await new Promise(r => setTimeout(r, 2580000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='44') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, mutemin,MessageType.text);

            await new Promise(r => setTimeout(r, 2640000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='45') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, mutemin,MessageType.text);

            await new Promise(r => setTimeout(r, 2700000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='46') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, mutemin,MessageType.text);

            await new Promise(r => setTimeout(r, 2760000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='47') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, mutemin,MessageType.text);

            await new Promise(r => setTimeout(r, 2820000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='48') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, mutemin,MessageType.text);

            await new Promise(r => setTimeout(r, 2880000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='49') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, mutemin,MessageType.text);

            await new Promise(r => setTimeout(r, 2940000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='50') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, mutemin,MessageType.text);

            await new Promise(r => setTimeout(r, 3000000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='51') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, mutemin,MessageType.text);

            await new Promise(r => setTimeout(r, 3060000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='52') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, mutemin,MessageType.text);

            await new Promise(r => setTimeout(r, 3120000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='53') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, mutemin,MessageType.text);

            await new Promise(r => setTimeout(r, 3180000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='54') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, mutemin,MessageType.text);

            await new Promise(r => setTimeout(r, 3240000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='55') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, mutemin,MessageType.text);

            await new Promise(r => setTimeout(r, 3300000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='56') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, mutemin,MessageType.text);

            await new Promise(r => setTimeout(r, 3360000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='57') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, mutemin,MessageType.text);

            await new Promise(r => setTimeout(r, 3420000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='58') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, mutemin,MessageType.text);

            await new Promise(r => setTimeout(r, 3480000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='59') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, mutemin,MessageType.text);

            await new Promise(r => setTimeout(r, 3540000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='1h') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid, mutehr,MessageType.text);

            await new Promise(r => setTimeout(r, 3600000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='2h') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid,mutehr,MessageType.text);

            await new Promise(r => setTimeout(r, 7200000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='3h') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid,mutehr,MessageType.text);

            await new Promise(r => setTimeout(r, 10800000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='4h') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid,mutehr,MessageType.text);

            await new Promise(r => setTimeout(r, 14400000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='5h') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid,mutehr,MessageType.text);

            await new Promise(r => setTimeout(r, 18000000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='6h') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid,mutehr,MessageType.text);

            await new Promise(r => setTimeout(r, 21600000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='7h') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid,mutehr,MessageType.text);

            await new Promise(r => setTimeout(r, 25200000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='8h') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid,mutehr,MessageType.text);

            await new Promise(r => setTimeout(r, 28800000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='9h') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid,mutehr,MessageType.text);

            await new Promise(r => setTimeout(r, 32400000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='10h') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid,mutehr,MessageType.text);

            await new Promise(r => setTimeout(r, 36000000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='11h') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid,mutehr,MessageType.text);

            await new Promise(r => setTimeout(r, 39600000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='12h') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid,mutehr,MessageType.text);

            await new Promise(r => setTimeout(r, 43200000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='1d') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid,muteday,MessageType.text);

            await new Promise(r => setTimeout(r, 86400000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='2d') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid,muteday,MessageType.text);

            await new Promise(r => setTimeout(r, 172800000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else if (match[1] ==='3d') {
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, true);
            await message.client.sendMessage(message.jid,muteday,MessageType.text);

            await new Promise(r => setTimeout(r, 259200000));
    
            await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
            await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
        }
        else {
            return await message.client.sendMessage(message.jid, mut.TÜR, MessageType.text);
        }
    }}));

Asena.addCommand({pattern: 'unmute ?(.*)', fromMe: true, desc: Lang.UNMUTE_DESC}, (async (message, match) => {    
    if (message.jid.endsWith('@g.us')) {
	var im = await checkImAdmin(message);
    if (!im) return await message.client.sendMessage(message.jid,Lang.IM_NOT_ADMIN,MessageType.text);

    if (Config.UNMUTEMSG == 'default') {
        await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
        await message.client.sendMessage(message.jid,Lang.UNMUTED,MessageType.text);
    }
    else {
        await message.client.groupSettingChange(message.jid, GroupSettingChange.messageSend, false);
        await message.client.sendMessage(message.jid,Config.UNMUTEMSG,MessageType.text);
    }
}}));

Asena.addCommand({pattern: 'invite ?(.*)', fromMe: true, desc: Lang.INVITE_DESC}, (async (message, match) => {    
    if (message.jid.endsWith('@g.us')) {
	var im = await checkImAdmin(message);
    if (!im) return await message.client.sendMessage(message.jid,Lang.IM_NOT_ADMIN, MessageType.text);
    var invite = await message.client.groupInviteCode(message.jid);
    await message.client.sendMessage(message.jid,Lang.INVITE + ' https://chat.whatsapp.com/' + invite, MessageType.text);
}}));

Asena.addCommand({pattern: 'revoke', fromMe: true, desc: "Revokes/resets group's invite link"}, (async (message, match) => {    
    if (message.jid.endsWith('@g.us')) {
	var im = await checkImAdmin(message);
    if (!im) return await message.client.sendMessage(message.jid, "_Promote bot as an *Admin* to use super commands_", MessageType.text);
    await message.client.revokeInvite(message.jid)
    await message.client.sendMessage(message.jid, "_*Group link* reset successfully!_", MessageType.text);
	}}))

module.exports = {
    checkImAdmin: checkImAdmin
};
