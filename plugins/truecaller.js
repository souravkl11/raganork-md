const truecaller = require('../Data/truecaller')
const New = require('../events');
const setting = require('../config');
const {MessageType} = require('@adiwajshing/baileys');
let sourav = setting.WORKTYPE == 'public' ? false : true
New.addCommand({pattern: 'true ?(.*)', desc: 'Searches for number in truecaller!',fromMe: true}, async (msg, query) => {
	if (!query[1]) return await msg.reply("_Give me any number or mention any user!_");
	if (query[1].includes('/')) {
    var init, fin;
    var split = query[1].split('/');
    fin = split[1];
    init = split[0];
    var initt = init.split(" ").join("")
    var number = initt.replace('+','')
    var code = fin.toUpperCase();
    const res = await truecaller.find(number, code)
		await msg.client.sendMessage(msg.jid, '*✅' + "NUMBER:" +'* ```' + res.phones[0].e164Format + '```\n' +
        '*👤' + "NAME:" +'* ```' + res.name+ '```\n' +
        '*🗺' + "ACCESS:" +'* ```' + res.access + '```\n' +
        '*🔢' + "CARRIER:" +'* ```' + res.phones[0].carrier + '```\n' +
        '*🌍' + "COUNTRY:" +'* ```' + res.phones[0].countryCode + '```\n' +
        '*🚩' + "CITY:" +'* ```' + res.addresses[0].city + '```\n' +
        '*📃' + "PREFIX:" +'* ```' + res.phones[0].dialingCode + '```\n' +
        '*🔌' + "SCORE:" +'* ```' + res.score + '```\n\n' +
        '*📡' + "UID:" +'* ```' + res.id + '```\n' +
        '*🛡' + "NUMBER TYPE:" +'* ```' + res.phones[0].numberType + '```\n' +
        '*⌚' + "TIME ZONE:" +'* ```' + res.addresses[0].timeZone + '```\n', MessageType.text, {quoted: msg.data});
    }	
    else return await msg.client.sendMessage(msg.jid, 'Wrong format! \n\n .true +91 XXXX XXXX/IN', MessageType.text, {quoted: msg.data})
 });
