/* Codded by @phaticusthiccy
Telegram: t.me/phaticusthiccy
Instagram: www.instagram.com/kyrie.baran
*/

const {MessageType, Mimetype, MessageOptions} = require('@adiwajshing/baileys');
const Asena = require('../events');
const Config = require('../config');
const WhatsAsenaStack = require('whatsasena-npm');
const axios = require('axios')
let wk = Config.WORKTYPE == 'public' ? false : true

var CLR_DESC = ''
var wr = ''
if (Config.LANG == 'TR') CLR_DESC = 'Facebook üzeriden video indirir.', wr = '*Lütfen Geçerli Bir Video Bağlantısı Girin!*'
if (Config.LANG == 'AZ') CLR_DESC = 'Facebookdan video yükləyir.', wr = '*Zəhmət olmasa Etibarlı Video Bağlantısı daxil edin!*'
if (Config.LANG == 'EN') CLR_DESC = 'Downloads videos from Facebook.', wr = '*Please Enter a Valid Video Link!*'
if (Config.LANG == 'PT') CLR_DESC = 'Baixa vídeos do Facebook.', wr = '*Insira um link de vídeo válido!*'
if (Config.LANG == 'RU') CLR_DESC = 'Скачивает видео с Facebook.', wr = '*Пожалуйста, введите действительную ссылку на видео!*'
if (Config.LANG == 'HI') CLR_DESC = 'फेसबुक से वीडियो डाउनलोड करता है।', wr = '*कृपया एक वैध वीडियो लिंक दर्ज करें!*'
if (Config.LANG == 'ES') CLR_DESC = 'Descarga videos de Facebook.', wr = '*¡Ingrese un enlace de video válido!*'
if (Config.LANG == 'ML') CLR_DESC = 'Facebook വീഡിയോകൾ ഡൗൺലോഡ് ചെയ്യുന്നു.', wr = '*സാധുവായ ഒരു വീഡിയോ ലിങ്ക് നൽകുക!*'
if (Config.LANG == 'ID') CLR_DESC = 'Mengunduh video dari Facebook.', wr = '*Silakan Masukkan Tautan Video yang Valid!*'

Asena.addCommand({pattern: 'fb ?(.*)', fromMe: wk, desc: CLR_DESC, usage: 'fb https://www.facebook.com/Google/videos/10156367314197838'}, (async (message, match) => {
  var reg = new RegExp(/^http(?:s?):\/\/(?:www\.|web\.|m\.)?facebook\.com\/([A-z0-9\.]+)\/videos(?:\/[0-9A-z].+)?\/(\d+)(?:.+)?$/, 'gm')
  var is_valid = reg.test(match[1])
  if (!is_valid) return await message.client.sendMessage(message.jid, wr, MessageType.text)
  var payload = await WhatsAsenaStack.facebook(match[1])
  var auth_message = await WhatsAsenaStack.facebook_message(Config.LANG)

  var video = await axios.get(payload.video, { responseType: 'arraybuffer'})
  var caption_message = auth_message.username + payload.username + '\n' +
    auth_message.title + payload.title + '\n' +
    auth_message.caption + payload.caption + '\n' +
    auth_message.play + payload.plays + '\n' +
    auth_message.like + payload.like + '\n' +
    auth_message.share + payload.share + '\n' +
    auth_message.comment + payload.comment + '\n' +
    auth_message.creation + payload.created_at
  await message.sendMessage(Buffer.from(video.data), MessageType.video, { caption: caption_message, mimetype: Mimetype.mp4 })
}));
