const {MessageType, GroupSettingChange, ChatModification, WAConnectionTest} = require('@adiwajshing/baileys');
const Asena = require('../events');
const Config = require('../config');

var CLR_DESC = ''
var CLR_PROC = ''
var CLR_DONE = '' 
if (Config.LANG == 'TR') CLR_DESC = 'Sohbetteki tüm mesajları siler.', CLR_PROC = '```bu sohbetteki tüm mesajlar siliniyor...```', CLR_DONE = '*✅️ Bu sohbetteki mesajlar Başarıyla Temizlendi!*'
if (Config.LANG == 'AZ') CLR_DESC = 'Söhbətdəki bütün mesajları silir.', CLR_PROC = '```Bu söhbətdəki bütün mesajlar silinir...```', CLR_DONE = '*✅️ Mesajlar bu söhbətdən uğurla silindi!*'
if (Config.LANG == 'EN') CLR_DESC = 'Clears all the messages from the chat.', CLR_PROC = '```Clearing all the messages from this chat...```', CLR_DONE = '*✅️ Successfully Cleared all the messages from this chat!*'
if (Config.LANG == 'PT') CLR_DESC = 'Limpa todas as mensagens do chat.', CLR_PROC = '```Limpando todas as mensagens deste bate-papo...```', CLR_DONE = '*✅️ Todas as mensagens deste bate-papo foram apagadas com sucesso!*'
if (Config.LANG == 'RU') CLR_DESC = 'Удаляет все сообщения из чата.', CLR_PROC = '```Удаление всех сообщений из этого чата...```', CLR_DONE = '*✅️ Успешно очищены все сообщения из этого чата!*'
if (Config.LANG == 'HI') CLR_DESC = 'चैट से सभी संदेशों को साफ़ करता है।', CLR_PROC = '```इस चैट से सभी संदेशों को साफ़ करना...```', CLR_DONE = '*✅️ इस चैट से सभी संदेशों को सफलतापूर्वक हटा दिया गया!*'
if (Config.LANG == 'ES') CLR_DESC = 'Forigas ĉiujn mesaĝojn de la babilejo.', CLR_PROC = '```Forigante ĉiujn mesaĝojn de ĉi tiu babilejo...```', CLR_DONE = '*✅️ Sukcese Forigis ĉiujn mesaĝojn de ĉi tiu babilejo!*'
if (Config.LANG == 'ML') CLR_DESC = 'ചാറ്റിൽ നിന്നുള്ള എല്ലാ സന്ദേശങ്ങളും മായ്‌ക്കുന്നു.', CLR_PROC = '```ഈ ചാറ്റിൽ നിന്നുള്ള എല്ലാ സന്ദേശങ്ങളും മായ്‌ക്കുന്നു...```', CLR_DONE = '*✅️ ഈ ചാറ്റിൽ നിന്നുള്ള എല്ലാ സന്ദേശങ്ങളും വിജയകരമായി മായ്ച്ചു!*'
if (Config.LANG == 'ID') CLR_DESC = 'Menghapus semua pesan dari obrolan.', CLR_PROC = '```Menghapus semua pesan dari obrolan ini...```', CLR_DONE = '*✅️ Berhasil Menghapus semua pesan dari obrolan ini!*'

Asena.addCommand({pattern: 'clear', fromMe: true, desc: CLR_DESC}, (async (message, match) => {

    await message.sendMessage(CLR_PROC);

    await message.client.modifyChat(message.jid, ChatModification.delete);

    await message.sendMessage(CLR_DONE);

}));
