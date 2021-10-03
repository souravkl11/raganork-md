const Asena = require('../events');
const Config = require('../config');
const {MessageType} = require('@adiwajshing/baileys');
const got = require('got');

// List
const IPSTATUS_DESC = "It Sends Your IP details"
const NEED_IP = "*Enter Your IP Address..!*"
const IP = "IP :"
const ST = "STATUS :"
const CONTINENT = "CONTINENT :"
const COUNTRY = "COUNTRY :"
const COUNTRYCODE = "COUNTRYCODE :"
const REGIONNAME = "REGIONNAME :"
const CITY = "CITY :"
const ZIP = "ZIP :"
const CURRENCY = "CURRENCY :"
const ISP = "ISP :"
const MOBILE = "MOBILE :"
const PROXY = "PROXY :"
const NOT_FOUNDIP = "```Sorry,I could not your IP 😖```"

if (Config.WORKTYPE == 'private') {

  Asena.addCommand({pattern: 'ip ?(.*)', desc: 'gives you the detail of your IP' ,fromMe: true}, async (message, match) => {
	
    if (message.jid === '905524317852-1612300121@g.us') {

                return;
            }
    
    if (match[1] === '') return await message.reply(NEED_IP);
	const url = `https://api.techniknews.net/ipgeo/${match[1]}`;
	try {
		const response = await got(url);
		const ipjson = JSON.parse(response.body);
		if (response.statusCode === 200) return await message.client.sendMessage(message.jid, '*🔴 ' + IP +'* ```' + match[1] + '```\n\n' +
		'*✅' + ST +'* ```' + ipjson.status+ '```\n' +
        '*🌐' + CONTINENT +'* ```' + ipjson.continent+ '```\n' +
        '*🗺' + COUNTRY +'* ```' + ipjson.country+ '```\n' +
        '*🔢' + COUNTRYCODE +'* ```' + ipjson.countryCode+ '```\n' +
        '*🌍' + REGIONNAME +'* ```' + ipjson.regionName+ '```\n' +
        '*🚩' + CITY +'* ```' + ipjson.city+ '```\n' +
        '*🏛' + ZIP +'* ```' + ipjson.zip+ '```\n' +
        '*💸' + CURRENCY +'* ```' + ipjson.currency+ '```\n\n' +
        '*📡' + ISP +'* ```' + ipjson.isp+ '```\n' +
        '*🛡' + PROXY +'* ```' + ipjson.proxy+ '```\n' +
        '*📱' + MOBILE +'* ```' + ipjson.mobile+ '```\n', MessageType.text);
	} 
    catch {
		return await message.client.sendMessage(message.jid, NOT_FOUNDIP, MessageType.text);
	}
 });
}	
else if (Config.WORKTYPE == 'public') {

  Asena.addCommand({pattern: 'ip ?(.*)', desc: 'gives you the detail of your IP' ,fromMe: false}, async (message, match) => {
	
    if (message.jid === '905524317852-1612300121@g.us') {

                return;
            }
    
    if (match[1] === '') return await message.reply(NEED_IP);
	const url = `https://api.techniknews.net/ipgeo/${match[1]}`;
	try {
		const response = await got(url);
		const ipjson = JSON.parse(response.body);
		if (response.statusCode === 200) return await message.client.sendMessage(message.jid, '*🔴 ' + IP +'* ```' + match[1] + '```\n\n' +
		'*✅' + ST +'* ```' + ipjson.status+ '```\n' +
        '*🌐' + CONTINENT +'* ```' + ipjson.continent+ '```\n' +
        '*🗺' + COUNTRY +'* ```' + ipjson.country+ '```\n' +
        '*🔢' + COUNTRYCODE +'* ```' + ipjson.countryCode+ '```\n' +
        '*🌍' + REGIONNAME +'* ```' + ipjson.regionName+ '```\n' +
        '*🚩' + CITY +'* ```' + ipjson.city+ '```\n' +
        '*🏛' + ZIP +'* ```' + ipjson.zip+ '```\n' +
        '*💸' + CURRENCY +'* ```' + ipjson.currency+ '```\n\n' +
        '*📡' + ISP +'* ```' + ipjson.isp+ '```\n' +
        '*🛡' + PROXY +'* ```' + ipjson.proxy+ '```\n' +
        '*📱' + MOBILE +'* ```' + ipjson.mobile+ '```\n', MessageType.text);
	} 
    catch {
		return await message.client.sendMessage(message.jid, NOT_FOUNDIP, MessageType.text);
	}
 });
}
