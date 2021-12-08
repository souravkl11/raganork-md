// credit - souravkl11
const axios = require('axios');
const New = require('../events');
const config = require('../config');
const Heroku = require('heroku-client');
const heroku = new Heroku({token: config.HEROKU.API_KEY});
let baseURI = '/apps/' + config.HEROKU.APP_NAME;
New.addCommand({ pattern: 'setlogo ?(.*)', fromMe: true}, (async (message, match) => {
        if (match[1] == '') {return await message.sendMessage('_Need an image link!_')}
         else if (!match[1].includes('jpg')) {return await message.sendMessage('_Image link invalid_ ❌ \n _Use command *.url* to get image link!_')}
          else {
var newimg = await axios.get(match[1], { responseType: 'arraybuffer' })
   
    await message.sendMessage(Buffer(newimg.data), MessageType.image, {mimetype: Mimetype.jpg, caption: "_Added new image! Restarting..._"})
    await heroku.patch(baseURI + '/config-vars', {
            body: {
                ['ALL_IMG']: match[1]
            }
        });
          }
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
