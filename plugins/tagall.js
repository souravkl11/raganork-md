/* Copyright (C) 2020 Yusuf Usta.
Licensed under the  GPL-3.0 License;
you may not use this file except in compliance with the License.
WhatsAsena - Yusuf Usta
*/

const Asena = require('../events');
const {MessageType} = require('@adiwajshing/baileys');
const Config = require('../config');

const Language = require('../language');
const Lang = Language.getString('tagall');
const SLang = Language.getString('scrapers');

async function checkImAdmin(message, user = message.client.user.jid) {
    var grup = await message.client.groupMetadata(message.jid);
    var sonuc = grup['participants'].map((member) => {
        if (member.jid.split('@')[0] === user.split('@')[0] && member.isAdmin) return true; else; return false;
    });
    return sonuc.includes(true);
}

Asena.addCommand({pattern: 'tagall ?(.*)', fromMe: true, desc: Lang.TAGALL_DESC }, (async (message, match) => {
    var im = await checkImAdmin(message);
    if (!im) return await message.client.sendMessage(message.jid,Lang.ADMİN,MessageType.text);

    if (!message.reply_message) {
        if (match[1] !== '') {
            grup = await message.client.groupMetadata(message.jid);
            var jids = [];
            mesaj = '';
            grup['participants'].map(
                async (uye) => {
                    mesaj += '@' + uye.id.split('@')[0] + ' ';
                    jids.push(uye.id.replace('c.us', 's.whatsapp.net'));
                }
            );
            await message.client.sendMessage(message.jid,`${match[1]}`, MessageType.extendedText, {contextInfo: {mentionedJid: jids}, previewType: 0})
        }
        else if (match[1] == '') {
            grup = await message.client.groupMetadata(message.jid);
            var jids = [];
            mesaj = '';
            grup['participants'].map(
                async (uye) => {
                    mesaj += '▫️ @' + uye.id.split('@')[0] + '\n';
                    jids.push(uye.id.replace('c.us', 's.whatsapp.net'));
                }
            );
            await message.client.sendMessage(message.jid,mesaj, MessageType.extendedText, {contextInfo: {mentionedJid: jids}, previewType: 0})
        }
    }
    else if (message.reply_message) {
        grup = await message.client.groupMetadata(message.jid);
        var jids = [];
        mesaj = '';
        grup['participants'].map(
            async (uye) => {
                mesaj += '@' + uye.id.split('@')[0] + ' ';
                jids.push(uye.id.replace('c.us', 's.whatsapp.net'));
            }
        );
        var tx = message.reply_message.text
        await message.client.sendMessage(message.jid,tx, MessageType.extendedText, {contextInfo: {mentionedJid: jids}, previewType: 0})
    }
}));
var stag_dsc = ''
if (Config.LANG == 'TR') stag_dsc = 'Yanıtlanan mesajı gruptaki tüm üyelere gönderir.'
if (Config.LANG == 'EN') stag_dsc = 'Sends the replied message to all members in the group.'
if (Config.LANG == 'AZ') stag_dsc = 'Cavablanmış mesajı qrupdakı bütün üzvlərə göndərir.'
if (Config.LANG == 'RU') stag_dsc = 'Отправляет ответное сообщение всем участникам группы.'
if (Config.LANG == 'HI') stag_dsc = 'उत्तर दिया गया संदेश समूह के सभी सदस्यों को भेजता है'
if (Config.LANG == 'ES') stag_dsc = 'Envía el mensaje de respuesta a todos los miembros del grupo.'
if (Config.LANG == 'ML') stag_dsc = 'ഗ്രൂപ്പിലെ എല്ലാ അംഗങ്ങൾക്കും മറുപടി സന്ദേശം അയയ്ക്കുന്നു.'
if (Config.LANG == 'ID') stag_dsc = 'Mengirim pesan balasan ke semua anggota dalam grup.'
if (Config.LANG == 'PT') stag_dsc = 'Envia a mensagem respondida a todos os membros do grupo.'

Asena.addCommand({pattern: 'stam$', fromMe: true, desc: stag_dsc }, (async (message, match) => {
    if (!message.reply_message) return await message.client.sendMessage(message.jid,SLang.NEED_REPLY, MessageType.text)
    grup = await message.client.groupMetadata(message.jid);
    var jids = [];
    mesaj = '';
    grup['participants'].map(async (uye) => {
        await message.client.sendMessage(uye.jid, message.reply_message.text, MessageType.text)
    })
}));
