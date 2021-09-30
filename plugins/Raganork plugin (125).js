const Asena = require('../events');

const {MessageType, MessageOptions, Mimetype} = require('@adiwajshing/baileys');

const fs = require('fs');

const axios = require('axios');

const Config = require('../config');

const Language = require('../language');

const Lang = Language.getString('ttp');

Asena.addCommand({pattern: 'logo', fromMe: false, desc: Lang.TXTTOIMG_DESC}, (async (message, match) => {    

       

    await message.sendMessage('\n*ALL LOGOS MAY NOT WORK PROPERLY*\n\n\n❣Usage: *.glitch*\n🛠️Desc: It Sends a glitch style image of the text provided\nYou must enter the heading and subheading seperated by */* in order!.\n\n🧚‍♻️Usage: *.gradient*\n🛠️Desc: it makes gradient text\n\n🧚‍♻️Usage: *.vintage*\n🛠️Desc: it makes Vintage  text\n\n🧚‍♻️Usage: *.glue*\n🛠️Desc: it makes 3D Glue text\n\n🧚‍♻️Usage: *.balloon*\n🛠️Desc: it makes Balloon text\n\n🧚‍♻️Usage: *.1917*\n🛠️Desc: it makes 1917 font text\n\n🧚‍♻️Usage: *.holo*\n🛠️Desc: it makes 3D holographic  text\n\n🧚‍♻️Usage: *.silver*\n🛠️Desc: it makes silver metal text\n\n🧚‍♻️Usage: *.blue*\n🛠️Desc: it makes Blue metal text\n\n🧚‍♻️Usage: *.fabric*\n🛠️Desc: it makes Fabric text\n\n🧚‍♻️Usage: *.avengers*\n🛠️Desc: it makes avengers text\n\n🧚‍♻️Usage: *.logomarvel*\n🛠️Desc: it makes Marvel logo text\n\n🧚‍♻️Usage: *.metallic*\n🛠️Desc: it makes silver metal  text\n\n🧚‍♻️Usage: *.rosegold*\n🛠️Desc: it makes Rose gold text\n\n🧚‍♻️Usage: *.metalgold*\n🛠️Desc:it makes metal gold  text\n\n🧚‍♻️Usage: *.galaxy*\n🛠️Desc: it makes metal galaxy text\n\n🧚‍♻️Usage: *.lion*\n🛠️Desc: it makes Lion logo\n\n🧚‍♻️Usage: *.joker*\n🛠️Desc: it makes joker logo text\n\n🧚‍♻️Usage: *.leaves*\n🛠️Desc: it makes leaves text\n\n🧚‍♻️Usage: skull*\n🛠️Desc: it makes skull logo\n\n🧚‍♻️Usage: *.robot*\n🛠️Desc: it makes Robot logo\n\n🧚‍♻️Usage: *.toxic*\n🛠️Desc: it makes Toxic logo\n\n🧚‍♻️Usage: *rainbow*\n🛠️Desc: it makes gradient text\n\n🧚‍♻️Usage: *orangeglass*\n🛠️Desc: it makes gradient text\n\n🧚‍♻️Usage: *.luxury*\n🛠️Desc: it makes luxury text\n\n🧚‍♻️Usage: *.pubg*\n🛠️Desc: It Sends Pubg Logo with text\n\n🧚‍♻️Usage: *.marvel*\n🛠️Desc: It Sends marvel logo type\n\n🧚‍♻️Usage: *.google*\n🛠️Desc: It Sends a google suggest\n\n🧚‍♻️Usage: *.fire*\n🛠️Desc: It Sends a fire logo\n\n🧚‍♻️Usage: *.banner*\n🛠️Desc: It Sends a banner text\n\n🧚‍♻️Usage: *.coffeecup*\n🛠️Desc: It Send a coffeecup image\n\n🧚‍♻️Usage: *.battle*\n🛠️Desc: It Sends a battle logo\n\n🧚‍♻️Usage: *.silk*\n🛠️Desc: It Sends a silk text\n\n  🧚‍♻️Usage: *.underwater*\n🛠️Desc: It Sends a ocean image of the text provided\n\n🧚‍♻️Usage: *.hub*\n🛠️Desc: It Sends a blackish orange coloured image of the text provided.\nYou must enter the heading and subheading seperated by */* in order!.\n\n🧚‍♻️Usage: *.sandwriting*\n🛠️Desc: It Sends a sand image of the text provided.\n\n🧚‍♻️Usage: *.blackpink*\n🛠️Desc: It Sends a blackish pink image of the text provided.\n\n🧚‍♻️Usage: *.lovemsg*\n🛠️Desc: It Sends love message style image of the text provided.\n\n🧚‍♻️Usage: *.grass*\n🛠️Desc: It Sends a grass image of the text provided.\n\n🧚‍♻️Usage: *.blood*\n🛠️Desc: It Sends a blood image of the text provided.\n\n🧚‍♻️Usage: *.romance*\n🛠️Desc: It Sends a green image with love shapes of the text provided.\n\n🧚‍♻️Usage: *.candlemug*\n🛠️Desc: It Sends a mug image of the text provided.\n\n🧚‍♻️Usage: *.snow*\n🛠️Desc: It Sends a snow image of the text provided.\n\n🧚‍♻️Usage: *.cloud*\n🛠️Desc: It Sends a sky image of the text provided\n\n🧚‍♻️Usage: *.flower*\n🛠️Desc: It Sends a flower image of the text provided\n\n🧚‍♻️Usage: *.burn*\n🛠️Desc: It Sends a half burned paper image of the text provided\n\n🧚‍♻️Usage: *.candy*\n🛠️Desc: It Sends a candy image of the text provided\n\n🧚‍♻️Usage: *.wood*\n🛠️Desc: It Sends a wood carved image of the text provided.\n\n🧚‍♻️Usage: *.latte*\n🛠️Desc: It put the text as latte art within a coffee cup.\n\n🧚‍♻️Usage: *.8bit*\n🛠️Desc: Converts the text into an 8bit style image.\nYou must enter the heading and subheading seperated by */* in order!\n\n🧚‍♻️Usage: *.shadow*\n🛠️Desc: Converts the text into shadow themed image.\n\n🧚‍♻️Usage: *.harrypotter*\n🛠️Desc: Converts the text into a harrypotter themed image.\n\n🧚‍♻️Usage: *.sparkling*\n🛠️Desc: Converts the text into a sparkling themed image\nYou must enter the heading and subheading seperated by */* in order!\n\n🧚‍♻️Usage: *.watercolour*\n🛠️Desc: Converts the text into a watercolour themed image.\n\n🧚‍♻️Usage: *.ninjalogo*\n🛠️Desc: Enters the text as the caption for a ninja themed logo.\n\n🧚‍♻️Usage: *.neonlight*\n🛠️Desc: Converts the text into a neonlight themed image.\n\n🧚‍♻️Usage: *.3dtext*\n🛠️Desc: Converts the provided text into a 3D style image.');

    }));

    Asena.addCommand({pattern: 'glitch ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

  

  var topText, bottomText;

    if (match[1].includes('/')) {

        var split = match[1].split('/');

        bottomText = split[1];

        topText = split[0];

}

    var webimage = await axios.get(`https://videfikri.com/api/textmaker/tiktokeffect/?text1=${topText}&text2=${bottomText}`, { responseType: 'arraybuffer' })

   await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

    }));

    Asena.addCommand({pattern: 'luxury ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

    var webimage = await axios.get(`https://api.xteam.xyz/textpro/3dluxury?text=${match[1]}&APIKEY=f3eaf19231f6201c`, { responseType: 'arraybuffer' })

    await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

    }));

    Asena.addCommand({pattern: 'pubg ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

  

  var topText, bottomText;

    if (match[1].includes('/')) {

        var split = match[1].split('/');

        bottomText = split[1];

        topText = split[0];

}

    var webimage = await axios.get(`https://api.zeks.me/api/pubglogo?apikey=souravkl11&text1=${topText}&text2=${bottomText}`, { responseType: 'arraybuffer' })

   await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

    }));

    Asena.addCommand({pattern: 'gradient ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

    var webimage = await axios.get(`https://api.xteam.xyz/textpro/3dgradient?text=${match[1]}&APIKEY=d9f297dbf7b0bbf4`, { responseType: 'arraybuffer' })

    await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

    }));

    Asena.addCommand({pattern: 'vintage ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

    var webimage = await axios.get(`https://api.xteam.xyz/textpro/realisticvintage?text=${match[1]}&APIKEY=f3eaf19231f6201c`, { responseType: 'arraybuffer' })

    await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

    }));

    Asena.addCommand({pattern: 'summery ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

    var webimage = await axios.get(`https://api.xteam.xyz/textpro/summerysandwriting?text=${match[1]}&APIKEY=c809c9b2f07400c2`, { responseType: 'arraybuffer' })

    await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

    }));

   

    Asena.addCommand({pattern: 'darkgold ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

    var webimage = await axios.get(`https://api.xteam.xyz/textpro/metaldarkgold?text=${match[1]}&APIKEY=f3eaf19231f6201c`, { responseType: 'arraybuffer' })

    await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

    }));

    Asena.addCommand({pattern: '1917 ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

    var webimage = await axios.get(`https://api.xteam.xyz/textpro/1917?text=${match[1]}&APIKEY=f3eaf19231f6201c`, { responseType: 'arraybuffer' })

    await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

    }));

    Asena.addCommand({pattern: 'holo ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

    var webimage = await axios.get(`https://api.xteam.xyz/textpro/holographic3d?text=${match[1]}&APIKEY=c809c9b2f07400c2`, { responseType: 'arraybuffer' })

    await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

    }));

    Asena.addCommand({pattern: 'silver ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

    var webimage = await axios.get(`https://api.xteam.xyz/textpro/deluxesilver?text=${match[1]}&APIKEY=f3eaf19231f6201c`, { responseType: 'arraybuffer' })

    await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

    }));

    Asena.addCommand({pattern: 'blue ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

    var webimage = await axios.get(`https://api.xteam.xyz/textpro/glossybluemetal?text=${match[1]}&APIKEY=c809c9b2f07400c2`, { responseType: 'arraybuffer' })

    await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

    }));

    Asena.addCommand({pattern: 'fabric ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

    var webimage = await axios.get(`https://api.xteam.xyz/textpro/fabric?text=${match[1]}&APIKEY=c809c9b2f07400c2`, { responseType: 'arraybuffer' })

    await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

    }));

    Asena.addCommand({pattern: 'avengers ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

  

  var topText, bottomText;

    if (match[1].includes('/')) {

        var split = match[1].split('/');

        bottomText = split[1];

        topText = split[0];

}

    var webimage = await axios.get(`https://api.xteam.xyz/textpro/3davengers?text=${topText}&text2=${bottomText}&APIKEY=d9f297dbf7b0bbf4`, { responseType: 'arraybuffer' })

   await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

    }));

    Asena.addCommand({pattern: 'logomarvel ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

  

  var topText, bottomText;

    if (match[1].includes('/')) {

        var split = match[1].split('/');

        bottomText = split[1];

        topText = split[0];

}

    var webimage = await axios.get(`https://api.xteam.xyz/textpro/marvel?text=${topText}&text2=${bottomText}&APIKEY=c809c9b2f07400c2`, { responseType: 'arraybuffer' })

   await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

    }));

    Asena.addCommand({pattern: 'metallic ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

  

  var topText, bottomText;

    if (match[1].includes('/')) {

        var split = match[1].split('/');

        bottomText = split[1];

        topText = split[0];

}

    var webimage = await axios.get(`https://api.xteam.xyz/textpro/3dmetalsilver?text=${topText}&text2=${bottomText}&APIKEY=260d649b8633836f`, { responseType: 'arraybuffer' })

   await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

    }));

    Asena.addCommand({pattern: 'glue ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

    var webimage = await axios.get(`https://api.xteam.xyz/textpro/3dglue?text=${match[1]}&APIKEY=c809c9b2f07400c2`, { responseType: 'arraybuffer' })

    await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

    }));

    Asena.addCommand({pattern: 'balloon ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

    var webimage = await axios.get(`https://api.xteam.xyz/textpro/balloontext?text=${match[1]}&APIKEY=d0d75df1a38b05bd`, { responseType: 'arraybuffer' })

    await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

    }));

    Asena.addCommand({pattern: 'rosegold ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

  

  var topText, bottomText;

    if (match[1].includes('/')) {

        var split = match[1].split('/');

        bottomText = split[1];

        topText = split[0];

}

    var webimage = await axios.get(`https://api.xteam.xyz/textpro/3drosegold?text=${topText}&text2=${bottomText}&APIKEY=917058a2392ad776`, { responseType: 'arraybuffer' })

   await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

    }));

    Asena.addCommand({pattern: 'metalgold ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

  

  var topText, bottomText;

    if (match[1].includes('/')) {

        var split = match[1].split('/');

        bottomText = split[1];

        topText = split[0];

}

    var webimage = await axios.get(`https://api.xteam.xyz/textpro/3dmetalgold?text=${topText}&text2=${bottomText}&APIKEY=d0d75df1a38b05bd`, { responseType: 'arraybuffer' })

   await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

    }));

    Asena.addCommand({pattern: 'lion ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

  

  var topText, bottomText;

    if (match[1].includes('/')) {

        var split = match[1].split('/');

        bottomText = split[1];

        topText = split[0];

}

    var webimage = await axios.get(`https://api.xteam.xyz/textpro/lionlogomascot?text=${topText}&text2=${bottomText}&APIKEY=d0d75df1a38b05bd`, { responseType: 'arraybuffer' })

   await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

    }));

    Asena.addCommand({pattern: 'galaxy ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

  

  var topText, bottomText;

    if (match[1].includes('/')) {

        var split = match[1].split('/');

        bottomText = split[1];

        topText = split[0];

}

    var webimage = await axios.get(`https://api.xteam.xyz/textpro/3dmetalgalaxy?text=${topText}&text2=${bottomText}&APIKEY=d0d75df1a38b05bd`, { responseType: 'arraybuffer' })

   await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

    }));

    Asena.addCommand({pattern: 'joker ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

    var webimage = await axios.get(`https://api.xteam.xyz/textpro/jokerlogo?text=${match[1]}&APIKEY=7f40eb6965e90926`, { responseType: 'arraybuffer' })

    await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

    }));

    Asena.addCommand({pattern: 'leaves ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

    var webimage = await axios.get(`https://api.xteam.xyz/textpro/naturalleaves?text=${match[1]}&APIKEY=7f40eb6965e90926`, { responseType: 'arraybuffer' })

    await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

    }));

    Asena.addCommand({pattern: 'skull ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

    var webimage = await axios.get(`https://api.xteam.xyz/textpro/skeleton?text=${match[1]}&APIKEY=917058a2392ad776`, { responseType: 'arraybuffer' })

    await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

    }));

    Asena.addCommand({pattern: 'robot ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

    var webimage = await axios.get(`https://api.xteam.xyz/textpro/robotr2d2?text=${match[1]}&APIKEY=7f40eb6965e90926`, { responseType: 'arraybuffer' })

    await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

    }));

    Asena.addCommand({pattern: 'toxic ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

    var webimage = await axios.get(`https://api.xteam.xyz/textpro/toxic?text=${match[1]}&APIKEY=7f40eb6965e90926`, { responseType: 'arraybuffer' })

    await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

    }));

    Asena.addCommand({pattern: 'rainbow ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

    var webimage = await axios.get(`https://api.xteam.xyz/textpro/rainbowequalizer?text=${match[1]}&APIKEY=917058a2392ad776`, { responseType: 'arraybuffer' })

    await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

    }));

    Asena.addCommand({pattern: 'orangeglass ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

    var webimage = await axios.get(`https://api.xteam.xyz/textpro/orangeglass?text=${match[1]}&APIKEY=7f40eb6965e90926`, { responseType: 'arraybuffer' })

    await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

    }));

    Asena.addCommand({pattern: 'marvel ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

  

  var topText, bottomText;

    if (match[1].includes('/')) {

        var split = match[1].split('/');

        bottomText = split[1];

        topText = split[0];

}

    var webimage = await axios.get(`https://api.xteam.xyz/textpro/marvelstudios?text=${topText}&text2=${bottomText}&APIKEY=c809c9b2f07400c2`, { responseType: 'arraybuffer' })

   await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

    }));

    Asena.addCommand({pattern: 'latte ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

    var webimage = await axios.get(`https://videfikri.com/api/textmaker/coffeecup/?text=${match[1]}`, { responseType: 'arraybuffer' })

    await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

    }));

    

    Asena.addCommand({pattern: 'wanted ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

    var webimage = await axios.get(`https://videfikri.com/api/textmaker/wanted/?text=${match[1]}`, { responseType: 'arraybuffer' })

    await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

    }));

