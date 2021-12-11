const Asena = require('../events');
const {MessageType,Mimetype} = require('@adiwajshing/baileys');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const {execFile} = require('child_process');
const cwebp = require('cwebp-bin');
const Config = require('../config');
const cheerio = require('cheerio')
const FormData = require('form-data')
const Axios = require('axios');

const Language = require('../language');
const Lang = Language.getString('conventer');

function webp2mp4File(path) {
    return new Promise(async (resolve, reject) => {
        const bodyForm = new FormData()
        bodyForm.append('new-image-url', '')
        bodyForm.append('new-image', fs.createReadStream(path))
        await Axios({
            method: 'post',
            url: 'https://s6.ezgif.com/webp-to-mp4',
            data: bodyForm,
            headers: {
                'Content-Type': `multipart/form-data boundary=${bodyForm._boundary}`
            }
        }).then(async ({ data }) => {
            const bodyFormThen = new FormData()
            const $ = cheerio.load(data)
            const file = $('input[name="file"]').attr('value')
            const token = $('input[name="token"]').attr('value')
            const convert = $('input[name="file"]').attr('value')
            const gotdata = {
                file: file,
                token: token,
                convert: convert
            }
            bodyFormThen.append('file', gotdata.file)
            bodyFormThen.append('token', gotdata.token)
            bodyFormThen.append('convert', gotdata.convert)
            await Axios({
                method: 'post',
                url: 'https://ezgif.com/webp-to-mp4/' + gotdata.file,
                data: bodyFormThen,
                headers: {
                    'Content-Type': `multipart/form-data boundary=${bodyFormThen._boundary}`
                }
            }).then(({ data }) => {
                const $ = cheerio.load(data)
                const result = 'https:' + $('div#output > p.outfile > video > source').attr('src')
                resolve({
                    status: true,
                    message: "Made successfully!",
                    result: result
                })
            }).catch(reject)
        }).catch(reject)
    })
}

   let sk = Config.WORKTYPE == 'public' ? false : true
   Asena.addCommand({pattern: 'mp4$', desc: '```Converts animated sticker to video```', fromMe: sk}, (async (message, match) => {
        const mid = message.jid
        if (message.reply_message === false) return await message.sendMessage("```Need video```");
        await message.client.sendMessage(mid, '```Converting to video format```', MessageType.text)
        const savedFilename = await message.client.downloadAndSaveMediaMessage({
            key: {
                remoteJid: message.reply_message.jid,
                id: message.reply_message.id
            },
            message: message.reply_message.data.quotedMessage
        });
        await webp2mp4File(savedFilename).then(async (rest) => {
            await Axios({ method: "GET", url: rest.result, responseType: "stream"}).then(({ data }) => {
                const saving = data.pipe(fs.createWriteStream('/skl/Raganork/stweb.mp4'))
                saving.on("finish", async () => {
                    await message.client.sendMessage(mid, fs.readFileSync('/skl/Raganork/stweb.mp4'), MessageType.video, { mimetype: Mimetype.mp4, caption: Config.AFN, quoted: message.data })
                    if (fs.existsSync(savedFilename)) fs.unlinkSync(savedFilename)
                    if (fs.existsSync('/skl/Raganork/stweb.mp4')) fs.unlinkSync('/skl/Raganork/stweb.mp4')
                })
            })
        })
    }));
