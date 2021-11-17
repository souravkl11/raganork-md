const New = require('../events');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const https = require('https');
const googleTTS = require('google-translate-tts');
const { MessageType, Mimetype, MessageOptions } = require('@adiwajshing/baileys');
const Language = require('../language');
const Lang = Language.getString('voicy');
const Sourav = require('../config');
const axios = require('axios')
const axiosdef = require("axios").default;
const os = require('os')
const translatte = require('translatte');
const LanguageDetect = require('languagedetect');
const lngDetector = new LanguageDetect();
const Heroku = require('heroku-client');
const heroku = new Heroku({
    token: Sourav.HEROKU.API_KEY
});
let baseURI = '/apps/' + Sourav.HEROKU.APP_NAME;

let wk = Sourav.WORKTYPE == 'public' ? false : true
var vtalk_dsc = ''
var reply_eva = ''
if (Sourav.LANG == 'TR') vtalk_dsc = 'Eva sesli sohbetini başlatır.', reply_eva = '*Herhangi Bir Sesli Mesaja Yanıt Verin!*'
if (Sourav.LANG == 'EN') vtalk_dsc = 'Starts to raganork voice chat.', reply_eva = '*Reply to Any Voice Message!*'
if (Sourav.LANG == 'AZ') vtalk_dsc = 'Eva səsli söhbətinə başlayır.', reply_eva = '*Hər hansı bir səsli mesaja cavab verin!*'
if (Sourav.LANG == 'PT') vtalk_dsc = 'Começa o bate-papo por voz de Eva.', reply_eva = '*Responder a qualquer mensagem de voz!*'
if (Sourav.LANG == 'RU') vtalk_dsc = 'Запускает голосовой чат Eva.', reply_eva = '*Ответьте на любое голосовое сообщение!*'
if (Sourav.LANG == 'HI') vtalk_dsc = 'Eva ध्वनि चैट प्रारंभ करता है', reply_eva = '*किसी भी ध्वनि संदेश का उत्तर दें!*'
if (Sourav.LANG == 'ES') vtalk_dsc = 'Comienza con el chat de voz de Eva.', reply_eva = '*¡Responde a cualquier mensaje de voz!*'
if (Sourav.LANG == 'ML') vtalk_dsc = 'വോയ്‌സ് ചാറ്റിലേക്ക് ആരംഭിക്കുന്നു.', reply_eva = '*ഏത് വോയ്‌സ് സന്ദേശത്തിനും മറുപടി നൽകുക!*'
if (Sourav.LANG == 'ID') vtalk_dsc = 'Mulai obrolan suara Eva.', reply_eva = '*Balas Pesan Suara Apapun!*'

