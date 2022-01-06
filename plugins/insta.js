/* Credits: souravkl11, raganork-api
(c) souravkl11 2022 All rights reserved
*/
const skl = require('../events');
const { MessageType, MessageOptions, Mimetype } = require('@adiwajshing/baileys');
const fs = require('fs');
const got = require("got");
const axios = require('axios');
const setting = require('../config');
const raganork = require('raganork-bot');
const Config = require('../config');
const s = require('../config');
const v = s.CHANNEL
const need = "_Need instagram link!_";
const need_acc = "_Need an instagram username!_";
const fail = "*_Download failed! Check your link and try again_*";
const need_acc_s = "_Need username or link!_";
let sourav = setting.WORKTYPE == 'public' ? false : true
skl.addCommand({ pattern: 'insta ?(.*)', fromMe: sourav,dontAddCommandList: true }, (async (msg, query) => {
if (query[1] && !msg.reply_message.text) {
if (!query[1].includes('instagram.com')) return await msg.client.sendMessage(msg.jid, need, MessageType.text, {quoted: msg.data});
var res = await raganork.query.getPost(query[1],v)
var buffer = await raganork.query.skbuffer(res.links[0].url)
if (!res) return await msg.client.sendMessage(msg.jid, fail, MessageType.text, {quoted: msg.data});
if (res.links[0].url.includes('mp4')) return await msg.client.sendMessage(msg.jid, buffer, MessageType.video, { mimetype: Mimetype.mp4, caption: '_Caption:_ ' + `${res.caption}` + '\n\n _Username:_ *' + `${res.username}` + '*\n _Name:_ *' + `${res.name}` + '*\n _Likes:_ *' + `${res.likes}` + '*\n _Comments:_ *' + `${res.comment_count}` + '*', quoted: msg.data});
if (res.links[0].url.includes('jpg')) return await msg.client.sendMessage(msg.jid, buffer, MessageType.image, { mimetype: Mimetype.jpg, caption: '_Caption:_ ' + `${res.caption}` + '\n\n _Username:_ *' + `${res.username}` + '*\n _Name:_ *' + `${res.name}` + '*\n _Likes:_ *' + `${res.likes}` + '*\n _Comments:_ *' + `${res.comment_count}` + '*', quoted: msg.data});
}
else if (!query[1] && msg.reply_message.text) {
if (!msg.reply_message.text.includes('instagram.com')) return await msg.client.sendMessage(msg.jid, need, MessageType.text, {quoted: msg.data});
var s1 = msg.reply_message.text
var souravkl11 = s1.split('instagram.com')
var q = 'https://instagram.com' + souravkl11[1]
var res = await raganork.query.getPost(q,v )
var buffer = await raganork.query.skbuffer(res.links[0].url)
if (!res) return await msg.client.sendMessage(msg.jid, fail, MessageType.text, {quoted: msg.data});
if (res.links[0].url.includes('mp4')) return await msg.client.sendMessage(msg.jid, buffer, MessageType.video, { mimetype: Mimetype.mp4, caption: '_Caption:_ ' + `${res.caption}` + '\n\n _Username:_ *' + `${res.username}` + '*\n _Name:_ *' + `${res.name}` + '*\n _Likes:_ *' + `${res.likes}` + '*\n _Comments:_ *' + `${res.comment_count}` + '*', quoted: msg.data});
if (res.links[0].url.includes('jpg')) return await msg.client.sendMessage(msg.jid, buffer, MessageType.image, { mimetype: Mimetype.jpg, caption: '_Caption:_ ' + `${res.caption}` + '\n\n _Username:_ *' + `${res.username}` + '*\n _Name:_ *' + `${res.name}` + '*\n _Likes:_ *' + `${res.likes}` + '*\n _Comments:_ *' + `${res.comment_count}` + '*', quoted: msg.data});
}
else return await msg.client.sendMessage(msg.jid, need, MessageType.text, {quoted: msg.data});
}));
skl.addCommand({ pattern: 'ig ?(.*)', fromMe: sourav,dontAddCommandList: true }, (async (msg, query) => {
if (query[1] === '') return await msg.client.sendMessage(msg.jid, need_acc, MessageType.text, {quoted: msg.data});
var res = await raganork.query.getStalk(query[1])
var buffer = await raganork.query.skbuffer(res.user.hd_profile_pic_url_info.url)
if (!res.user) return await msg.client.sendMessage(msg.jid, "_Username invalid!_", MessageType.text, {quoted: msg.data})
await msg.client.sendMessage(msg.jid, buffer, MessageType.image, { mimetype: Mimetype.jpg, caption: '_Name:_ ' + `${res.user.full_name}` + '\n _Bio:_ *' + `${res.user.biography}`+ '*\n _Private acc:_ *' + `${res.user.is_private} ` + '*\n _Followers:_ *' + `${res.user.follower_count}` + '*\n _Following:_ *' + `${res.user.following_count}` + '*\n _Posts:_ *' + `${res.user.media_count}` + '*\n _Verified:_ ' + `${res.user.is_verified} ` + '\n _IGTV videos:_ *' + `${res.user.total_igtv_videos}` + '*', quoted: msg.data});
}));
skl.addCommand({ pattern: 'story ?(.*)', fromMe: sourav,dontAddCommandList: true }, (async (msg, query) => {
if (query[1] === '') return await msg.client.sendMessage(msg.jid, need_acc_s, MessageType.text, {quoted: msg.data});
var user = query[1];
var res = await raganork.query.getStory(user,v)
var url = ''
res.result.data.map((result) => {
url += result.url + ','});
var que = url !== false ? url.split(',') : [];
for (var i = 0; i < (que.length < res.result.data.length ? que.length : res.result.data.length); i++) {
var get = got(que[i], {https: {rejectUnauthorized: false}});
var stream = get.buffer();
stream.then(async (video) => {
await msg.client.sendMessage(msg.jid, video, MessageType.video, { mimetype: Mimetype.mp4, caption: '```Story of '+user + '```', quoted: msg.data});
})};
}));
