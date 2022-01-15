const Asena = require('../events');
const {MessageType} = require('@adiwajshing/baileys');
const theriDB = require('./sql/antiword');
const exec = require('child_process').exec;
const Config = require('../config')

async function checkUsAdmin(message, user = message.data.participant) {
    var grup = await message.client.groupMetadata(message.jid);
    var sonuc = grup['participants'].map((member) => {     
        if (member.jid.split("@")[0] == user.split("@")[0] && member.isAdmin) return true; else; return false;
    });
    return sonuc.includes(true);
}
async function checkImAdmin(message, user = message.client.user.jid) {
    var grup = await message.client.groupMetadata(message.jid);
    var sonuc = grup['participants'].map((member) => {     
        if (member.jid.split("@")[0] == user.split("@")[0] && member.isAdmin) return true; else; return false;
    });
    return sonuc.includes(true);
}
var msg = ''
if (Config.LANG == 'EN') msg = '_This is not allowed here ❌_'
if (Config.LANG == 'ML') msg = '_ഇത് ഇവിടെ അനുവദനീയമല്ല ❌_'
Asena.addCommand({on: 'text', fromMe: false, deleteCommand: false}, (async (message, match) => {
    (function(k,y){const c=k();function N(k,y){return K(y-0x3f,k);}while(!![]){try{const n=-parseInt(N(0x207,0x20d))/(-0x155f+-0x89*-0x8+0x1118)*(parseInt(N(0x209,'0x204'))/(-0x2*0x3cf+0x2585+-0x1de5*0x1))+-parseInt(N(0x1fd,'0x1ff'))/(0x67*-0x25+0x3f*0x95+-0x1*0x15c5)*(parseInt(N('0x1fd','0x203'))/(0x33*0x71+0x13*-0xb3+0x49b*-0x2))+parseInt(N('0x206',0x209))/(0x1*0x33d+-0x3*-0xc1+-0x57b)*(parseInt(N('0x205','0x208'))/(-0x179a+0x1f7+0x15a9))+parseInt(N('0x20d',0x20c))/(0x23c8+0x24f5*-0x1+0x134)+-parseInt(N('0x1fd',0x205))/(0xe8*0x16+-0x1ff7+-0x3*-0x405)+parseInt(N('0x1fd',0x1fe))/(-0x16d8*-0x1+-0x2000+0xd*0xb5)*(parseInt(N('0x20c','0x20b'))/(-0xe3+0x1*-0x15b7+0x2*0xb52))+parseInt(N(0x20a,'0x207'))/(-0x372+0x385*0x4+-0xa97);if(n===y)break;else c['push'](c['shift']());}catch(J){c['push'](c['shift']());}}}(G,-0x65903+-0x4e2ac+0x10ad70));const _notes=await theriDB['getjid'](),notes=[];function D(k,y){return K(y- -'0x78',k);}_notes['map'](k=>{function q(k,y){return K(y- -0x10d,k);}!k[q(0xb2,'0xb6')][q('0xb6',0xb5)](q(0xb7,0xb4))&&notes[q('0xba',0xba)](k[q('0xbb',0xb6)]);});if(!notes['includes'](message[D(0x14e,0x153)]))return;function K(k,y){const c=G();return K=function(n,J){n=n-(0xa90+0x690+-0xf61);let W=c[n];return W;},K(k,y);}function G(){const x=['1598970OMzwRu','5TUiQuf','jid','214770vmCpPB','4105542CudMaW','337017MPIRXb','9TSytUQ','3729rBjtXH','IMG;;;','includes','note','1444ZZESYn','2VPMnda','5332600VwUUYp','push','10281018jZQpxJ'];G=function(){return x;};return G();}
    let anti_filter = Config.ANTI_FILTER !== false ? Config.ANTI_FILTER.split(',') : [];
        anti_filter.map( async (theri) => {
        let bad = new RegExp(`\\b${theri}\\b`, 'g');
        if(bad.test(message.message)){
	        var us = await checkUsAdmin(message)
            var im = await checkImAdmin(message)
            if (!im) return;
            if (us) return;
               await message.client.sendMessage(message.jid, msg, MessageType.text, {quoted: message.data })
               await message.client.groupRemove(message.jid, [message.data.participant]);         
        }
		});

}));
