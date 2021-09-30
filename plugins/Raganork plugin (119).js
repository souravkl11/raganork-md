const Asena = require('../events');
const {MessageType} = require('@adiwajshing/baileys');
const got = require('got');
const Config = require('../config');

const Language = require('../language');
const Lang = Language.getString('weather');

if (Config.WORKTYPE == 'private') {

Asena.addCommand({pattern: 'joke ?(.*)', fromMe: true, desc: Lang.JOKE_DESC}, async (message, match) => {
	if (match[1] === 'xx') return await message.reply(Lang.NEED_LOCATIONA);
	const url = `https://official-joke-api.appspot.com/random_joke`;
	try {
		const response = await got(url);
		const json = JSON.parse(response.body);
		if (response.statusCode === 200) return await message.client.sendMessage(message.jid, '*🗣️ ' + Lang.JOKE +'* ```' + json.setup + '```\n\n' +
		'*😆' + Lang.PUNCHLINE +'* ```' + json.punchline+ '```\n\n 😂njan oru killadi thanne ellarum chirikku guys😂\n', MessageType.text);
	} catch {
		return await message.client.sendMessage(message.jid, Lang.NOT_FOUNDAC, MessageType.text);
	}
});
}

else if (Config.WORKTYPE == 'public') {

Asena.addCommand({pattern: 'joke ?(.*)', fromMe: false, desc: Lang.JOKE_DESC}, async (message, match) => {
	if (match[1] === 'xx') return await message.reply(Lang.NEED_LOCATIONA);
	const url = `https://official-joke-api.appspot.com/random_joke`;
	try {
		const response = await got(url);
		const json = JSON.parse(response.body);
		if (response.statusCode === 200) return await message.client.sendMessage(message.jid, '*🗣️ ' + Lang.JOKE +'* ```' + json.setup + '```\n\n' +
		'*😆' + Lang.PUNCHLINE +'* ```' + json.punchline+ '```\n\n 😂njan oru killadi thanne ellarum chirikku guys😂\n', MessageType.text);
	} catch {
		return await message.client.sendMessage(message.jid, Lang.NOT_FOUNDAC, MessageType.text);
	}
});
}
