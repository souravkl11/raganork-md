/*
# Copyright (C) 2020 farhan-dqz
*/


const Asena = require('../events');
const { MessageType } = require('@adiwajshing/baileys');
const axios = require('axios');
const Config = require('../config');

const Language = require('../language');
const { errorMessage, infoMessage } = require('../helpers');
const Lang = Language.getString('instagram') ;



if (Config.WORKTYPE == 'private') {

Asena.addCommand({ pattern: 'profinsta ?(.*)', fromMe: true, usage: Lang.USAGE, desc: Lang.DESC }, async (message, match) => {

    const userName = match[1]

    if (!userName) return await message.sendMessage(errorMessage(Lang.NEED_WORD))

    await message.sendMessage(infoMessage(Lang.LOADING))

    await axios
      .get(`https://api-anoncybfakeplayer.herokuapp.com/igstalk?username=${userName}`)
      .then(async (response) => {
        const {
          pic,
          username,
          bio,
          follower,
          following,
        } = response.data

        const profileBuffer = await axios.get(pic, {responseType: 'arraybuffer'})

        const msg = `
        *${Lang.USERNAME}*: ${username}    
        *${Lang.BIO}*: ${bio}
        *${Lang.FOLLOWERS}*: ${follower}
        *${Lang.FOLLOWS}*: ${following}`

        await message.sendMessage(Buffer.from(profileBuffer.data), MessageType.image, {
          caption: msg
        })
      })
      .catch(
        async (err) => await message.sendMessage(errorMessage(Lang.NOT_FOUND + userName)),
      )
  },

 )
}
else if (Config.WORKTYPE == 'public') {

Asena.addCommand({ pattern: 'profinsta ?(.*)', fromMe: false, usage: Lang.USAGE, desc: Lang.DESC }, async (message, match) => {

    const userName = match[1]

    if (!userName) return await message.sendMessage(errorMessage(Lang.NEED_WORD))

    await message.sendMessage(infoMessage(Lang.LOADING))

    await axios
      .get(`https://api-anoncybfakeplayer.herokuapp.com/igstalk?username=${userName}`)
      .then(async (response) => {
        const {
          pic,
          username,
          bio,
          follower,
          following,
        } = response.data

        const profileBuffer = await axios.get(pic, {responseType: 'arraybuffer'})

        const msg = `
        *${Lang.USERNAME}*: ${username}    
        *${Lang.BIO}*: ${bio}
        *${Lang.FOLLOWERS}*: ${follower}
        *${Lang.FOLLOWS}*: ${following}`

        await message.sendMessage(Buffer.from(profileBuffer.data), MessageType.image, {
          caption: msg
        })
      })
      .catch(
        async (err) => await message.sendMessage(errorMessage(Lang.NOT_FOUND + userName)),
      )
  },

 )
}
