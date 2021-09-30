const Asena = require('../events');
const { MessageType, MessageOptions, Mimetype } = require('@adiwajshing/baileys');
const fs = require('fs');
const axios = require('axios');
const Config = require('../config');
const Ln = "*RAGANORK SETVAR HELPER* "
 const code = "*Hey, I'm here to help you*\n\n*Nigalkk ningalude bottile setvar commad use cheyyan njan ningale sahayikkam*\n\n* setvar commads here*\n⏬⏬⏬⏬⏬⏬⏬\n*.setvar ALIVE_MESSAGE:Alive message set akkan*\n*.setvar ALL_CAPTION:Image maker caption mattuvan (Made by YOURNAME)*\n*. setvar BAN_MESSAGE:Ban message cheyyan*\n*.setvar BOT_NAME:Bot name change cheyyan*\n*.setvar KICKME_MESSAGE:Kickme dialoge change cheyyan*\n*.setvar MUTE_MESSAGE:Mute message change cheyyan*\n*.setvar OWNER_NAME:Owner name mattan*\n*.setvar PROMOTE_MESSAGE:admin akkumbol ulla message sett akkuvan*\n*.setvar TAG_HEADER:Tagall cheyyumbol ulla heading mattan*\n*.setvar TAG_REPLY:Ningale mention cheyyumbol audio/sticker varan example: 91xxxxxxxxxx@s.whatsapp.net*\n\n\n*true and false*\n\n*true=on*\n*false=off*\n\n*.setvar ALL_LINK_BAN:*\n*.setvar ANTİ_LİNK:*\n*.setvar AUTO_BİO:*\n*.setvar BGM_FILTER:*\n*.setvar BLOCK_CHAT:*\n*.setvar DEBUG:*\n*.setvar FULL_EVA:*\n*.setvar NO_LOG:*\n*.setvar NO_ONLINE:*\n*.setvar SEND_READ:*\n*.setvar STICKER_REPLY:*\n*.setvar THERI_KICK:*\n\n *WORK TYPE CHANGING METHOD*\n\n*.setvar WORK_TYPE:private*\n*.setvar WORK_TYPE:public*\n\n\n```എളുപ്പവഴി```\n*.mlink on/off*\n*.theri no/yes*\n*.fulleva on/off*\n*.bgm off/on*\n\n\n\n*𝐑𝐀𝐆𝐀𝐍𝐎𝐑𝐊 𝐎𝐅𝐅𝐈𝐂𝐈𝐀𝐋 𝐁𝐎𝐓*" 
{
    
      Asena.addCommand({pattern: 'varhelp', fromMe: false, desc: Ln,}, (async (message, match) => {

    await message.client.sendMessage(
  
      message.jid,code, MessageType.text);
  
  }));
  }

    
