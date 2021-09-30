/* Copyright (C) 2020 Yusuf Usta.
Licensed under the  GPL-3.0 License;
you may not use this file except in compliance with the License.
WhatsAsena - Yusuf Usta
*/

const Asena = require('../events');
const config = require('../config');
const Heroku = require('heroku-client');
const heroku = new Heroku({
    token: config.HEROKU.API_KEY
});
let baseURI = '/apps/' + config.HEROKU.APP_NAME;

   var l_dsc = ''
    var alr_on = ''
    var alr_off = ''
    var BGM_on = ''
    var BGM_off = ''
    var STICKER_on = ''
    var STICKER_off = ''
    
    if (config.LANG == 'TR') {
        
        STICKER_on = 'Sticker reply on!'
        STICKER_off = 'Sticker reply turned off'
        Y_dsc = 'Turns sticker On and Off'
        l_dsc = 'Antilink aracını etkinleştirir.'
        alr_on = 'Antilink halihazırda açık!'
        alr_off = 'Antilink halihazırda kapalı!'
        BGM_on = 'bgm option turned on!'
        BGM_off = 'bgm option turned off'
    }
    if (config.LANG == 'EN') {

        Y_dsc = 'Turns sticker On and Off'
        l_dsc = 'turn on and turn of bgm. -bot owner command'
        alr_on = 'Antilink is already open!'
        alr_off = 'Antilink is currently closed!'
        BGM_on = 'bgm option turned on!'
        BGM_off = 'bgm option turned off'
        STICKER_on = 'Sticker reply on!'
        STICKER_off = 'Sticker reply turned off'

    }
    if (config.LANG == 'AZ') {

        STICKER_on = 'Sticker reply on!'
        STICKER_off = 'Sticker reply turned off'
        Y_dsc = 'Turns sticker On and Off'
        l_dsc = 'Antilink alətini aktivləşdirir.'
        alr_on = 'Antilink hazırda açıqdır!'
        alr_off = 'Antilink hazırda bağlıdır!'
        BGM_on = '*bgm option turned on*'
        BGM_off = '*bgm option turned off*'
    }
    if (config.LANG == 'HI') {

        STICKER_on = 'Sticker reply on!'
        STICKER_off = 'Sticker reply turned off'
        Y_dsc = 'Turns sticker On and Off'
        l_dsc = 'एंटीलिंक टूल को सक्रिय करता है।'
        alr_on = 'एंटीलिंक पहले से ही खुला है!'
        alr_off = 'एंटीलिंक वर्तमान में बंद है!'
        BGM_on = 'bgm option turndा!'
        BGM_off = 'bgm option turned off'
    }
    if (config.LANG == 'ML') {
        Y_dsc = 'Turns sticker On and Off'
        l_dsc = 'ആന്റിലിങ്ക് ഉപകരണം സജീവമാക്കുന്നു.'
        alr_on = 'ആന്റിലിങ്ക് ഇതിനകം തുറന്നു!'
        alr_off = 'ആന്റിലിങ്ക് നിലവിൽ അടച്ചിരിക്കുന്നു!'
        BGM_on = 'bgm option turned on'
        BGM_off = 'bgm option turned off'
        STICKER_on = '*ini stickers Varum!*'
        STICKER_off = '*Ini stickers varilla!*'

    }
    if (config.LANG == 'PT') {

        l_dsc = 'Ativa a ferramenta Antilink.'
        alr_on = 'O Antilink já está aberto!'
        alr_off = 'Antilink está fechado no momento!'
        BGM_on = 'bgm option turned on'
        BGM_off = 'bgm option turned off'
    }
    if (config.LANG == 'RU') {
        
        STICKER_on = 'Sticker reply on!'
        STICKER_off = 'Sticker reply turned off'
        l_dsc = 'Активирует инструмент Antilink.'
        alr_on = 'Антилинк уже открыт!'
        alr_off = 'Антилинк сейчас закрыт!'
        BGM_on = 'Антилинк успешно открыт!'
        BGM_off = 'bgm option turned off'
    }
    if (config.LANG == 'ES') {

        STICKER_on = 'Sticker reply on!'
        STICKER_off = 'Sticker reply turned off'
        l_dsc = 'Activa la herramienta Antilink.'
        alr_on = '¡Antilink ya está abierto!'
        alr_off = '¡Antilink está cerrado actualmente!'
        BGM_on = 'bgm option turned on'
        BGM_off = 'bgm option turned off!'
    }
    if (config.LANG == 'ID') {

        STICKER_on = 'Sticker reply on!'
        STICKER_off = 'Sticker reply turned off'
        l_dsc = 'Mengaktifkan alat Antilink.'
        alr_on = 'Antilink sudah terbuka!'
        alr_off = 'Antilink saat ini ditutup!'
        BGM_on = 'bgm option turned on'
        BGM_off = 'bgm option turned off'
    }
    Asena.addCommand({pattern: 'bgm ?(.*)', fromMe: true, desc: l_dsc, usage: '.bgm on / off' }, (async (message, match) => {
        if (match[1] == 'off') {
                await heroku.patch(baseURI + '/config-vars', { 
                    body: { 
                        ['BGM_FILTER']: 'false'
                    } 
                });
                await message.sendMessage(BGM_off)
        } else if (match[1] == 'on') {
                await heroku.patch(baseURI + '/config-vars', { 
                    body: { 
                        ['BGM_FILTER']: 'true'
                    } 
                });
                await message.sendMessage(BGM_on)
        }
    }));

    Asena.addCommand({pattern: 'sticker ?(.*)', fromMe: true, desc: 'Turns Sticker on/off', usage: '.sticker on / off' }, (async (message, match) => {
        if (match[1] == 'off') {
                await heroku.patch(baseURI + '/config-vars', { 
                    body: { 
                        ['AUTO_STICKER']: 'false'
                    } 
                });
                await message.sendMessage(STICKER_off)
        } else if (match[1] == 'on') {
                await heroku.patch(baseURI + '/config-vars', { 
                    body: { 
                        ['AUTO_STICKER']: 'true'
                    } 
                });
                await message.sendMessage(STICKER_on)
        }
    }));

    Asena.addCommand({ pattern: 'sudo ?(.*)', fromMe: true, desc: 'changes sudo numbers', usage: '.sudo *your number*' }, (async (message, match) => {
        if (match[1] == '') return await message.sendMessage('NEED A NUMBER')
        await heroku.patch(baseURI + '/config-vars', {
            body: {
                ['SUDO']: match[1]
            }
        });
        await message.sendMessage("NEW SUDO UPDATED")
    }));

    Asena.addCommand({ pattern: 'caption ?(.*)', fromMe: true, desc: 'changes all captions', usage: '.caption *Made by Raganork*' }, (async (message, match) => {
        if (match[1] == '') return await message.sendMessage('NEED cA CAPTION')
        await heroku.patch(baseURI + '/config-vars', {
            body: {
                ['ALL_CAPTION']: match[1]
            }
        });
        await message.sendMessage("NEW CAPTION UPDATED")
   
    }));


    Asena.addCommand({ pattern: 'botname ?(.*)', fromMe: true, desc: 'change your bot name', usage: '.botname *name* ' }, (async (message, match) => {
        if (match[1] == '') return await message.sendMessage('TYPE YOUR NEW BOT NAME')
        await heroku.patch(baseURI + '/config-vars', {
            body: {
                ['BOT_NAME']: match[1]
            }
        });
        await message.sendMessage("BOT NAME CHANGED SUCCESSFULLY ✅")
    }));