Asena.addCommand({pattern: 'silk ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

    var webimage = await axios.get(`https://videfikri.com/api/textmaker/silk/?text=${match[1]}`, { responseType: 'arraybuffer' })

    await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

    }));

    Asena.addCommand({pattern: 'google ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

  

  var topText, bottomText;

    if (match[1].includes('/')) {

        var split = match[1].split('/');

        tbottomText = split[2];

        bottomText = split[1];

        topText = split[0];

}

    var webimage = await axios.get(`https://videfikri.com/api/textmaker/gsuggest/?text1=${topText}&text2=${bottomText}&text3=${tbottomText}`, { responseType: 'arraybuffer' })

   await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

    }));

    Asena.addCommand({pattern: 'battle ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

  

  var topText, bottomText;

    if (match[1].includes('/')) {

        var split = match[1].split('/');

        bottomText = split[1];

        topText = split[0];

}

    var webimage = await axios.get(`https://videfikri.com/api/textmaker/bf4/?text1=${topText}&text2=${bottomText}`, { responseType: 'arraybuffer' })

   await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: '```Battle logo Effect```'})

    }));

    Asena.addCommand({pattern: 'face ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

    var webimage = await axios.get(`https://api.zeks.xyz/api/emoji-image?apikey=1hroZ3ju94h0PBjCNKsfhYaSuLs&emoji=${match[1]}`, { responseType: 'arraybuffer' })

    await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

    }));

    Asena.addCommand({pattern: 'coffeecup ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

    var webimage = await axios.get(`https://videfikri.com/api/textmaker/coffeecup2/?text=${match[1]}`, { responseType: 'arraybuffer' })

    await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: '```cup image```'})

    }));

    Asena.addCommand({pattern: 'fire ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

    var webimage = await axios.get(`https://videfikri.com/api/textmaker/crossfirelogo/?text=${match[1]}`, { responseType: 'arraybuffer' })

    await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: '```fire logo```'})

    }));

    Asena.addCommand({pattern: 'banner ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

    var webimage = await axios.get(`https://videfikri.com/api/textmaker/narutobanner/?text=${match[1]}`, { responseType: 'arraybuffer' })

    await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

    }));

    Asena.addCommand({pattern: 'wood ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

    var webimage = await axios.get(`https://videfikri.com/api/textmaker/woodblock/?text=${match[1]}`, { responseType: 'arraybuffer' })

    await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

    }));

    Asena.addCommand({pattern: '8bit ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

  

  var topText, bottomText;

    if (match[1].includes('/')) {

        var split = match[1].split('/');

        bottomText = split[1];

        topText = split[0];

}

    var webimage = await axios.get(`https://videfikri.com/api/textmaker/8bit/?text1=${topText}&text2=${bottomText}`, { responseType: 'arraybuffer' })

    await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

    }));

    Asena.addCommand({pattern: 'shadow ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

    var webimage = await axios.get(`https://videfikri.com/api/textmaker/shadowtext/?text=${match[1]}`, { responseType: 'arraybuffer' })

  await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

    }));

    Asena.addCommand({pattern: 'underwater ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

    var webimage = await axios.get(`https://videfikri.com/api/textmaker/underwater/?text=${match[1]}`, { responseType: 'arraybuffer' })

    await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

    }));

    Asena.addCommand({pattern: 'flower ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

    var webimage = await axios.get(`https://videfikri.com/api/textmaker/mugflower/?text=${match[1]}`, { responseType: 'arraybuffer' })

    await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

    }));

    Asena.addCommand({pattern: 'burn ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

    var webimage = await axios.get(`https://videfikri.com/api/textmaker/burnpaper/?text=${match[1]}`, { responseType: 'arraybuffer' })

    await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

    }));

    Asena.addCommand({pattern: 'candy ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

    var webimage = await axios.get(`https://videfikri.com/api/textmaker/sweetcandy/?text=${match[1]}`, { responseType: 'arraybuffer' })

    await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

    }));

    Asena.addCommand({pattern: 'harrypotter ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

    var webimage = await axios.get(`https://videfikri.com/api/textmaker/hpotter/?text=${match[1]}`, { responseType: 'arraybuffer' })

    await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

    }));

    Asena.addCommand({pattern: 'sparkling ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

  

  var topText, bottomText;

    if (match[1].includes('/')) {

        var split = match[1].split('/');

        bottomText = split[1];

        topText = split[0];

}

    var webimage = await axios.get(`https://docs-jojo.herokuapp.com/api/sparkling?text1=${topText}&text2=${bottomText}`, { responseType: 'arraybuffer' })

    await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

    }));

    Asena.addCommand({pattern: 'watercolour ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

    var webimage = await axios.get(`https://docs-jojo.herokuapp.com/api/watercolor?text=${match[1]}`, { responseType: 'arraybuffer' })

    await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

    }));

    Asena.addCommand({pattern: 'ninjalogo ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.NEED_WORD);

    var webimage = await axios.get(`https://docs-jojo.herokuapp.com/api/gaming?text=${match[1]}`, { responseType: 'arraybuffer' })

    await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

    }));

    Asena.addCommand({pattern: 'neonlight ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

    var webimage = await axios.get(`https://docs-jojo.herokuapp.com/api/neon_light?text=${match[1]}`, { responseType: 'arraybuffer' })

    await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

    }));

    Asena.addCommand({pattern: '3dtext ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

    var webimage = await axios.get(`https://docs-jojo.herokuapp.com/api/text3d?text=${match[1]}`, { responseType: 'arraybuffer' })

    await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

    }));

    Asena.addCommand({ pattern: 'ttp ?(.*)', fromMe: false, dontAddCommandList: true }, (async (message, match) => {

    if (match[1] === '') return await message.sendMessage(Lang.NEED_WORD);

    var ttinullimage = await axios.get(`https://api.xteam.xyz/ttp?file&text=${match[1].replace(/Ö/g, "%C3%96").replace(/ö/g, "%C3%B6").replace(/ü/g, "%C3%BC").replace(/Ü/g, "%C3%9C").replace(/Ğ/g, "%C4%9E").replace(/ğ/g, "%C4%9F").replace(/ş/g, "%C5%9F").replace(/Ş/g, "%C5%9E").replace(/ç/g, "%C3%A7").replace(/Ç/g, "%C3%87").replace(/ı/g, "%C4%B1").replace(/i/g, "%69").replace(/"/g, "%22").replace(/İ/g, "%C4%B0").replace(/#/g, "\n")}`, { responseType: 'arraybuffer' })

    

    await message.sendMessage(Buffer.from(ttinullimage.data), MessageType.image, { mimetype: Mimetype.jpg, thumbnail:"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" })

}));

    Asena.addCommand({ pattern: 'attp ?(.*)', fromMe: false, dontAddCommandList: true }, (async (message, match) => {

    if (match[1] === '') return await message.sendMessage(Lang.NEED_WORD);

    var ttinullimage = await axios.get(`https://api.xteam.xyz/attp?file&text=${match[1].replace(/Ö/g, "%C3%96").replace(/ö/g, "%C3%B6").replace(/ü/g, "%C3%BC").replace(/Ü/g, "%C3%9C").replace(/Ğ/g, "%C4%9E").replace(/ğ/g, "%C4%9F").replace(/ş/g, "%C5%9F").replace(/Ş/g, "%C5%9E").replace(/ç/g, "%C3%A7").replace(/Ç/g, "%C3%87").replace(/ı/g, "%C4%B1").replace(/i/g, "%69").replace(/"/g, "%22").replace(/İ/g, "%C4%B0").replace(/#/g, "\n")}`, { responseType: 'arraybuffer' })

    await message.sendMessage(Buffer.from(ttinullimage.data), MessageType.sticker, { mimetype: Mimetype.webp,quoted : message.data})

}));

    Asena.addCommand({pattern: 'sandwriting ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

    var webimage = await axios.get(`https://api.xteam.xyz/textpro/sandwriting?text=${match[1]}&APIKEY=d9f297dbf7b0bbf4`, { responseType: 'arraybuffer' })

   await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

    }));

    Asena.addCommand({pattern: 'cloud ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

    var webimage = await axios.get(`https://api.xteam.xyz/textpro/cloudtext?text=${match[1]}&APIKEY=d9f297dbf7b0bbf4`, { responseType: 'arraybuffer' })

   await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

    }));

    Asena.addCommand({pattern: 'hub ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

  

  var topText, bottomText;

    if (match[1].includes('/')) {

        var split = match[1].split('/');

        bottomText = split[1];

        topText = split[0];

}

    var webimage = await axios.get(`https://api.xteam.xyz/textpro/ph?text=${topText}&text2=${bottomText}&APIKEY=d9f297dbf7b0bbf4`, { responseType: 'arraybuffer' })

   await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg , caption: Config.AFN})

    }));

    Asena.addCommand({pattern: 'snow ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

    var webimage = await axios.get(`https://api.xteam.xyz/textpro/snowtext?text=${match[1]}&APIKEY=d9f297dbf7b0bbf4`, { responseType: 'arraybuffer' })

   await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

    }));

