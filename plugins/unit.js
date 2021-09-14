/* Codded by @phaticusthiccy
Telegram: t.me/phaticusthiccy
Instagram: www.instagram.com/kyrie.baran
*/

const Asena = require('../events');
const {MessageType, MessageOptions, Mimetype} = require('@adiwajshing/baileys');
const axios = require('axios');
const Config = require('../config');
const WhatsAsenaStack = require('whatsasena-npm');
const exec = require('child_process').exec;

let wk = Config.WORKTYPE == 'public' ? false : true
var description = ''
var bit = ''
if (Config.LANG == 'TR') description = 'Ağırlık birimlerini dönüştürür.', bit = 'Veri birimlerini dönüştürür.'
if (Config.LANG == 'EN') description = 'Converts weight units.', bit = 'Converts data units.'
if (Config.LANG == 'AZ') description = 'Ağırlıq vahidlərini çevirir.', bit = 'Məlumat vahidlərini çevirir.'
if (Config.LANG == 'RU') description = 'Преобразует единицы веса.', bit = 'Преобразует единицы данных.'
if (Config.LANG == 'ES') description = 'Convierte unidades de peso.', bit = 'Convierte unidades de datos.'
if (Config.LANG == 'PT') description = 'Converte unidades de peso.', bit = 'Converte unidades de dados.'
if (Config.LANG == 'ML') description = 'ഭാരം യൂണിറ്റുകൾ പരിവർത്തനം ചെയ്യുന്നു.', bit = 'ഡാറ്റ യൂണിറ്റുകൾ പരിവർത്തനം ചെയ്യുന്നു.'
if (Config.LANG == 'HI') description = 'वजन इकाइयों को परिवर्तित करता है।', bit = 'डेटा इकाइयों को परिवर्तित करता है'
if (Config.LANG == 'ID') description = 'Mengonversi satuan berat.', bit = 'Mengonversi unit data.'

Asena.addCommand({pattern: 'unit ?(.*)', fromMe: wk, desc: description, usage: 'unit 1 kg mg // unit <number> <unit1> <unit2>'}, (async (message, match) => {
  var splitted_text = match[1].split(' ')
  var auth_messages = await WhatsAsenaStack.unit_message(Config.LANG)
  if (splitted_text.length < 3) {
    return await message.client.sendMessage(message.jid,auth_messages.unsuccess + auth_messages.values, MessageType.text)
  }
  var unitter = await WhatsAsenaStack.unit(splitted_text[0], splitted_text[1], splitted_text[2])
  if (unitter.error) {
    return await message.client.sendMessage(message.jid,auth_messages.unsuccess + auth_messages.values, MessageType.text)
  }
  var string_result = unitter.result.toString()
  var formatter = auth_messages.success.replace('{number}', splitted_text[0]).replace('{unit1}', splitted_text[1]).replace('{unit2}', splitted_text[2]).replace('{result}', string_result)
  await message.client.sendMessage(message.jid, formatter, MessageType.text, { quoted: message.data })
}));
Asena.addCommand({pattern: 'bitunit ?(.*)', fromMe: wk, desc: bit, usage: 'bitunit 1 gb mb // bitunit <number> <unit1> <unit2>'}, (async (message, match) => {
  var splitted_text = match[1].split(' ')
  var auth_messages = await WhatsAsenaStack.unit_byte_msg(Config.LANG)
  if (splitted_text.length < 3) {
    return await message.client.sendMessage(message.jid,auth_messages.unsuccess + auth_messages.values, MessageType.text)
  }
  var unitter = await WhatsAsenaStack.unit_byte(splitted_text[0], splitted_text[1], splitted_text[2])
  if (unitter.error) {
    return await message.client.sendMessage(message.jid,auth_messages.unsuccess + auth_messages.values, MessageType.text)
  }
  var string_result = unitter.result.toString()
  var formatter = auth_messages.success.replace('{number}', splitted_text[0]).replace('{unit1}', splitted_text[1]).replace('{unit2}', splitted_text[2]).replace('{result}', string_result)
  await message.client.sendMessage(message.jid, formatter, MessageType.text, { quoted: message.data })
}));
