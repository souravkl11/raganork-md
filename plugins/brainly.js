const Asena = require('../events');
const {MessageType} = require('@adiwajshing/baileys');
const axios = require('axios');
const Config = require('../config');

const BRAINLY_DESC = "Finds answer for your query on brainly."
const BRAINLY_USAGE = ".brainly <Query>"
const NEED_QUERY = "```Enter the Question!```"

let sk = Config.WORKTYPE == 'public' ? false : true

Asena.addCommand({ pattern: 'brainly ?(.*)', fromMe: sk, desc: BRAINLY_DESC, usage: BRAINLY_USAGE }, async (message, match) => {

        const Soal = match[1]
        
        if (match[1] === '') return await message.client.sendMessage(message.jid, NEED_QUERY, MessageType.text);

        await axios
          .get(`https://api.xteam.xyz/brainly?APIKEY=10c4105200edc0f0&soal=${Soal}`)
          .then(async (response) => {
            const {
              soal,
              jawaban,
            } = response.data

            const msg = `*Question Brainly:* ${soal}
*Answer Brainly:* ${jawaban.replace(/1Question/g, '*(1) Question*').replace(/2Question/g, '*(2) Question*').replace(/3Question/g, '*(3) Question*').replace(/Answer/g, '*Answer*').replace(/Brainly Found/g, '')}`
            await message.client.sendMessage(message.jid, msg, MessageType.text)
           })
      },
    )
