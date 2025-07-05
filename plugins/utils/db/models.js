const { DataTypes } = require("sequelize");
const config = require("../../../config");

config.sequelize.sync();

const warnDB = config.sequelize.define("_warn", {
  chat: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  user: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: "No reason provided",
  },
  warnedBy: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});

const FakeDB = config.sequelize.define("fake", {
  jid: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
});

// Legacy antilink table - will be removed
const antilinkDB = config.sequelize.define("antilink", {
  jid: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
});

// New advanced antilink system
const AntilinkConfigDB = config.sequelize.define("antilink_config", {
  jid: {
    type: DataTypes.STRING,
    allowNull: false,
    primaryKey: true,
  },
  mode: {
    type: DataTypes.ENUM("warn", "kick", "delete"),
    defaultValue: "delete",
    allowNull: false,
  },
  allowedLinks: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: "Comma-separated list of allowed domains/patterns",
  },
  blockedLinks: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: "Comma-separated list of blocked domains/patterns",
  },
  isWhitelist: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: "true = only allow listed links, false = block listed links",
  },
  enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  customMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: "Custom message to send when link is detected",
  },
  updatedBy: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});

const antiSpamDB = config.sequelize.define("antispam", {
  jid: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
});

const PDMDB = config.sequelize.define("pdm", {
  jid: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
});

const antiDemote = config.sequelize.define("antidemote", {
  jid: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
});

const antiPromote = config.sequelize.define("antipromote", {
  jid: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
});

const antiBotDB = config.sequelize.define("antibot", {
  jid: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
});

const antiWordDB = config.sequelize.define("antiword", {
  jid: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
});

const WelcomeDB = config.sequelize.define("welcome", {
  jid: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

const GoodbyeDB = config.sequelize.define("goodbye", {
  jid: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

const FilterDB = config.sequelize.define("filter", {
  trigger: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  response: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  jid: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  scope: {
    type: DataTypes.ENUM("chat", "global", "dm", "group"),
    defaultValue: "chat",
  },
  enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  caseSensitive: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  exactMatch: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  createdBy: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

module.exports = {
  warnDB,
  FakeDB,
  antilinkDB, // Legacy - will be removed
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
};
