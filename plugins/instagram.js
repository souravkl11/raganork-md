const {
    Module
} = require('../main');
const {
    pinSearch, getBuffer, downloadGram, pin, tiktok, igStalk, fb
} = require("./utils");
const {
    fromBuffer
} = require('file-type');
const botConfig = require('../config');
const axios = require("axios");
const isFromMe = botConfig.MODE === 'public' ? false : true;
const commandHandlerPrefix = botConfig.HANDLERS !== 'false' ? botConfig.HANDLERS.split("")[0] : "";

function disableCertificateCheck() {
    if (process.env.NODE_TLS_REJECT_UNAUTHORIZED != 0) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0
    }
}
async function checkRedirect(url){
    let split_url = url.split("/");
    if(split_url.includes("share")){
        let res = await axios.get(url);
        return res.request.res.responseUrl;
    }
    return url
}
Module({
    pattern: 'insta ?(.*)',
    fromMe: isFromMe,
    desc: 'Instagram post/reel/tv/highlights downloader',
    usage: 'insta link or reply to a link',
    use: 'download'
}, (async (message, match) => {
    // disableCertificateCheck();
    let mediaLink = match[1] || message.reply_message?.text;
    if (/\bhttps?:\/\/\S+/gi.test(mediaLink)) {
        mediaLink = mediaLink.match(/\bhttps?:\/\/\S+/gi)[0];
    }
    if (mediaLink && (mediaLink.includes('gist') || mediaLink.includes('youtu') || mediaLink.startsWith("ll"))) return;
    if (!mediaLink) return await message.sendReply("*Need Instagram link*");
    mediaLink = await checkRedirect(mediaLink);
    if (mediaLink.includes("stories")) return await message.sendReply("*_Use .story command!_*");
    if (mediaLink && !mediaLink.includes('instagram.com')) {
        return await message.client.sendMessage(message.jid, {
            text: "*_Need Instagram link!_*"
        }, {
            quoted: message.data
        });
    }

    const instagramRegex = /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com(?:\/.+?)?\/(p|s|reel|tv)\/)([\w-]+)(?:\/)?(\?.*)?$/;
    const urlMatch = instagramRegex.exec(mediaLink);

    if (urlMatch) {
        try {
            var downloadResult = await downloadGram(urlMatch[0]);
        } catch {
            return await message.sendReply("_Something went wrong, Please try again!_");
        }
        if (downloadResult === false) return await message.sendReply("*Download failed*");

        const quotedMessage = message.reply_message ? message.quoted : message.data;
        for (const mediaUrl of downloadResult) {
            if (mediaLink.includes("reel")){
            return await message.client.sendMessage(message.jid, {
                ['video']: {url: mediaUrl}
            }, {
                quoted: quotedMessage
            });                
            }
            const mediaBuffer = await getBuffer(mediaUrl);
            const {
                mime
            } = await fromBuffer(mediaBuffer);
            await message.client.sendMessage(message.jid, {
                [mime.includes("video") ? 'video' : 'image']: mediaBuffer
            }, {
                quoted: quotedMessage
            });
        }
    }
}));

Module({
    pattern: 'fb ?(.*)',
    fromMe: isFromMe,
    desc: 'Facebook video downloader',
    usage: 'fb link or reply to a link',
    use: 'download'
}, (async (message, match) => {
    // disableCertificateCheck();
    let videoLink = !message.reply_message?.message ? match[1] : message.reply_message.message;

    if (/\bhttps?:\/\/\S+/gi.test(videoLink)) {
        videoLink = videoLink.match(/\bhttps?:\/\/\S+/gi)[0];
    }
    if (!videoLink) return await message.sendReply("*Need Facebook link*");

    const facebookDownloadResult = await fb(videoLink);
    const sentMessage = await message.sendReply('_*Hold on, downloading will take some time..*_');

    await message.sendReply({
        url: facebookDownloadResult.url
    }, "video");
    return await message.edit('*_Download complete!_*', message.jid, sentMessage.key);
}));

Module({
    pattern: 'ig ?(.*)',
    fromMe: isFromMe,
    desc: 'Gets account info from instagram',
    usage: 'ig username',
    use: 'search'
}, (async (message, match) => {
    // disableCertificateCheck();
    if (!match[1]) return await message.sendReply("_Need Instagram username!_");

    if (match[1].startsWith("https") && match[1].includes("instagram")) {
        const usernameRegex = /instagram\.com\/([^/?]+)/i;
        const usernameMatch = match[1].match(usernameRegex);
        match[1] = usernameMatch && usernameMatch[1];
    }

    try {
        var accountInfo = await igStalk(encodeURIComponent(match[1]));
    } catch {
        return await message.sendReply("_Server busy!_");
    }

    await message.client.sendMessage(message.jid, {
        image: {
            url: accountInfo.profile_pic
        },
        caption: `_*Name:*_ ${accountInfo.full_name}\n_*Followers:*_ ${accountInfo.followers}\n_*Following:*_ ${accountInfo.following}\n_*Bio:*_ ${accountInfo.bio}\n_*Private account:*_ ${accountInfo.is_private ? "Yes" : "No"} \n_*Posts:*_ ${accountInfo.posts}`
    }, {
        quoted: message.data
    });
}));

