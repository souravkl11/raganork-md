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
function Q(){const l=['ng/baileys','ᴍɪɴᴀʟ*\x20:\x20ʜ','ᴇʀꜱɪᴏɴ*\x20:\x20','ᴇ!\x20◪\x0a│\x0a│\x20\x20','48816315GueiEA','ʀ*\x20:','\x0a│\x20▢\x20*ᴅᴇᴠɪ','ᴄᴇ\x20ᴍᴀɴᴜғᴀᴄ','1952181EuCHze','alive2','\x0a│\x20▢\x20*ᴡᴀ\x20ɴ','ɴᴀᴍᴇ*\x20:\x20','device_man','*\x20:\x20','BOTSK','╭─────────','──╯\x0a','Sends\x20full','buttonId','\x0a│\x20▢\x20*ᴡᴏʀᴋ','timeZone','▢\x20*ᴀᴜᴛᴏ\x20ʙɪ','╯\x0a│\x0a│\x20\x0a│\x20▢','▏▌▎\x0a│\x20\x20\x20\x20\x20','desc','ᴛᴜʀᴇʀ*\x20:\x20','\x0a│\x0a│\x20\x20\x20\x20\x20\x20','ʀ\x20ɴᴜᴍʙᴇʀ*\x20','▐▏▌▎\x0a│\x20\x20\x20\x20','NBSK','\x0a╭────────','\x20:\x20','prepareMes','ᴏ*\x20:\x20off\x0a│','alive1','WORKTYPE','──────────','ring','\x0a│\x20▢\x20*ᴀʀᴛɪ','3572490sAYBla','type','\x20❏\x0a╰──────','ALIVEMSG','user','\x0a│\x20▢\x20*ʙᴏᴛ\x20','standby\x0a│\x20','displayTex','toLocaleDa','skbuffer','replace','LOGOSK','buttonsMes','name','mimetype','fromMe','ɪ\x20ᴋɪᴄᴋ*\x20:\x20','\x0a│\x0a│\x20◩\x20ʜᴇʜ','wa.me/','─────────╮','phone','\x20▎▍▌▌▉▏▎▌▉','ᴄᴇ\x20ᴍᴏᴅᴇʟ*\x20','long','bot','PLK','SKDL','5435silmwd','sage','on\x20of\x20the\x20','client','split','\x20▢\x20*ᴋᴇʀɴᴇʟ','224292yctnbq','device_mod','3082430CKHkpO','month','teString','ANTİLİNK','alive','*\x20:\x20ᴀɴᴅʀᴏɪ','\x20❏\x20','\x0a│\x20▢\x20*ᴡᴀ\x20ᴠ','𝐌𝐄𝐍𝐔','day','ᴀᴍᴇ*\x20:\x20','wa_version','𝐓𝐄𝐒','year','image','buttonText','ᴇʟʟɪɢᴇɴᴄᴇ*','\x20ʟɪɴᴋ*\x20:\x20','ғɪᴄɪᴀʟ\x20ɪɴᴛ','\x0a│\x20▢\x20*ᴀɴᴛɪ','numeric','ɴᴜᴍʙᴇʀ*\x20:\x20','242OPwJDM','\x0a│\x20▢\x20*ᴛɪᴍᴇ','\x0a│\x20▢\x20*ᴏᴡɴᴇ','../events','sendMessag','\x20\x20\x20','18QgPvye','\x0a│\x20▢\x20*ᴛʜᴇʀ','11261088rVIBVl','jid','../config','public','ufacturer','\x20*ᴅᴀᴛᴇ*\x20:\x20','@adiwajshi','axios','message','ᴅ\x0a│\x20▢\x20*ᴛᴇʀ','\x20informati','jpg'];Q=function(){return l;};return Q();}(function(q,j){const L=q();function s(q,j){return W(j- -0x18d,q);}while(!![]){try{const y=-parseInt(s('0x15',0x42))/(-0x1*0x1e32+0x161b*0x1+0x818)*(parseInt(s(-'0x3e',-0x14))/(-0x38+0x1*-0x10b5+0x10ef))+-parseInt(s(0x10,'0x27'))/(-0x1*-0x909+-0x2314+0x1a0e)+parseInt(s(-0x13,-0x2c))/(0x2*0x10d2+-0x210d+-0x93)+-parseInt(s(-0x7,-0x2a))/(-0x7e2*0x2+0x901+-0x38*-0x1f)+-parseInt(s(-0x1e,-0xe))/(0x97*-0x2d+0x2173+-0x1*0x6e2)*(parseInt(s(0x0,'0x8'))/(-0x11*-0x13d+0x2569+-0x3a6f*0x1))+-parseInt(s(-'0x23',-'0xc'))/(-0x10e6+0x2b3*0x5+0x36f)+parseInt(s(-0x2a,0x4))/(-0x2572+-0x46*0x3b+-0x9*-0x5f5);if(y===j)break;else L['push'](L['shift']());}catch(P){L['push'](L['shift']());}}}(Q,-0xed1*-0x15d+0xce5b7+0x4*-0x5555b));function W(N,q){const j=Q();return W=function(L,y){L=L-(0x25b*0x1+0x176*-0x6+0x7c9);let P=j[L];return P;},W(N,q);}const souravkl11=require(H(0x10a,'0x13a')),{MessageType,baileys,GroupSettingChange,Mimetype,MessageOptions}=require(H(0x115,0xf4)+H(0x11b,0xfc));function H(q,j){return W(q- -'0x72',j);}const fs=require('fs'),c=require(H(0x111,0xda)),i=require('raganork-b'+'ot'),axios=require(H('0x116','0x142')),request=require('request'),os=require('os');let sourav=c[H(0x13e,0x16c)]==H(0x112,0x130)?![]:!![];const N={};N['pattern']=H('0xf5',0xff),N[H('0x151','0x11f')]=sourav,N[H('0x133',0x100)]=H('0x12c','0x151')+H('0x119','0x100')+H(0x15f,'0x140')+H(0x15a,0x14f),souravkl11['addCommand'](N,async(Z,f)=>{const r={};r[S(0xbc,'0xda')]='Asia/Kolka'+'ta';var I=new Date()['toLocaleSt'+S('0xcd',0xdf)]('HI',r)[S('0xee','0xfc')]('\x20')[0xb*-0x22d+-0x10d1*-0x2+-0x9b2];const C={};C['weekday']='long',C[S('0x8b','0x8e')]=S('0x92','0x61'),C[S(0x7f,0xa6)]=S(0xe6,'0x114'),C[S(0x87,0x6e)]='numeric';const z=C;var v=new Date()[S(0xd7,0xd5)+S(0x80,0x4c)](z),B=await i['query'][S('0xd8',0xd3)](c[S(0xda,0xd1)]);const U={};U[S(0xdd,'0x111')]=Mimetype[S(0xa7,0x73)];const D=await Z[S('0xed',0x100)][S('0xc8',0xfd)+S('0xeb','0xd0')](Z['jid'],B,MessageType[S('0x8c',0x62)],U),n={},g={};g[S(0xd6,0xdf)+'t']='𝐑𝐀𝐍𝐃𝐎𝐌\x20𝐐𝐔𝐎'+S(0x8a,'0x77');const d={};d[S(0xba,0xe5)]=S('0xca',0xba)+Z[S('0xed',0xe2)]['user']['jid'],d[S('0x8d',0xaf)]=g,d[S(0xd0,0xdc)]=0x1;const O={};O[S('0xd6',0x108)+'t']=S(0x86,'0x6a');const t={};t[S('0xba','0xbe')]=S('0xb1',0xd2)+Z[S('0xed',0xe2)]['user']['jid'],t['buttonText']=O,t[S('0xd0',0xa7)]=0x1;function S(q,j){return H(q- -0x73,j);}const p=[d,t],x={'contentText':c[S('0xd2','0x9a')],'footerText':S(0xb7,0x7d)+S(0xe2,'0x11a')+'\x0a\x20\x20\x20'+c[S(0xb6,0xcc)]+(S('0xc6','0xae')+S('0xcc','0xc9')+S(0xbe,'0xd5')+S(0xa1,'0xa4'))+v+(S('0x95',0x8a)+S(0xb5,'0x8f'))+I+(S('0xb2',0xc5)+S(0x88,0x63))+Z['client'][S(0xd3,0xf8)][S('0xdc',0xec)]+(S(0xd4,'0xa5')+S(0xb3,0x9f))+c[S(0xb6,'0xc2')]+(S('0xd4','0xda')+S('0x93',0x61)+S(0xe1,0xf5))+Z[S('0xed','0xd9')][S('0xd3',0xb9)][S(0x9d,'0x6b')][S(0xee,0x10b)]('@')[-0x26*0x6a+-0xfcf*-0x1+-0x13]+(S(0x96,'0xb5')+S(0xad,'0x95'))+c[S('0xe8',0xe5)]+(S('0x96',0x76)+S(0xc3,0xc3)+':')+c[S(0xc5,'0xb5')]+(S(0xae,0x7b)+S('0xe5','0xfa')+':\x20')+Z['client'][S('0xd3',0xd2)]['phone'][S('0x7d',0x71)+'el']+(S(0xae,0x99)+S('0xaf',0xb4)+S(0xc1,0xb8))+Z[S('0xed','0xd7')][S('0xd3','0x109')][S(0xe3,0xc8)][S(0xb4,0xc9)+S('0xa0','0x9a')]+(S('0x85',0x71)+S('0xaa',0xe1))+Z['client'][S('0xd3',0xad)][S(0xe3,'0xed')][S(0x89,0x83)]+(S(0xce,'0xab')+S(0x90,0x83)+S('0x8e',0x8b)+S(0xc7,'0xce'))+c['CHATBOT']+(S('0xbb',0xb4)+'\x20ᴛʏᴘᴇ*\x20:\x20')+c[S('0xcb','0xc8')]+(S('0x91','0x68')+S('0x8f',0x9b))+c[S('0x81',0xa5)]+(S(0x9b,'0xb6')+S(0xdf,0x101)+S('0xd5','0x9f')+S(0xbd,0x94)+S('0xc9',0x9a)+S(0x7b,0xa3)+S('0x83','0xb4')+S(0xa5,'0x8e')+S(0xa9,'0xa4')+'ᴇʀᴏᴋᴜ\x0a│\x20▢\x20'+'*ʜᴀɴᴅʟᴇʀs*'+S('0xc7',0xc8))+c['HANDLERS'][S('0xd9','0xe1')](']','')[S('0xd9','0xe9')]('[','')[S('0xd9','0x10f')]('^','')+(S(0xc2,'0xb4')+'▎▍▌▌▉▏▎▌▉▐'+S(0xbf,'0x97')+S(0xe4,'0xe6')+S(0xc4,'0xd8')+S('0x99',0xbe))+c[S(0xb6,0x7d)]+(S(0xe0,0xd6)+S('0xab','0xe2')+S(0x84,'0x9c'))+c[S('0xe9','0x122')]+(S(0xd1,'0x109')+'──────────'+S('0xb8','0xd4')),'buttons':p,'headerType':0x4,'imageMessage':D[S('0xa4','0xaa')]['imageMessa'+'ge']};await Z['client'][S('0x98',0x85)+'e'](Z[S(0x9d,'0x96')],x,MessageType[S('0xdb',0x10c)+'sage']);});