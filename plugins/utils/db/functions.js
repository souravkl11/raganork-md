const {
  warnDB,
  FakeDB,
  AntilinkConfigDB,
  antiSpamDB,
  PDMDB,
  antiDemote,
  antiPromote,
  antiBotDB,
  antiWordDB,
  WelcomeDB,
  GoodbyeDB,
  FilterDB,
} = require("./models");

async function getWarn(jid = null, user = null, cnt) {
  if (!jid || !user) return null;

  const warnings = await warnDB.findAll({
    where: { chat: jid, user: user },
    order: [["timestamp", "DESC"]],
  });

  if (!cnt) {
    return warnings;
  }

  const count = parseInt(cnt);
  const currentWarns = warnings.length;
  const remaining = count - currentWarns;

  return {
    current: currentWarns,
    limit: count,
    remaining: remaining > 0 ? remaining : 0,
    exceeded: remaining <= 0,
    warnings: warnings,
  };
}

async function setWarn(
  jid = null,
  user = null,
  reason = "No reason provided",
  warnedBy = null
) {
  if (!jid || !user || !warnedBy) return false;

  const warnData = {
    chat: jid,
    user: user,
    reason: reason,
    warnedBy: warnedBy,
    timestamp: new Date(),
  };

  await warnDB.create(warnData);

  return await getWarn(jid, user);
}

async function resetWarn(jid = null, user) {
  if (!jid || !user) return false;

  const deleted = await warnDB.destroy({
    where: { chat: jid, user: user },
  });

  return deleted > 0;
}

async function getWarnCount(jid = null, user = null) {
  if (!jid || !user) return 0;

  return await warnDB.count({
    where: { chat: jid, user: user },
  });
}

async function decrementWarn(jid = null, user = null) {
  if (!jid || !user) return false;

  const warnings = await warnDB.findAll({
    where: { chat: jid, user: user },
    order: [["timestamp", "DESC"]],
    limit: 1,
  });

  if (warnings.length === 0) return false;

  const deleted = await warnDB.destroy({
    where: { id: warnings[0].id },
  });

  return deleted > 0;
}

async function getAllWarns(jid = null) {
  if (!jid) return [];

  const { Op } = require("sequelize");
  const warnings = await warnDB.findAll({
    where: { chat: jid },
    order: [["timestamp", "DESC"]],
  });

  const groupedWarnings = {};
  warnings.forEach((warn) => {
    if (!groupedWarnings[warn.user]) {
      groupedWarnings[warn.user] = [];
    }
    groupedWarnings[warn.user].push(warn);
  });

  return groupedWarnings;
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

// New advanced antilink functions
async function getAntilinkConfig(jid = null) {
  if (!jid) {
    return await AntilinkConfigDB.findAll();
  }
  return await AntilinkConfigDB.findOne({ where: { jid } });
}

async function setAntilinkConfig(jid, config = {}) {
  if (!jid) return false;

  const defaultConfig = {
    mode: "delete",
    allowedLinks: "gist,instagram,youtu",
    blockedLinks: null,
    isWhitelist: true,
    enabled: true,
    customMessage: null,
    updatedBy: null,
    updatedAt: new Date(),
  };

  const finalConfig = { ...defaultConfig, ...config, jid };

  const [antilinkConfig, created] = await AntilinkConfigDB.upsert(finalConfig);
  return antilinkConfig;
}

async function updateAntilinkConfig(jid, updates = {}) {
  if (!jid) return false;

  updates.updatedAt = new Date();

  const [updateCount] = await AntilinkConfigDB.update(updates, {
    where: { jid },
  });

  if (updateCount > 0) {
    return await getAntilinkConfig(jid);
  }

  return false;
}

async function deleteAntilinkConfig(jid = null) {
  if (!jid) return false;
  return await AntilinkConfigDB.destroy({ where: { jid } });
}

async function resetAntilinkConfig() {
  return await AntilinkConfigDB.destroy({ where: {}, truncate: true });
}

function parseAntilinkPattern(pattern) {
  if (!pattern || typeof pattern !== "string") return null;

  // Handle negation pattern !(domain1,domain2)
  const negationMatch = pattern.match(/^!\(([^)]+)\)$/);
  if (negationMatch) {
    return {
      isWhitelist: false,
      domains: negationMatch[1]
        .split(",")
        .map((d) => d.trim())
        .filter((d) => d),
    };
  }

  // Handle regular pattern (domain1,domain2)
  return {
    isWhitelist: true,
    domains: pattern
      .split(",")
      .map((d) => d.trim())
      .filter((d) => d),
  };
}

