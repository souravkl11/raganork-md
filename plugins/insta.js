/* Code Credits: souravkl11, raganork-api
Please give credit to the creator :)
(c) souravkl11 2022 All rights reserved
*/
const skl = require('../events');
const { MessageType, MessageOptions, Mimetype } = require('@adiwajshing/baileys');
const fs = require('fs');
const got = require("got");
const axios = require('axios');
const setting = require('../config');
const {getPost,getStalk,getStory,skbuffer} = require('raganork-bot');
const Config = require('../config');
const s = require('../config');
var v = s.CHANNEL
var need = "*_Need instagram link!_*";
var downloading = "_Downloading_";
var need_acc = "*_Need an instagram username!_*";
var fail = "*_Download failed! Check your link and try again_*";
var need_acc_s = "_Need an instagram username or link!_";
let sourav = setting.WORKTYPE == 'public' ? false : true
skl.addCommand({ pattern: 'insta ?(.*)', fromMe: sourav, desc:'Downloads post/reel/igtv from instagram',usage:'insta link or reply to a link'}, (async (msg, query) => {
var q = !msg.reply_message.message ? query[1] : msg.reply_message.message
if (!q)  return await msg.client.sendMessage(msg.jid, '_Unable to read link from message!_', MessageType.text, {quoted: msg.data});
if (q && !q.includes('instagram.com')) return await msg.client.sendMessage(msg.jid, need, MessageType.text, {quoted: msg.data});
var getid = /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com(?:\/.+?)?\/(p|reel|tv)\/)([\w-]+)(?:\/)?(\?.*)?$/
var url = getid.exec(q)
if (url != null) {
var res = await getPost(url[0],v )
if (res === "false") return await msg.client.sendMessage(msg.jid, fail, MessageType.text, {quoted: msg.data});
else await msg.client.sendMessage(msg.jid, downloading, MessageType.text, {quoted: msg.data});
var url = res.data
for (var i = 0; i < (url.length); i++) {
var get = got(url[i], {https: {rejectUnauthorized: false}});
var type = url[i].includes('mp4') ? MessageType.video : MessageType.image
var mime = url[i].includes('mp4') ? Mimetype.mp4 : Mimetype.jpg
var stream = get.buffer();
stream.then(async (video) => {
await msg.client.sendMessage(msg.jid, video, type, { mimetype: mime, quoted: msg.data});
})};}
else if (url == null) {
var linksplit = q.split('https://')[1]
var res = await getPost('https://'+linksplit,v )
if (res === "false") return await msg.client.sendMessage(msg.jid, fail, MessageType.text, {quoted: msg.data});
else await msg.client.sendMessage(msg.jid, downloading, MessageType.text, {quoted: msg.data});
var buffer = await skbuffer(res.links[0].url)
if (res.links[0].url.includes('mp4')) return await msg.client.sendMessage(msg.jid, buffer, MessageType.video, { mimetype: Mimetype.mp4, quoted: msg.data});
if (res.links[0].url.includes('jpg')) return await msg.client.sendMessage(msg.jid, buffer, MessageType.image, { mimetype: Mimetype.jpg, quoted: msg.data});
    
}
}));
skl.addCommand({ pattern: 'ig ?(.*)', fromMe: sourav, desc:'Gets account info from instagram',usage:'ig username'}, (async (msg, query) => {
    if (query[1] === '') return await msg.client.sendMessage(msg.jid, need_acc, MessageType.text, {quoted: msg.data});
    var res = await getStalk(query[1])
    if (res === "false") return await msg.client.sendMessage(msg.jid, "_Username invalid!_", MessageType.text, {quoted: msg.data})
    var buffer = await skbuffer(res.hd_profile_pic_url_info.url)
    await msg.client.sendMessage(msg.jid, buffer, MessageType.image, { mimetype: Mimetype.jpg, caption: '_*Name:*_ ' + `${res.fullname}` + '\n _*Bio:*_ ' + `${res.biography}`+ '\n _*Private account:*_ ' + `${res.is_private} ` + '\n _*Followers:*_ ' + `${res.followers}` + '\n _*Following:*_ ' + `${res.following}` + '\n _*Posts:*_ ' + `${res.post_count}` + '\n _*Verified:*_ ' + `${res.is_verified} ` + '\n _*IGTV videos:*_ ' + `${res.total_igtv_videos}`, quoted: msg.data});
    }));
skl.addCommand({ pattern: 'story ?(.*)', fromMe: sourav, desc:'Downloads full/single story from instagram',usage:'.story username or link'}, (async (msg, query) => {
if (query[1] === '') return await msg.client.sendMessage(msg.jid, need_acc_s, MessageType.text, {quoted: msg.data});
var user = query[1];
var res = await getStory(user,v)
if (res === "false") return await msg.client.sendMessage(msg.jid, "_Story not found!_", MessageType.text, {quoted: msg.data})
if (res.error) return await msg.client.sendMessage(msg.jid, res.error.replace('status','story'), MessageType.text, {quoted: msg.data})
var url = ''
await msg.sendMessage('```Downloading '+res.result.stories.length+' stories of '+res.result.username+'```');
res.result.stories.map((result) => {
url += result.url + ','});
var que = url !== false ? url.split(',') : [];
for (var i = 0; i < (que.length < res.result.stories.length ? que.length : res.result.stories.length); i++) {
var get = got(que[i], {https: {rejectUnauthorized: false}});
var type = que[i].includes('mp4') ? MessageType.video : MessageType.image
var mime = que[i].includes('mp4') ? Mimetype.mp4 : Mimetype.jpg
var stream = get.buffer();
stream.then(async (video) => {
await msg.client.sendMessage(msg.jid, video, type, { mimetype: mime,quoted: msg.data});
})};
}));
