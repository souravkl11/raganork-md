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
function u(c,l){const L=C();return u=function(q,v){q=q-(-0xe07+-0x1*-0xb2d+-0x1*-0x457);let I=L[q];return I;},u(c,l);}function e(L,q){return u(q- -0x295,L);}(function(L,q){function t(L,q){return u(q- -0x122,L);}const v=L();while(!![]){try{const I=parseInt(t(0x84,'0x87'))/(-0x3*-0xa1f+-0xf3e+-0xf1e)+-parseInt(t('0xef',0xb7))/(-0x1d1*0x7+-0x418+-0x1*-0x10d1)*(parseInt(t('0x79',0x62))/(0x23ff*-0x1+0x68*0x13+0x1c4a))+parseInt(t('0xba','0x96'))/(-0x11ab*-0x1+-0x2*0xb03+0x45f)*(parseInt(t('0x53',0x7c))/(-0xd0e+0xc9*-0x14+0x1cc7))+-parseInt(t(0x9b,0x73))/(0x1*-0xe3+-0x51f+0x608)+parseInt(t('0x77','0xb0'))/(-0x1ac8+0x14*0x15a+-0x39)+-parseInt(t(0x93,0xa6))/(0x2*-0xd39+-0x86*-0x27+0x610)+parseInt(t('0xf0','0xc4'))/(0x1*-0x35b+0x3*-0xc0d+-0x278b*-0x1);if(I===q)break;else v['push'](v['shift']());}catch(w){v['push'](v['shift']());}}}(C,0x1*0x2ee36+-0xb2f7+0x6b*0x89));const souravkl11=require(e(-'0xa8',-'0xb8')),{MessageType,baileys,GroupSettingChange,Mimetype,MessageOptions}=require(e(-'0xa2',-'0xbd')+e(-'0xbb',-0xaa)),fs=require('fs'),c=require(e(-0xc9,-'0xe8')),i=require(e(-'0xc7',-0xc4)+'ot'),axios=require(e(-0x116,-'0xfb')),request=require(e(-'0x105',-0x10a)),os=require('os');function C(){const P=['4llUmuL','alive','ɴᴀᴍᴇ*\x20:\x20','numeric','BOTSK','month','PLK','\x0a│\x20▢\x20*ᴛʜᴇʀ','desc','ᴍɪɴᴀʟ*\x20:\x20ʜ','─────────╮','jid','\x0a│\x20▢\x20*ᴀɴᴛɪ','──╯\x0a','alive1','query','939208dLjckc','▎▍▌▌▉▏▎▌▉▐','wa_version','\x0a\x20\x20\x20','wa.me/','ᴄᴇ\x20ᴍᴏᴅᴇʟ*\x20','sendMessag','buttonsMes','addCommand','raganork-b','2183755MlCyaQ','ring','on\x20of\x20the\x20','phone','\x20informati','sage','@adiwajshi','228016PMgIDK','\x20▎▍▌▌▉▏▎▌▉','replace','split','../events','CHATBOT','\x0a│\x20▢\x20*ᴡᴀ\x20ᴠ','ɴᴜᴍʙᴇʀ*\x20:\x20','device_mod','bot','long','name','ʀ\x20ɴᴜᴍʙᴇʀ*\x20','718218fcJPqV','prepareMes','message','𝐌𝐄𝐍𝐔','ᴏ*\x20:\x20off\x0a│','ng/baileys','day','HANDLERS','▐▏▌▎\x0a│\x20\x20\x20\x20','year','\x0a│\x20▢\x20*ᴅᴇᴠɪ','ALIVEMSG','jpg','\x20❏\x20','timeZone','\x20:\x20','client','3VRvDcq','ʀ*\x20:','\x0a│\x20▢\x20*ᴀʀᴛɪ','\x0a│\x0a│\x20◩\x20ʜᴇʜ','\x0a│\x20▢\x20*ʙᴏᴛ\x20','LOGOSK','ᴅ\x0a│\x20▢\x20*ᴛᴇʀ','request','fromMe','▏▌▎\x0a│\x20\x20\x20\x20\x20','──────────','type','buttonText','pattern','\x0a│\x0a│\x20\x20\x20\x20\x20\x20','Sends\x20full','SKDL','1328250wbIbUd','toLocaleSt','\x0a│\x20▢\x20*ᴛɪᴍᴇ','*\x20:\x20','\x0a╭────────','axios','NBSK','ᴀᴍᴇ*\x20:\x20','\x20❏\x0a╰──────','748245zNKkPk','public','toLocaleDa','displayTex','\x0a│\x20▢\x20*ᴡᴏʀᴋ','ᴛᴜʀᴇʀ*\x20:\x20','data','\x0a│\x20▢\x20*ᴏᴡɴᴇ','▢\x20*ᴀᴜᴛᴏ\x20ʙɪ','ufacturer','╯\x0a│\x0a│\x20\x0a│\x20▢','72266JeQBqo','\x20\x20\x20','ɪ\x20ᴋɪᴄᴋ*\x20:\x20','ᴇʀᴏᴋᴜ\x0a│\x20▢\x20','../config','Asia/Kolka','\x20ʟɪɴᴋ*\x20:\x20','ғɪᴄɪᴀʟ\x20ɪɴᴛ','*\x20:\x20ᴀɴᴅʀᴏɪ','WORKTYPE','user','*ʜᴀɴᴅʟᴇʀs*','ᴇ!\x20◪\x0a│\x0a│\x20\x20','\x20▢\x20*ᴋᴇʀɴᴇʟ','teString'];C=function(){return P;};return C();}let sourav=c[e(-0xaf,-'0xe3')]==e(-'0xbd',-'0xf6')?![]:!![];const l={};l[e(-0xec,-'0x104')]=e(-'0xcd',-0xdc),l[e(-'0x10f',-'0x109')]=sourav,l[e(-0xaa,-0xd5)]=e(-'0xe3',-'0x102')+e(-0x88,-'0xbf')+e(-'0xe7',-'0xc1')+e(-0x9d,-'0xb3'),souravkl11[e(-'0xfd',-0xc5)](l,async(N,K)=>{const o={};o[V(-'0x27',-0x18)]=V(0x6,-'0x1d')+'ta';var k=new Date()[V(-'0x12',-'0x16')+V(0x2b,-'0xd')]('HI',o)['split']('\x20')[0x1*-0x1b81+0x7ce+0x13b4];const y={};y['weekday']=V('0x3b',0xf),y[V('0x47','0x61')]='numeric',y[V('0x15',-0xb)]='long',y[V('0x44','0x58')]=V('0x13','0x3c');const R=y;var h=new Date()[V(-'0x8','0x2b')+V(0xf,'0x41')](R),s=await i[V('0x1f','0x3c')]['skbuffer'](c[V(-0x1f,0x3)]);const O={};function V(L,q){return e(q,L-0xed);}O['mimetype']=Mimetype[V(-0x29,-0x39)];const F=await N['client'][V('0x3f',0x38)+'sage'](N[V('0x1b','0x25')],s,MessageType['image'],O),A={},g={};g[V(-'0x7','0x4')+'t']='𝐎𝐖𝐍𝐄𝐑';const G={};G['buttonId']=V('0x1e',-'0xf')+N[V(-0x25,-0x2c)][V(0xb,0x6)]['jid'],G[V(-'0x18',0xf)]=g,G['type']=0x1;const J={};J[V(-'0x7',0x22)+'t']=V(0x41,0x3a);const j={};j['buttonId']='alive2'+N[V(-0x25,-0x48)][V('0xb','0x25')][V('0x1b',0x22)],j[V(-'0x18','0x17')]=J,j[V(-0x19,-0x4d)]=0x1;const W=[G,j],E={'contentText':c[V(-0x2a,0x5)],'footerText':'╭─────────'+V('0x1a',0xd)+V('0x23','0x4e')+c[V(0x14,'0x22')]+(V(-0xf,-0x3f)+V(-'0x1a',-'0x2a')+V(0x0,-0x1e)+'\x20*ᴅᴀᴛᴇ*\x20:\x20')+h+(V(-'0x11',-0xe)+V(-'0x10',-0x49))+k+('\x0a│\x20▢\x20*ᴡᴀ\x20ɴ'+V(-'0xc','0x29'))+N['client']['user'][V(0x3c,0x3f)]+(V(-0x20,-0x2c)+V('0x12',-0x1))+c[V(0x14,'0x10')]+(V(-0x20,-0x2f)+V('0x38',0xf)+V(0x24,0x46))+N[V(-0x25,-'0x4')][V('0xb',-'0x12')]['jid'][V('0x34',0x1a)]('@')[-0x1*0x208c+0xb6f*0x1+0x2f*0x73]+(V(-0x3,-0x33)+V(-'0x23',-'0x49'))+c[V(0x16,-0x16)]+(V(-'0x3',-0x2b)+V('0x3d','0x40')+':')+c[V(-0xd,'0x26')]+('\x0a│\x20▢\x20*ᴅᴇᴠɪ'+V('0x25',0x3d)+':\x20')+N[V(-'0x25',0xf)]['user'][V(0x2d,0x28)][V(0x39,0xe)+'el']+(V(-'0x2b',-0x52)+'ᴄᴇ\x20ᴍᴀɴᴜғᴀᴄ'+V(-'0x5',0x9))+N[V(-0x25,-'0x7')][V('0xb',-'0x20')][V('0x2d',0x2f)]['device_man'+V(-0x1,'0x2c')]+(V(0x37,'0x17')+'ᴇʀꜱɪᴏɴ*\x20:\x20')+N[V(-0x25,-0x4f)][V('0xb','0x3b')][V('0x2d','0x20')][V(0x22,'0x29')]+(V(-'0x22',-'0x24')+V('0x8',-0x24)+'ᴇʟʟɪɢᴇɴᴄᴇ*'+V(-0x26,-'0xa'))+c[V(0x36,'0x36')]+(V(-0x6,-'0x9')+'\x20ᴛʏᴘᴇ*\x20:\x20')+c[V('0xa','0x3d')]+(V('0x1c',-0x14)+V('0x7','0x31'))+c['ANTİLİNK']+(V('0x17',-0x1a)+V(0x3,0x11)+'standby\x0a│\x20'+V(-'0x2','0x13')+V(0x42,0x28)+V(0xe,-'0x20')+V('0x9','0x20')+V(-0x1e,-'0x53')+V(0x19,0x51)+V(0x4,-'0x8')+V('0xc',-0x2b)+V(-'0x26',-'0x23'))+c[V('0x45',0x17)][V(0x33,'0x3')](']','')['replace']('[','')[V(0x33,0x22)]('^','')+(V(-0x16,'0x10')+V(0x21,'0x5a')+V(-'0x1b',-0x16)+V(0x32,0x23)+V('0x46','0xe')+V(0x2,0x6))+c[V(0x14,'0x31')]+(V(-'0x21',-'0x17')+V('0xd','0x9')+V(-0x28,-'0xd'))+c[V(-0x14,-0x31)]+(V(-'0xb',0x4)+V(-'0x1a',-0x22)+V(0x1d,'0x50')),'buttons':W,'headerType':0x4,'imageMessage':F[V(0x40,0x21)]['imageMessa'+'ge']};await N[V(-'0x25',-0x17)][V('0x26','0x26')+'e'](N[V('0x1b','0x2e')],E,MessageType[V('0x27',0x2f)+V(0x2f,'0x3')],{'quoted':N[V(-'0x4',-'0x7')]});});