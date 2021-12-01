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
    var THERI_on = ''
    var THERI_off = ''
   
    if (config.LANG == 'EN') {
        anti_on = '_Anti word mode activated! Restarting.._'
        anti_off = '_Anti word mode deactivated! Restarting.._'
    }
    if (config.LANG == 'ML') {
        anti_on = 'ഇനി ചില ഫിൽട്ടർ വാക്കുകൾ ഉപയോഗിച്ചാൽ ഗ്രൂപ്പിൽ നിന്ന് നീക്കം ചെയ്യപ്പെടും. ബോട്ട് പുനരാരംഭിക്കുന്നു'
        anti_off = 'ഇനി ഗ്രൂപ്പിൽ നിങ്ങൾക്ക് ഏത് വാക്കുകളും ഉപയോഗിക്കാംകാം'
    }
   
    Asena.addCommand({pattern: 'antiword ?(.*)', fromMe: true, desc: 'Turns on anti word mode! Will be kicked when using some filtered words', usage: '.antiword on / off or .antiword Word1,Word2,etc' }, (async (message, match) => {
        if (match[1] == 'off') {
                await heroku.patch(baseURI + '/config-vars', { 
                    body: { 
                        ['ANTI_KICK']: 'false'
                    } 
                });
                await message.sendMessage(anti_off)
        } else if (match[1] == 'on') {
                await heroku.patch(baseURI + '/config-vars', { 
                    body: { 
                        ['ANTI_KICK']: 'true'
                    } 
                });
                await message.sendMessage(anti_on)
        }
        else if (match[1].includes(',')) {
                await heroku.patch(baseURI + '/config-vars', { 
                    body: { 
                        ['REMOVE_FILTER']: match[1]
                    } 
                });
                await message.sendMessage('Added ' + match[1] + ' to filtered words!')
        }
    }));
