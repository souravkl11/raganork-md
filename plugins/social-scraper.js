/* Codded by @PLK
HEHE
*/
const Asena = require('../events');
const {MessageType, MessageOptions, Mimetype} = require('@adiwajshing/baileys');
const axios = require('axios');
const { requestLyricsFor, requestAuthorFor, requestTitleFor, requestIconFor } = require("solenolyrics");
const solenolyrics= require("solenolyrics"); 
const google = require("googlethis");
const playstore = require("playstore-scraper");
const Sea = require('search-engine-client');
const ffmpeg = require('fluent-ffmpeg');
const TinyURL = require('tinyurl');
const fs = require('fs');
const Language = require('../language');
const Lang = Language.getString('instagram')
const { errorMessage, infoMessage } = require('../helpers')

const cn = require('../config');
const vf = "Confirmed Account"
const novf = "Unconfirmed Account"
const bs = "Yes"
const nobs = "no"

if (cn.WORKTYPE == 'private') {

    Asena.addCommand({ pattern: 'pinsta ?(.*)', fromMe: false, desc: 'instagram profile' }, async (message, match) => {

        const userName = match[1]

        if (userName === '') return await message.sendMessage(errorMessage('NEED USERNAME'))

        await message.sendMessage(infoMessage('LOADING'))

        await axios.get(`https://docs-jojo.herokuapp.com/api/stalk?username=${userName}`).then(async (response) => {

            const {biography, username, edge_follow, edge_followed_by, category_name, is_verified, is_private, edge_owner_to_timeline_media, profile_pic_url_hd, full_name, is_business_account } = response.data.graphql.user

            const profileBuffer = await axios.get(profile_pic_url_hd, { responseType: 'arraybuffer' })

            const msg = `*${'NAME'}*: ${full_name} \n*${'USERNAME'}*: ${username} \n*${'BIO'}*: ${biography} \n*${'FOLLOWERS'}*: ${edge_followed_by.count} \n*${'FOLLOWS'}*: ${edge_follow.count} \n*${'ACCOUNT'}*: ${is_private ? 'HIDDEN' : 'PUBLIC'} \n*Hesap Türü:* ${is_verified ? vf : novf} \n*İşletme Hesabı mı?:* ${is_business_account ? bs : nobs} \n*Kategori:* ${category_name} \n*Post Sayısı:* ${edge_owner_to_timeline_media.count}`

            await message.sendMessage(Buffer.from(profileBuffer.data), MessageType.image, { caption: msg })

        }).catch(async (err) => {
            await message.sendMessage(errorMessage('NOT_FOUND' + userName))
        })
    });
}


else if (cn.WORKTYPE == 'public') {

    Asena.addCommand({ pattern: 'pinsta ?(.*)', fromMe: false, desc: 'instagram profile' }, async (message, match) => {

        const userName = match[1]

        if (userName === '') return await message.sendMessage(errorMessage('NEED USERNAME'))

        await message.sendMessage(infoMessage('LOADING'))

        await axios.get(`https://docs-jojo.herokuapp.com/api/stalk?username=${userName}`).then(async (response) => {

            const {biography, username, edge_follow, edge_followed_by, category_name, is_verified, is_private, edge_owner_to_timeline_media, profile_pic_url_hd, full_name, is_business_account } = response.data.graphql.user

            const profileBuffer = await axios.get(profile_pic_url_hd, { responseType: 'arraybuffer' })

            const msg = `*${'NAME'}*: ${full_name} \n*${'USERNAME'}*: ${username} \n*${'BIO'}*: ${biography} \n*${'FOLLOWERS'}*: ${edge_followed_by.count} \n*${'FOLLOWS'}*: ${edge_follow.count} \n*${'ACCOUNT'}*: ${is_private ? 'HIDDEN' : 'PUBLIC'} \n*Hesap Türü:* ${is_verified ? vf : novf} \n*İşletme Hesabı mı?:* ${is_business_account ? bs : nobs} \n*Kategori:* ${category_name} \n*Post Sayısı:* ${edge_owner_to_timeline_media.count}`

            await message.sendMessage(Buffer.from(profileBuffer.data), MessageType.image, { caption: msg })

        }).catch(async (err) => {
            await message.sendMessage(errorMessage('NOT_FOUND' + userName))
        })
    });
}
