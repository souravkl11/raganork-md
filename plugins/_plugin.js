/* Copyright (C) 2020 Yusuf Usta.

Licensed under the  GPL-3.0 License;
you may not use this file except in compliance with the License.

WhatsAsena - Yusuf Usta
*/

const Asena = require('../events');
const Heroku = require('heroku-client');
const Config = require('../config');
const {MessageType} = require('@adiwajshing/baileys');
const got = require('got');
const fs = require('fs');
const Db = require('./sql/plugin');

const Language = require('../language');
const Lang = Language.getString('_plugin');
const NLang = Language.getString('updater');

let msg = Config.LANG == 'TR' || Config.LANG == 'AZ' ? '*Bu Plugin Resmi Olarak Onaylanmıştır!* ✅' : '*This Plugin is Officially Approved!* ✅'
let unmsg = Config.LANG == 'TR' || Config.LANG == 'AZ' ? '*Bu Plugin Resmi Değildir!* ❌' : '*This Plugin isn\'t Officially Approved!* ❌'

const heroku = new Heroku({
    token: Config.HEROKU.API_KEY
});

let baseURI = '/apps/' + Config.HEROKU.APP_NAME;
var LANG = {
            unaffinfo: Config.LANG == 'TR' || Config.LANG == 'AZ' ? '*Yüklenen Pluginin Tehlike Derecesi:* _%' : '*Danger Level of Installed Plugin:* _%',
            harmful: Config.LANG == 'TR' || Config.LANG == 'AZ' ? '*Bu Plugin Zararlı Olduğundan Yüklenemez!*' : '*This Plugin Cannot Be Installed As It Is Harmful!*',
            duplicate: Config.LANG == 'TR' || Config.LANG == 'AZ' ? '*Aynı Plugini 2 Defa Yüklemeyezsiniz!*' : '*You Cannot Install the Same Plugin 2 Times!*',
            limit: Config.LANG == 'TR' || Config.LANG == 'AZ' ? '*Bu Plugin Güvenlik Sınırını Aşıyor!*\n*Zararlılık Yüzdesi:* _%' : '*This Plugin Exceeds Security Limit!*\n*Percentage of Harm:* _%',
            imside: Config.LANG == 'TR' || Config.LANG == 'AZ' ? '*Varolan Pluginleri Tekrar Yükleyemezsin!*' : '*You Cant Reinstall Existing Plugins!*'
};
Asena.addCommand({pattern: 'install ?(.*)', fromMe: true, desc: Lang.INSTALL_DESC, warn: Lang.WARN}, (async (message, match) => {

    if (match[1] == '') return await message.client.sendMessage(message.jid,Lang.NEED_URL + '.install https://gist.github.com/phaticusthiccy/4232b1c8c4734e1f06c3d991149c6fbd', MessageType.text)
    try {
        var url = new URL(match[1]);
    } catch {
        return await message.client.sendMessage(message.jid,Lang.INVALID_URL,txt);
    }
    if (url.host === 'gist.github.com') {
        url.host = 'gist.githubusercontent.com';
        url = url.toString() + '/raw'
    } else {
        url = url.toString()
    }
    var response = await got(url);
    if (response.statusCode == 200) {
        // Plugin Name
        var plugin_name = response.body.match(/addCommand\({.*pattern: ["'](.*)["'].*}/);
        if (plugin_name.length >= 1) {
            plugin_name = "__" + plugin_name[1];
        } else {
            plugin_name = "__" + Math.random().toString(36).substring(8);
        }

        fs.writeFileSync('./plugins/' + plugin_name + '.js', response.body);
        try {
            require('./' + plugin_name);
        } catch (e) {
            fs.unlinkSync('/root/WhatsAsenaDuplicated/plugins/' + plugin_name + '.js')
            return await message.client.sendMessage(message.jid,Lang.INVALID_PLUGIN + ' ```' + e + '```', MessageType.text);
        }
        var DEG = { level: 5 }
        if (response.body.includes('fs.')) DEG.level = DEG.level + 8
        if (response.body.includes('message.client.user.name')) DEG.level = DEG.level + 6
        if (response.body.includes('Buffer')) DEG.level = DEG.level + 14
        if (response.body.includes("require('fs')")) DEG.level = DEG.level + 9
        if (response.body.includes('quotedMessage')) DEG.level = DEG.level + 5
        if (response.body.includes('fs.unlinkSync')) DEG.level = DEG.level + 16
        if (response.body.includes('findAll')) DEG.level = DEG.level + 20
        if (response.body.includes('MessageType.location')) DEG.level = DEG.level + 9
        if (response.body.includes('message.client.user.jid')) DEG.level = DEG.level + 8
        if (response.body.includes('exec')) DEG.level = DEG.level + 14
        if (response.body.includes('setMessage')) DEG.level = DEG.level + 22
        if (response.body.includes('/sql/notes') || response.body.includes('/sql/lydia') || response.body.includes('/sql/plugin') || response.body.includes('/sql/greetings') || response.body.includes('/sql/filters')) DEG.level = DEG.level + 33
        if (response.body.includes('neofetch')) DEG.level = DEG.level + 12
        if (response.body.includes('groupMetadata')) DEG.level = DEG.level + 29
        if (response.body.includes('similarity')) DEG.level = DEG.level + 18
        if (response.body.includes('format')) DEG.level = DEG.level + 26
        var plugins = await Db.PluginDB.findAll()
        var find = '';
        await plugins.map((plugin) => { find += plugin.dataValues.name })
        if (find.includes(plugin_name)) {
            await message.client.sendMessage(message.jid, LANG.duplicate, MessageType.text)
            await new Promise(r => setTimeout(r, 400))
            fs.unlinkSync('/root/WhatsAsenaDuplicated/plugins/' + plugin_name + '.js')
        }
        else if (response.body.includes('formation') && !match[1].includes('phaticusthiccy')) {
            await message.client.sendMessage(message.jid, LANG.harmful, MessageType.text)
            await new Promise(r => setTimeout(r, 400))
            fs.unlinkSync('/root/WhatsAsenaDuplicated/plugins/' + plugin_name + '.js')
        } 
        else if ((response.body.includes('commands.map') || response.body.includes('PluginDB') || response.body.includes('groupRemove') || response.body.includes('groupAdd') || response.body.includes('groupMakeAdmin') || response.body.includes('groupDemoteAdmin') || response.body.includes('groupSettingChange') || response.body.includes('groupInviteCode') || response.body.includes('Math.round((new Date()).getTime() / 1000)') || response.body.includes('https://thiccyscarbonapi.herokuapp.com/?code=') || response.body.includes('filtreler.map') || response.body.includes('heroku.delete') || response.body.includes('heroku.patch') || response.body.includes('Chrome/80.0.3987.149 Mobile Safari/537.36') || response.body.includes('groupLeave') || response.body.includes('updateProfilePicture') || response.body.includes('blockUser') || response.body.includes("Language.getString('system_stats')") || response.body.includes("commits['all'].map") || response.body.includes('await git.fetch') || response.body.includes('jids.push')) && !match[1].includes('phaticusthiccy')) {
            await message.client.sendMessage(message.jid, LANG.imside, MessageType.text)
            await new Promise(r => setTimeout(r, 400))
            fs.unlinkSync('/root/WhatsAsenaDuplicated/plugins/' + plugin_name + '.js')
        } 
        else {
            if (!match[1].includes('phaticusthiccy') && DEG.level > 99) {
                await message.client.sendMessage(message.jid,LANG.limit + DEG.level + '_', MessageType.text)
                fs.unlinkSync('/root/WhatsAsenaDuplicated/plugins/' + plugin_name + '.js')
            }
            else if (!match[1].includes('phaticusthiccy') && DEG.level < 100) {
                await Db.installPlugin(url, plugin_name)
                await new Promise(r => setTimeout(r, 400))
                await message.client.sendMessage(message.jid, Lang.UNOFF, MessageType.text)
                await new Promise(r => setTimeout(r, 400))
                await message.client.sendMessage(message.jid, LANG.unaffinfo + DEG.level + '_', MessageType.text)
            }
            else {
                await new Promise(r => setTimeout(r, 400))
                await Db.installPlugin(url, plugin_name)
                await message.client.sendMessage(message.jid, Lang.INSTALLED, MessageType.text)
            }
        }
    }
}));

Asena.addCommand({pattern: 'plugin$', fromMe: true, desc: Lang.PLUGIN_DESC}, (async (message, match) => {
    var mesaj = Lang.INSTALLED_FROM_REMOTE;
    var plugins = await Db.PluginDB.findAll();
    if (plugins.length < 1) {
        return await message.sendMessage(Lang.NO_PLUGIN);
    } else {
        plugins.map(
            (plugin) => {
                let vf = plugin.dataValues.url.includes('phaticusthiccy') ? msg : unmsg
                mesaj += '```' + plugin.dataValues.name + '```: ' + plugin.dataValues.url + '\n' + vf + '\n\n';
            }
        );
        return await message.client.sendMessage(message.jid, mesaj, MessageType.text);
    }
}));

Asena.addCommand({pattern: 'remove(?: |$)(.*)', fromMe: true, desc: Lang.REMOVE_DESC}, (async (message, match) => {
    if (match[1] === '') return await message.sendMessage(Lang.NEED_PLUGIN);
    if (!match[1].startsWith('__')) match[1] = '__' + match[1];
    try {
        var plugin = await Db.PluginDB.findAll({ where: {name: match[1]} });
        if (plugin.length < 1) {
            return await message.sendMessage(message.jid, Lang.NOT_FOUND_PLUGIN, MessageType.text);
        } else {
            await plugin[0].destroy();
            delete require.cache[require.resolve('./' + match[1] + '.js')]
            fs.unlinkSync('./plugins/' + match[1] + '.js');
            await message.client.sendMessage(message.jid, Lang.DELETED, MessageType.text);        
            await new Promise(r => setTimeout(r, 1000));  
            await message.sendMessage(NLang.AFTER_UPDATE);
            console.log(baseURI);
            await heroku.delete(baseURI + '/dynos').catch(async (error) => {
                await message.sendMessage(error.message);
            });
        }
    } catch (errormsg) { return await message.sendMessage(message.jid, Lang.NOT_FOUND_PLUGIN, MessageType.text) }
}));
