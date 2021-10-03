/* Copyright (C) 2020 plk
afnplk
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
    var TLINK_on = ''
    var TLINK_off = ''
   
    if (config.LANG == 'EN') {
        l_dsc = 'remove for all link'
        alr_on = '!'
        alr_off = '!'
        LINKT_on = '*M_LINK TURNED ON*'
        LINKT_off = '*M_LINK TURNED OFF*'
    }
    if (config.LANG == 'ML') {
        l_dsc = '.'
        alr_on = '!'
        alr_off = '!'
        LINKT_on = 'M_LINK TURNED ON'
        LINKT_off = 'M_LINK TURNED Off'
    }
   
    Asena.addCommand({pattern: 'mlink ?(.*)', fromMe: true, desc: l_dsc, usage: '.mlink on / of' }, (async (message, match) => {
        if (match[1] == 'off') {
                await heroku.patch(baseURI + '/config-vars', { 
                    body: { 
                        ['ALL_LINK_BAN']: 'false'
                    } 
                });
                await message.sendMessage(LINKT_off)
        } else if (match[1] == 'on') {
                await heroku.patch(baseURI + '/config-vars', { 
                    body: { 
                        ['ALL_LINK_BAN']: 'true'
                    } 
                });
                await message.sendMessage(LINKT_on)
        }
    }));
