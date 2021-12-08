// credit - souravkl11
const axios = require('axios');
const New = require('../events');
const {MessageType,Mimetype} = require('@adiwajshing/baileys');
const config = require('../config');
const Heroku = require('heroku-client');
const heroku = new Heroku({token: config.HEROKU.API_KEY});
let baseURI = '/apps/' + config.HEROKU.APP_NAME;
New.addCommand({ pattern: 'setlogo ?(.*)', fromMe: true}, (async (message, match) => {
        if (match[1] == '') {return await message.sendMessage('_Need an image link!_')}
         else if (!match[1].includes('jpeg')) {return await message.sendMessage('_Image link invalid_ ❌ \n _Use command *.url* to get image link!_')}
          else {
var newimg = await axios.get(match[1], { responseType: 'arraybuffer' })
   
    await message.sendMessage(Buffer.from(newimg.data), MessageType.image, {mimetype: Mimetype.jpg, caption: "_Added new image! Restarting..._"})
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
        else if (match[1] === 'off') {
         await heroku.patch(baseURI + '/config-vars', {
            body: {
                ['M_REPLY_VAR']: 'false'
            }
        });  
         await message.sendMessage("_Mention reply turned off. Restarting.._")
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
New.addCommand({ pattern: 'antifake ?(.*)', fromMe: true}, (async (message, match) => {
        if (!match[1]) {
          return await message.sendMessage('Need a response! \n .antifake on or off')
        }
         else if (match[1] === 'on') {
         await heroku.patch(baseURI + '/config-vars', {
            body: {
                ['ANTI_FAKE']: 'true'
            }
        });  
         await message.sendMessage("_Auto fake remove turned on! Restarting.._")
         }
        else if (match[1] === 'off') {
         await heroku.patch(baseURI + '/config-vars', {
            body: {
                ['ANTI_FAKE']: 'false'
            }
        });  
         await message.sendMessage("_Auto fake remove turned off. Restarting.._")
         }
    }));

New.addCommand({ pattern: 'mycode ?(.*)', fromMe: true}, (async (message, match) => {
        if (!match[1]) {
          return await message.sendMessage('Need a response! \n .mycode 91')
        }
         await heroku.patch(baseURI + '/config-vars', {
            body: {
                ['C_CODE']: match[1]
            }
        });  
         await message.sendMessage("_Auto fake country code set!.._")
            }));
