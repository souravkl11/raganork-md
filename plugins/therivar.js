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
        l_dsc = 'chilla theri vilichaal spot kick. -bot owner command'
        alr_on = 'Antilink is already open!'
        alr_off = 'Antilink is currently closed!'
        THERI_on = '*Anti theri mode activated. May kick when using some bad words*'
        THERI_off = '*Anti theri mode deactivated. Theri vilicho no problem*'
    }
   
    if (config.LANG == 'HI') {
        l_dsc = 'एंटीलिंक टूल को सक्रिय करता है।'
        alr_on = 'एंटीलिंक पहले से ही खुला है!'
        alr_off = 'एंटीलिंक वर्तमान में बंद है!'
        THERI_on = 'bgm option turndा!'
        THERI_off = 'bgm option turned off'
    }
    if (config.LANG == 'ML') {
        l_dsc = 'ആന്റിലിങ്ക് ഉപകരണം സജീവമാക്കുന്നു.'
        alr_on = 'ആന്റിലിങ്ക് ഇതിനകം തുറന്നു!'
        alr_off = 'ആന്റിലിങ്ക് നിലവിൽ അടച്ചിരിക്കുന്നു!'
        THERI_on = 'ഇനി തെറി വിളിച്ചാൽ ഗ്രൂപ്പിൽ നിന്ന് പുറത്താക്കും. ബോട്ട് പുനരാരംഭിക്കുന്നു'
        THERI_off = 'ഇനി ഗ്രൂപ്പിൽ എന്ത് തെറി വേണെങ്കിലും വിളിക്കാം'
    }
   
    Asena.addCommand({pattern: 'therikick ?(.*)', fromMe: true, desc: l_dsc, usage: '.theri no / yes' }, (async (message, match) => {
        if (match[1] == 'off') {
                await heroku.patch(baseURI + '/config-vars', { 
                    body: { 
                        ['THERI_KICK']: 'false'
                    } 
                });
                await message.sendMessage(THERI_off)
        } else if (match[1] == 'on') {
                await heroku.patch(baseURI + '/config-vars', { 
                    body: { 
                        ['THERI_KICK']: 'true'
                    } 
                });
                await message.sendMessage(THERI_on)
        }
    }));
