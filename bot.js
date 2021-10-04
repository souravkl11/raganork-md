const fs = require("fs");
const path = require("path");
const events = require("./events");
const chalk = require('chalk');
const config = require('./config');
const {WAConnection, MessageOptions, MessageType, Mimetype, Presence} = require('@adiwajshing/baileys');
const {Message, StringSession, Image, Video} = require('./Raganork/');
const { DataTypes } = require('sequelize');
const { getMessage } = require("./plugins/sql/greetings");
const axios = require('axios');
const got = require('got');

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

async function whatsAsena () {
    await config.DATABASE.sync();
    var StrSes_Db = await WhatsAsenaDB.findAll({
        where: {
          info: 'StringSession'
        }
    });
    
    
    const conn = new WAConnection();
    conn.version = [2, 2126, 14];
    const Session = new StringSession();

    conn.logger.level = config.DEBUG ? 'debug' : 'warn';
    var nodb;

    if (StrSes_Db.length < 1) {
        nodb = true;
        conn.loadAuthInfo(Session.deCrypt(config.SESSION)); 
    } else {
        conn.loadAuthInfo(Session.deCrypt(StrSes_Db[0].dataValues.value));
    }

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
        console.log(`${chalk.green.bold('Whats')}${chalk.blue.bold('Asena')}
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
            chalk.green.bold('✅ Raganork working!')
        );
        await new Promise(r => setTimeout(r, 1100));

        if (config.WORKTYPE == 'public') {
            if (config.LANG == 'TR' || config.LANG == 'AZ') {

                if (conn.user.jid === '@s.whatsapp.net') {

                    await conn.sendMessage(conn.user.jid, '```🛡️ Blacklist Tespit Edildi!``` \n```Kullanıcı:``` \n```Sebep:``` ', MessageType.text)

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
                    await conn.sendMessage(conn.user.jid, '*RAGANORK STARTED*', MessageType.text);
                }
            }
            else {

                if (conn.user.jid === '@s.whatsapp.net') {

                    await conn.sendMessage(conn.user.jid, '```🛡️ Blacklist Detected!``` \n```User:```  \n```Reason:``` ', MessageType.text)

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
                    await conn.sendMessage(conn.user.jid, '*RAGANORK STARTED*', MessageType.text);
                }

            }
        }
        else if (config.WORKTYPE == 'private') {
            if (config.LANG == 'TR' || config.LANG == 'AZ') {

                if (conn.user.jid === '@s.whatsapp.net') {

                    await conn.sendMessage(conn.user.jid, '```🛡️ Blacklist Detected!``` \n ```Kullanıcı:``` \n```Sebep:``` ', MessageType.text)

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

                await conn.sendMessage(conn.user.jid, '*RAGANORK STARTED*', MessageType.text);
                }
            }
            else {

                if (conn.user.jid === '@s.whatsapp.net') {

                    await conn.sendMessage(conn.user.jid, '```🛡️ Blacklist Detected!``` \n```User:```  \n```Reason:``` ', MessageType.text)
   
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

                    await conn.sendMessage(conn.user.jid, '*RAGANORK STARTED*', MessageType.text);
                }
            }
        }
        else {
            return console.log('Wrong WORK_TYPE key! Please use “private” or “public”')
        }
    });

    conn.on('chat-update', async m => {
        if (!m.hasNewMessage) return;
        if (!m.messages && !m.count) return;
        let msg = m.messages.all()[0];
        if (msg.key && msg.key.remoteJid == 'status@broadcast') return;

        if (config.NO_ONLINE) {
            await conn.updatePresence(msg.key.remoteJid, Presence.unavailable);
        }

        if (msg.messageStubType === 32 || msg.messageStubType === 28) {

            var gb = await getMessage(msg.key.remoteJid, 'goodbye');
            if (gb !== false) {
                if (gb.message.includes('{profile}')) {
                let pp 
                try { pp = await conn.getProfilePicture(msg.messageStubParameters[0]); } catch { pp = await conn.getProfilePicture(); }
                 var sourav = await conn.groupMetadata(msg.key.remoteJid)
                await axios.get(pp, {responseType: 'arraybuffer'}).then(async (res) => {
                await conn.sendMessage(msg.key.remoteJid, res.data, MessageType.image, {caption:  gb.message.replace('{profile}', '').replace('{gpname}', sourav.subject).replace('{gpmaker}', sourav.owner).replace('{gpdesc}', sourav.desc).replace('{owner}', conn.user.name) }); });                           
            } else if (gb.message.includes('{gif}')) {
                var sourav = await conn.groupMetadata(msg.key.remoteJid)
                //created by afnanplk
                    var skl11 = await axios.get(config.GIF_BYE, { responseType: 'arraybuffer' })
                await conn.sendMessage(msg.key.remoteJid, Buffer.from(skl11.data), MessageType.video, {mimetype: Mimetype.gif, caption: gb.message.replace('{gif}', '').replace('{gpname}', sourav.subject).replace('{gpmaker}', sourav.owner).replace('{gpdesc}', sourav.desc).replace('{owner}', conn.user.name) });
            } else {
                var sourav = await conn.groupMetadata(msg.key.remoteJid)
                   await conn.sendMessage(msg.key.remoteJid,gb.message.replace('{gpname}', sourav.subject).replace('{gpmaker}', sourav.owner).replace('{gpdesc}', sourav.desc).replace('{owner}', conn.user.name), MessageType.text);
            }
          }  //thanks to farhan      
            return;
        } else if (msg.messageStubType === 27 || msg.messageStubType === 31) {
            // welcome
             var gb = await getMessage(msg.key.remoteJid);
            if (gb !== false) {
                if (gb.message.includes('{profile}')) {
                let pp
                try { pp = await conn.getProfilePicture(msg.messageStubParameters[0]); } catch { pp = await conn.getProfilePicture(); }
                    var sourav = await conn.groupMetadata(msg.key.remoteJid)
                await axios.get(pp, {responseType: 'arraybuffer'}).then(async (res) => {
                    //created by afnanplk
                await conn.sendMessage(msg.key.remoteJid, res.data, MessageType.image, {caption:  gb.message.replace('{profile}', '').replace('{gpname}', sourav.subject).replace('{gpmaker}', sourav.owner).replace('{gpdesc}', sourav.desc).replace('{owner}', conn.user.name) }); });                           
            } else if (gb.message.includes('{gif}')) {
                var skl11 = await axios.get(config.WEL_GIF, { responseType: 'arraybuffer' })
                await conn.sendMessage(msg.key.remoteJid, Buffer.from(skl11.data), MessageType.video, {mimetype: Mimetype.gif, caption: gb.message.replace('{gif}', '').replace('{gpname}', sourav.subject).replace('{gpmaker}', sourav.owner).replace('{gpdesc}', sourav.desc).replace('{owner}', conn.user.name) });
            } else {
                   var sourav = await conn.groupMetadata(msg.key.remoteJid)
                   await conn.sendMessage(msg.key.remoteJid,gb.message.replace('{gpname}', sourav.subject).replace('{gpmaker}', sourav.owner).replace('{gpdesc}', sourav.desc).replace('{owner}', conn.user.name), MessageType.text);
            }
          }         
            return;                               
    }

    if (config.BLOCKCHAT !== false) {     
        var abc = config.BLOCKCHAT.split(',');                            
        if(msg.key.remoteJid.includes('-') ? abc.includes(msg.key.remoteJid.split('@')[0]) : abc.includes(msg.participant ? msg.participant.split('@')[0] : msg.key.remoteJid.split('@')[0])) return ;
    }
    if (config.SUPPORT == '905524317852-1612300121') {     
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
                    var chat = conn.chats.get(msg.key.remoteJid)
                        
                    if ((config.SUDO !== false && msg.key.fromMe === false && command.fromMe === true &&
                        (msg.participant && config.SUDO.includes(',') ? config.SUDO.split(',').includes(msg.participant.split('@')[0]) : msg.participant.split('@')[0] == config.SUDO || config.SUDO.includes(',') ? config.SUDO.split(',').includes(msg.key.remoteJid.split('@')[0]) : msg.key.remoteJid.split('@')[0] == config.SUDO)
                    ) || command.fromMe === msg.key.fromMe || (command.fromMe === false && !msg.key.fromMe)) {
                        if (command.onlyPinned && chat.pin === undefined) return;
                        if (!command.onlyPm === chat.jid.includes('-')) sendMsg = true;
                        else if (command.onlyGroup === chat.jid.includes('-')) sendMsg = true;
                    }
                    if ((config.YAK !== false && msg.key.fromMe === false && command.fromMe === true &&
                        (msg.participant && config.YAK.includes(',') ? config.YAK.split(',').includes(msg.participant.split('@')[0]) : msg.participant.split('@')[0] == config.YAK || config.YAK.includes(',') ? config.YAK.split(',').includes(msg.key.remoteJid.split('@')[0]) : msg.key.remoteJid.split('@')[0] == config.YAK)
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
/*
                        if (command.deleteCommand && msg.key.fromMe) {
                            await whats.delete(); 
                        }
*/
                        try {
                            await command.function(whats, match);
                        } catch (error) {
                            if (config.LANG == 'TR' || config.LANG == 'AZ') {
                                await conn.sendMessage(conn.user.jid, '-- HATA RAPORU [WHATSASENA] --' + 
                                    '\n*WhatsAsena bir hata gerçekleşti!*'+
                                    '\n_Bu hata logunda numaranız veya karşı bir tarafın numarası olabilir. Lütfen buna dikkat edin!_' +
                                    '\n_Yardım için Telegram grubumuza yazabilirsiniz._' +
                                    '\n_Bu mesaj sizin numaranıza (kaydedilen mesajlar) gitmiş olmalıdır._\n\n' +
                                    'Gerçekleşen Hata: ' + error + '\n\n'
                                    , MessageType.text);
                            } else {
                                await conn.sendMessage(conn.user.jid, '*~_________~ 𝐑𝐀𝐆𝐀𝐍𝐎𝐑𝐊 ~______~*' +
                                    '\n\n*🧞‍♂️ ' + error + '*\n\n```JOIN SUPPORT GROUP ONLY WITH +91 NUMBERS``` ' 
                                    , MessageType.text);
                            }
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
            console.log(chalk.red.bold('Eski sürüm stringiniz yenileniyor...'))
            conn.loadAuthInfo(Session.deCrypt(config.SESSION)); 
            try {
                await conn.connect();
            } catch {
                return;
            }
        }
    }
}

whatsAsena();
