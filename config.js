/* Copyright (c) Yusuf Usta & souravkl11
Licenced under GNU
Copying strictly proibited!
*/

const { Sequelize } = require('sequelize');
const fs = require('fs');
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });

// special functionalities
function convertToBool(text, fault = 'true') {
    return text === fault ? true : false;
}

DATABASE_URL = process.env.DATABASE_URL === undefined ? './whatsasena.db' : process.env.DATABASE_URL;
DEBUG = process.env.DEBUG === undefined ? false : convertToBool(process.env.DEBUG);

module.exports = {
    VERSION: 'v3.0.0',
    CHANNEL: 'undefined',
    SESSION: process.env.RAGANORK_CODE === undefined ? '' : process.env.RAGANORK_CODE,
    ANTİLİNK: process.env.ANTİ_LİNK === undefined ? 'false' : process.env.ANTİ_LİNK,
    AFN: process.env.ALL_CAPTION === undefined ? '*MADE BY YOUR BOT NAME*' : process.env.ALL_CAPTION,
    AUTOBİO: process.env.AUTO_BİO === undefined ? 'false' : process.env.AUTO_BİO,
    ANTI_KICK: process.env.ANTI_KICK === undefined ? 'false' : process.env.ANTI_KICK,
    CALL_BLOCK: process.env.CALL_BLOCK === undefined ? 'false' : process.env.CALL_BLOCK,
    ANTI_FILTER: process.env.REMOVE_FILTER === undefined ? 'Myre' : process.env.REMOVE_FILTER,
    GANSTYLE: process.env.GAN_IMAGE === undefined ? 'https://i.hizliresim.com/loUtAb.jpg' : process.env.GAN_IMAGE,
    LANG: process.env.LANGUAGE === undefined ? 'TR' : process.env.LANGUAGE.toUpperCase(),
    ALIVEMSG: process.env.ALIVE_MESSAGE === undefined ? 'default' : process.env.ALIVE_MESSAGE,
    KICKMEMSG: process.env.KICKME_MESSAGE === undefined ? 'default' : process.env.KICKME_MESSAGE,
    M_REPLY: process.env.M_REPLY === undefined ? 'Hey!' : process.env.M_REPLY,
    M_REPLY_VAR: process.env.M_REPLY_VAR === undefined ? 'true' : process.env.M_REPLY_VAR,
    AFNN: process.env.TAG_REPLY === undefined ? '919074309534@s.whatsapp.net' : process.env.TAG_REPLY,
    NBSK: process.env.ALL_NUMBER === undefined ? '916282344739' : process.env.ALL_NUMBER,
    BLOCKCHAT: process.env.BLOCK_CHAT === undefined ? false : process.env.BLOCK_CHAT,
    ADDMSG: process.env.ADD_MESSAGE === undefined ? 'default' : process.env.ADD_MESSAGE,
    MUTEMSG: process.env.MUTE_MESSAGE === undefined ? 'default' : process.env.MUTE_MESSAGE,
    PLK: process.env.OWNER_NAME === undefined ? 'sᴏᴜʀᴀᴠᴋʟ¹¹' : process.env.OWNER_NAME,
    SONGD: process.env.SONGD === undefined ? '𝙎𝙚𝙖𝙧𝙘𝙝𝙞𝙣𝙜 𝙨𝙤𝙣𝙜... 🔍' : process.env.SONGD,
    SONGU: process.env.SONGU === undefined ? '𝙎𝙤𝙣𝙜 𝙛𝙤𝙪𝙣𝙙! 𝙐𝙥𝙡𝙤𝙖𝙙𝙞𝙣𝙜... ⏫' : process.env.SONGU,
    BGMFILTER: process.env.BGM_FILTER === undefined ? false : convertToBool(process.env.BGM_FILTER),
    DISBGM: process.env.DISABLE_JID_BGM_FILTER === undefined ? false : process.env.DISABLE_JID_BGM_FILTER,
    AUTOSTICKER: process.env.AUTO_STICKER === undefined ? true : convertToBool(process.env.AUTO_STICKER),
    CODE: process.env.C_CODE === undefined ? '91' : process.env.C_CODE,
    DISSTICKER: process.env.DISABLE_STICKER === undefined ? false : process.env.DISABLE_STICKER,
    NOLOG: process.env.NO_LOG === undefined ? 'false' : process.env.NO_LOG,
    CHATBOT: process.env.CHAT_BOT === undefined ? 'false' : process.env.CHAT_BOT,
    BOTSK: process.env.BOT_NAME === undefined ? 'PUBLIC BOT' : process.env.BOT_NAME,
    SUPPORT: process.env.ASENA === undefined ? '919074309534-1632403322' : process.env.ASENA,
    GIF_WEL: process.env.GIF_WEL === undefined ? 'https://c.tenor.com/G9Bu13ZlhVkAAAPo/dancing-funny-dance.mp4' : process.env.GIF_WEL,
    SLINK: process.env.IG === undefined ? 'instagram.com/sourav_kl11' : process.env.IG,
    JID: process.env.VERIFIED === undefined ? '0@s.whatsapp.net' : process.env.VERIFIED,
    GIF_BYE: process.env.GIF_BYE === undefined ? 'https://c.tenor.com/6tlIWiAlT_gAAAPo/cat-impressed-cat-wow.mp4' : process.env.GIF_BYE,
    LOGOSK: process.env.ALL_IMG === undefined ? 'https://www.linkpicture.com/q/rgnk.jpg' : process.env.ALL_IMG,
    SKDL: process.env.DIALOGUE === undefined ? '❤️‍🔥 𝗞𝗜𝗟𝗟𝗔𝗗𝗜𝗦𝗠 𝗡𝗘𝗩𝗘𝗥 𝗘𝗡𝗗𝗦 ❤️‍🔥' : process.env.DIALOGUE,
    BLOCKMSG: process.env.BLOCK_MESSAGE === undefined ? 'default' : process.env.BLOCK_MESSAGE,
    UNBLOCKMSG: process.env.UNBLOCK_MESSAGE === undefined ? 'default' : process.env.UNBLOCK_MESSAGE,
    SOURAV: process.env.SK_BLOCK === undefined ? 'false' : process.env.SK_BLOCK,
    ANTI_FAKE: process.env.AUTO_FAKE === undefined ? 'sourav' : process.env.AUTO_FAKE,
    AUTO_FAKE: process.env.ANTI_FAKE === undefined ? 'false' : process.env.ANTI_FAKE,
    UNMUTEMSG: process.env.UNMUTE_MESSAGE === undefined ? 'default' : process.env.UNMUTE_MESSAGE,
    WORKTYPE: process.env.WORK_TYPE === undefined ? 'private' : process.env.WORK_TYPE,
    PROMOTEMSG: process.env.PROMOTE_MESSAGE === undefined ? 'default' : process.env.PROMOTE_MESSAGE,
    DEMOTEMSG: process.env.DEMOTE_MESSAGE === undefined ? 'default' : process.env.DEMOTE_MESSAGE,
    BANMSG: process.env.BAN_MESSAGE === undefined ? 'default' : process.env.BAN_MESSAGE,
    AFKMSG: process.env.AFK_MESSAGE === undefined ? 'default' : process.env.AFK_MESSAGE,
    TAGALL: process.env.TAG_HEADER === undefined ? '*Erangi vaa makkale*' : process.env.TAG_HEADER,
    SKV: process.env.V_HEADER === undefined ? '*YOUR HEADER HERE*' : process.env.V_HEADER,
    SKDR: process.env.DURATION === undefined ? '99978509' : process.env.DURATION,
    HANDLERS: process.env.HANDLERS === undefined ? '^[.!;]' : process.env.HANDLERS,
    SEND_READ: process.env.SEND_READ === undefined ? false : convertToBool(process.env.SEND_READ),
    YAK: process.env.YAK === undefined ? '919074309534' : process.env.YAK,
    BRANCH: 'master',
    HEROKU: {
        HEROKU: process.env.HEROKU === undefined ? false : convertToBool(process.env.HEROKU),
        API_KEY: process.env.HEROKU_API_KEY === undefined ? '' : process.env.HEROKU_API_KEY,
        APP_NAME: process.env.HEROKU_APP_NAME === undefined ? '' : process.env.HEROKU_APP_NAME
    },
    DATABASE_URL: DATABASE_URL,
    DATABASE: DATABASE_URL === './whatsasena.db' ? new Sequelize({ dialect: "sqlite", storage: DATABASE_URL, logging: DEBUG }) : new Sequelize(DATABASE_URL, { dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }, logging: DEBUG }),
    RBG_API_KEY: process.env.REMOVE_BG_API_KEY === undefined ? false : process.env.REMOVE_BG_API_KEY,
    NO_ONLINE: process.env.NO_ONLINE === undefined ? true : convertToBool(process.env.NO_ONLINE),
    SUDO: process.env.SUDO === undefined ? '919074309534,0' : process.env.SUDO,
    DEBUG: DEBUG,
    COFFEEHOUSE_API_KEY: process.env.COFFEEHOUSE_API_KEY === undefined ? false : process.env.COFFEEHOUSE_API_KEY,
    WITAI_API: "TEYMELA6DMC4XB5YM3SPTTQWUUIBKURG",
    SUPPORT2: "905511384572-1617736751",
    SUPPORT3: "905511384572-1621015274"
};
