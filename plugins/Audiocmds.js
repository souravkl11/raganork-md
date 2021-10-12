const skl = require('../events');
const {MessageType} = require('@adiwajshing/baileys');
const axios = require ('axios')
const Config = require('../config');

 if (Config.WORKTYPE == 'private') {
    skl.addCommand({pattern: 'audio ?(.*)', fromMe: true, desc: 'Gives audio commands' , dontAddCommandList: true }, async (message, match) => {

        const {data} = await axios(`https://gist.github.com/souravkl11/f9a683c137a67af4133f62b60951f973`)
        const { souravkl11 } = data
        await message.client.sendMessage(message.jid, souravkl11, MessageType.text, { quoted: message.data });
   });
    }
 
if (Config.WORKTYPE == 'public') {
    skl.addCommand({pattern: 'audio ?(.*)', fromMe: false, desc: 'Gives audio commands' , dontAddCommandList: true }, async (message, match) => {

        const {data} = await axios(`https://gist.github.com/souravkl11/f9a683c137a67af4133f62b60951f973`)
        const { souravkl11 } = data
        await message.client.sendMessage(message.jid, souravkl11, MessageType.text, { quoted: message.data });
   });
    }
