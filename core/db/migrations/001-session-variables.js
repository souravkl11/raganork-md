// per-session settings: one row per (account, key). bot_variables stays the global table.
const { DataTypes } = require("sequelize");

module.exports = {
  stage: "schema",
  async up({ queryInterface, transaction, tableExists }) {
    if (await tableExists("session_variables")) return;
    await queryInterface.createTable(
      "session_variables",
      {
        accountId: { type: DataTypes.STRING, primaryKey: true, allowNull: false },
        key: { type: DataTypes.STRING, primaryKey: true, allowNull: false },
        value: { type: DataTypes.TEXT, allowNull: true },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false },
      },
      { transaction },
    );
  },
};
