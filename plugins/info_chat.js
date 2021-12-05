const skl = require('../events');
const { MessageType, Mimetype, GroupSettingChange, MessageOptions } = require('@adiwajshing/baileys');
const metadata = require('axios');
const rgnk = require('../config');
const Language = require('../language'); 
const sk = Language.getString('whois'); // Language Support
let myr = rgnk.WORKTYPE == 'public' ? false : true

var ADMİN_USER = ''
var USER_USER = ''
var TR_USER = ''
var Hİ_USER = ''
var AZ_USER = ''
var SRİ_USER = ''
var RU_USER = ''
var USA_USER = ''
var OTHER = ''
if (rgnk.LANG == 'TR') ADMİN_USER = '*Admin Sayısı:*', USER_USER = '*Üye Sayısı:*', TR_USER = '*Türk Üye Sayısı:*', Hİ_USER = '*Hint Üye Sayısı:*', AZ_USER = '*Azeri Üye Sayısı:*', SRİ_USER = '*Sri Lanka Üye Sayısı:*', RU_USER = '*Rus Üye Sayısı:*', USA_USER = '*ABD Üye Sayısı:*', OTHER = '*Diğer Üye Sayısı:*'
if (rgnk.LANG == 'EN') ADMİN_USER = '*Admin Count:*', USER_USER = '*Member Count:*', TR_USER = '*Turkish Member Count:*', Hİ_USER = '*Indian Member Count:*', AZ_USER = '*Azerbayjan Member Count:*', SRİ_USER = '*Sri Lanka Member Count:*', RU_USER = '*Russian Member Count:*', USA_USER = '*USA Member Count:*', OTHER = '*Other Member Count:*'
if (rgnk.LANG == 'AZ') ADMİN_USER = '*Admin sayı:*', USER_USER = '*Üzv sayı:*', TR_USER = '*Türk Üzv Sayısı:*', Hİ_USER = '*Hindistan üzv sayı:*', AZ_USER = '*Azərbaycan Üzv Sayısı:*', SRİ_USER = '*Şri Lanka üzv sayı:*', RU_USER = '*Rusiya Üzv Sayısı:*', USA_USER = '*ABD Üzv sayı:*', OTHER = '*Digər üzv sayı:*'
if (rgnk.LANG == 'ES') ADMİN_USER = '*Recuento de administradores:*', USER_USER = '*Cuenta de miembro:*', TR_USER = '*Recuento de miembros turcos:*', Hİ_USER = '*Recuento de miembros indios:*', AZ_USER = '*Recuento de miembros de Azerbaiyán:*', SRİ_USER = '*Recuento de miembros de Sri Lanka:*', RU_USER = '*Recuento de miembros rusos:*', USA_USER = '*Recuento de miembros de USA:*', OTHER = '*Otro recuento de miembros:*'
if (rgnk.LANG == 'PT') ADMİN_USER = '*Contagem de Admin:*', USER_USER = '*Contagem de membro:*', TR_USER = '*Contagem de membros turcos:*', Hİ_USER = '*Contagem de membros indianos:*', AZ_USER = '*Contagem de membros do Azerbaijão:*', SRİ_USER = '*Contagem de membros do Sri Lanka:*', RU_USER = '*Contagem de membros russos:*', USA_USER = '*Contagem de membros dos USA:*', OTHER = '*Contagem de outros membros:*'
if (rgnk.LANG == 'RU') ADMİN_USER = '*Количество администраторов:*', USER_USER = '*Количество участников:*', TR_USER = '*Количество членов в Турции:*', Hİ_USER = '*Количество членов в Индии:*', AZ_USER = '*Количество участников из Азербайджана:*', SRİ_USER = '*Количество членов из Шри-Ланки:*', RU_USER = '*Количество участников в России:*', USA_USER = '*Количество участников в США:*', OTHER = '*Количество других участников:*'
if (rgnk.LANG == 'HI') ADMİN_USER = '*व्यवस्थापक गणना:*', USER_USER = '*सदस्य गणना:*', TR_USER = '*तुर्की सदस्य संख्या:*', Hİ_USER = '*भारतीय सदस्य संख्या:*', AZ_USER = '*अज़रबैजान सदस्य संख्या:*', SRİ_USER = '*श्रीलंका सदस्य संख्या:*', RU_USER = '*रूसी सदस्य संख्या:*', USA_USER = '*यूएसए सदस्य संख्या:*', OTHER = '*अन्य सदस्य संख्या:*'
if (rgnk.LANG == 'ID') ADMİN_USER = '*Jumlah Admin:*', USER_USER = '*Jumlah anggota:*', TR_USER = '*Jumlah Anggota Turki:*', Hİ_USER = '*Jumlah Anggota India:*', AZ_USER = '*Jumlah Anggota Azerbaijan:*', SRİ_USER = '*Jumlah Anggota Sri Lanka:*', RU_USER = '*Jumlah Anggota Rusia:*', USA_USER = '*Jumlah Anggota USA:*', OTHER = '*Jumlah Anggota Lainnya:*'
if (rgnk.LANG == 'ML') ADMİN_USER = '*അഡ്‌മിൻ എണ്ണം:*', USER_USER = '*അംഗങ്ങളുടെ എണ്ണം:*', TR_USER = '*ടർക്കിഷ് അംഗങ്ങളുടെ എണ്ണം:*', Hİ_USER = '*ഇന്ത്യൻ അംഗങ്ങളുടെ എണ്ണം:*', AZ_USER = '*അസർബൈജാൻ അംഗങ്ങളുടെ എണ്ണം:*', SRİ_USER = '*ശ്രീലങ്ക അംഗങ്ങളുടെ എണ്ണം:*', RU_USER = '*റഷ്യൻ അംഗങ്ങളുടെ എണ്ണം:*', USA_USER = '*യു‌എസ്‌എ അംഗങ്ങളുടെ എണ്ണം:*', OTHER = '*മറ്റ് അംഗങ്ങളുടെ എണ്ണം:*'


    skl.addCommand({ pattern: 'info$', fromMe: myr, desc: sk.PL_DESC }, async (raganork, match) => { 
        if (raganork.jid.includes('g.us')) {
            var json = await raganork.client.groupMetadataMinimal(raganork.jid) 
            var nwjson = await raganork.client.groupMetadata(raganork.jid) 
            let region = await raganork.client.groupMetadata(raganork.jid);
            let grup = await raganork.client.groupMetadata(raganork.jid);
            var jids = [];
            mesaj = '';
            var users1 = [];
            grup['participants'].map(async (uye) => {
                if (uye.isAdmin) {
                    mesaj += '@' + uye.id.split('@')[0] + ' ';
                    jids.push(uye.id.replace('c.us', 's.whatsapp.net'));
                }
                users1.push(uye.id.replace('c.us', 's.whatsapp.net'));
            });
            var admin_count = ' ' +  jids.length + '\n'
            var user_count = ' ' +  users1.length + '\n'
            var tr_user = [];
            var hi_user = [];
            var az_user = [];
            var sri_user = [];
            var ru_user = [];
            var usa_user = [];
            var other_user = [];
            region['participants'].map(async (reg) => {
                if (reg.jid.startsWith('90')) { tr_user.push(reg.id.replace('c.us', 's.whatsapp.net'));
                } if (reg.jid.startsWith('994')) { az_user.push(reg.id.replace('c.us', 's.whatsapp.net'));
                } if (reg.jid.startsWith('91')) { hi_user.push(reg.id.replace('c.us', 's.whatsapp.net'));
                } if (reg.jid.startsWith('94')) { sri_user.push(reg.id.replace('c.us', 's.whatsapp.net'));
                } if (reg.jid.startsWith('7')) { ru_user.push(reg.id.replace('c.us', 's.whatsapp.net'));
                } if (reg.jid.startsWith('1')) { usa_user.push(reg.id.replace('c.us', 's.whatsapp.net'));
                } 
            });
            var trus = ' ' + tr_user.length + '\n'
            var hius = ' ' + hi_user.length + '\n'
            var azus = ' ' + az_user.length + '\n'
            var srius = ' ' + sri_user.length + '\n'
            var ruus = ' ' + ru_user.length + '\n'
            var usaus = ' ' + usa_user.length + '\n'
            var oth = user_count - trus - hius - azus - srius - ruus - usaus
            const user_count_msg = ADMİN_USER + admin_count + USER_USER + user_count + Hİ_USER + hius + AZ_USER + azus + SRİ_USER + srius + RU_USER + ruus + USA_USER + usaus + OTHER + ' ' + oth + '\n'
            const msg = `*Grup ID:* ${json.id} \n` + sk.SUB + `${nwjson.subject} \n` + sk.OWN + `${json.owner} \n` + user_count_msg + sk.DES + `\n\n${nwjson.desc}`
            var ppUrl = await raganork.client.getProfilePicture(raganork.jid) 
            const resim = await metadata.get(ppUrl, {responseType: 'arraybuffer'})
            await raganork.sendMessage(
                Buffer.from(resim.data), 
                MessageType.image, 
                {caption: msg }
            );
        }
        else {
            var status = await raganork.client.getStatus(raganork.jid) 
            var usppUrl = await raganork.client.getProfilePicture(raganork.jid) 
            var usexists = await raganork.client.isOnWhatsApp(raganork.jid)
            const nwmsg = sk.JİD + `${usexists.jid} \n` + sk.ST + `${status.status}`
            const resimnw = await metadata.get(usppUrl, {responseType: 'arraybuffer'})
            await raganork.sendMessage(
                Buffer.from(resimnw.data), 
                MessageType.image, 
                { caption: nwmsg }
            );
        }
    });
