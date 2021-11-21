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
         else if (!match[1].endsWith('.jpg' || '.jpeg' || '.png')) {
           return await message.sendMessage('_INVALID IMAGE LINK ❌_')
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
