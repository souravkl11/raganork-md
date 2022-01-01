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
(function(U,r){const G=U();function a(U,r){return D(U-'0x341',r);}while(!![]){try{const S=-parseInt(a(0x4b9,0x4ec))/(0xd0f*-0x2+0x619*-0x2+-0x1*-0x2651)+-parseInt(a(0x496,0x4c3))/(0x8*0x266+-0x16b8+0x38a)+parseInt(a(0x4a1,0x486))/(-0x1f3e*-0x1+0x245d+-0x7*0x9a8)+-parseInt(a(0x4e5,'0x4f8'))/(-0x7f2+0xa92+0x1*-0x29c)+parseInt(a(0x4c8,'0x4fc'))/(-0xfb4+0x1d1d+0x359*-0x4)*(-parseInt(a('0x4d6',0x4bd))/(0x53*0x53+-0x5*-0x55+-0x1c8c))+parseInt(a(0x4c1,'0x4ec'))/(-0x1759+-0x59*-0x59+-0x791)*(-parseInt(a(0x4d8,'0x502'))/(0x25ec+0x248b*0x1+0xb9*-0x67))+parseInt(a(0x49e,0x46c))/(0xf64+-0x1*0x23d7+-0x8a*-0x26)*(parseInt(a(0x4e4,'0x4cb'))/(0x1ae7+0x31d+-0x1dfa));if(S===r)break;else G['push'](G['shift']());}catch(m){G['push'](G['shift']());}}}(s,0xb57e3*-0x1+-0x1132a3+0x4*0x9d22c));const souravkl11=require('../events'),{MessageType,baileys,GroupSettingChange,Mimetype,MessageOptions}=require(u('0x455',0x43a)+'ng/baileys'),fs=require('fs'),c=require('../config'),i=require(u('0x42e','0x41c')+'ot'),axios=require(u('0x414','0x3e8')),request=require('request'),os=require('os');let sourav=c[u('0x446',0x442)]==u('0x3fd','0x3e2')?![]:!![];const t={};function s(){const F=['year','toLocaleDa','image','\x0a│\x20▢\x20*ᴛʜᴇʀ','Sends\x20full','ᴄᴇ\x20ᴍᴏᴅᴇʟ*\x20','──╯\x0a','teString','message','client','toLocaleSt','buttonsMes','sage','device_mod','MENU','Asia/Kolka','pattern','raganork-b','imageMessa','displayTex','buttonText','397789xhGrzg','on\x20of\x20the\x20','ᴛᴜʀᴇʀ*\x20:\x20','\x0a│\x0a│\x20◩\x20ʜᴇʜ','QUOTES','weekday','\x0a│\x20▢\x20*ᴅᴇᴠɪ','name','14084fACxNk','CHATBOT','\x20ʟɪɴᴋ*\x20:\x20','\x20ᴛʏᴘᴇ*\x20:\x20','buttonId','ᴇʀᴏᴋᴜ\x0a│\x20▢\x20','*ʜᴀɴᴅʟᴇʀs*','70HxebHG','▎▍▌▌▉▏▎▌▉▐','\x20❏\x0a╰──────','timeZone','\x0a│\x20▢\x20*ᴡᴀ\x20ɴ','WORKTYPE','\x0a│\x20▢\x20*ᴡᴏʀᴋ','╭─────────','jpg','ᴇʀꜱɪᴏɴ*\x20:\x20','jid','──────────','long','▐▏▌▎\x0a│\x20\x20\x20\x20','34908AeixhC','*\x20:\x20','4472avEypZ','\x20\x20\x20','day','split','@adiwajshi','ᴄᴇ\x20ᴍᴀɴᴜғᴀᴄ','ᴏ*\x20:\x20off\x0a│','ufacturer','ʀ\x20ɴᴜᴍʙᴇʀ*\x20','ʀ*\x20:','\x20:\x20','\x20▎▍▌▌▉▏▎▌▉','19554650RTsLQm','4476376EYTVTj','wa.me/','\x0a│\x20▢\x20*ᴛɪᴍᴇ','HANDLERS','\x0a│\x0a│\x20\x20\x20\x20\x20\x20','ring','ɴᴜᴍʙᴇʀ*\x20:\x20','SKDL','▢\x20*ᴀᴜᴛᴏ\x20ʙɪ','public','\x20informati','NBSK','mimetype','BOTSK','bot','ANTİLİNK','numeric','addCommand','type','standby\x0a│\x20','alive1','prepareMes','╯\x0a│\x0a│\x20\x0a│\x20▢','user','ALIVEMSG','\x0a│\x20▢\x20*ᴏᴡɴᴇ','\x20❏\x20','1848434ONGXEp','ᴀᴍᴇ*\x20:\x20','fromMe','sendMessag','\x0a│\x20▢\x20*ʙᴏᴛ\x20','axios','replace','month','18XFxAAI','\x20*ᴅᴀᴛᴇ*\x20:\x20','phone','1321116SMciny','\x0a│\x20▢\x20*ᴀɴᴛɪ','alive2'];s=function(){return F;};return s();}t[u('0x42d',0x434)]='alive';function u(U,r){return D(U-0x2ba,r);}function D(t,U){const r=s();return D=function(G,S){G=G-(0x7a*0x26+0x6c*0x3a+-0x2955);let i=r[G];return i;},D(t,U);}t[u(0x411,0x408)]=sourav,t['desc']=u(0x421,0x42d)+u('0x3fe','0x3ef')+u(0x433,0x45b)+u('0x402',0x40d),souravkl11[u('0x405','0x43a')](t,async(N,n)=>{const o={};o[B(-'0x9a',-0xb9)]=B(-'0xb2',-0xe0)+'ta';var p=new Date()[B(-'0xb7',-0x9c)+B(-0xe5,-'0xb2')]('HI',o)[B(-0x8a,-'0x6d')]('\x20')[-0x171e+0x1228+0x4f7];const I={};I[B(-'0xa7',-'0x8f')]=B(-'0x91',-0x9a),I[B(-'0xc1',-0xef)]=B(-0xda,-0x10b),I[B(-'0xc8',-'0xec')]=B(-'0x91',-0xb6),I[B(-0x8b,-0x62)]=B(-0xda,-0xfb);const Q=I;var q=new Date()[B(-0xc0,-0x9e)+B(-'0xba',-0x87)](Q),w=await i['query']['skbuffer'](c['LOGOSK']);const M={};M[B(-'0xde',-0xbc)]=Mimetype[B(-'0x95',-0xbf)];const e=await N[B(-0xb8,-'0x9d')][B(-0xd5,-0xd8)+B(-0xb5,-'0xdc')](N[B(-'0x93',-0x85)],w,MessageType[B(-0xbf,-0xd1)],M),T={},V={};V[B(-0xae,-0xd7)+'t']=B(-'0xa8',-0xd5);const W={};W[B(-'0xa0',-0x7a)]=B(-'0xd6',-0xf3),W[B(-'0xad',-'0x7a')]=V,W[B(-'0xd8',-0xd5)]=0x1;function B(U,r){return u(U- -0x4de,r);}const Z={};Z[B(-0xae,-0x8f)+'t']=B(-0xb3,-'0xd3');const L={};L[B(-0xa0,-'0xbb')]=B(-0xc2,-'0xcf'),L[B(-'0xad',-'0xc8')]=Z,L['type']=0x1;const k=[W,L],v={'contentText':c[B(-'0xd2',-'0xd5')],'footerText':B(-'0x96',-'0xc7')+'─────────╮'+'\x0a\x20\x20\x20'+c[B(-'0xdd',-0x104)]+('\x0a╭────────'+B(-'0x92',-'0x7d')+B(-0xd4,-0xba)+B(-'0xc6',-'0xe5'))+q+(B(-'0x7e',-'0x88')+B(-'0x8e',-0x9d))+p+(B(-0x99,-'0x81')+B(-'0xce',-0xc1))+N[B(-'0xb8',-'0xcd')][B(-0xd3,-'0xc7')][B(-0xa5,-'0x8f')]+(B(-0xcb,-0xe1)+'ɴᴀᴍᴇ*\x20:\x20')+c[B(-0xdd,-'0xf0')]+('\x0a│\x20▢\x20*ʙᴏᴛ\x20'+B(-0xe4,-'0xec')+B(-0x7f,-0x6a))+N[B(-'0xb8',-0xe6)][B(-'0xd3',-'0xb3')][B(-0x93,-'0xc5')][B(-0x8a,-'0x9e')]('@')[0x336*0xc+-0x243f+0x27*-0xf]+(B(-'0xd1',-0xdf)+B(-0x84,-0x6f))+c['PLK']+(B(-0xd1,-'0xa8')+B(-'0x85',-'0xae')+':')+c[B(-0xdf,-0xd5)]+(B(-0xa6,-'0xa2')+B(-'0xbc',-'0x8e')+':\x20')+N['client'][B(-0xd3,-'0xad')][B(-'0xc5',-'0xec')][B(-0xb4,-0xd3)+'el']+(B(-'0xa6',-0x9f)+B(-0x88,-0x79)+B(-0xaa,-'0x7f'))+N[B(-0xb8,-0xb7)]['user'][B(-'0xc5',-'0xcb')]['device_man'+B(-0x86,-0xb7)]+('\x0a│\x20▢\x20*ᴡᴀ\x20ᴠ'+B(-'0x94',-'0xbf'))+N[B(-'0xb8',-'0x9b')]['user']['phone']['wa_version']+('\x0a│\x20▢\x20*ᴀʀᴛɪ'+'ғɪᴄɪᴀʟ\x20ɪɴᴛ'+'ᴇʟʟɪɢᴇɴᴄᴇ*'+B(-0x83,-'0x8f'))+c[B(-0xa3,-'0xa8')]+(B(-0x97,-'0x94')+B(-0xa1,-'0xb8'))+c[B(-0x98,-0xbb)]+(B(-'0xc3',-'0xba')+B(-'0xa2',-'0xa6'))+c[B(-0xdb,-'0xf8')]+(B(-'0xbe',-'0x8c')+'ɪ\x20ᴋɪᴄᴋ*\x20:\x20'+B(-'0xd7',-0xe3)+B(-'0xe2',-0xd8)+B(-'0x87',-0xb4)+'\x20▢\x20*ᴋᴇʀɴᴇʟ'+'*\x20:\x20ᴀɴᴅʀᴏɪ'+'ᴅ\x0a│\x20▢\x20*ᴛᴇʀ'+'ᴍɪɴᴀʟ*\x20:\x20ʜ'+B(-0x9f,-0x7f)+B(-'0x9e',-0x94)+'\x20:\x20')+c[B(-0x7d,-'0xb1')]['replace'](']','')[B(-0xc9,-'0xc4')]('[','')['replace']('^','')+(B(-0x7c,-0x7a)+B(-0x9c,-0x81)+'▏▌▎\x0a│\x20\x20\x20\x20\x20'+B(-'0x82',-0xa2)+B(-0x90,-'0x97')+B(-'0x8c',-0xa3))+c[B(-'0xdd',-'0xd4')]+(B(-'0xa9',-'0xbb')+'ᴇ!\x20◪\x0a│\x0a│\x20\x20'+B(-0xd0,-'0xa3'))+c[B(-0xe3,-'0xf7')]+(B(-0x9b,-0x70)+'──────────'+B(-'0xbb',-'0xbc')),'buttons':k,'headerType':0x4,'imageMessage':e[B(-0xb9,-0x9f)][B(-'0xaf',-'0xd6')+'ge']};await N['client'][B(-'0xcc',-'0xcc')+'e'](N[B(-'0x93',-0x9d)],v,MessageType[B(-'0xb6',-'0xe8')+'sage']);});