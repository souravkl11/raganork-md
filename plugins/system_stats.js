/* Copyright (C) 2020 Yusuf Usta.

Licensed under the  GPL-3.0 License;
you may not use this file except in compliance with the License.

WhatsAsena - Yusuf Usta
Developer & Co-Founder - Phaticusthiccy
*/

const Asena = require('../events');
const {MessageType} = require('@adiwajshing/baileys');
const {spawnSync} = require('child_process');
const Config = require('../config');
const chalk = require('chalk');
const Axios = require('axios');
const fs = require('fs')
const Language = require('../language');
const Lang = Language.getString('system_stats');


if (Config.WORKTYPE == 'private') {

    Asena.addCommand({pattern: 'alive', fromMe: true, desc: Lang.ALIVE_DESC}, (async (message, match) => {

        if (Config.ALIVEMSG == 'default') {
            await message.client.sendMessage(message.jid,'```Tanrı Türk\'ü Korusun. 🐺 Asena Hizmetinde!```\n\n*Version:* ```'+Config.VERSION+'```\n*Branch:* ```'+Config.BRANCH+'```\n*Telegram Group:* https://t.me/AsenaSupport\n*Telegram Channel:* https://t.me/asenaremaster\n*Plugin Channel:* ' + Config.CHANNEL , MessageType.text);
        }
        else {
            var payload = Config.ALIVEMSG
            const status = await message.client.getStatus()

            if (payload.includes('{pp}')) {
                const ppUrl = await message.client.getProfilePicture() 
                const resim = await Axios.get(ppUrl, {responseType: 'arraybuffer'})
                await message.sendMessage(Buffer(resim.data), MessageType.image, { caption: payload.replace('{version}', Config.VERSION).replace('{pp}', '').replace('{info}', `${status.status}`).replace('{plugin}', Config.CHANNEL)});
            }
            else if (payload.includes('{asenalogo}')) {
                await message.client.sendMessage(message.jid,fs.readFileSync('/root/WhatsAsenaDuplicated/media/gif/WhatsAsena Animated.mp4'), MessageType.video, { caption: payload.replace('{version}', Config.VERSION).replace('{pp}', '').replace('{info}', `${status.status}`).replace('{plugin}', Config.CHANNEL).replace('{asenalogo}', '')});
            }
            else {
                await message.client.sendMessage(message.jid,payload.replace('{version}', Config.VERSION).replace('{info}', `${status.status}`).replace('{plugin}', Config.CHANNEL), MessageType.text);
            }
        }
    }));

    Asena.addCommand({pattern: 'sysd', fromMe: true, desc: Lang.SYSD_DESC}, (async (message, match) => {

        const child = spawnSync('neofetch', ['--stdout']).stdout.toString('utf-8')
        await message.sendMessage(
            '```' + child + '```', MessageType.text
        );
    }));
}
else if (Config.WORKTYPE == 'public') {

    Asena.addCommand({pattern: 'alive', fromMe: false, desc: Lang.ALIVE_DESC}, (async (message, match) => {

        if (Config.ALIVEMSG == 'default') {
            await message.client.sendMessage(message.jid,'```Tanrı Türk\'ü Korusun. 🐺 Asena Hizmetinde!```\n\n*Version:* ```'+Config.VERSION+'```\n*Branch:* ```'+Config.BRANCH+'```\n*Telegram Group:* https://t.me/AsenaSupport\n*Telegram Channel:* https://t.me/asenaremaster\n*Plugin Channel:* ' + Config.CHANNEL , MessageType.text);
        }
        else {
            var payload = Config.ALIVEMSG
            const status = await message.client.getStatus()

            if (payload.includes('{pp}')) {
                const ppUrl = await message.client.getProfilePicture() 
                const resim = await Axios.get(ppUrl, {responseType: 'arraybuffer'})
                await message.sendMessage(Buffer(resim.data), MessageType.image, { caption: payload.replace('{version}', Config.VERSION).replace('{pp}', '').replace('{info}', `${status.status}`).replace('{plugin}', Config.CHANNEL)});
            }
            else if (payload.includes('{asenalogo}')) {
                await message.client.sendMessage(message.jid,fs.readFileSync('/root/WhatsAsenaDuplicated/media/gif/WhatsAsena Animated.mp4'), MessageType.video, { caption: payload.replace('{version}', Config.VERSION).replace('{pp}', '').replace('{info}', `${status.status}`).replace('{plugin}', Config.CHANNEL).replace('{asenalogo}', '')});
            }
            else {
                await message.client.sendMessage(message.jid,payload.replace('{version}', Config.VERSION).replace('{info}', `${status.status}`).replace('{plugin}', Config.CHANNEL), MessageType.text);
            }
        }
    }));

    Asena.addCommand({pattern: 'sysd', fromMe: false, desc: Lang.SYSD_DESC}, (async (message, match) => {

        const child = spawnSync('neofetch', ['--stdout']).stdout.toString('utf-8')
        await message.sendMessage(
            '```' + child + '```', MessageType.text
        );
    }));
}
