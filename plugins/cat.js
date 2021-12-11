const Raganork = require('../events');
const {MessageType, MessageOptions, Mimetype} = require('@adiwajshing/baileys');
const axios = require ('axios')
const LOAD_ING = "*Loading image...*"
const Config = require('../config');
let sourav = Config.WORKTYPE == 'public' ? false : true

  Raganork.addCommand({pattern: 'cat ?(.*)', fromMe: sourav, desc: 'Sends random car wallpaper' , dontAddCommandList: true }, async (message, match) => {

      var souravkl11 = await axios.get('https://server-api-rey.herokuapp.com/api/wallpaper/kucing?apikey=apirey', { responseType: 'arraybuffer' })
   
    await message.sendMessage(Buffer(souravkl11.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

        });
        Raganork.addCommand({pattern: 'car ?(.*)', fromMe: sourav, desc: 'Sends random car wallpaper' , dontAddCommandList: true }, async (message, match) => {

          var souravkl11 = await axios.get('https://server-api-rey.herokuapp.com/api/wallpaper/mobil?apikey=apirey', { responseType: 'arraybuffer' })
       
        await message.sendMessage(Buffer(souravkl11.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})
    
        })