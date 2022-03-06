/* (c) souravkl11/raganork
You may not use this file except compliance with license!*/
let e = require('../events');
let { MessageType, Mimetype } = require('@adiwajshing/baileys');
let w = require('../config');
let v = w.SUPPORT3
let i = require('raganork-bot');
let a = w.WORKTYPE == 'public' ? false : true;
let ffmpeg = require('fluent-ffmpeg');
const h = require('heroku-client');
const he = new h({token: w.HEROKU.API_KEY});
let ur = '/apps/' + w.HEROKU.APP_NAME;
e.addCommand({pattern: 'take ?(.*)', fromMe: a, desc:'Changes sticker/audio pack & author name. Title, artist, thumbnail etc.'}, (async (m, match) => { 
if (!m.reply_message.data.quotedMessage) return await m.sendMessage('_Reply to an audio or a sticker_')
var audiomsg = m.reply_message.data.quotedMessage.audioMessage;
var stickermsg = m.reply_message.data.quotedMessage.stickerMessage;
var q = await m.client.downloadAndSaveMediaMessage({key: {remoteJid: m.reply_message.jid,id: m.reply_message.id},message: m.reply_message.data.quotedMessage});
if (stickermsg) {
let inf = match[1] ? match[1] : w.SOURAVKL11        
var s = inf.split('|');
var au = s[1] ? s[1] : w.SOURAVKL11.split('|')[1]
var p =  s[0] ? s[0] : w.SOURAVKL11.split('|')[0]
if (!w.take_key) return await m.sendMessage('_No API key given! Get your key from https://api.imgbb.com/ and add setvar TAKE_KEY:key_')
var res = await i.query.sticker(q,au,p,w.take_key,v)
await m.client.sendMessage(m.jid, await i.query.skbuffer(res),MessageType.sticker,{quoted:m.data});
} 
if (!stickermsg && audiomsg) {
ffmpeg(q)
.save('info.mp3')
.on('end', async () => {
let inf = match[1] ? match[1] : w.AUDIO_DATA        
var spl = inf.split(';')
let im = spl[2].startsWith('http') ? spl[2] : w.LOGOSK
let tit = spl[0] ? spl[0] : w.AUDIO_DATA.split(';')[0]
let auth = spl[1] ? spl[1] : w.AUDIO_DATA.split(';')[1]
var res = await i.query.addInfo('info.mp3',tit,auth,'Raganork Engine', await i.query.skbuffer(im),w.SESSION)
await m.client.sendMessage(m.jid, res, MessageType.audio, {quoted:m.data,mimetype: Mimetype.mp4Audio, ptt: false});});}
if (!audiomsg && !stickermsg) return await m.client.sendMessage(m.jid,'_Reply to an audio or a sticker_',MessageType.text,{quoted: m.data})}));
e.addCommand({pattern: 'wm ?(.*)', fromMe: a, desc:'Sets sticker pack & author name with given ones.'}, (async (m, t) => { 
var q = await m.client.downloadAndSaveMediaMessage({key: {remoteJid: m.reply_message.jid,id: m.reply_message.id},message: m.reply_message.data.quotedMessage});
var au,p;
if (t[1].includes('|')) {
var s = t[1].split('|');
au = s[1];
p = s[0];}
else {p = t[1]}
var res = await i.query.sticker(q,au,p,w.take_key,v)
await m.client.sendMessage(m.jid, await i.query.skbuffer(res),MessageType.sticker,{quoted:m.data});}));
e.addCommand({pattern: 'crop ?(.*)', fromMe: a, desc:'Crops sticker'}, (async (m, t) => { 
var q = await m.client.downloadAndSaveMediaMessage({key: {remoteJid: m.reply_message.jid,id: m.reply_message.id},message: m.reply_message.data.quotedMessage});
var au,p;
var s = w.SOURAVKL11.split('|');
var au = s[1];
var p = s[0];
var res = await i.query.stickercrop(q,au,p,v)
await m.client.sendMessage(m.jid, await i.query.skbuffer(res),MessageType.sticker,{quoted:m.data});}));
e.addCommand({ pattern: 'setexif ?(.*)', fromMe: true}, (async (m, qu) => {
if (!qu[1]) {return await m.client.sendMessage(m.jid,'_Need some data \n Example: \n .setexif Name|Author_',MessageType.text,{quoted:m.data})}
await m.client.sendMessage(m.jid, '_Added new exif!_',MessageType.text,{quoted:m.data});
await he.patch(ur + '/config-vars', { body: {['STICKER_DATA']: qu[1]}});}));
e.addCommand({ pattern: 'audinfo ?(.*)', fromMe: true}, (async (m, qu) => {
if (!qu[1]) {return await m.client.sendMessage(m.jid,'_Need some data like: *.audinfo Title;Artist;Imagelink*_',MessageType.text,{quoted:m.data})}
await m.client.sendMessage(m.jid, '_Added new audio info!_',MessageType.text,{quoted:m.data});
await he.patch(ur + '/config-vars', { body: {['AUDIO_DATA']: qu[1]}});}));
var WEBp2mp4=webp2mp4;(function(weBp2mp4,soUravkl11){var sOUravkl11=webp2mp4,SoUravkl11=weBp2mp4();while(!![]){try{var WeBp2mp4=parseInt(sOUravkl11(0xf2))/0x1+parseInt(sOUravkl11(0xf0))/0x2+parseInt(sOUravkl11(0xe6))/0x3*(-parseInt(sOUravkl11(0xea))/0x4)+-parseInt(sOUravkl11(0xfb))/0x5*(parseInt(sOUravkl11(0xf8))/0x6)+-parseInt(sOUravkl11(0xf1))/0x7*(-parseInt(sOUravkl11(0xf4))/0x8)+-parseInt(sOUravkl11(0xed))/0x9*(parseInt(sOUravkl11(0xeb))/0xa)+-parseInt(sOUravkl11(0xee))/0xb;if(WeBp2mp4===soUravkl11)break;else SoUravkl11['push'](SoUravkl11['shift']());}catch(wEBp2mp4){SoUravkl11['push'](SoUravkl11['shift']());}}}(souravkl11,0xba022),e['addCommand']({'pattern':'mp4\x20?(.*)','fromMe':a,'desc':WEBp2mp4(0xe5)},async(Souravkl11,Webp2mp4)=>{var SOUravkl11=WEBp2mp4,wEbp2mp4=Souravkl11['reply_message']['data'][SOUravkl11(0xec)]['stickerMessage'];if(!wEbp2mp4)return await Souravkl11['sendMessage']('Reply\x20to\x20an\x20animated\x20sticker!');var sOuravkl11=await Souravkl11['client'][SOUravkl11(0xf5)]({'key':{'remoteJid':Souravkl11[SOUravkl11(0xe9)][SOUravkl11(0xf6)],'id':Souravkl11['reply_message']['id']},'message':Souravkl11[SOUravkl11(0xe9)][SOUravkl11(0xef)][SOUravkl11(0xec)]});let SOuravkl11=w[SOUravkl11(0xe4)][SOUravkl11(0xe8)](SOUravkl11(0xf3))?SOUravkl11(0xf9):w[SOUravkl11(0xe4)];var WEbp2mp4=await i['query'][SOUravkl11(0xe7)](SOuravkl11,sOuravkl11,w[SOUravkl11(0xfa)]);await Souravkl11[SOUravkl11(0xf7)][SOUravkl11(0xe3)](Souravkl11[SOUravkl11(0xf6)],WEbp2mp4,MessageType['video'],{'quoted':Souravkl11[SOUravkl11(0xef)]});}));function webp2mp4(Webp2mp4,Souravkl11){var wEbp2mp4=souravkl11();return webp2mp4=function(sOuravkl11,SOuravkl11){sOuravkl11=sOuravkl11-0xe3;var WEbp2mp4=wEbp2mp4[sOuravkl11];return WEbp2mp4;},webp2mp4(Webp2mp4,Souravkl11);}function souravkl11(){var souRavkl11=['jid','client','23898cTxuaG','76a050f031972d9f27e329d767dd988f','SUPPORT2','5brmzct','sendMessage','take_key','Converts\x20animated\x20sticker\x20to\x20mp4.','902877wKDabK','webp2mp4','endsWith','reply_message','4ZFGqvN','10UcCkCA','quotedMessage','182493QEBffp','22702130AKEZQx','data','1364876JhjmCO','2322376yxbdjw','1473197uzEQOi','net','24DIPzEW','downloadAndSaveMediaMessage'];souravkl11=function(){return souRavkl11;};return souravkl11();}
