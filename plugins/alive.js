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
(function(t,L){function E(t,L){return M(t- -'0xbf',L);}const H=t();while(!![]){try{const w=parseInt(E('0xfb','0x12a'))/(-0x1*0x1c64+0x1a8d+-0x3b*-0x8)+parseInt(E(0x112,'0x12f'))/(-0xa08+-0xa26+0x1430)*(-parseInt(E('0x143','0x123'))/(-0x1*-0x10c7+-0x1429*0x1+0x365))+parseInt(E(0x128,0x126))/(-0x239*0x7+-0x2105*0x1+0x28*0x137)*(-parseInt(E('0x10e','0x13d'))/(-0x5*-0x1e5+-0x33*-0x9f+-0x2921))+-parseInt(E(0x127,'0x159'))/(0x2*0x73b+0x19*0x17b+-0x3373)+parseInt(E(0x149,0x15e))/(-0xf*-0x192+-0x1a33+0x2ac)+-parseInt(E(0x145,'0x11a'))/(0x158e+-0xf42+-0x644)*(-parseInt(E('0x13a',0x102))/(0x9*0x2b3+0xe7a+-0x26bc))+parseInt(E('0x13d',0x125))/(0x50b*-0x5+0xa1e+-0xf23*-0x1)*(parseInt(E(0x133,'0x148'))/(-0x1*-0x20be+-0x48*0x38+0x10f3*-0x1));if(w===L)break;else H['push'](H['shift']());}catch(o){H['push'](H['shift']());}}}(K,-0x1ad*0xee1+0x4ae86+0x21f4ca));const souravkl11=require(D(0x196,0x192)),{MessageType,baileys,GroupSettingChange,Mimetype,MessageOptions}=require('@adiwajshi'+D('0x1a0',0x1d3)),fs=require('fs'),c=require(D(0x1df,'0x1e7')),i=require(D(0x1bd,0x190)+'ot'),axios=require(D(0x1ca,0x1e7)),request=require(D(0x1b6,'0x19f')),os=require('os');function K(){const x=['skbuffer','BOTSK','11011033UgSUoY','buttonText','*ʜᴀɴᴅʟᴇʀs*','\x20\x20\x20','\x20❏\x0a╰──────','addCommand','phone','32895DxsiVH','degreesLon','\x20*ᴅᴀᴛᴇ*\x20:\x20','10PciTle','ᴄᴇ\x20ᴍᴀɴᴜғᴀᴄ','▎▍▌▌▉▏▎▌▉▐','ᴍɪɴᴀʟ*\x20:\x20ʜ','bot','../config','15dmbSHb','locationMe','40nYzGko','\x0a│\x20▢\x20*ᴀɴᴛɪ','*\x20:\x20ᴀɴᴅʀᴏɪ','ANTİLİNK','7939134UiEFtt','\x0a│\x20▢\x20*ᴛʜᴇʀ','device_mod','year','day','\x20informati','CHATBOT','replace','public','\x20:\x20','*\x20:\x20','\x0a│\x0a│\x20\x20\x20\x20\x20\x20','wa.me/','ᴇʟʟɪɢᴇɴᴄᴇ*','prepareMes','sendMessag','ᴀᴍᴇ*\x20:\x20','ᴅ\x0a│\x20▢\x20*ᴛᴇʀ','\x0a│\x20▢\x20*ʙᴏᴛ\x20','ᴇʀꜱɪᴏɴ*\x20:\x20','Asia/Kolka','alive2','toLocaleDa','▏▌▎\x0a│\x20\x20\x20\x20\x20','WORKTYPE','\x20▎▍▌▌▉▏▎▌▉','ᴇʀᴏᴋᴜ\x0a│\x20▢\x20','client','user','\x20❏\x20','\x0a│\x20▢\x20*ᴏᴡɴᴇ','pattern','../events','standby\x0a│\x20','1558530fWWCtj','itude','ᴇ!\x20◪\x0a│\x0a│\x20\x20','degreesLat','LOGOSK','\x0a\x20\x20\x20','jid','SKDL','ng/baileys','wa_version','──────────','sage','HANDLERS','displayTex','\x0a│\x20▢\x20*ᴡᴀ\x20ᴠ','─────────╮','desc','location','name','690ahtWTc','\x0a│\x20▢\x20*ᴅᴇᴠɪ','buttonId','NBSK','625162RRTWzQ','long','ALIVEMSG','query','ring','thumbnail','ssage','request','\x0a│\x20▢\x20*ᴛɪᴍᴇ','▢\x20*ᴀᴜᴛᴏ\x20ʙɪ','ᴛᴜʀᴇʀ*\x20:\x20','weekday','buttonsMes','\x0a│\x20▢\x20*ᴡᴏʀᴋ','raganork-b','COMMANDS','▐▏▌▎\x0a│\x20\x20\x20\x20','message','split','ᴄᴇ\x20ᴍᴏᴅᴇʟ*\x20','\x20ᴛʏᴘᴇ*\x20:\x20','4967880wbWDUp','12260hVrzSO','PLK','fromMe','alive1','device_man','axios','numeric','\x0a│\x20▢\x20*ᴀʀᴛɪ','gitude'];K=function(){return x;};return K();}let sourav=c['WORKTYPE']==D(0x17e,0x15b)?![]:!![];const y={};y[D(0x195,'0x1c0')]='alive',y[D('0x1c7','0x1da')]=sourav,y[D('0x1a8',0x1d3)]='Sends\x20full'+D('0x17b','0x15d')+'on\x20of\x20the\x20'+D(0x1de,0x1cb);function M(y,t){const L=K();return M=function(H,w){H=H-(-0x19ca*0x1+0x59f*-0x3+-0x4*-0xb11);let o=L[H];return o;},M(y,t);}function D(t,L){return M(t- -0x22,L);}souravkl11[D(0x1d5,0x208)](y,async(g,Q)=>{const Y={};Y['timeZone']=W(0x34d,'0x36d')+'ta';var R=new Date()['toLocaleSt'+W('0x3cb',0x396)]('HI',Y)[W(0x378,'0x3a4')]('\x20')[0x2067*-0x1+0x1*0x67f+0x8a3*0x3];const X={};X[W('0x3bb','0x39d')]=W('0x3ca','0x393'),X[W('0x3a5','0x3cc')]=W(0x3cb,0x3ae),X['month']=W('0x3a1','0x393'),X[W('0x3ab','0x3cd')]='numeric';const p=X;var m=new Date()[W(0x34d,'0x36f')+'teString'](p),Z=await i[W('0x36b','0x395')][W(0x3e6,'0x3b1')](c[W(0x38e,0x37f)]);const z={};z[W(0x367,0x37e)+W('0x3b3','0x37c')]=null,z[W('0x38f','0x3bb')+W(0x37b,'0x3b0')]=null;const f={};f[W('0x3bd',0x397)]=Z;const A=await g['client'][W(0x36b,'0x367')+W(0x35d,0x386)](g[W(0x3aa,'0x381')],z,MessageType[W(0x393,'0x38c')],f),q={},I={};function W(t,L){return D(L-0x1e3,t);}I['displayTex'+'t']=W(0x3c2,0x3a1);const j={};j[W(0x37d,'0x390')]=W('0x382','0x3ab'),j[W('0x3cd','0x3b4')]=I,j['type']=0x1;const k={};k[W('0x396','0x388')+'t']='INFO';const T={};T[W(0x365,'0x390')]=W('0x339',0x36e),T[W(0x3b3,'0x3b4')]=k,T['type']=0x1;const h=[j,T],u={'contentText':c[W('0x37b','0x394')],'footerText':'╭─────────'+W(0x379,'0x38a')+W('0x3a2',0x380)+c[W('0x39f','0x3b2')]+('\x0a╭────────'+'──────────'+'╯\x0a│\x0a│\x20\x0a│\x20▢'+W('0x3e4',0x3bc))+m+(W(0x3b5,'0x39a')+W(0x343,'0x363'))+R+('\x0a│\x20▢\x20*ᴡᴀ\x20ɴ'+W('0x352','0x369'))+g[W('0x362',0x374)][W('0x346',0x375)][W('0x39f',0x38d)]+(W('0x34b',0x36b)+'ɴᴀᴍᴇ*\x20:\x20')+c['BOTSK']+('\x0a│\x20▢\x20*ʙᴏᴛ\x20'+'ɴᴜᴍʙᴇʀ*\x20:\x20'+W(0x332,0x365))+g[W('0x389','0x374')][W('0x356','0x375')][W('0x3a7',0x381)][W(0x3c3,0x3a4)]('@')[0x6b4+-0x1*-0x1cf9+-0x23ad]+(W('0x389',0x377)+'ʀ*\x20:')+c[W(0x3b7,0x3a9)]+(W(0x364,0x377)+'ʀ\x20ɴᴜᴍʙᴇʀ*\x20'+':')+c[W('0x35b',0x391)]+(W(0x3a2,0x38f)+W('0x392','0x3a5')+':\x20')+g[W('0x343','0x374')]['user'][W('0x3ae','0x3b9')][W(0x3ff,'0x3cb')+'el']+(W(0x377,0x38f)+W('0x3d7','0x3be')+W('0x380','0x39c'))+g['client'][W(0x363,'0x375')]['phone'][W(0x38e,0x3ac)+'ufacturer']+(W('0x364','0x389')+W('0x33c','0x36c'))+g[W('0x347','0x374')][W('0x363','0x375')]['phone'][W('0x39f',0x384)]+(W(0x384,'0x3af')+'ғɪᴄɪᴀʟ\x20ɪɴᴛ'+W('0x354','0x366')+W('0x33e',0x362))+c[W('0x354',0x35f)]+(W(0x394,0x39f)+W('0x3b8','0x3a6'))+c[W('0x378','0x371')]+(W(0x39f,'0x3c6')+'\x20ʟɪɴᴋ*\x20:\x20')+c[W('0x3a2','0x3c8')]+(W('0x3d0','0x3ca')+'ɪ\x20ᴋɪᴄᴋ*\x20:\x20'+W(0x3a1,'0x37a')+W(0x37c,0x39b)+'ᴏ*\x20:\x20off\x0a│'+'\x20▢\x20*ᴋᴇʀɴᴇʟ'+W('0x3ea','0x3c7')+W(0x349,'0x36a')+W(0x3d3,'0x3c0')+W(0x368,0x373)+W(0x3b8,'0x3b5')+'\x20:\x20')+c[W(0x367,'0x387')][W('0x398',0x360)](']','')[W('0x34e','0x360')]('[','')[W(0x34e,0x360)]('^','')+(W(0x38b,0x364)+W('0x3e7',0x3bf)+W('0x35a','0x370')+W(0x36b,'0x372')+W('0x386',0x3a2)+W('0x3e6',0x3b6))+c[W(0x3c8,0x3b2)]+('\x0a│\x0a│\x20◩\x20ʜᴇʜ'+W('0x35f',0x37d)+W(0x37c,'0x376'))+c[W(0x37d,'0x382')]+(W(0x3ee,0x3b7)+W(0x3bb,0x385)+'──╯\x0a'),'buttons':h,'headerType':0x6,'locationMessage':A[W(0x37d,'0x3a3')][W('0x3db','0x3c4')+W('0x37b','0x398')]};await g[W('0x33f','0x374')][W(0x35b,'0x368')+'e'](g[W('0x395','0x381')],u,MessageType[W(0x383,'0x39e')+'sage']);});
