/* Codded by @phaticusthiccy
Telegram: t.me/phaticusthiccy
Instagram: www.instagram.com/kyrie.baran
*/

const Asena = require('../events')
const { MessageType } = require('@adiwajshing/baileys')
const axios = require('axios')
const cn = require('../config');

const Language = require('../language')
const { errorMessage, infoMessage } = require('../helpers')
const Lang = Language.getString('instagram')
const Tlang = Language.getString('tiktok')

if (cn.WORKTYPE == 'private') {

    Asena.addCommand({ pattern: 'insta ?(.*)', fromMe: true, desc: Lang.DESC }, (async (message, match) => {
        if (match[0].includes('install')) return;
        if (match[1] === '') return await message.client.sendMessage(message.jid, Lang.NEED_WORD, MessageType.text, { quoted: message.data });
        if (!match[1].includes('www.instagram.com')) return await message.client.sendMessage(message.jid, Lang.NEED_WORD, MessageType.text, { quoted: message.data });
	
        let urls = `https://api.xteam.xyz/dl/ig?url=${match[1]}&APIKEY=ab9942f95c09ca89`
        let response
        try { response = await got(urls) } catch { return await message.client.sendMessage(message.jid, Lang.FİX, MessageType.text, { quoted: message.data });
        }
        const json = JSON.parse(response.body);

        if (json.status === false) return await message.client.sendMessage(message.jid, Lang.NOT_FOUND, MessageType.text, { quoted: message.data });
        if (json.code === 403) return await message.client.sendMessage(message.jid, '```API Error!```', MessageType.text, { quoted: message.data });

        await message.client.sendMessage(message.jid, Tlang.DOWN, MessageType.text, { quoted: message.data });

        let url = json.result.data[0].data;
        let name = json.result.data[0].type;
        await axios({ method: "get", url, headers: { 'DNT': 1, 'Upgrade-Insecure-Request': 1 }, responseType: 'arraybuffer'}).then(async (res) => {
            if (name === 'video') { return await message.sendMessage(Buffer(res.data), MessageType.video, { caption: '*' + Tlang.USERNAME + '* ' + json.result.username + '\n*' + Tlang.LİNK + '* ' + 'http://instagram.com/' + json.result.username + '\n*' + Tlang.CAPTİON + '* ' + json.result.caption }) } else { return await message.sendMessage(Buffer(res.data), MessageType.image, { caption: '*' + Tlang.USERNAME + '* ' + json.result.username + '\n*' + Tlang.LİNK + '* ' + 'http://instagram.com/' + json.result.username + '\n*' + Tlang.CAPTİON + '* ' + json.result.caption });
            }
        });

    }));

    /*
    Asena.addCommand({ pattern: 'tiktok ?(.*)', fromMe: true, desc: Tlang.TİKTOK }, async (message, match) => {

        const userName = match[1]

        if (!userName) return await message.client.sendMessage(message.jid, Tlang.NEED, MessageType.text)

        await message.client.sendMessage(message.jid, Tlang.DOWN, MessageType.text)

        await axios
          .get(`https://shinoa-rest.herokuapp.com/dl/tiktok?link=${userName}`)
          .then(async (response) => {
            const {
              data,
            } = response.data

            const profileBuffer = await axios.get(data.mp4, {
              responseType: 'arraybuffer',
            })

            await message.sendMessage(Buffer.from(profileBuffer.data), MessageType.video, {
              caption: 'Made by WhatsAsena',
            })
          })
          .catch(
            async (err) => await message.client.sendMessage(message.jid, Tlang.NOT + userName, MessageType.text),
          )
      },
    )
    */
}
else if (cn.WORKTYPE == 'public') {

    Asena.addCommand({ pattern: 'insta ?(.*)', fromMe: false, desc: Lang.DESC }, (async (message, match) => {
        if (match[0].includes('install')) return;
        if (match[1] === '') return await message.client.sendMessage(message.jid, Lang.NEED_WORD, MessageType.text, { quoted: message.data });
        if (!match[1].includes('www.instagram.com')) return await message.client.sendMessage(message.jid, Lang.NEED_WORD, MessageType.text, { quoted: message.data });
	
        let urls = `https://api.xteam.xyz/dl/ig?url=${match[1]}&APIKEY=ab9942f95c09ca89`
        let response
        try { response = await got(urls) } catch { return await message.client.sendMessage(message.jid, Lang.FİX, MessageType.text, { quoted: message.data });
        }
        const json = JSON.parse(response.body);

        if (json.status === false) return await message.client.sendMessage(message.jid, Lang.NOT_FOUND, MessageType.text, { quoted: message.data });
        if (json.code === 403) return await message.client.sendMessage(message.jid, '```API Error!```', MessageType.text, { quoted: message.data });

        await message.client.sendMessage(message.jid, Tlang.DOWN, MessageType.text, { quoted: message.data });

        let url = json.result.data[0].data;
        let name = json.result.data[0].type;
        await axios({ method: "get", url, headers: { 'DNT': 1, 'Upgrade-Insecure-Request': 1 }, responseType: 'arraybuffer'}).then(async (res) => {
            if (name === 'video') { return await message.sendMessage(Buffer(res.data), MessageType.video, { caption: '*' + Tlang.USERNAME + '* ' + json.result.username + '\n*' + Tlang.LİNK + '* ' + 'http://instagram.com/' + json.result.username + '\n*' + Tlang.CAPTİON + '* ' + json.result.caption }) } else { return await message.sendMessage(Buffer(res.data), MessageType.image, { caption: '*' + Tlang.USERNAME + '* ' + json.result.username + '\n*' + Tlang.LİNK + '* ' + 'http://instagram.com/' + json.result.username + '\n*' + Tlang.CAPTİON + '* ' + json.result.caption });
            }
        });

    }));
    Asena.addCommand({ pattern: 'insta ?(.*)', fromMe: true, desc: Lang.DESC, dontAddCommandList: true }, (async (message, match) => {
        if (match[0].includes('install')) return;
        if (match[1] === '') return await message.client.sendMessage(message.jid, Lang.NEED_WORD, MessageType.text, { quoted: message.data });
        if (!match[1].includes('www.instagram.com')) return await message.client.sendMessage(message.jid, Lang.NEED_WORD, MessageType.text, { quoted: message.data });
	
        let urls = `https://api.xteam.xyz/dl/ig?url=${match[1]}&APIKEY=ab9942f95c09ca89`
        let response
        try { response = await got(urls) } catch { return await message.client.sendMessage(message.jid, Lang.FİX, MessageType.text, { quoted: message.data });
        }
        const json = JSON.parse(response.body);

        if (json.status === false) return await message.client.sendMessage(message.jid, Lang.NOT_FOUND, MessageType.text, { quoted: message.data });
        if (json.code === 403) return await message.client.sendMessage(message.jid, '```API Error!```', MessageType.text, { quoted: message.data });

        await message.client.sendMessage(message.jid, Tlang.DOWN, MessageType.text, { quoted: message.data });

        let url = json.result.data[0].data;
        let name = json.result.data[0].type;
        await axios({ method: "get", url, headers: { 'DNT': 1, 'Upgrade-Insecure-Request': 1 }, responseType: 'arraybuffer'}).then(async (res) => {
            if (name === 'video') { return await message.sendMessage(Buffer(res.data), MessageType.video, { caption: '*' + Tlang.USERNAME + '* ' + json.result.username + '\n*' + Tlang.LİNK + '* ' + 'http://instagram.com/' + json.result.username + '\n*' + Tlang.CAPTİON + '* ' + json.result.caption }) } else { return await message.sendMessage(Buffer(res.data), MessageType.image, { caption: '*' + Tlang.USERNAME + '* ' + json.result.username + '\n*' + Tlang.LİNK + '* ' + 'http://instagram.com/' + json.result.username + '\n*' + Tlang.CAPTİON + '* ' + json.result.caption });
            }
        });

    }));
    /*
    Asena.addCommand({ pattern: 'tiktok ?(.*)', fromMe: false, desc: Tlang.TİKTOK }, async (message, match) => {

        const userName = match[1]

        if (!userName) return await message.client.sendMessage(message.jid, Tlang.NEED, MessageType.text)

        await message.client.sendMessage(message.jid, Tlang.DOWN, MessageType.text)

        await axios
          .get(`https://api.xteam.xyz/dl/tiktok?url=${userName}&APIKEY=ab9942f95c09ca89`)
          .then(async (response) => {
            const {
              server_1,
            } = response.data

            const profileBuffer = await axios.get(server_1, {
              responseType: 'arraybuffer',
            })

            await message.sendMessage(Buffer.from(profileBuffer.data), MessageType.video, {
              caption: 'Made by WhatsAsena',
            })
          })
          .catch(
            async (err) => await message.client.sendMessage(message.jid, Tlang.NOT + userName, MessageType.text),
          )
      },
    )
    Asena.addCommand({ pattern: 'tiktok ?(.*)', fromMe: true, desc: Tlang.TİKTOK }, async (message, match) => {

        const userName = match[1]

        if (!userName) return await message.client.sendMessage(message.jid, Tlang.NEED, MessageType.text)

        await message.client.sendMessage(message.jid, Tlang.DOWN, MessageType.text)

        await axios
          .get(`https://shinoa-rest.herokuapp.com/dl/tiktok?link=${userName}`)
          .then(async (response) => {
            const {
              data,
            } = response.data

            const profileBuffer = await axios.get(data.mp4, {
              responseType: 'arraybuffer',
            })

            await message.sendMessage(Buffer.from(profileBuffer.data), MessageType.video, {
              caption: 'Made by WhatsAsena',
            })
          })
          .catch(
            async (err) => await message.client.sendMessage(message.jid, Tlang.NOT + userName, MessageType.text),
          )
      },
    )
    */
}