function checkLinkAllowed(url, config) {
  if (!config || !config.enabled) return true;

  // Normalize the URL for checking
  let normalizedUrl = url.toLowerCase();

  // Remove protocol if present to standardize checking
  normalizedUrl = normalizedUrl.replace(/^https?:\/\//, "");
  normalizedUrl = normalizedUrl.replace(/^www\./, "");

  const allowedDomains = config.allowedLinks
    ? config.allowedLinks
        .split(",")
        .map((d) => d.trim().toLowerCase())
        .filter((d) => d)
    : [];
  const blockedDomains = config.blockedLinks
    ? config.blockedLinks
        .split(",")
        .map((d) => d.trim().toLowerCase())
        .filter((d) => d)
    : [];

  // Check if URL contains any blocked domains
  if (blockedDomains.length > 0) {
    for (const domain of blockedDomains) {
      const normalizedDomain = domain
        .replace(/^https?:\/\//, "")
        .replace(/^www\./, "");
      if (normalizedUrl.includes(normalizedDomain)) {
        return false;
      }
    }
  }

  // If whitelist mode and allowed domains exist
  if (config.isWhitelist && allowedDomains.length > 0) {
    for (const domain of allowedDomains) {
      const normalizedDomain = domain
        .replace(/^https?:\/\//, "")
        .replace(/^www\./, "");
      if (normalizedUrl.includes(normalizedDomain)) {
        return true;
      }
    }
    return false; // Not in whitelist
  }

  // If blacklist mode, allow unless explicitly blocked
  return true;
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
  const { Op } = require("sequelize");

  if (trigger && jid) {
    return await FilterDB.findOne({
      where: {
        trigger: trigger,
        [Op.or]: [
          { jid: jid, scope: "chat" },
          { jid: null, scope: "global" },
          { jid: null, scope: jid.includes("@g.us") ? "group" : "dm" },
        ],
        enabled: true,
      },
    });
  } else if (jid) {
    return await FilterDB.findAll({
      where: {
        [Op.or]: [
          { jid: jid, scope: "chat" },
          { jid: null, scope: "global" },
          { jid: null, scope: jid.includes("@g.us") ? "group" : "dm" },
        ],
        enabled: true,
      },
    });
  } else {
    return await FilterDB.findAll();
  }
}

async function setFilter(
  trigger,
  response,
  jid = null,
  scope = "chat",
  createdBy,
  options = {}
) {
  const filterData = {
    trigger,
    response,
    jid: scope === "chat" ? jid : null,
    scope,
    enabled: true,
    caseSensitive: options.caseSensitive || false,
    exactMatch: options.exactMatch || false,
    createdBy,
  };

  const existing = await FilterDB.findOne({
    where: {
      trigger,
      jid: filterData.jid,
      scope,
    },
  });

  if (existing) {
    await existing.update(filterData);
    return existing;
  }

  return await FilterDB.create(filterData);
}

async function delFilter(trigger, jid = null, scope = "chat") {
  return await FilterDB.destroy({
    where: {
      trigger,
      jid: scope === "chat" ? jid : null,
      scope,
    },
  });
}

async function toggleFilter(trigger, jid = null, scope = "chat", enabled) {
  const filter = await FilterDB.findOne({
    where: {
      trigger,
      jid: scope === "chat" ? jid : null,
      scope,
    },
  });

  if (filter) {
    await filter.update({ enabled });
    return filter;
  }
  return false;
}

async function getFiltersByScope(scope, jid = null) {
  const whereCondition = { scope, enabled: true };
  if (scope === "chat" && jid) {
    whereCondition.jid = jid;
  } else if (scope !== "chat") {
    whereCondition.jid = null;
  }

  return await FilterDB.findAll({ where: whereCondition });
}

async function checkFilterMatch(text, jid) {
  if (!text) return null;

  const filters = await getFilter(jid);

  for (const filter of filters) {
    const trigger = filter.caseSensitive
      ? filter.trigger
      : filter.trigger.toLowerCase();
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

// New antilink system
const antilinkConfig = {
  get: getAntilinkConfig,
  set: setAntilinkConfig,
  update: updateAntilinkConfig,
  delete: deleteAntilinkConfig,
  reset: resetAntilinkConfig,
  parsePattern: parseAntilinkPattern,
  checkAllowed: checkLinkAllowed,
};
const antiword = {
  set: setAntiWord,
  get: getAntiWord,
  delete: delAntiWord,
  reset: resetAntiWord,
};
const antifake = {
  set: setAntifake,
  get: getAntifake,
  delete: delAntifake,
  reset: resetAntifake,
};
const antipromote = {
  set: setAntiPromote,
  get: getAntiPromote,
  delete: delAntiPromote,
  reset: resetAntiPromote,
};
const antidemote = {
  set: setAntiDemote,
  get: getAntiDemote,
  delete: delAntiDemote,
  reset: resetAntiDemote,
};
const antispam = {
  set: setAntiSpam,
  get: getAntiSpam,
  delete: delAntiSpam,
  reset: resetAntiSpam,
};
const antibot = {
  set: setAntiBot,
  get: getAntiBot,
  delete: delAntiBot,
  reset: resetAntiBot,
};
const pdm = { set: setPdm, get: getPdm, delete: delPdm, reset: resetPdm };
const welcome = {
  set: setWelcome,
  get: getWelcome,
  delete: delWelcome,
  toggle: toggleWelcome,
};
const goodbye = {
  set: setGoodbye,
  get: getGoodbye,
  delete: delGoodbye,
  toggle: toggleGoodbye,
};
const filter = {
  set: setFilter,
  get: getFilter,
  delete: delFilter,
  toggle: toggleFilter,
  getByScope: getFiltersByScope,
  checkMatch: checkFilterMatch,
};

module.exports = {
  getWarn,
  setWarn,
  resetWarn,
  getWarnCount,
  decrementWarn,
  getAllWarns,
  antilinkConfig,
  antiword,
  antifake,
  antipromote,
  antidemote,
  antispam,
  antibot,
  pdm,
  welcome,
  goodbye,
  filter,
};
