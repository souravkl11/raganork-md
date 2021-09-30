const Asena = require('../events');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const { MessageType } = require('@adiwajshing/baileys');
const Language = require('../language');
const Lang = Language.getString('voicy');
const conf = require('../config');


const recognizeAudio = () => {

    const headers = new Headers({
        'Content-Type': 'audio/wav',
        "Authorization": `Bearer ${conf.WITAI_API}`,
        'Cache-Control': 'no-cache',
        'Transfer-Encoding': 'chunked'
    })

    const requestBody = {
        method: "POST",
        body: fs.readFileSync('output.wav'),
        headers: headers
    }

    return fetch("https://api.wit.ai/speech?v=20200219", requestBody)
        .then(response => response.json())
        .then(json => json._text)
}

const convertToWav = file => {
    return ffmpeg(file)
        .audioCodec('pcm_s16le')
        .format('wav')
        .save('output.wav')
}


if (conf.WORKTYPE == 'private') {

    Asena.addCommand({ pattern: 'voicy', desc: Lang.USAGE, fromMe: true }, (async (message, match) => {

        try {
            if (message.reply_message) {
                if (!message.reply_message.text && !message.reply_message.video && !message.reply_message.image) {
                    const file = await message.client.downloadAndSaveMediaMessage({
                        key: {
                            remoteJid: message.reply_message.jid,
                            id: message.reply_message.id
                        },
                        message: message.reply_message.data.quotedMessage
                    })


                    convertToWav(file).on('end', async () => {
                        const recognizedText = await recognizeAudio()

                        await message.client.sendMessage(message.jid, Lang.TEXT + '```' + recognizedText + '```', MessageType.text)
                    });


                } else {
                    await message.client.sendMessage(message.jid, Lang.ONLY_AUDIO, MessageType.text)

                }
            } else {
                await message.client.sendMessage(message.jid, Lang.NEED_REPLY, MessageType.text)

            }

        } catch (err) {
            console.log(err)
        }


    }));
}
if (conf.WORKTYPE == 'public') {

    Asena.addCommand({ pattern: 'voicy', desc: Lang.USAGE, fromMe: false }, (async (message, match) => {

        try {
            if (message.reply_message) {
                if (!message.reply_message.text && !message.reply_message.video && !message.reply_message.image) {
                    const file = await message.client.downloadAndSaveMediaMessage({
                        key: {
                            remoteJid: message.reply_message.jid,
                            id: message.reply_message.id
                        },
                        message: message.reply_message.data.quotedMessage
                    })


                    convertToWav(file).on('end', async () => {
                        const recognizedText = await recognizeAudio()

                        await message.client.sendMessage(message.jid, Lang.TEXT + '```' + recognizedText + '```', MessageType.text)
                    });


                } else {
                    await message.client.sendMessage(message.jid, Lang.ONLY_AUDIO, MessageType.text)

                }
            } else {
                await message.client.sendMessage(message.jid, Lang.NEED_REPLY, MessageType.text)

            }

        } catch (err) {
            console.log(err)
        }


    }));
}
