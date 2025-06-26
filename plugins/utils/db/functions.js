const {
    warnDB,
    FakeDB,
    antilinkDB,
    antiSpamDB,
    PDMDB,
    antiDemote,
    antiPromote,
    antiBotDB,
    antiWordDB,
    WelcomeDB,
    GoodbyeDB,
    FilterDB
} = require('./models');


async function getWarn(jid = null, user = null, cnt) {
    const count = parseInt(cnt);
    const Wher = { chat: jid, user: user };
    const Msg = await warnDB.findAll({ where: Wher });

    if (Msg.length < 1) return false;
    
    const ini = Msg.length;
    const remain = count - ini;
    return remain < 1 ? 0 : remain;
}

async function setWarn(jid = null, user = null, cnt) {
    await warnDB.create({ chat: jid, user: user });
    return await getWarn(jid, user, cnt);
}

async function resetWarn(jid = null, user) {
    const Msg = await warnDB.findAll({ where: { chat: jid, user: user } });
    
    if (Msg.length < 1) return false;
    
    for (const msg of Msg) {
        await msg.destroy();
    }
    return true;
}


async function getAntifake() {
    return await FakeDB.findAll();
}

async function setAntifake(jid) {
    return await FakeDB.create({ jid });
}

async function delAntifake(jid = null) {
    return await FakeDB.destroy({ where: { jid } });
}

async function resetAntifake() {
    return await FakeDB.destroy({ where: {}, truncate: true });
}


async function getAntilink() {
    return await antilinkDB.findAll();
}

async function setAntilink(jid) {
    return await antilinkDB.create({ jid });
}

async function delAntilink(jid = null) {
    return await antilinkDB.destroy({ where: { jid } });
}

async function resetAntilink() {
    return await antilinkDB.destroy({ where: {}, truncate: true });
}


async function getAntiSpam() {
    return await antiSpamDB.findAll();
}

async function setAntiSpam(jid) {
    return await antiSpamDB.create({ jid });
}

async function delAntiSpam(jid = null) {
    return await antiSpamDB.destroy({ where: { jid } });
}

async function resetAntiSpam() {
    return await antiSpamDB.destroy({ where: {}, truncate: true });
}


async function getPdm() {
    return await PDMDB.findAll();
}

async function setPdm(jid) {
    return await PDMDB.create({ jid });
}

async function delPdm(jid = null) {
    return await PDMDB.destroy({ where: { jid } });
}

async function resetPdm() {
    return await PDMDB.destroy({ where: {}, truncate: true });
}


async function getAntiDemote() {
    return await antiDemote.findAll();
}

async function setAntiDemote(jid) {
    return await antiDemote.create({ jid });
}

async function delAntiDemote(jid = null) {
    return await antiDemote.destroy({ where: { jid } });
}

async function resetAntiDemote() {
    return await antiDemote.destroy({ where: {}, truncate: true });
}


async function getAntiPromote() {
    return await antiPromote.findAll();
}

async function setAntiPromote(jid) {
    return await antiPromote.create({ jid });
}

async function delAntiPromote(jid = null) {
    return await antiPromote.destroy({ where: { jid } });
}

async function resetAntiPromote() {
    return await antiPromote.destroy({ where: {}, truncate: true });
}


async function getAntiBot() {
    return await antiBotDB.findAll();
}

async function setAntiBot(jid) {
    return await antiBotDB.create({ jid });
}

async function delAntiBot(jid = null) {
    return await antiBotDB.destroy({ where: { jid } });
}

async function resetAntiBot() {
    return await antiBotDB.destroy({ where: {}, truncate: true });
}


async function getAntiWord() {
    return await antiWordDB.findAll();
}

async function setAntiWord(jid) {
    return await antiWordDB.create({ jid });
}

async function delAntiWord(jid = null) {
    return await antiWordDB.destroy({ where: { jid } });
}

async function resetAntiWord() {
    return await antiWordDB.destroy({ where: {}, truncate: true });
}


async function getWelcome(jid = null) {
    if (jid) {
        return await WelcomeDB.findOne({ where: { jid } });
    }
    return await WelcomeDB.findAll();
}

async function setWelcome(jid, message) {
    const existing = await WelcomeDB.findOne({ where: { jid } });
    if (existing) {
        await existing.update({ message, enabled: true });
        return existing;
    }
    return await WelcomeDB.create({ jid, message, enabled: true });
}

async function delWelcome(jid = null) {
    return await WelcomeDB.destroy({ where: { jid } });
}

async function toggleWelcome(jid, enabled) {
    const existing = await WelcomeDB.findOne({ where: { jid } });
    if (existing) {
        await existing.update({ enabled });
        return existing;
    }
    return false;
}


async function getGoodbye(jid = null) {
    if (jid) {
        return await GoodbyeDB.findOne({ where: { jid } });
    }
    return await GoodbyeDB.findAll();
}

