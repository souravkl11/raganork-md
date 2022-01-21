let e = require('../events');
let c = require('../config');
let v = c.SESSION
let i = require('raganork-bot');
let {MessageType} = require('@adiwajshing/baileys');
let Language = require('../language');
let fm = Config.WORKTYPE == 'public' ? false : true
e.addCommand({pattern: 'fancy ?(.*)', fromMe: fm, desc: 'Transforms normal text to cool fancy text. Reply to a text message'}, (async (m, q) => {
if (!m.reply_message) return await m.sendMessage(`_Reply to a text message_ \n Example: .fancy 10 \n Number codes: \n 1. tēxt hērē
3. ｲ乇ﾒｲ ん乇尺乇
4. ㄒ乇乂ㄒ 卄乇尺乇
5. 🅃🄴🅇🅃 🄷🄴🅁🄴
6. ᏖᏋጀᏖ ᏂᏋᏒᏋ
7. TE᙭T ᕼEᖇE
8. ȶɛӼȶ ɦɛʀɛ
9. 𝚃𝚎𝚡𝚝 𝙷𝚎𝚛𝚎        
10. 𝙏𝙚𝙭𝙩 𝙃𝙚𝙧𝙚        
11. 𝐓𝐞𝐱𝐭 𝐇𝐞𝐫𝐞        
12. 𝗧𝗲𝘅𝘁 𝗛𝗲𝗿𝗲        
13. 𝘛𝘦𝘹𝘵 𝘏𝘦𝘳𝘦        
14. Tҽxƚ Hҽɾҽ
15. ₮ɆӾ₮ ⱧɆⱤɆ
16. †êx† Hêrê
17. тєχт нєяє
18. Ͳҽ×է Ƕҽɾҽ
19. ƬΣXƬ ΉΣЯΣ
20. ₜₑₓₜ ₕₑᵣₑ
21. ᵀᵉˣᵗ ᴴᵉʳᵉ
22. ՇєאՇ ђєгє
23. 𝕋𝕖𝕩𝕥 ℍ𝕖𝕣𝕖       
24. 𝕿𝖊𝖝𝖙 𝕳𝖊𝖗𝖊        
25. 🆃🅴🆇🆃 🅷🅴🆁🅴
26. 𝓣𝓮𝔁𝓽 𝓗𝓮𝓻𝓮        
27. 𝔗𝔢𝔵𝔱 ℌ𝔢𝔯𝔢       
28. Ｔｅｘｔ Ｈｅｒｅ`)
    var r = i.query.Fancy(m.reply_message.text,v)
    await m.client.sendMessage(m.jid,r.res+q[1],MessageType.text,{quoted: m.data})}));