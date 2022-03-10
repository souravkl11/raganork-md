const skl = require('../events');
const {MessageType,Mimetype} = require('@adiwajshing/baileys');
const config = require('../config');
const yts = require( 'yt-search' )
const Language = require('../language');
const Lang = Language.getString('scrapers');
let sourav = config.WORKTYPE == 'public' ? false : true
skl.addCommand({pattern: 'music ?(.*)', fromMe: sourav, desc: "Select and download songs from yt (list)"}, (async (message, match) => { 

        if (match[1] === '') return await message.client.sendMessage(message.jid,Lang.NEED_TEXT_SONG,MessageType.text);    
        let arama = await yts(match[1]);
        arama = arama.all;
        if(arama.length < 1) return await message.client.sendMessage(message.jid,Lang.NO_RESULT,MessageType.text);
        const rows = [
        {title: arama[0].title, description: '', rowId:"song;"+arama[0].videoId},
        {title: arama[1].title, description: '', rowId:"song;"+arama[1].videoId},
        {title: arama[2].title, description: '', rowId:"song;"+arama[2].videoId},
        {title: arama[3].title, description: '', rowId:"song;"+arama[3].videoId},
        {title: arama[4].title, description: '', rowId:"song;"+arama[4].videoId},
        {title: arama[5].title, description: '', rowId:"song;"+arama[5].videoId},
        {title: arama[6].title, description: '', rowId:"song;"+arama[6].videoId},
        {title: arama[7].title, description: '', rowId:"song;"+arama[7].videoId},
        {title: arama[8].title, description: '', rowId:"song;"+arama[8].videoId},
        {title: arama[9].title, description: '', rowId:"song;"+arama[9].videoId},
        ]
       
       const sections = [{title: "Select your song!", rows: rows}]
       
       const button = {
        buttonText: '*Matching songs*',
        description: '© ' + config.BOTSK,
        sections: sections,
        listType: 1
       }
       await message.client.sendMessage(message.jid, button, MessageType.listMessage)
}));
