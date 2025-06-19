const {
    Module
} = require('../main');
const {
    isJid
} = require('./utils/lid-helper');
Module({
    pattern: 'react ?(.*)',
    fromMe: true,
    use: 'whatsapp'
}, (async (m, t) => {
    let msg = {
        remoteJid: m.reply_message?.jid,
        id: m.reply_message.id
    }
    const reactionMessage = {
        react: {
            text: t[1],
            key: msg
        }
    }

    await m.client.sendMessage(m.jid, reactionMessage);
}));
Module({
    pattern: 'edit ?(.*)',
    fromMe: true,
    use: 'whatsapp'
}, (async (m, t) => {
    if (t[1] && m.reply_message?.text && m.quoted.key.fromMe){
    await m.edit(t[1],m.jid,m.quoted.key);
}
}));
Module({
    pattern: 'retry ?(.*)',
    fromMe: false,
    desc: 'Retries replied command to run the command again',
    use: 'misc'
}, (async (m, t) => {
    if (!m.reply_message) return await m.sendReply('_Reply to a command message_')
    await m.client.ev.emit('messages.upsert',{messages: [m.quoted],type: 'notify'})
}));
Module({
    pattern: 'vv ?(.*)',
    fromMe: true,
    desc: "Anti view once",
    use: 'utility'
}, async (m, match) => {
    const quoted = m.quoted?.message, realQuoted = m.quoted;

    if (!m.reply_message || !quoted) {
        return await m.sendReply("_Not a view once msg!_");
    }

    if (match[1] && isJid(match[1])) m.jid = match[1];

    const viewOnceKey = ['viewOnceMessage', 'viewOnceMessageV2', 'viewOnceMessageV2Extension']
        .find(key => quoted.hasOwnProperty(key));

    if (viewOnceKey) {
        const realMessage = quoted[viewOnceKey].message;
        const msgType = Object.keys(realMessage)[0];
        if (realMessage[msgType]?.viewOnce) realMessage[msgType].viewOnce = false;
        m.quoted.message = realMessage;
        return await m.forwardMessage(m.jid, m.quoted, { contextInfo: { isForwarded: false } });
    }

    const directType = quoted.imageMessage ? 'imageMessage' :
                        quoted.videoMessage ? 'videoMessage' : null;

    if (directType && quoted[directType]?.viewOnce) {
        quoted[directType].viewOnce = false;
        return await m.forwardMessage(m.jid, m.quoted, { contextInfo: { isForwarded: false } });
    }

    await m.sendReply("_Not a view once msg!_");
});

