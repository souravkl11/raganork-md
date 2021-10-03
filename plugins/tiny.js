const Asena = require('../events');
const {MessageType} = require('@adiwajshing/baileys');
const got = require('got');
const Config = require('../config');

const Language = require('../language');
const Lang = Language.getString('weather');

if (Config.WORKTYPE == 'public') {

Asena.addCommand({pattern: 'tiny ?(.*)', fromMe: false, desc: Lang.TIN_DESC}, async (message, match) => {
	if (match[1] === '') return await message.reply(Lang.NEED_LINK);
	const url = `https://tobz-api.herokuapp.com/api/tinyurl?url=${match[1]}&apikey=BotWeA`;
	try {
		const response = await got(url);
		const json = JSON.parse(response.body);
		if (response.statusCode === 200) return await message.client.sendMessage(message.jid, 
		'\n *🔗 ' + Lang.SLINK +'* ```' + json.result + '```\n\n', MessageType.text);
	} catch {
		return await message.client.sendMessage(message.jid, Lang.NOT_FOUNDLI, MessageType.text);
	}
});
}
else if (Config.WORKTYPE == 'private') {

Asena.addCommand({pattern: 'tiny ?(.*)', fromMe: true, desc: Lang.TIN_DESC}, async (message, match) => {
	if (match[1] === '') return await message.reply(Lang.NEED_LINK);
	const url = `https://tobz-api.herokuapp.com/api/tinyurl?url=${match[1]}&apikey=BotWeA`;
	try {
		const response = await got(url);
		const json = JSON.parse(response.body);
		if (response.statusCode === 200) return await message.client.sendMessage(message.jid, 
		'\n *🔗 ' + Lang.SLINK +'* ```' + json.result + '```\n\n', MessageType.text);
	} catch {
		return await message.client.sendMessage(message.jid, Lang.NOT_FOUNDLI, MessageType.text);
	}
});
}
