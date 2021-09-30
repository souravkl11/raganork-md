const Raganork = require('../events');
const {MessageType} = require('@adiwajshing/baileys');
const got = require('got');
const Config = require('../config');

const Language = require('../language');
const Lang = Language.getString('weather');






if (Config.WORKTYPE == 'private') {

Raganork.addCommand({pattern: 'quote ?(.*)', fromMe: true, desc: Lang.QUOTE_DESC}, async (message, match) => {
	if (match[1] === 'xx') return await message.reply(Lang.NEED_LOCATIONA);
	const url = `https://api.quotable.io/random`;
	try {
		const response = await got(url);
		const json = JSON.parse(response.body);
		if (response.statusCode === 200) return await message.client.sendMessage(message.jid, '*📌 ' + Lang.QUOTE +'* ```' + json.content + '```\n\n' +
		'*✒️' + Lang.AUTHOR +'* ```' + json.author+ '```\n', MessageType.text);
	} catch {
		return await message.client.sendMessage(message.jid, Lang.NOT_FOUNDA, MessageType.text);
	}
});


Raganork.addCommand({pattern: 'pquote ?(.*)', fromMe: true, dontAddCommandList: true}, async (message, match) => {
	if (match[1] === 'xx') return await message.reply(Lang.NEED_LOCATIONA);
	const url = `https://api.quotable.io/random`;
	try {
		const response = await got(url);
		const json = JSON.parse(response.body);
		if (response.statusCode === 200) return await message.client.sendMessage(message.jid, '*📌 ' + Lang.QUOTE +'* ```' + json.content + '```\n\n' +
		'*✒️' + Lang.AUTHOR +'* ```' + json.author+ '```\n', MessageType.text);
	} catch {
		return await message.client.sendMessage(message.jid, Lang.NOT_FOUNDA, MessageType.text);
	}
});
}

else if (Config.WORKTYPE == 'public') {

Raganork.addCommand({pattern: 'quote ?(.*)', fromMe: false, desc: Lang.QUOTE_DESC}, async (message, match) => {
	if (match[1] === 'xx') return await message.reply(Lang.NEED_LOCATIONA);
	const url = `https://api.quotable.io/random`;
	try {
		const response = await got(url);
		const json = JSON.parse(response.body);
		if (response.statusCode === 200) return await message.client.sendMessage(message.jid, '*📌 ' + Lang.QUOTE +'* ```' + json.content + '```\n\n' +
		'*✒️' + Lang.AUTHOR +'* ```' + json.author+ '```\n', MessageType.text);
	} catch {
		return await message.client.sendMessage(message.jid, Lang.NOT_FOUNDA, MessageType.text);
	}
});


Raganork.addCommand({pattern: 'pquote ?(.*)', fromMe: true, dontAddCommandList: true}, async (message, match) => {
	if (match[1] === 'xx') return await message.reply(Lang.NEED_LOCATIONA);
	const url = `https://api.quotable.io/random`;
	try {
		const response = await got(url);
		const json = JSON.parse(response.body);
		if (response.statusCode === 200) return await message.client.sendMessage(message.jid, '*📌 ' + Lang.QUOTE +'* ```' + json.content + '```\n\n' +
		'*✒️' + Lang.AUTHOR +'* ```' + json.author+ '```\n', MessageType.text);
	} catch {
		return await message.client.sendMessage(message.jid, Lang.NOT_FOUNDA, MessageType.text);
	}
});
}