async function setGoodbye(jid, message) {
    const existing = await GoodbyeDB.findOne({ where: { jid } });
    if (existing) {
        await existing.update({ message, enabled: true });
        return existing;
    }
    return await GoodbyeDB.create({ jid, message, enabled: true });
}

async function delGoodbye(jid = null) {
    return await GoodbyeDB.destroy({ where: { jid } });
}

async function toggleGoodbye(jid, enabled) {
    const existing = await GoodbyeDB.findOne({ where: { jid } });
    if (existing) {
        await existing.update({ enabled });
        return existing;
    }
    return false;
}


async function getFilter(jid = null, trigger = null) {
    const { Op } = require('sequelize');
    
    if (trigger && jid) {
        
        return await FilterDB.findOne({ 
            where: { 
                trigger: trigger,
                [Op.or]: [
                    { jid: jid, scope: 'chat' },
                    { jid: null, scope: 'global' },
                    { jid: null, scope: jid.includes('@g.us') ? 'group' : 'dm' }
                ],
                enabled: true 
            }
        });
    } else if (jid) {
        
        return await FilterDB.findAll({
            where: {
                [Op.or]: [
                    { jid: jid, scope: 'chat' },
                    { jid: null, scope: 'global' },
                    { jid: null, scope: jid.includes('@g.us') ? 'group' : 'dm' }
                ],
                enabled: true
            }
        });
    } else {
        
        return await FilterDB.findAll();
    }
}

async function setFilter(trigger, response, jid = null, scope = 'chat', createdBy, options = {}) {
    const filterData = {
        trigger,
        response,
        jid: scope === 'chat' ? jid : null,
        scope,
        enabled: true,
        caseSensitive: options.caseSensitive || false,
        exactMatch: options.exactMatch || false,
        createdBy
    };

    
    const existing = await FilterDB.findOne({
        where: {
            trigger,
            jid: filterData.jid,
            scope
        }
    });

    if (existing) {
        await existing.update(filterData);
        return existing;
    }

    return await FilterDB.create(filterData);
}

async function delFilter(trigger, jid = null, scope = 'chat') {
    return await FilterDB.destroy({
        where: {
            trigger,
            jid: scope === 'chat' ? jid : null,
            scope
        }
    });
}

async function toggleFilter(trigger, jid = null, scope = 'chat', enabled) {
    const filter = await FilterDB.findOne({
        where: {
            trigger,
            jid: scope === 'chat' ? jid : null,
            scope
        }
    });

    if (filter) {
        await filter.update({ enabled });
        return filter;
    }
    return false;
}

async function getFiltersByScope(scope, jid = null) {
    const whereCondition = { scope, enabled: true };
    if (scope === 'chat' && jid) {
        whereCondition.jid = jid;
    } else if (scope !== 'chat') {
        whereCondition.jid = null;
    }

    return await FilterDB.findAll({ where: whereCondition });
}

async function checkFilterMatch(text, jid) {
    if (!text) return null;

    const filters = await getFilter(jid);
    
    for (const filter of filters) {
        const trigger = filter.caseSensitive ? filter.trigger : filter.trigger.toLowerCase();
        const textToCheck = filter.caseSensitive ? text : text.toLowerCase();
        
        let isMatch = false;
        
        if (filter.exactMatch) {
            isMatch = textToCheck === trigger;
        } else {
            isMatch = textToCheck.includes(trigger);
        }
        
        if (isMatch) {
            return filter;
        }
    }
    
    return null;
}


const antilink = { set: setAntilink, get: getAntilink, delete: delAntilink, reset: resetAntilink };
const antiword = { set: setAntiWord, get: getAntiWord, delete: delAntiWord, reset: resetAntiWord };
const antifake = { set: setAntifake, get: getAntifake, delete: delAntifake, reset: resetAntifake };
const antipromote = { set: setAntiPromote, get: getAntiPromote, delete: delAntiPromote, reset: resetAntiPromote };
const antidemote = { set: setAntiDemote, get: getAntiDemote, delete: delAntiDemote, reset: resetAntiDemote };
const antispam = { set: setAntiSpam, get: getAntiSpam, delete: delAntiSpam, reset: resetAntiSpam };
const antibot = { set: setAntiBot, get: getAntiBot, delete: delAntiBot, reset: resetAntiBot };
const pdm = { set: setPdm, get: getPdm, delete: delPdm, reset: resetPdm };
const welcome = { set: setWelcome, get: getWelcome, delete: delWelcome, toggle: toggleWelcome };
const goodbye = { set: setGoodbye, get: getGoodbye, delete: delGoodbye, toggle: toggleGoodbye };
const filter = { 
    set: setFilter, 
    get: getFilter, 
    delete: delFilter, 
    toggle: toggleFilter, 
    getByScope: getFiltersByScope,
    checkMatch: checkFilterMatch 
};

module.exports = {
    getWarn, setWarn, resetWarn,
    antilink, antiword, antifake, 
    antipromote, antidemote, antispam,
    antibot, pdm, welcome, goodbye, filter
};