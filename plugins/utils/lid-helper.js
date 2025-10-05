function isLid(identifier) {
    return identifier && identifier.endsWith('@lid');
}

function isJid(identifier) {
    return identifier && (identifier.endsWith('@s.whatsapp.net') || identifier.endsWith('@g.us'));
}

function getBotJid(client) {
    if (client.user && client.user.id) {
        return client.user.id.split(":")[0] + "@s.whatsapp.net";
    }
    return null;
}

function getBotLid(client) {
    if (client.user && client.user.lid) {
        return client.user.lid.split(":")[0] + "@lid";
    }
    return null;
}

function getBotId(client, contextJid = null, sender = "@s.whatsapp.net") {

    return getBotLid(client) || getBotJid(client);
}

function getBotNumericId(message, client) {
    let isPvt = isPrivateMessage(message.jid);
    let isLidChat = isPvt ? false : isLid(message.key?.participant);
    if (isLidChat && client.user && client.user.lid) return client.user.lid.split(":")[0];
    if (client.user && client.user.id) return client.user.id.split(":")[0];
    return null;
}

function getNumericId(identifier) {
    if (!identifier) return null;

    if (isLid(identifier) || isJid(identifier)) {
        return identifier.split('@')[0];
    }

    return identifier;
}

function isSudo(identifier, sudoConfig) {
    if (!identifier || !sudoConfig) return false;

    const userNumeric = getNumericId(identifier);
    const sudoNumbers = sudoConfig.split(",").map(s => s.trim());

    return sudoNumbers.includes(userNumeric);
}

function isFromOwner(msg, client, sudoConfig) {
    if (msg.key.fromMe) return true;

    const botNumeric = getBotNumericId(msg, client);
    const senderNumeric = getNumericId(msg.key.participant || msg.key.remoteJid);

    if (botNumeric === senderNumeric) return true;

    return isSudo(msg.key.participant || msg.key.remoteJid, sudoConfig);
}

function getSudoJid(sudoConfig, client = null) {
    if (!sudoConfig) {
        return client ? getBotJid(client) : null;
    }

    const firstSudo = sudoConfig.split(",")[0].trim();
    if (!firstSudo) {
        return client ? getBotJid(client) : null;
    }
    return toJid(firstSudo);
}

function parseSudoList(sudoConfig) {
    if (!sudoConfig) return [];
    return sudoConfig
        .split(',')
        .map(s => (s || '').trim())
        .filter(s => s)
        .map(s => getNumericId(s));
}



function getSudoIdentifier(sudoConfig, asLid = true) {

    if (!sudoConfig) return null;
    const firstSudo = sudoConfig.split(",")[0].trim();
    if (!firstSudo) return null;
    return asLid ? firstSudo + "@lid" : firstSudo + "@s.whatsapp.net";
}

function getParticipantId(msg, client) {
    const { key } = msg;
    const { remoteJid, fromMe } = key;

    if (!isPrivateMessage(remoteJid)) {
        return key.participant;
    }

    if (fromMe) {
        return getBotLid(client) || getBotJid(client);
    } else {

        return toLid(remoteJid);
    }
}



function toLid(identifier) {
    if (!identifier) return null;
    if (isLid(identifier)) return identifier;
    if (identifier.endsWith('@g.us')) return identifier; 
    if (isJid(identifier)) return identifier.split('@')[0] + '@lid';
    if (/^\d+$/.test(identifier)) return identifier + '@lid';
    return identifier;
}

function toJid(identifier) {
    if (!identifier) return null;
    if (isJid(identifier)) return identifier;
    if (identifier.endsWith('@g.us')) return identifier;
    if (isLid(identifier)) return identifier.split('@')[0] + '@s.whatsapp.net';
    if (/^\d+$/.test(identifier)) return identifier + '@s.whatsapp.net';
    return identifier;
}

function isLidParticipant(participant) {
    return participant && participant.endsWith('@lid');
}

function isPrivateMessage(remoteJid) {
    if (!remoteJid) return false;

    if (remoteJid.endsWith('@g.us')) return false;

    if (remoteJid === 'status@broadcast') return false;

    return remoteJid.endsWith('.net') || remoteJid.endsWith('@lid');
}

module.exports = {
    isLid,
    isJid,
    getBotId,
    getBotJid,
    getBotLid,
    getBotNumericId,
    getNumericId,
    isLidParticipant,
    isSudo,
    isFromOwner,
    getSudoJid,
    isPrivateMessage,
    getParticipantId,
    toLid,
    toJid,
    getSudoIdentifier,
    parseSudoList
};