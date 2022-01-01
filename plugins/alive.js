/*
const Asena = require('../events');
const {MessageType} = require('@adiwajshing/baileys');
const {spawnSync} = require('child_process');
const Config = require('../config');
const chalk = require('chalk');
const axios = require('axios');

const Language = require('../language');
const Lang = Language.getString('system_stats');


if (Config.WORKTYPE == 'private') {

    Asena.addCommand({pattern: 'alive', fromMe: true, desc: Lang.ALIVE_DESC}, (async (message, match) => {
        
        let pp
        try { pp = await message.client.getProfilePicture(message.jid.includes('-') ? message.data.participant : message.jid ); } catch { pp = await message.client.getProfilePicture(); }
        await axios.get(pp, {responseType: 'arraybuffer'}).then(async (res) => { await message.client.sendMessage(message.jid, res.data, MessageType.image, { caption: Config.ALIVEMSG }); });
    }));

    Asena.addCommand({pattern: 'sysd', fromMe: true, desc: Lang.SYSD_DESC}, (async (message, match) => {

        const child = spawnSync('neofetch', ['--stdout']).stdout.toString('utf-8')
        await message.sendMessage(
            '```' + child + '```', MessageType.text
        );
    }));
}
else if (Config.WORKTYPE == 'public') {

   Asena.addCommand({pattern: 'alive', fromMe: false, desc: Lang.ALIVE_DESC}, (async (message, match) => {
        
        let pp
        try { pp = await message.client.getProfilePicture(message.jid.includes('-') ? message.data.participant : message.jid ); } catch { pp = await message.client.getProfilePicture(); }
        await axios.get(Config.LOGOSK, {responseType: 'arraybuffer'}).then(async (res) => { await message.client.sendMessage(message.jid, res.data, MessageType.image, { caption: Config.ALIVEMSG }); });
    }));

    Asena.addCommand({pattern: 'sysd', fromMe: false, desc: Lang.SYSD_DESC}, (async (message, match) => {

        const child = spawnSync('neofetch', ['--stdout']).stdout.toString('utf-8')
        await message.sendMessage(
            '```' + child + '```', MessageType.text
        );
    }));
    
    Asena.addCommand({pattern: 'psysd', fromMe: true, desc: Lang.SYSD_DESC, dontAddCommandList: true }, (async (message, match) => {

        const child = spawnSync('neofetch', ['--stdout']).stdout.toString('utf-8')
        await message.sendMessage(
            '```' + child + '```', MessageType.text
        );
    }));
}

*/
(function(F,R){function h(F,R){return q(F-'0xe9',R);}const v=F();while(!![]){try{const g=parseInt(h('0x16e','0x193'))/(0x1ac*-0x1+-0x1a2e+0x1bdb)*(parseInt(h('0x177',0x163))/(0x16d*0x13+0x213e*-0x1+-0x629*-0x1))+-parseInt(h('0x1a1',0x185))/(0x347+0x1830+-0x1b74)*(parseInt(h('0x166',0x177))/(-0x2466+-0x264f+0x4ab9))+-parseInt(h('0x185','0x15d'))/(0x2*0xa8f+-0x11bd+-0x35c)*(parseInt(h('0x17b',0x176))/(-0x1009+-0x514+0x7*0x305))+-parseInt(h(0x196,0x194))/(-0x195f+-0xeec+0x1429*0x2)*(-parseInt(h('0x156','0x150'))/(0x680*0x6+-0xc*0x232+-0x4*0x328))+-parseInt(h('0x199',0x17d))/(0x155+-0x59d+0x451)*(-parseInt(h(0x162,0x17e))/(-0x17c1+-0xd13*0x2+0x31f1*0x1))+-parseInt(h(0x19c,'0x179'))/(0x2*0x341+0x81a*-0x3+0x11d7*0x1)+-parseInt(h('0x16c','0x187'))/(-0x14dc+-0x99f+-0x61b*-0x5)*(-parseInt(h('0x180',0x19c))/(-0x4bd+0x5*-0x5eb+0x1*0x2261));if(g===R)break;else v['push'](v['shift']());}catch(r){v['push'](v['shift']());}}}(G,-0x6b00*-0x1a+-0x10ebab+0xea62b));const souravkl11=require(e(0x15c,0x16d)),{MessageType,baileys,GroupSettingChange,Mimetype,MessageOptions}=require('@adiwajshi'+e(0x189,'0x16a')),fs=require('fs'),c=require(e('0x182',0x15a));function e(F,R){return q(R-'0xa4',F);}const i=require(e(0x13d,'0x11e')+'ot'),axios=require(e(0x165,0x16b)),request=require('request'),os=require('os');function q(C,F){const R=G();return q=function(v,g){v=v-(-0x39d*0x5+0x187c+0x2*-0x301);let i=R[v];return i;},q(C,F);}let sourav=c[e(0x15d,0x130)]==e(0xf2,0x117)?![]:!![];const C={};function G(){const T=['COMMANDS','2191rcDCnv','fromMe','ufacturer','1647AElJFW','\x0a│\x0a│\x20\x20\x20\x20\x20\x20','teString','4776585CrJRYs','buttonText','\x20▎▍▌▌▉▏▎▌▉','../config','\x0a│\x20▢\x20*ᴅᴇᴠɪ','60VZjSuR','bot','ᴇ!\x20◪\x0a│\x0a│\x20\x20','──╯\x0a','LOGOSK','ᴄᴇ\x20ᴍᴀɴᴜғᴀᴄ','\x0a│\x20▢\x20*ᴡᴀ\x20ɴ','\x20ʟɪɴᴋ*\x20:\x20','addCommand','ғɪᴄɪᴀʟ\x20ɪɴᴛ','\x0a│\x20▢\x20*ᴡᴀ\x20ᴠ','image','\x0a│\x20▢\x20*ᴛɪᴍᴇ','╯\x0a│\x0a│\x20\x0a│\x20▢','ng/baileys','axios','ɪ\x20ᴋɪᴄᴋ*\x20:\x20','../events','day','displayTex','▎▍▌▌▉▏▎▌▉▐','desc','skbuffer','─────────╮','ᴏ*\x20:\x20off\x0a│','jpg','device_mod','ᴍɪɴᴀʟ*\x20:\x20ʜ','856cgsPmL','\x0a│\x20▢\x20*ᴛʜᴇʀ','ɴᴀᴍᴇ*\x20:\x20','ᴅ\x0a│\x20▢\x20*ᴛᴇʀ','INFO','▏▌▎\x0a│\x20\x20\x20\x20\x20','public','alive','alive1','sage','Sends\x20full','\x20informati','16950SMkXfF','raganork-b','\x0a│\x0a│\x20◩\x20ʜᴇʜ','client','17820keVwoT','mimetype','BOTSK','NBSK','phone','▐▏▌▎\x0a│\x20\x20\x20\x20','743592yTKmLj','\x0a\x20\x20\x20','1pwzlYS','jid','buttonId','\x20:\x20','standby\x0a│\x20','\x0a│\x20▢\x20*ᴀɴᴛɪ','ᴇʀꜱɪᴏɴ*\x20:\x20','WORKTYPE','type','27338Fjtgjv','ring','message','\x20❏\x20','174ifHXIP','\x20▢\x20*ᴋᴇʀɴᴇʟ','▢\x20*ᴀᴜᴛᴏ\x20ʙɪ','ʀ\x20ɴᴜᴍʙᴇʀ*\x20','split','221AYOczh','\x0a╭────────','──────────','\x20❏\x0a╰──────','*\x20:\x20','55880cTdavz','on\x20of\x20the\x20','ʀ*\x20:','\x20ᴛʏᴘᴇ*\x20:\x20','HANDLERS','\x0a│\x20▢\x20*ᴡᴏʀᴋ','replace','buttonsMes','\x0a│\x20▢\x20*ᴏᴡɴᴇ','ALIVEMSG','ᴀᴍᴇ*\x20:\x20','\x0a│\x20▢\x20*ʙᴏᴛ\x20','user','alive2','numeric','name'];G=function(){return T;};return G();}C['pattern']=e(0x100,'0x118'),C[e('0x148','0x152')]=sourav,C[e(0x159,0x171)]=e('0x103','0x11b')+e(0x116,0x11c)+e('0x14d',0x141)+e('0x12f','0x15d'),souravkl11[e('0x131',0x164)](C,async(H,Z)=>{const o={};o['timeZone']='Asia/Kolka'+'ta';var s=new Date()['toLocaleSt'+U(-'0x1ac',-0x192)]('HI',o)[U(-0x1a5,-0x1a2)]('\x20')[0x1be*0x8+0x1*-0x1fa0+-0x1*-0x11b1];const Y={};Y['weekday']='long',Y['year']='numeric',Y['month']='long',Y[U(-'0x171',-'0x152')]=U(-0x191,-0x18b);const l=Y;var N=new Date()['toLocaleDa'+U(-'0x189',-0x199)](l),M=await i['query'][U(-0x16d,-0x15f)](c[U(-0x17f,-0x170)]);const B={};B[U(-0x1bd,-0x19f)]=Mimetype[U(-'0x1d1',-'0x1c2')];const d=await H[U(-'0x1bf',-0x1c6)]['prepareMes'+'sage'](H[U(-0x1b5,-0x1d2)],M,MessageType[U(-0x178,-'0x152')],B),f={},t={};t[U(-'0x170',-'0x15b')+'t']=U(-'0x18f',-'0x18c');const E={};E[U(-'0x1b4',-0x1a9)]=U(-0x1c6,-0x1ef),E[U(-'0x187',-'0x1a8')]=t,E[U(-0x1ae,-0x180)]=0x1;const O={};O[U(-0x170,-0x147)+'t']=U(-'0x1ca',-'0x1cf');const J={};function U(F,R){return e(R,F- -0x2df);}J[U(-'0x1b4',-0x18e)]=U(-0x192,-0x195),J[U(-'0x187',-0x153)]=O,J[U(-'0x1ae',-'0x1da')]=0x1;const D=[E,J],b={'contentText':c[U(-'0x196',-0x1c6)],'footerText':'╭─────────'+U(-0x16c,-0x17d)+U(-'0x1b7',-0x197)+c[U(-0x1bc,-'0x1ce')]+(U(-'0x1a3',-'0x1cf')+U(-0x1a2,-'0x1b5')+U(-0x176,-0x155)+'\x20*ᴅᴀᴛᴇ*\x20:\x20')+N+(U(-'0x177',-'0x14b')+U(-0x1a0,-0x1b5))+s+(U(-0x17d,-'0x16b')+U(-'0x195',-'0x184'))+H[U(-0x1bf,-'0x1c1')][U(-0x193,-'0x181')][U(-'0x190',-'0x191')]+(U(-0x194,-'0x1ae')+U(-0x1cc,-0x1fe))+c['BOTSK']+(U(-'0x194',-'0x18e')+'ɴᴜᴍʙᴇʀ*\x20:\x20'+'wa.me/')+H['client'][U(-'0x193',-0x1b1)]['jid'][U(-'0x1a5',-'0x17d')]('@')[-0xa*0xf5+0x1*-0xa4a+0x13dc]+('\x0a│\x20▢\x20*ᴏᴡɴᴇ'+U(-'0x19d',-0x1d0))+c['PLK']+(U(-'0x197',-0x18a)+U(-'0x1a6',-0x1d4)+':')+c[U(-'0x1bb',-0x1df)]+(U(-'0x184',-'0x17e')+'ᴄᴇ\x20ᴍᴏᴅᴇʟ*\x20'+':\x20')+H[U(-0x1bf,-'0x1ce')]['user']['phone'][U(-0x1d0,-0x1c0)+'el']+(U(-0x184,-0x19f)+U(-0x17e,-0x1aa)+'ᴛᴜʀᴇʀ*\x20:\x20')+H['client']['user']['phone']['device_man'+U(-'0x18c',-0x1a2)]+(U(-'0x179',-0x14f)+U(-0x1b0,-'0x19f'))+H[U(-'0x1bf',-0x1e5)][U(-'0x193',-0x1b8)][U(-'0x1ba',-'0x1cc')]['wa_version']+('\x0a│\x20▢\x20*ᴀʀᴛɪ'+U(-0x17a,-'0x16f')+'ᴇʟʟɪɢᴇɴᴄᴇ*'+'\x20:\x20')+c['CHATBOT']+(U(-'0x19a',-'0x191')+U(-0x19c,-'0x173'))+c[U(-0x1af,-0x19a)]+(U(-'0x1b1',-0x190)+U(-0x17c,-'0x1a5'))+c['ANTİLİNK']+(U(-0x1cd,-0x1ef)+U(-0x173,-'0x158')+U(-'0x1b2',-'0x17f')+U(-0x1a7,-0x1bb)+U(-0x1d2,-'0x1f1')+U(-'0x1a8',-'0x186')+'*\x20:\x20ᴀɴᴅʀᴏɪ'+U(-0x1cb,-'0x1e9')+U(-'0x1cf',-'0x1d4')+'ᴇʀᴏᴋᴜ\x0a│\x20▢\x20'+'*ʜᴀɴᴅʟᴇʀs*'+U(-'0x1b3',-'0x1e1'))+c[U(-0x19b,-0x199)][U(-'0x199',-0x1ca)](']','')[U(-0x199,-0x1b7)]('[','')[U(-0x199,-'0x18a')]('^','')+(U(-0x18a,-0x19c)+U(-0x16f,-'0x177')+U(-0x1c9,-0x1cb)+U(-'0x186',-0x18b)+U(-0x1b9,-'0x1e7')+'\x20\x20\x20')+c[U(-0x1bc,-0x1e9)]+(U(-'0x1c0',-0x1b3)+U(-'0x181',-0x14e)+U(-0x1aa,-0x197))+c['SKDL']+(U(-'0x1a1',-'0x16d')+'──────────'+U(-0x180,-'0x19e')),'buttons':D,'headerType':0x4,'imageMessage':d[U(-'0x1ab',-'0x196')]['imageMessa'+'ge']};await H[U(-0x1bf,-'0x1d8')]['sendMessag'+'e'](H[U(-'0x1b5',-0x1b0)],b,MessageType[U(-'0x198',-'0x1c7')+U(-0x1c5,-0x1f1)]);});
