const { DataTypes } = require("sequelize");
const { sequelize } = require("../index");
const { scoped, accountColumn: accountId, accountOptions } = require("../scoped");

const warnDB = sequelize.define("_warn", {
  accountId,
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
}, accountOptions("_warns"));

const FakeDB = sequelize.define("fake", {
  accountId,
  jid: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
}, accountOptions("fakes"));

const antilinkDB = sequelize.define("antilink", {
  accountId,
  jid: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
}, accountOptions("antilinks"));

// keyed by (account, group); the legacy table is keyed by jid alone
const AntilinkConfigDB = sequelize.define("antilink_config", {
  accountId: {
    type: DataTypes.STRING,
    allowNull: false,
    primaryKey: true,
  },
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
}, { tableName: "account_antilink_configs" });

const AntiStatusMentionDB = sequelize.define("anti_status_mention", {
  accountId: {
    type: DataTypes.STRING,
    allowNull: false,
    primaryKey: true,
  },
  jid: {
    type: DataTypes.STRING,
    allowNull: false,
    primaryKey: true,
  },
  // .antistatus mention switch (the original column)
  enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  // .antistatus post switch: statuses posted to the group itself
  postEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  action: {
    type: DataTypes.ENUM("delete", "kick", "both", "warn"),
    defaultValue: "delete",
    allowNull: false,
  },
  replyEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  customMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  updatedBy: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, { tableName: "account_anti_status_mentions" });

const antiSpamDB = sequelize.define("antispam", {
  accountId,
  jid: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
}, accountOptions("antispams"));

const PDMDB = sequelize.define("pdm", {
  accountId,
  jid: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
}, accountOptions("pdms"));

const antiDemote = sequelize.define("antidemote", {
  accountId,
  jid: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
}, accountOptions("antidemotes"));

const antiPromote = sequelize.define("antipromote", {
  accountId,
  jid: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
}, accountOptions("antipromotes"));

const antiBotDB = sequelize.define("antibot", {
  accountId,
  jid: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
}, accountOptions("antibots"));

const antiWordDB = sequelize.define("antiword", {
  accountId,
  jid: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
}, accountOptions("antiwords"));

const WelcomeDB = sequelize.define("welcome", {
  accountId,
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
}, accountOptions("welcomes"));

const GoodbyeDB = sequelize.define("goodbye", {
  accountId,
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
}, accountOptions("goodbyes"));

const FilterDB = sequelize.define("filter", {
  accountId,
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
}, accountOptions("filters"));

[
  warnDB,
  FakeDB,
  antilinkDB,
  AntilinkConfigDB,
  AntiStatusMentionDB,
  antiSpamDB,
  PDMDB,
  antiDemote,
  antiPromote,
  antiBotDB,
  antiWordDB,
  WelcomeDB,
  GoodbyeDB,
  FilterDB,
].forEach(scoped);

module.exports = {
  warnDB,
  FakeDB,
  antilinkDB,
  AntilinkConfigDB,
  AntiStatusMentionDB,
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
