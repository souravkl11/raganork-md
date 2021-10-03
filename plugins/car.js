const Raganork = require('../events');
const {MessageType, MessageOptions, Mimetype} = require('@adiwajshing/baileys');
const axios = require ('axios')
const LOAD_ING = "*Loading image...*"
const Config = require('../config');

if (Config.WORKTYPE == 'private') {
  
  Raganork.addCommand({pattern: 'car ?(.*)', fromMe: true, desc: 'Sends random car wallpaper' , dontAddCommandList: true }, async (message, match) => {

      var souravkl11 = await axios.get('https://server-api-rey.herokuapp.com/api/wallpaper/mobil?apikey=apirey', { responseType: 'arraybuffer' })
   
    await message.sendMessage(Buffer(souravkl11.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

        });
    }
 
if (Config.WORKTYPE == 'public') {
    
  Raganork.addCommand({pattern: 'car ?(.*)', fromMe: false, desc: 'Sends random car wallpaper' , dontAddCommandList: true }, async (message, match) => {

      var souravkl11 = await axios.get('https://server-api-rey.herokuapp.com/api/wallpaper/mobil?apikey=apirey', { responseType: 'arraybuffer' })
   
    await message.sendMessage(Buffer(souravkl11.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

        });
    }
