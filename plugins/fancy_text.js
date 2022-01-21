let e = require('../events');
let c = require('../config');
let v = c.SESSION
let i = require('raganork-bot');
let {MessageType} = require('@adiwajshing/baileys');
let Language = require('../language');
let fm = c.WORKTYPE == 'public' ? false : true
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
    var msg;
if (q[1] == '1') msg = r.res1
if (q[1] == '2') msg = r.res2
if (q[1] == '3') msg = r.res3
if (q[1] == '4') msg = r.res4
if (q[1] == '5') msg = r.res5
if (q[1] == '6') msg = r.res6
if (q[1] == '7') msg = r.res7
if (q[1] == '8') msg = r.res8
if (q[1] == '9') msg = r.res9
if (q[1] == '10') msg = r.res10
if (q[1] == '11') msg = r.res11
if (q[1] == '12') msg = r.res12
if (q[1] == '13') msg = r.res13
if (q[1] == '14') msg = r.res14
if (q[1] == '15') msg = r.res15
if (q[1] == '16') msg = r.res16
if (q[1] == '17') msg = r.res17
if (q[1] == '18') msg = r.res18
if (q[1] == '19') msg = r.res19
if (q[1] == '20') msg = r.res20
if (q[1] == '21') msg = r.res21
if (q[1] == '22') msg = r.res22
if (q[1] == '23') msg = r.res23
if (q[1] == '24') msg = r.res24
if (q[1] == '25') msg = r.res25
if (q[1] == '26') msg = r.res26
if (q[1] == '27') msg = r.res27
if (q[1] == '28') msg = r.res28
    await m.client.sendMessage(m.jid,msg,MessageType.text,{quoted: m.data})}));
