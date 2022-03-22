// credit - souravkl11
const axios = require('axios');
const {skbuffer} = require('raganork-bot');
const New = require('../events');
const {MessageType,Mimetype} = require('@adiwajshing/baileys');
const config = require('../config');
const Heroku = require('heroku-client');
const heroku = new Heroku({token: config.HEROKU.API_KEY});
let baseURI = '/apps/' + config.HEROKU.APP_NAME;
New.addCommand({ pattern: 'setlogo ?(.*)', fromMe: true}, (async (message, match) => {
        if (match[1] == '') {return await message.sendMessage('_Need an image link!_')}
var newimg;
         try { newimg = await skbuffer(match[1]) } catch {await message.sendMessage('_Image link invalid_ ❌ \n _Use command *.url* to get image link!_')}
   
    await message.sendMessage(newimg, MessageType.image, {mimetype: Mimetype.jpg, caption: "_Added new image! Restarting..._", quoted:message.data})
    await heroku.patch(baseURI + '/config-vars', {
            body: {
                ['ALL_IMG']: match[1]
            }
        });
          
        }));

New.addCommand({ pattern: 'mreply ?(.*)', fromMe: true}, (async (message, match) => {
        
        if (!match[1] && !message.reply_message) {
          return await message.sendMessage('Need a response! \n .mreply on/off \n or \n .mreply Message \n or reply to any message')
        }
         else if (match[1] === 'on') {
         await heroku.patch(baseURI + '/config-vars', {
            body: {
                ['M_REPLY_VAR']: 'true'
            }
        });  
         await message.sendMessage("_Mention reply turned on! Restarting._")
         }
        else if (match[1] === 'off') {
         await heroku.patch(baseURI + '/config-vars', {
            body: {
                ['M_REPLY_VAR']: 'false'
            }
        });  
         await message.sendMessage("_Mention reply turned off. Restarting._")
         }
         else if (message.reply_message.text) {
            await heroku.patch(baseURI + '/config-vars', {
               body: {
                   ['M_REPLY']: message.reply_message.text
               }
           });  
            await message.sendMessage("_New mention reply added. Restarting._")
            }
          else {
            await heroku.patch(baseURI + '/config-vars', {
            body: {
                ['M_REPLY']: match[1]
            }
        });
        await message.sendMessage("_Added mention reply message! Restarting._")
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
