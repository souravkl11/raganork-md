const Asena = require('../events')
const { MessageType, Mimetype} = require('@adiwajshing/baileys')
const axios = require('axios')
const sd = "Instagram video dowloads."
const got = require('got');
const hb = "Rent"
const yb = "Rentable"
const tvig = "Dwnlds Via Igtv."
const ph = "instagram Media Downloads."
const { errorMessage, infoMessage } = require('../helpers')
const Language = require('../language');
const Lang = Language.getString('instagram')


Asena.addCommand({ pattern: 'vinsta ?(.*)', fromMe: false, desc: sd }, async (message, match) => {

    const userName = match[1]

    if (userName === '') return await message.client.sendMessage(message.jid, '```URL Gir!```')

    await axios.get(`https://docs-jojo.herokuapp.com/api/insta?url=${userName}`).then(async (response) => {

        const { resource } = response.data

        const profileBuffer = await axios.get(resource.url[0], { responseType: 'arraybuffer' })

        if (resource.url.is_video[0]) {
            await message.sendMessage(Buffer.from(profileBuffer.data), MessageType.video, { caption: 'Made by WhatsAsena' })
        }
        else if (!resource.url.is_video[0]) {
            await message.sendMessage(Buffer.from(profileBuffer.data), MessageType.image, { caption: 'Made by WhatsAsena' })
        }
    }).catch(async (err) => {
        await message.sendMessage(errorMessage(Lang.NOT_FOUND + userName))
    })
});
Asena.addCommand({ pattern: 'pinsta ?(.*)', fromMe: false, desc: ph }, async (message, match) => {

    const userName = match[1]

    if (userName === '') return await message.client.sendMessage(message.jid, '```URL Gir!```')

    await axios
      .get(`https://api.zeks.xyz/api/ig?url=${userName}&apikey=Ekqqy3DmxtTHPAuA7inIHpxjFIC`)
      .then(async (response) => {

        const {
          owner,
          caption,
          url, 
        } = response.data.result

        const phig = await axios.get(url, 
          {responseType: 'arraybuffer',
        })

        const msg = `*Username:* ${owner} \n*Caption:* ${caption}`

        await message.sendMessage(Buffer.from(phig.data), MessageType.image, { 
          caption: msg,
        })
      })
      .catch(
        async (err) => await message.client.sendMessage(message.jid, 'Bulunamadı'),
      )
  },
)

Asena.addCommand({ pattern: 'igtv ?(.*)', fromMe: false, desc: tvig }, async (message, match) => {

    const userName = match[1]

    if (userName === '') return await message.client.sendMessage(message.jid, '```URL Gir!```')

    await axios
      .get(`https://videfikri.com/api/igtv/?url=${userName}`)
      .then(async (response) => {

        const {
          likes, 
          comment, 
          username,
          full_name, 
          caption,
          video_url, 
          duration,
        } = response.data.result

        const tvdat = await axios.get(video_url, 
          {responseType: 'arraybuffer',
        })

        const msg = `*Username:* ${username} \n*Name:* ${full_name} \n*Likes:* ${likes} \n*Comments:* ${comment} \n*Caption:* ${caption} \n*Duration:* ${duration}`

        await message.sendMessage(Buffer.from(tvdat.data), MessageType.video, { 
          caption: msg,
        })
      })
      .catch(
        async (err) => await message.client.sendMessage(message.jid, 'Bulunamadı'),
      )
  },
)
Asena.addCommand({ pattern: 'igstalk ?(.*)', fromMe: true, desc: Lang.DESC }, (async (message, match) => {
	if (match[0].includes('install')) return;
        if (match[1] === '') return await message.client.sendMessage(message.jid, Lang.NEED_WORD, MessageType.text, { quoted: message.data });
        if (!match[1].includes('www.instagram.com')) return await message.client.sendMessage(message.jid, Lang.NEED_WORD, MessageType.text, { quoted: message.data });
	
        let urls = `https://api.xteam.xyz/dl/igstalk?url=${match[1]}&APIKEY=82d4dc815ab1fd4c`
        var response = await got(urls) 
        const json = JSON.parse(response.body);

        if (json.status === false) return await message.client.sendMessage(message.jid, Lang.NOT_FOUND, MessageType.text, { quoted: message.data });
        
        if (json.code === 403) return await message.client.sendMessage(message.jid, '```API Error!```', MessageType.text, { quoted: message.data });

        await message.client.sendMessage(message.jid, Tlang.DOWN, MessageType.text, { quoted: message.data });

        let url = json.result.data[0].data;
        let name = json.result.data[0].type;
        await axios({ method: "get", url, headers: { 'DNT': 1, 'Upgrade-Insecure-Request': 1 }, responseType: 'arraybuffer'}).then(async (res) => {
            if (name === 'video') { return await message.sendMessage(Buffer(res.data), MessageType.video, { caption: '*' + Tlang.USERNAME + '* ' + json.result.username + '\n*' + Tlang.LİNK + '* ' + 'http://instagram.com/' + json.result.username + '\n*Beğeni Sayısı:* ' + json.result.likes + '\n*' + Tlang.CAPTİON + '* ' + json.result.caption }) } else { return await message.sendMessage(Buffer(res.data), MessageType.image, { caption: '*' + Tlang.USERNAME + '* ' + json.result.username + '\n*' + Tlang.LİNK + '* ' + 'http://instagram.com/' + json.result.username + '\n*Beğeni Sayısı:* ' + json.result.likes + '\n*' + Tlang.CAPTİON + '* ' + json.result.caption });
            }
        });

}));
