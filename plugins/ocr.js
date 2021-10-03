/* Copyright (C) 2020 Yusuf Usta.

Licensed under the  GPL-3.0 License;
you may not use this file except in compliance with the License.

WhatsAsena - Yusuf Usta
Thanks to github/@justinthoms for base and helps.
*/

const Asena = require('../events');
const Config = require('../config');
const {MessageType} = require('@adiwajshing/baileys');
const tesseract = require("node-tesseract-ocr")
const langs = require('langs');
const Language = require('../language');
const Lang = Language.getString('ocr');

if (Config.WORKTYPE == 'private') {

    Asena.addCommand({pattern: 'ocr ?(.*)', fromMe: true, desc: Lang.OCR_DESC}, (async (message, match) => { 

        if (message.reply_message === false) return await message.sendMessage(Lang.NEED_REPLY);    
	var info = await message.reply(Lang.DOWNLOADING);
        var location = await message.client.downloadAndSaveMediaMessage({
            key: {
                remoteJid: message.reply_message.jid,
                id: message.reply_message.id
            },
            message: message.reply_message.data.quotedMessage
        });

        var dil;
        if (match[1] !== '') {
            dil = langs.where("1", match[1]);
        } else {
            dil = langs.where("1", Config.LANG.toLowerCase());
        }

        try {
            var result = await tesseract.recognize(location, {
                lang: dil[2]
            });    
        } catch (e) {
            return await message.reply(Lang.ERROR.format(e));
        }

        await info.delete();
        if ( result === ' ' || result.length == 1 ) {
            return await message.reply(Lang.ERROR.format(' Empty text'));
        }

        return await message.reply(Lang.RESULT.format(dil[2], result));
    }));
}
else if (Config.WORKTYPE == 'public') {

    Asena.addCommand({pattern: 'ocr ?(.*)', fromMe: false, desc: Lang.OCR_DESC}, (async (message, match) => { 

        if (message.reply_message === false) return await message.sendMessage(Lang.NEED_REPLY);    
	var info = await message.reply(Lang.DOWNLOADING);
        var location = await message.client.downloadAndSaveMediaMessage({
            key: {
                remoteJid: message.reply_message.jid,
                id: message.reply_message.id
            },
            message: message.reply_message.data.quotedMessage
        });

        var dil;
        if (match[1] !== '') {
            dil = langs.where("1", match[1]);
        } else {
            dil = langs.where("1", Config.LANG.toLowerCase());
        }

        try {
            var result = await tesseract.recognize(location, {
                lang: dil[2]
            });    
        } catch (e) {
            return await message.reply(Lang.ERROR.format(e));
        }

        await info.delete();
        if ( result === ' ' || result.length == 1 ) {
            return await message.reply(Lang.ERROR.format(' Empty text'));
        }

        return await message.reply(Lang.RESULT.format(dil[2], result));
    }));
    Asena.addCommand({pattern: 'ocr ?(.*)', fromMe: true, desc: Lang.OCR_DESC, dontAddCommandList: true}, (async (message, match) => { 

        if (message.reply_message === false) return await message.sendMessage(Lang.NEED_REPLY);    
	var info = await message.reply(Lang.DOWNLOADING);
        var location = await message.client.downloadAndSaveMediaMessage({
            key: {
                remoteJid: message.reply_message.jid,
                id: message.reply_message.id
            },
            message: message.reply_message.data.quotedMessage
        });

        var dil;
        if (match[1] !== '') {
            dil = langs.where("1", match[1]);
        } else {
            dil = langs.where("1", Config.LANG.toLowerCase());
        }

        try {
            var result = await tesseract.recognize(location, {
                lang: dil[2]
            });    
        } catch (e) {
            return await message.reply(Lang.ERROR.format(e));
        }

        await info.delete();
        if ( result === ' ' || result.length == 1 ) {
            return await message.reply(Lang.ERROR.format(' Empty text'));
        }

        return await message.reply(Lang.RESULT.format(dil[2], result));
    }));
}