Asena.addCommand({pattern: 'grass ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

    var webimage = await axios.get(`https://videfikri.com/api/textmaker/paperonglass/?text=${match[1]}`, { responseType: 'arraybuffer' })

    await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

    }));

    Asena.addCommand({pattern: 'candlemug ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

    var webimage = await axios.get(`https://videfikri.com/api/textmaker/candlemug/?text=${match[1]}`, { responseType: 'arraybuffer' })

    await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

    }));

    Asena.addCommand({pattern: 'romance ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

    var webimage = await axios.get(`https://videfikri.com/api/textmaker/romancetext/?text=${match[1]}`, { responseType: 'arraybuffer' })

    await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

    }));

    Asena.addCommand({pattern: 'lovemsg ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

    var webimage = await axios.get(`https://videfikri.com/api/textmaker/lovemsg/?text=${match[1]}`, { responseType: 'arraybuffer' })

    await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

    }));

    Asena.addCommand({pattern: 'blood ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

    var webimage = await axios.get(`https://api.xteam.xyz/textpro/bloodontheroastedglass?text=${match[1]}&APIKEY=d9f297dbf7b0bbf4`, { responseType: 'arraybuffer' })

   await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})
   
    }));

    Asena.addCommand({pattern: 'flower ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

    var webimage = await axios.get(`https://api.zeks.me/api/flowertext?apikey=souravkl11&text=${match[1]}`, { responseType: 'arraybuffer' })

   await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

       }));

    Asena.addCommand({pattern: 'flame ?(.*)', fromMe: false, dontAddCommandList: true}, (async (message, match) => {

    if (match[1] === '') return await message.client.sendMessage(message.jid,NEED_WORD);

    var webimage = await axios.get(`https://api.zeks.me/api/flametext?apikey=souravkl11&text=${match[1]}`, { responseType: 'arraybuffer' })

   await message.client.sendMessage(message.jid,Buffer.from(webimage.data), MessageType.image, {mimetype: Mimetype.jpg, caption: Config.AFN})

    }));
