 
const {addCommand} = require('../events');
const {MessageType, Mimetype} = require('@adiwajshing/baileys');
const fs = require('fs');
const axios = require('axios');
const {take_key,WORKTYPE,BOTSK} = require('../config');
var fm = WORKTYPE=='public'?false:true
const {sticker, skbuffer, filecheck} = require('raganork-bot');
addCommand({pattern: 'emoji ?(.*)', fromMe: fm, desc: 'Converts emoji to sticker',usage: '.emoji 😂1'}, (async (message, match) => {
function raganork(){var EmOji=['https://raganork-api.herokuapp.com/api/emoji-to-png?apikey=souravkl11&emoji=','2VfjNuY','49PztFhP','4544811YCfcHf','images','8TARkgM','174420dnYTBh','replace','471276ozAQPT','182759daspYn','8781740Hcmhcr','error','match','1083432QExAah','1889085fuuPNo'];raganork=function(){return EmOji;};return raganork();}function emoji(emoji,souravkl11){var Souravkl11=raganork();return emoji=function(Emoji,Raganork){Emoji=Emoji-0x118;var sOuravkl11=Souravkl11[Emoji];return sOuravkl11;},emoji(emoji,souravkl11);}(function(sOuravkl11 ,SOuravkl11 ){var soUravkl11 =emoji ,EMoji =sOuravkl11 ();while(!![]){try{var RAganork=-parseInt(soUravkl11 (0x121))/0x1*(parseInt(soUravkl11 (0x119))/0x2)+parseInt(soUravkl11 (0x126))/0x3+-parseInt(soUravkl11 (0x125))/0x4+-parseInt(soUravkl11 (0x11e))/0x5+parseInt(soUravkl11 (0x120))/0x6*(parseInt(soUravkl11 (0x11a))/0x7)+-parseInt(soUravkl11 (0x11d))/0x8*(-parseInt(soUravkl11 (0x11b))/0x9)+-parseInt(soUravkl11 (0x122))/0xa;if(RAganork===SOuravkl11 )break;else EMoji ['push'](EMoji ['shift']());}catch(emOji ){EMoji ['push'](EMoji ['shift']());}}}(raganork,0x4d97d));async function getEmojiBuffer(souravkl11 ){var raGanork=emoji ;await filecheck();var Souravkl11 =souravkl11 [raGanork(0x124)](/\d+/)===null?0x0:souravkl11 [raGanork(0x124)](/\d+/)[0x0],Emoji =souravkl11 [raGanork(0x11f)](/[0-9]/g,'')['replace'](/\s/g,'');;var Raganork=raGanork(0x118)+encodeURIComponent(Emoji ),{data:eMoji }=await axios(Raganork),rAganork=eMoji [raGanork(0x123)][raGanork(0x11c)][Souravkl11 ]['url'];return await fs['writeFileSync']('emo.png',await skbuffer(rAganork)),'emo.png';}
if (!match[1]) return;
await message.client.sendMessage(message.jid,await skbuffer(await sticker(await getEmojiBuffer(match[1]),match[1].replace(/[0-9]/g, ''),'Raganork Emoji API','41323bf9ddc5de66f7f258534008a88f')), MessageType.sticker, {mimetype: Mimetype.webp, quoted:message.data}) 
}));
