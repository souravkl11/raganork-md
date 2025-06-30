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
    gtts,
    gis,
    aiTTS
} = require('./utils');
const config = require('../config');
const axios = require('axios');
const fileType = require('file-type');
let MODE = config.MODE,
    STICKER_DATA = config.STICKER_DATA;
const {
    getString
} = require('./utils/lang');
const Lang = getString('converters');
let w = MODE == 'public' ? false : true

Module({
    pattern: 'img ?(.*)',
    fromMe: w,
    use: 'search',
    desc: 'Searches for an image on Google Images and sends the requested number of results.'
}, (async (message, match) => {
    if (!match[1]) return await message.send("*_Need a search term!_*");
    let splitInput = match[1].split(',');
    let count = parseInt(splitInput[1] || 5);
    await message.send(`*_Searching for ${count} images..._*`);
    
    const buffer = Math.ceil(count * 0.5);
    let results = await gis(splitInput[0], count + buffer);
    if (results.length < 1) return await message.send("*_No results found!_*");
    let successCount = 0;
    let i = 0;
    while (successCount < count && i < results.length) {
        try {
            await message.client.sendMessage(message.jid, {
                image: {
                    url: results[i]
                }
            });
            successCount++;
        } catch (e) {
            console.log(`Failed to send image ${i+1}:`, e);
            if (i === results.length - 1 && successCount < count) {
                let moreResults = await gis(splitInput[0], buffer, { page: Math.floor(i/10) + 1 });
                if (moreResults.length > 0) {
                    results = results.concat(moreResults);
                }
            }
        }
        i++;
    }
    
    if (successCount < count) {
        await message.send(`*_Only able to send ${successCount}/${count} images. Some images failed to load._*`);
    }
}));

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
    pattern: 'sped ?(.*)',
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
    }    query = query.replace("tts", "")
    var lng = 'en';
    if (/[\u0D00-\u0D7F]+/.test(query)) lng = 'ml';
    let LANG = lng,
        ttsMessage = query,
        SPEED = 1.0,
        VOICE = 'nova';
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
    }    let audio;
    
    if (LANG === 'ml') {
        try {
            audio = await gtts(ttsMessage.trim(), LANG);
        } catch {
            return await message.sendReply("_" + Lang.TTS_ERROR + "_");
        }
    } else {
        try {
            const ttsResult = await aiTTS(ttsMessage.trim(), VOICE, SPEED.toFixed(2));
            if (ttsResult && ttsResult.url) {
                audio = { url: ttsResult.url };
            } else {
                throw new Error(ttsResult && ttsResult.error ? ttsResult.error : 'AI TTS failed');
            }
        } catch (e) {
            console.error("AI TTS failed, falling back to gtts:", e);
            try {
                audio = await gtts(ttsMessage.trim(), LANG);
            } catch {
                return await message.sendReply("_" + Lang.TTS_ERROR + "_");
            }
        }
    }
    
    await message.client.sendMessage(message.jid, {
        audio,
        mimetype: 'audio/mpeg',
        ptt: true
    }, {
        quoted: message.data
    });
});
Module({
    pattern: 'doc ?(.*)',
    fromMe: w,
    use: 'edit',
    desc: "Converts replied media to document format"
}, async (message, match) => {
    if (message.reply_message === false) return await message.send("_Reply to a media file (image, video, audio, sticker, or document)_");
    
    if (!message.reply_message.image && !message.reply_message.video && !message.reply_message.audio && !message.reply_message.sticker && !message.reply_message.document) {
        return await message.send("_Reply to a media file (image, video, audio, sticker, or document)_");
    }
    
    try {
        const mediaMessage = message.reply_message.data.message;
        const mediaType = Object.keys(mediaMessage)[0];
        const mediaInfo = mediaMessage[mediaType];
        
        if (mediaInfo.fileLength && mediaInfo.fileLength > 50 * 1024 * 1024) {
            return await message.send("_File too large! Maximum size is 50MB_");
        }        const processingMsg = await message.send("_Converting to document..._");
        
        const filePath = await message.reply_message.download();
        const stream = fs.createReadStream(filePath);
        var randomHash = Math.random().toString(36).substring(2, 8);
        var fileName = match[1];
        var mimetype = mediaInfo.mimetype || 'application/octet-stream';
        
        if (message.reply_message.document && mediaInfo.fileName && !match[1]) {
            fileName = mediaInfo.fileName;
        } else if (!fileName) {
            fileName = `converted_file_${randomHash}`;
        }
        
        if (!fileName.includes('.') && mimetype) {
            const ext = mimetype.split('/')[1];
            if (ext && ext !== 'octet-stream') {
                fileName += `.${ext}`;
            }
        }
          await message.client.sendMessage(message.jid, {
            document: { stream: stream },
            fileName: fileName,
            mimetype: mimetype,
            caption: match[1] ? '' : '_Converted to document_'
        }, {
            quoted: message.quoted
        });
        
        try {
            fs.unlinkSync(filePath);
        } catch (e) {
            console.log('Failed to delete temp file:', filePath);
        }
        
        await message.client.sendMessage(message.jid, {
            delete: processingMsg.key
        });
        
    } catch (error) {
        console.error('Doc conversion error:', error);
        if (error.message.includes('download')) {
            await message.send("_Failed to download media. File might be corrupted or expired_");
        } else if (error.message.includes('large') || error.message.includes('memory')) {
            await message.send("_File too large to process_");
        } else {
            await message.send("_Failed to convert media to document_");
        }
    }
});
Module({
    pattern: 'upload ?(.*)',
    fromMe: w,
    use: 'utility',
    desc: "Downloads file from URL and sends as document"
}, async (message, match) => {    var url = match[1] || (message.reply_message ? message.reply_message.text : '');
    
    const urlMatch = url.match(/https?:\/\/[^\s]+/);
    if (urlMatch) {
        url = urlMatch[0];
    }
    
    if (!url || !url.startsWith('http')) {
        return await message.send("_Please provide a valid URL or reply to a message containing a URL_");
    }
    
    try {        await message.send("_Downloading file..._");
        
        const response = await axios.get(url, {
            responseType: 'stream',
            timeout: 60000,
        });
        
        var randomHash = Math.random().toString(36).substring(2, 8);        
        var fileName = `downloaded_file_${randomHash}`;
        var mimetype = response.headers['content-type'] || 'application/octet-stream';
        
        const contentDisposition = response.headers['content-disposition'];
        if (contentDisposition && contentDisposition.includes('filename=')) {
            const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (filenameMatch) {
                fileName = filenameMatch[1].replace(/['"]/g, '');
            }
        } else {
            const urlPath = new URL(url).pathname;
            const urlFileName = urlPath.split('/').pop();
            if (urlFileName && urlFileName.includes('.')) {
                fileName = urlFileName;
            }
        }
        
        if (!fileName.includes('.') && response.headers['content-type']) {
            const ext = response.headers['content-type'].split('/')[1];
            if (ext && ext !== 'octet-stream') {
                fileName += `.${ext}`;
            }
        }        await message.client.sendMessage(message.jid, {
            document: { stream: response.data },
            fileName: fileName,
            mimetype: mimetype,
            caption: `_Downloaded from: ${url}_`
        }, {
            quoted: message.quoted
        });
        
    } catch (error) {
        console.error('Upload error:', error);
        if (error.code === 'ECONNABORTED') {
            await message.send("_Download timeout. File might be too large or server is slow_");
        } else if (error.response && error.response.status === 404) {
            await message.send("_File not found (404). Please check the URL_");
        } else if (error.response && error.response.status >= 400) {
            await message.send(`_Download failed with status ${error.response.status}_`);
        } else {
            await message.send("_Failed to download file. Please check the URL and try again_");
        }
    }
});