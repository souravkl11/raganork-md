// credit - souravkl11

const New = require('../events');
const config = require('../config');
const Heroku = require('heroku-client');
const heroku = new Heroku({
    token: config.HEROKU.API_KEY
});
let baseURI = '/apps/' + config.HEROKU.APP_NAME;

New.addCommand({ pattern: 'setlogo ?(.*)', fromMe: true}, (async (message, match) => {
        
        if (match[1] == '') {
          return await message.sendMessage('NEED AN IMAGE LINK!')
        }
         else if (!match[1].endsWith('.jpg') || !match[1].endsWith('.jpeg') || !match[1].endsWith('.png')) {
           return await message.sendMessage('_Image link invalid ❌ \n Use command .url to get image link!_')
         }
          else {
            await heroku.patch(baseURI + '/config-vars', {
            body: {
                ['ALL_IMG']: match[1]
            }
        });
          }
        await message.sendMessage("_BOT IMAGE/LOGO CHANGED! RESTARTING AND APPLYING CHANGES_")
    }));

New.addCommand({ pattern: 'mreply ?(.*)', fromMe: true}, (async (message, match) => {
        
        if (!match[1]) {
          return await message.sendMessage('Need a response! \n .mreply on \n or \n .mreply Message')
        }
         else if (match[1] === 'on') {
         await heroku.patch(baseURI + '/config-vars', {
            body: {
                ['M_REPLY_VAR']: 'true'
            }
        });  
         await message.sendMessage("_Mention reply turned on! Restarting.._")
         }
          else {
            await heroku.patch(baseURI + '/config-vars', {
            body: {
                ['M_REPLY']: match[1]
            }
        });
        await message.sendMessage("_Added mention reply message! Restarting.._")
          }
        
    }));