Module({
    pattern: 'story ?(.*)',
    fromMe: isFromMe,
    desc: 'Instagram stories downloader',
    usage: '.story username or link',
    use: 'download'
}, (async (message, match) => {
    // disableCertificateCheck();
    let userIdentifier = match[1] !== '' ? match[1] : message.reply_message.text;

    if (userIdentifier && (userIdentifier.includes("/reel/") || userIdentifier.includes("/tv/") || userIdentifier.includes("/p/"))) return;
    if (!userIdentifier) return await message.sendReply("_Need an Instagram username or link!_");

    userIdentifier = !/\bhttps?:\/\/\S+/gi.test(userIdentifier) ? `https://instagram.com/stories/${userIdentifier}/` : userIdentifier.match(/\bhttps?:\/\/\S+/gi)[0];

    try {
        var storyData = await downloadGram(userIdentifier);
    } catch {
        return await message.sendReply("*_Sorry, server error_*");
    }

    if (!storyData) return await message.sendReply("*_User has no stories!_*");

    if (storyData.length < 3) {
        for (const storyMediaUrl of storyData) {
            await message.sendReply({
                url: storyMediaUrl
            }, storyMediaUrl.includes("mp4") ? "video" : "image");
        }
    } else {
        for (const storyMediaUrl of storyData) {
            await message.sendReply({
                url: storyMediaUrl
            }, storyMediaUrl.includes("mp4") ? "video" : "image");
        }
    }
}));

Module({
    pattern: 'pinterest ?(.*)',
    fromMe: isFromMe,
    desc: 'Pinterest downloader',
    usage: '.pinterest reply or link',
    use: 'download'
}, (async (message, match) => {
    let userQuery = match[1] !== '' ? match[1] : message.reply_message.text;
    if (userQuery === 'g') return;
    if (!userQuery) return await message.sendReply("*Need text or Pinterest URL*");

    if (/\bhttps?:\/\/\S+/gi.test(userQuery)) {
        userQuery = userQuery.match(/\bhttps?:\/\/\S+/gi)[0];
        try {
            var pinterestResult = await pin(userQuery);
        } catch {
            return await message.sendReply("*Server error*");
        }
        const quotedMessage = message.reply_message ? message.quoted : message.data;
        await message.client.sendMessage(message.jid, {
            [pinterestResult.endsWith('jpg') ? 'image' : 'video']: {
                url: pinterestResult
            }
        }, {
            quoted: quotedMessage
        });
    } else {
        let desiredCount = parseInt(userQuery.split(",")[1]) || 5;
        let searchQuery = userQuery.split(",")[0] || userQuery;
        const searchResults = await pinSearch(searchQuery, desiredCount);

        await message.sendReply(`_Downloading ${searchResults.length} results for ${searchQuery} from Pinterest_`);

        let successfulDownloads = 0;
        for (let i = 0; i < searchResults.length && successfulDownloads < desiredCount; i++) {
            try {
                const mediaBuffer = await getBufferfer(searchResults[i]);
                if (mediaBuffer) {
                    await message.send(mediaBuffer, 'image');
                    successfulDownloads++;
                }
            } catch (error) {
                console.error(`Error downloading Pinterest image: ${error.message}`);
            }
        }
    }
}));

Module({
    pattern: 'pin ?(.*)',
    fromMe: isFromMe,
    use: 'download'
}, (async (message, match) => {
    let userQuery = match[1] !== '' ? match[1] : message.reply_message.text;
    if (!userQuery || userQuery === 'g' || userQuery.startsWith('terest')) return;
    await message.sendReply("_Use .pinterest command for downloading content from this query!_");
}));

Module({
    pattern: 'tiktok ?(.*)',
    fromMe: isFromMe,
    desc: 'TikTok downloader',
    usage: '.tiktok reply or link',
    use: 'download'
}, (async (message, match) => {
    let videoLink = match[1] !== '' ? match[1] : message.reply_message.text;
    if (!videoLink) return await message.sendReply("_Need a TikTok URL_");

    videoLink = videoLink.match(/\bhttps?:\/\/\S+/gi)[0];
    let downloadResult;
    try {
        downloadResult = (await tiktok(videoLink)).result;
        await message.sendReply({
            url: downloadResult
        }, 'video');
    } catch (error) {
        await message.sendReply("```" + `Download failed\n\nResponse: ${downloadResult}` + "```");
    }
}));