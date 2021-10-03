const Asena = require('../events');
const { MessageType, MessageOptions, Mimetype } = require('@adiwajshing/baileys');
const fs = require('fs');
const axios = require('axios');

Asena.addCommand({pattern: 'song', fromMe: false,dontAddCommandList: true}, (async (message, match) => {

    var r_text = new Array ();    
r_text[0] = "\nNinakk enthina ee song?\n";
r_text[1] = "Enjoy with everyday Saturday with holiday-   Raganork";
r_text[2] = "I lub U";
r_text[3] = "Ente muthinu njan oru song ittutharatte 😊";
r_text[4] = "Hello... Sugano?";
r_text[5] = "Ninakk swanthamayi bot veno? Watch this video- https://youtu.be/iRLphwWvxrs";
r_text[6] = "Njan oru killadi thanne";
r_text[7] = "താനാരാണെന്ന് തനിക്ക് അറിയാന്‍ മേലങ്കില്‍താന്‍ എന്നോട്‌ ചോദിക്ക്.. താനാരണെന്ന്...തനിക്ക് ഞാന്‍ പറഞ്ഞു തരാംതാനാരാണെന്ന്...എന്നിട്ട്‌ഞാനാരാണെന്ന് എനിക്കാറിയാമൊന്നുതാനെന്നോട്‌ ചോദിക്ക്..അപ്പോ തനിക്ക് ഞാന്‍ പറഞ്ഞു തരാംതാനാരാണെന്നും ..ഞാനാരാണെന്നും - കുതിരവട്ടം പപ്പു, മണിച്ചിത്രതാഴ് ";
r_text[8] = "\n Enikk kurach samadhanam theruo 😅 \n";
r_text[9] = "Poyi valla panikk poyi jeevikkan nokkada naari 😂";
r_text[10] = "Open youtube app> Go to search bar and type your song name and search. Avide song varum... OK? 😂";
r_text[11] = "My owner is my favourite person in the world 💖";
r_text[12] = "രണ്ട് ബക്കറ്റ് നിറയെ വെള്ളമുണ്ട്. അതിൽ ഒരു ബക്കറ്റിനു ദ്വാരമുള്ളതാണ്. എന്നാൽ ദ്വാരമുള്ള ബക്കറ്റിൽ നിന്നും വെള്ളം പോകുന്നില്ല. കാരണം എന്താണ്? para ninak vivaram indo nokkatte";
r_text[13] = "ഒരു  മുത്തശ്ശിക്കു മൈദ പൊടികാനായി ഒരു പുഴ കടക്കണം  അവിടെ ഒരു തോണി പോലും ഇല്ല? ആ മുത്തശ്ശി എങ്ങിനെ പോകും?";
r_text[14] = "ഹിന്ദിക്കാർ പോക്കറ്റിലും മലയാളികൾ അടുപ്പിലും വെക്കുന്ന സാധനം എന്ത്..?  ennallum ath enthaayikkum...🤔🤔";
r_text[15] = "ആദ്യം നീ പാട്ട് പാട് എന്നിട്ട് ഞാന്‍ പാടാം";
r_text[16] = "നീ എന്തൊരു വെറുപ്പിക്കലാണ് 🤣";
r_text[17] = "\nനിന്‍റെ പേരു പറ എന്നാല്‍ സോങ് തരാം...";
r_text[18] = "enikk njan und njan uyir 😎";
r_text[19] = "\nഈ ഫാന്‍സിന്‍റെ ഒരു കാര്യം .. 😅\n ";
r_text[20] = "The coefficient's of linear expansions is the position of Haemoglobin in the atmosphere. But Why? Full Many gem of purests serene lay underneath the unfathomed ocean's unblossomeds ! But why? But why";
r_text[21] = "Kozhikode pazhaya kozhikodellennariyam… pakshe njan pazhaya njan thanneya...😎\n\n";
r_text[22] = "Kaanaan oru look illanney ullu… bhayankara budhiya\n\n ninnak allatto enik";
r_text[23] = "Ithalla ithinapparam chaadi kadannavananee K.K. RAGANORK";
r_text[24] = "\nHi, njan Raganork. Ningalkk ente name mattam, number mattam, photo mattam, ellam mattam. ithokke matti kazhinj ente name ningal marakkalle 😅 *RAGANORK*\n";
r_text[25] = "\nPempillerey roattikoodey nadakkaan nee sammathikkilla, alley?... Da, neeyaanee alavaladi Shaji alley\n";
r_text[26] = "\nAthu enne uddheshichanu… enne thanney uddheshichanu… enne maatram uddheshichanu\n";
r_text[27] = "\nBeedi undo saghave, oru theepetti edukkan\n";
r_text[28] = "\nIppo sheriyakithara… ippo sheriyakithara…\n";
r_text[29] = "\nBeedi undo saghave, oru theepetti edukkan?\n";
r_text[30] = "Killadism never ends.\n       -Raganork";    
var i = Math.floor(31*Math.random())

await message.sendMessage(r_text[i]);

}));
