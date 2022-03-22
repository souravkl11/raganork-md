const {skbuffer} = require('raganork-bot')
const ffmpeg = require('fluent-ffmpeg')
const fs = require('fs')
const yts = require('yt-search')
const ytdl = require('ytdl-core');
const {addCommand} = require('../events');
const {MessageType,Mimetype} = require('@adiwajshing/baileys');
const c = require('../config');
let manual = c.WORKTYPE == 'public' ? false : true
addCommand({on:'button', fromMe:manual}, (async (b,ma) => { 
if (b.button && b.button.startsWith('ytv') && b.button.includes(b.client.user.jid)) {
  await b.client.sendMessage(b.jid,'_Downloading video 🎥_',MessageType.text);
            var spl = b.button.split(';')
            let songid = spl[1]
            let srch = await yts('https://youtu.be/'+songid);
            srch = srch.all;
            var yt = ytdl(songid, {filter: format => format.container === 'mp4' && ['720p', '480p', '360p', '240p', '144p'].map(() => true)});
        yt.pipe(fs.createWriteStream('./' + songid + '.mp4'));
        yt.on('end', async () => {
            await b.client.sendMessage(b.jid,'_Uploading video 🎥_',MessageType.text);
            await b.client.sendMessage(b.jid,fs.readFileSync('./' + songid + '.mp4'), MessageType.video, {mimetype: Mimetype.mp4 ,quoted: b.data,caption:srch[0].title, thumbnail: await skbuffer(srch[0].thumbnail)});
        });
}
if (b.button && b.button.startsWith('yta') && b.button.includes(b.client.user.jid)) {
var spl = b.button.split(';')
            var reply = await b.client.sendMessage(b.jid,c.SONGD,MessageType.text);
            let songid = spl[1]
            let srch = await yts('https://youtu.be/'+songid);
            srch = srch.all;
            let stream = ytdl(songid, {
                quality: 'highestaudio',
            });
            ffmpeg(stream)
                .audioBitrate(320)
                .save('./' + songid + '.mp3')
                .on('end', async () => {
                    reply = await b.client.sendMessage(b.jid,c.SONGU,MessageType.text);
                    await b.client.sendMessage(b.jid,fs.readFileSync('./' + songid + '.mp3'), MessageType.audio, {mimetype: Mimetype.mp4Audio, ptt: false, quoted: b.data, "contextInfo": { forwardingScore: 100, isForwarded: true, text: 'Text 1 here', sendEphemeral: true, externalAdReply:{title:srch[0].title,body:'Downloaded by ' + c.BOTSK,mediaType:"2",thumbnail:await skbuffer(srch[0].thumbnail),mediaUrl:srch[0].url}}});
                  });
  
}       }));

addCommand({on:'button', fromMe:manual}, (async (b,ma) => { 
if (b.list && b.list.startsWith('song') && b.list.includes(b.client.user.jid)){
var reply = await b.sendMessage(c.SONGD);
            let songid = b.list.split(';')[1]
            let srch = await yts('https://youtu.be/'+songid);
            srch = srch.all;
            var pic = await skbuffer(srch[0].thumbnail)
    const media = await b.client.prepareMessage(b.jid, pic, MessageType.image, {thumbnail:null,mimetype: Mimetype.jpg});
    const thumbnail = {};
    const buttons = [
        { buttonId: 'ytv;'+songid+';'+b.client.user.jid, buttonText: { displayText: "VIDEO 🎥" }, type: 1 },
        { buttonId: 'yta;'+songid+';'+b.client.user.jid, buttonText: { displayText: "AUDIO 🔊" }, type: 1 }
    ]
    const buttonMessage = {
        contentText:`*${srch[0].title}*
*Views:* ${srch[0].views}
*Uploaded:* ${srch[0].ago}
*Duration:* ${srch[0].duration.timestamp}
*Url:* https://youtu.be/${songid}
*Server:* Raganork IN`,
        footerText:  '© ' + c.BOTSK,
        buttons: buttons,
        headerType: 4,
        imageMessage: media.message.imageMessage
    }
    await b.client.sendMessage(b.jid, buttonMessage, MessageType.buttonsMessage, {quoted:b.data})  
       }
    }));