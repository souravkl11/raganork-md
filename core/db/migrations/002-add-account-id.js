// adds the nullable "accountId" column (and an index on it) to every table whose rows
// belong to one WhatsApp number, and creates account_antilink_configs, the per-account
// replacement for antilink_configs (whose primary key is the group jid alone).
// rows keep accountId NULL until 003-backfill-account-id assigns them; scoped models
// treat NULL as visible to every account. old code ignores the column.
//
// self-contained on purpose: table names and index names are written out here and in
// the models (index names must match, sync() adds a model index that is missing by name).
const { DataTypes } = require("sequelize");

const SETTINGS_TABLES = [
  "_warns",
  "fakes",
  "antilinks",
  "antispams",
  "pdms",
  "antidemotes",
  "antipromotes",
  "antibots",
  "antiwords",
  "welcomes",
  "goodbyes",
  "filters",
  "automutes",
  "autounmutes",
  "stickcmds",
  "scheduled_messages",
];

// index name -> table. UserStats gets no separate index: its unique index (004)
// starts with accountId.
const INDEXED = {
  ...Object.fromEntries(SETTINGS_TABLES.map((table) => [`${table}_account_id`, table])),
  anti_delete_caches_account_id: "AntiDeleteCaches",
};
const WITH_COLUMN = [...SETTINGS_TABLES, "UserStats", "AntiDeleteCaches"];

module.exports = {
  stage: "schema",
  async up({ queryInterface, transaction, tableExists }) {
    const options = { transaction };

    for (const table of WITH_COLUMN) {
      if (!(await tableExists(table))) continue; // fresh install: the model creates it complete
      const columns = await queryInterface.describeTable(table, options);
      if (!columns.accountId) {
        await queryInterface.addColumn(table, "accountId", { type: DataTypes.STRING, allowNull: true }, options);
      }
    }

    for (const [name, table] of Object.entries(INDEXED)) {
      if (!(await tableExists(table))) continue;
      const indexes = await queryInterface.showIndex(table, options);
      if (!indexes.some((index) => index.name === name)) {
        await queryInterface.addIndex(table, ["accountId"], { name, transaction });
      }
    }

    if (!(await tableExists("account_antilink_configs"))) {
      await queryInterface.createTable(
        "account_antilink_configs",
        {
          accountId: { type: DataTypes.STRING, primaryKey: true, allowNull: false },
          jid: { type: DataTypes.STRING, primaryKey: true, allowNull: false },
          mode: { type: DataTypes.ENUM("warn", "kick", "delete"), allowNull: false, defaultValue: "delete" },
          allowedLinks: { type: DataTypes.TEXT, allowNull: true },
          blockedLinks: { type: DataTypes.TEXT, allowNull: true },
          isWhitelist: { type: DataTypes.BOOLEAN, defaultValue: true },
          enabled: { type: DataTypes.BOOLEAN, defaultValue: true },
          customMessage: { type: DataTypes.TEXT, allowNull: true },
          updatedBy: { type: DataTypes.STRING, allowNull: true },
          createdAt: { type: DataTypes.DATE, allowNull: false },
          updatedAt: { type: DataTypes.DATE, allowNull: true },
        },
        options,
      );
    }
  },
};
