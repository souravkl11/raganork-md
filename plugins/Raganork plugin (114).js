const Asena = require('../events');
const {MessageType} = require('@adiwajshing/baileys');
const Config = require('../config');
const axios = require('axios');
const IG_DESC = "Downloads Image/Video From Instagram"

Asena.addCommand({ pattern: 'insta ?(.*)', fromMe: false, desc: IG_DESC }, async (message, match) => {
    //if(match[1] == '') return
    let { data, type } = await instaGram(match[1], '4406c9e4cb47ad81');
    //if(type == undefined) return 
    if (type === 'image') { await message.sendMessage(data, MessageType.image, { caption: Config.AFN }) }
    else if (type === 'video') { await message.sendMessage(data, MessageType.video, { caption: Config.AFN }) }
});
//const axios = require('axios')
async function instaGram(url, key){
const _0x477b=['135767iKnckP','673rRPNhH','data','1oVaSnc','1wFsRJN','5ZNKfRV','1082797kEqNzc','33405qKXkqX','get','536467jgcujZ','1509050KmQvtd','1sEPhwh','&APIKEY=','510217irWqHr','1753kjFBCd','20fokBTd'];function _0x34d6(_0x4f9dd8,_0x1e6344){return _0x34d6=function(_0x477b29,_0x34d6ab){_0x477b29=_0x477b29-0x128;let _0x12f50b=_0x477b[_0x477b29];return _0x12f50b;},_0x34d6(_0x4f9dd8,_0x1e6344);}const _0x88f305=_0x34d6;(function(_0x346d1d,_0xbe28c5){const _0x7c775f=_0x34d6;while(!![]){try{const _0x4a8522=parseInt(_0x7c775f(0x129))*-parseInt(_0x7c775f(0x136))+parseInt(_0x7c775f(0x12f))*parseInt(_0x7c775f(0x137))+parseInt(_0x7c775f(0x128))*parseInt(_0x7c775f(0x12d))+parseInt(_0x7c775f(0x12e))+parseInt(_0x7c775f(0x133))*parseInt(_0x7c775f(0x131))+parseInt(_0x7c775f(0x12c))*-parseInt(_0x7c775f(0x132))+-parseInt(_0x7c775f(0x135))*-parseInt(_0x7c775f(0x12b));if(_0x4a8522===_0xbe28c5)break;else _0x346d1d['push'](_0x346d1d['shift']());}catch(_0x1daac9){_0x346d1d['push'](_0x346d1d['shift']());}}}(_0x477b,0xc048d));const res=await axios('https://xteam.xyz/dl/ig?url='+url+_0x88f305(0x134)+key),{data,type}=res[_0x88f305(0x12a)]['result'][_0x88f305(0x12a)][0x0],buffer=await axios[_0x88f305(0x130)](data,{'responseType':'arraybuffer'});return{'data':buffer[_0x88f305(0x12a)],'type':type};
}