const recognizeAudio = () => {
    const headers = new Headers({
        'Content-Type': 'audio/wav',
        "Authorization": `Bearer ${Sourav.WITAI_API}`,
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

New.addCommand({on: 'text', fromMe: wk, dontAddCommandList: true, deleteCommand: false}, (async (message, match) => {
    if (message.message.startsWith('bot') && Sourav.CHATBOT !== 'true') {        
        var unique_ident = message.client.user.jid.split('@')[0]      
        var finm = message.message.replace('bot', '').replace(' ', '')   
        var ainame = os.userInfo().homedir.split('Rag')[1].split('rk/')[0]
        if (ainame !== 'ano') return;
        var ldet = lngDetector.detect(finm)
        var trmsg = ''
        if (ldet[0][0] !== 'english') {
            ceviri = await translatte(finm, {from: 'auto', to: 'EN'});
            if ('text' in ceviri) {
                trmsg = ceviri.text
            }
        } else { trmsg = finm }
        var uren = encodeURI(trmsg)
        await axios.get('http://api.brainshop.ai/get?bid=159572&key=usZjYZjRBVJcwN1S&uid=' + unique_ident + '&msg=' + uren).then(async (response) => {
            var raganork = ''                           
            if (Sourav.LANG !== 'EN') {
                ceviri = await translatte(response.data.cnt, {from: 'auto', to: Sourav.LANG});
                if ('text' in ceviri) {
                    raganork = ceviri.text
                }
            } else { raganork = response.data.cnt }
            await message.client.sendMessage(raganork.replace('Raganork', Sourav.BOTSK).replace('Souravkl11', Sourav.PLK), MessageType.text, { quoted: message.data})
        })
    }
}));
New.addCommand({on: 'text', fromMe: false, deleteCommand: false}, (async (message, match) => {
        if (Sourav.CHATBOT == 'true' && ((!message.jid.includes('-')) || (message.jid.includes('-') && 
            (( message.mention !== false && message.mention.length !== 0 ) || message.reply_message !== false)))) {
            if (message.jid.includes('-') && (message.mention !== false && message.mention.length !== 0)) {
                message.mention.map(async (jid) => {
                    if (message.client.user.jid.split('@')[0] === jid.split('@')[0]) {
                        var unique_ident = message.client.user.jid.split('@')[0]      
                        var finm = message.message
                        var ldet = lngDetector.detect(finm)
                        var trmsg = ''
                        if (ldet[0][0] !== 'english') {
                            ceviri = await translatte(finm, {from: 'auto', to: 'EN'});
                            if ('text' in ceviri) {
                                trmsg = ceviri.text
                            }
                        } else { trmsg = finm }
                        var uren = encodeURI(trmsg)
                        await axios.get('http://api.brainshop.ai/get?bid=159572&key=usZjYZjRBVJcwN1S&uid=' + unique_ident + '&msg=' + uren).then(async (response) => {
                            var raganork = ''                           
                            if (Sourav.LANG !== 'EN') {
                                ceviri = await translatte(response.data.cnt, {from: 'auto', to: Sourav.LANG});
                                if ('text' in ceviri) {
                                    raganork = ceviri.text
                                }
                            } else { raganork = response.data.cnt }
                            await message.client.sendMessage(raganork.replace('Raganork', Sourav.BOTSK).replace('Souravkl11', Sourav.PLK), MessageType.text, { quoted: message.data})
                        })
                    }
                })
            } else if (message.jid.includes('-') && message.reply_message !== false) {
                if (message.reply_message.jid.split('@')[0] === message.client.user.jid.split('@')[0]) {
                    var unique_ident = message.client.user.jid.split('@')[0]      
                    var finm = message.message
                    var finm = message.message
                    var ldet = lngDetector.detect(finm)
                    var trmsg = ''
                    if (ldet[0][0] !== 'english') {
                        ceviri = await translatte(finm, {from: 'auto', to: 'EN'});
                        if ('text' in ceviri) {
                            trmsg = ceviri.text
                        }
                    } else { trmsg = finm }
                    var uren = encodeURI(trmsg)
                    await axios.get('http://api.brainshop.ai/get?bid=159572&key=usZjYZjRBVJcwN1S&uid=' + unique_ident + '&msg=' + uren).then(async (response) => {
                        var raganork = ''                           
                        if (Sourav.LANG !== 'EN') {
                            ceviri = await translatte(response.data.cnt, {from: 'auto', to: Sourav.LANG});
                            if ('text' in ceviri) {
                                raganork = ceviri.text
                            }
                        } else { raganork = response.data.cnt }
                        await message.client.sendMessage(raganork.replace('Raganork', Sourav.BOTSK).replace('Souravkl11', Sourav.PLK), MessageType.text, { quoted: message.data})
                    })
                }
            } else {
                var unique_ident = message.client.user.jid.split('@')[0]      
                var finm = message.message
                var ldet = lngDetector.detect(finm)
                var trmsg = ''
                if (ldet[0][0] !== 'english') {
                    ceviri = await translatte(finm, {from: 'auto', to: 'EN'});
                    if ('text' in ceviri) {
                        trmsg = ceviri.text
                    }
                } else { trmsg = finm }
                var uren = encodeURI(trmsg)
                await axios.get('http://api.brainshop.ai/get?bid=159572&key=usZjYZjRBVJcwN1S&uid=' + unique_ident + '&msg=' + uren).then(async (response) => {
                    var raganork = ''                           
                    if (Sourav.LANG !== 'EN') {
                        ceviri = await translatte(response.data.cnt, {from: 'auto', to: Sourav.LANG});
                        if ('text' in ceviri) {
                            raganork = ceviri.text
                        }
                    } else { raganork = response.data.cnt }
                    await message.client.sendMessage(raganork.replace('Raganork', Sourav.BOTSK).replace('Souravkl11', Sourav.PLK), MessageType.text, { quoted: message.data})
                })
            }
        }

}));
New.addCommand({ pattern: 'vtalk$', desc: vtalk_dsc,dontAddCommandList: true, fromMe: wk }, (async (message, match) => {
    if (!message.reply_message) return await message.client.sendMessage(message.jid,reply_eva, MessageType.text, { quoted: message.data }) 
    try {
        const file = await message.client.downloadAndSaveMediaMessage({
            key: {
                remoteJid: message.reply_message.jid,
                id: message.reply_message.id
            },
            message: message.reply_message.data.quotedMessage
        })
        
        convertToWav(file)
            .on('end', async () => {
                const recognizedText = await recognizeAudio()
                
                var ssc = ''
                ceviri = await translatte(recognizedText, {from: 'auto', to: 'EN' });
                if ('text' in ceviri) {
                    ssc = ceviri.text
                }
                var unique_ident = message.client.user.jid.split('@')[0]
                var son = encodeURI(ssc)
                await axios.get('http://api.brainshop.ai/get?bid=159572&key=usZjYZjRBVJcwN1S&uid=' + unique_ident + '&msg=' + son).then(async (response) => {
                    var trmsg = ''
                    cevir = await translatte(response.data.cnt, {from: 'auto', to: Sourav.LANG});
                    if ('text' in cevir) {
                        trmsg = cevir.text
                    }
            
                    let 
                        LANG = Sourav.LANG.toLowerCase(),
                        ttsMessage = trmsg,
                        SPEED = 1.0
                    var buffer = await googleTTS.synthesize({
                        text: ttsMessage,
                        voice: LANG
                    });
            
                    await message.client.sendMessage(message.jid,buffer, MessageType.audio, {mimetype: Mimetype.mp4Audio, ptt: true, quoted: message.data})
                }).catch(async (error) => {
	            console.log(error)
                });
        });
    } catch (err) { console.log(err) }
}));
var _dsc = ''
var already_on = ''
var already_off = ''
var succ_on = ''
var succ_off = ''
if (Sourav.LANG == 'TR') {
    _dsc = 'Tam fonksiyonel Raganork özelliklerini aktif eder. Hesabınızı bir chatbota dönüştürün!'
    already_on = 'Raganork yapay zekası halihazırda tüm fonksiyonları etkin.'
    already_off = 'Raganork yapay zekası halihazırda yarı fonksiyonel çalışıyor.'
    succ_on = 'Raganork, Tam Fonksiyonel Olarak Açıldı! Lütfen Biraz Bekleyin! ✅'
    succ_off = 'Raganork, Yarı Fonksiyonel Olarak Ayarlandı! Lütfen Biraz Bekleyin! ☑️'
}
if (Sourav.LANG == 'EN') {
    fulleva_dsc = 'Turns on AI powered chatbot on to your account!'
    already_on = 'AI chatbot is already functional.'
    already_off = 'AI chatbot is currently turned off!.'
    succ_on = 'AI chatbot awakened! Restarting to make functional ✅'
    succ_off = 'AI chatbot turned off :( Restarting to make functional ☑️'
}
if (Sourav.LANG == 'ML') {
    fulleva_dsc = 'പൂർണ്ണമായും പ്രവർത്തനക്ഷമമായ AI chatbot സജീവമാക്കുന്നു. നിങ്ങളുടെ അക്കൗണ്ട് ഒരു ചാറ്റ്ബോട്ടാക്കി മാറ്റുക!'
    already_on = 'കൃത്രിമബുദ്ധി ഇതിനകം പൂർണ്ണമായി പ്രവർത്തിക്കുന്നു.'
    already_off = 'AI നിലവിൽ സെമി-ഫംഗ്ഷണൽ ആണ്.'
    succ_on = 'AI പൂർണ്ണമായും പ്രവർത്തനക്ഷമമായി തുറന്നു! കുറച്ച് കാത്തിരിക്കൂ! ✅'
    succ_off = 'AI സെമി-ഫങ്ഷണൽ ആയി സജ്ജമാക്കുക! കുറച്ച് കാത്തിരിക്കൂ! ☑️'
}

New.addCommand({ pattern: 'chatbot ?(.*)', desc: _dsc, fromMe: true,dontAddCommandList: true, usage: '.chatbot on / off' }, (async (message, match) => {
    var eva_status = `${Sourav.CHATBOT}`
    if (match[1] == 'on') {
        if (eva_status == 'true') {
            return await message.client.sendMessage(message.jid, '*' + already_on + '*', MessageType.text)
        }
        else {
            await heroku.patch(baseURI + '/config-vars', { 
                body: { 
                    ['CHAT_BOT']: 'true'
                } 
            });
            await message.client.sendMessage(message.jid, '*' + succ_on + '*', MessageType.text)
        }
    }
    else if (match[1] == 'off') {
        if (eva_status !== 'true') {
            return await message.client.sendMessage(message.jid, '*' + already_off + '*', MessageType.text)
        }
        else {
            await heroku.patch(baseURI + '/config-vars', { 
                body: { 
                    ['CHAT_BOT']: 'false'
                } 
            });
            await message.client.sendMessage(message.jid, '*' + succ_off + '*', MessageType.text)
        }
    }
}));
