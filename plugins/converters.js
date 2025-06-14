const {
    Module
} = require('../main');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const {
    bass,
    sticker,
    addExif,
    attp,
    gtts
} = require('./utils');
const {
    aiTTS
} = require('./utils/aiTTS');
const config = require('../config');
let MODE = config.MODE,
    STICKER_DATA = config.STICKER_DATA;
const {
    getString
} = require('./utils/lang');
const Lang = getString('converters');
let w = MODE == 'public' ? false : true
Module({
    pattern: 'sticker ?(.*)',
    use: 'edit',
    fromMe: w,
    desc: Lang.STICKER_DESC
}, (async (message, match) => {
    if (message.reply_message === false) return await message.send(Lang.STICKER_NEED_REPLY)
    var savedFile = await message.reply_message.download();
    var exif = {
        author: STICKER_DATA.split(";")[1] || "",
        packname: message.senderName,
        categories: STICKER_DATA.split(";")[2] || "😂",
        android: "https://github.com/souravkl11/Raganork-md/",
        ios: "https://github.com/souravkl11/Raganork-md/"
    }
    if (message.reply_message.image === true) {
        return await message.client.sendMessage(message.jid, {
            sticker: fs.readFileSync(await addExif(await sticker(savedFile), exif))
        }, {
            quoted: message.quoted
        })
    } else {
        return await message.client.sendMessage(message.jid, {
            sticker: fs.readFileSync(await addExif(await sticker(savedFile, 'video'), exif))
        }, {
            quoted: message.quoted
        })
    }
}));
Module({
    pattern: 'mp3 ?(.*)',
    fromMe: w,
    use: 'edit',
    desc: Lang.MP3_DESC
}, (async (message, match) => {
    if (!message.reply_message || (!message.reply_message.video && !message.reply_message.audio)) return await message.sendReply(Lang.MP3_NEED_REPLY)
    var {
        seconds
    } = message.quoted.message[Object.keys(message.quoted.message)[0]];
    if (seconds > 120) await message.sendReply(`_Alert: Duration more than 2 mins. This process may fail or take much more time!_`)
    var savedFile = await message.reply_message.download();
    ffmpeg(savedFile)
        .save('./temp/tomp3.mp3')
        .on('end', async () => {
            await message.client.sendMessage(message.jid, {
                audio: fs.readFileSync('./temp/tomp3.mp3'),
                mimetype: 'audio/mp4',
                ptt: false
            }, {
                quoted: message.quoted
            })
        });
}));
Module({
    pattern: 'slow ?(.*)',
    fromMe: w,
    use: 'edit',
    desc: "Slows down music & decreases pitch. For making slowed+reverb audios"
}, (async (message, match) => {
    if (message.reply_message === false) return await message.sendReply(Lang.MP3_NEED_REPLY)
    var {
        seconds
    } = message.quoted.message[Object.keys(message.quoted.message)[0]];
    if (seconds > 120) await message.sendReply(`_Alert: Duration more than 2 mins. This process may fail or take much more time!_`)
    var savedFile = await message.reply_message.download();
    ffmpeg(savedFile)
        .audioFilter("atempo=0.5")
        .outputOptions(["-y", "-af", "asetrate=44100*0.9"])
        .save("./temp/slow.mp3")
        .on('end', async () => {
            await message.client.sendMessage(message.jid, {
                audio: fs.readFileSync('./temp/slow.mp3'),
                mimetype: 'audio/mp4',
                ptt: false
            }, {
                quoted: message.quoted
            })
        });
}));
Module({
    pattern: 'speed ?(.*)',
    fromMe: w,
    use: 'edit',
    desc: "Speeds up music & increases pitch. For making sped-up+reverb audios"
}, (async (message, match) => {
    if (message.reply_message === false) return await message.sendReply(Lang.MP3_NEED_REPLY)
    var {
        seconds
    } = message.quoted.message[Object.keys(message.quoted.message)[0]];
    if (seconds > 120) await message.sendReply(`_Alert: Duration more than 2 mins. This process may fail or take much more time!_`)
    var savedFile = await message.reply_message.download();
    ffmpeg(savedFile)
        .audioFilter("atempo=0.5")
        .outputOptions(["-y", "-af", "asetrate=44100*1.2"])
        .save("./temp/sped.mp3")
        .on('end', async () => {
            await message.client.sendMessage(message.jid, {
                audio: fs.readFileSync('./temp/sped.mp3'),
                mimetype: 'audio/mp4',
                ptt: false
            }, {
                quoted: message.quoted
            })
        });
}));
Module({
    pattern: 'bass ?(.*)',
    fromMe: w,
    use: 'edit',
    desc: Lang.BASS_DESC
}, (async (message, match) => {
    if (message.reply_message === false) return await message.sendReply(Lang.BASS_NEED_REPLY)
    var savedFile = await message.reply_message.download();
    bass(savedFile, match[1], async function(audio) {
        await message.client.sendMessage(message.jid, {
            audio: audio,
            mimetype: 'audio/mp4',
            ptt: false
        }, {
            quoted: message.data
        })
    });
}));
Module({
    pattern: 'photo ?(.*)',
    fromMe: w,
    use: 'edit',
    desc: Lang.PHOTO_DESC
}, (async (message, match) => {
    if (message.reply_message === false) return await message.send(Lang.PHOTO_NEED_REPLY)
    var savedFile = await message.reply_message.download();
    ffmpeg(savedFile)
        .fromFormat('webp_pipe')
        .save('output.png')
        .on('end', async () => {
            await message.sendReply(fs.readFileSync('output.png'), 'image');
        });

}));
Module({
    pattern: 'attp ?(.*)',
    fromMe: w,
    use: 'utility',
    desc: "Text to animated sticker"
}, (async (message, match) => {
    if (match[1] == '') return await message.send("*Need text*")
    var result = await attp(match[1]);
    var exif = {
        author: STICKER_DATA.split(";")[1] || "",
        packname: message.senderName,
        categories: STICKER_DATA.split(";")[2] || "😂",
        android: "https://github.com/souravkl11/Raganork-md/",
        ios: "https://github.com/souravkl11/Raganork-md/"
    }
    await message.sendMessage(fs.readFileSync(await addExif(result, exif)), 'sticker')
}));
Module({
    pattern: 'tts ?(.*)',
    fromMe: w,
    desc: Lang.TTS_DESC,
    use: 'utility'
}, async (message, match) => {
    var query = match[1] || message.reply_message.text
    if (!query) return await message.sendReply(Lang.TTS_NEED_REPLY);
    if (!fs.existsSync("./temp/tts")) {
        fs.mkdirSync("./temp/tts")
    }
    query = query.replace("tts", "")
    var lng = 'en';
    if (/[00-\u0D7F]+/.test(query)) lng = 'ml';
    let LANG = lng,
        ttsMessage = query,
        SPEED = 1.0,
        VOICE = 'coral';
    if (langMatch = query.match("\\{([a-z]{2})\\}")) {
        LANG = langMatch[1]
        ttsMessage = ttsMessage.replace(langMatch[0], "")
    }
    if (speedMatch = query.match("\\{([0-9]+\\.[0-9]+)\\}")) {
        SPEED = parseFloat(speedMatch[1])
        ttsMessage = ttsMessage.replace(speedMatch[0], "")
    }
    if (voiceMatch = query.match("\\{(nova|alloy|ash|coral|echo|fable|onyx|sage|shimmer)\\}")) {
        VOICE = voiceMatch[1]
        ttsMessage = ttsMessage.replace(voiceMatch[0], "")
    }
    let audio;
    try {
        // Try new aiTTS API
        const ttsResult = await aiTTS(ttsMessage.trim(), VOICE, SPEED.toFixed(2));
        if (ttsResult.url) {
            const {
                data
            } = await axios.get(ttsResult.url, {
                responseType: 'arraybuffer'
            });
            audio = Buffer.from(data);
        } else {
            throw new Error(ttsResult.error || 'AI TTS failed');
        }
    } catch (e) {
        // Fallback to gtts
        try {
            audio = await gtts(ttsMessage.trim(), LANG);
        } catch {
            return await message.sendReply("_" + Lang.TTS_ERROR + "_");
        }
    }
    await message.client.sendMessage(message.jid, {
        audio,
        mimetype: 'audio/mp4',
        ptt: true,
        waveform: Array.from({
            length: 40
        }, () => Math.floor(Math.random() * 99))
    }, {
        quoted: message.data
    });
});