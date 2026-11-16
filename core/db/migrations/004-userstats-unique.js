// UserStats is unique per (user, chat); with several accounts it must be unique per
// (account, user, chat). the index is dropped and re-created UNDER THE SAME NAME.
//
// why the name matters: Model.sync() adds every model index that is missing by name. an
// older build that gets rolled back would otherwise try to re-create the two-column
// unique index and fail as soon as two accounts hold stats for the same user and chat.
// with the name kept it finds the index, skips it, its `ON CONFLICT (userJid, chatJid)`
// insert fails and it falls back to the slow path it already has (core/store.js).
//
// runs in the schema stage, before the backfill, so every row still has accountId NULL;
// NULLs never collide in a unique index, so creating it cannot fail.
const { DataTypes } = require("sequelize");

const TABLE = "UserStats";
const NAME = "user_stats_user_jid_chat_jid";
const WANTED = ["accountId", "userJid", "chatJid"];

module.exports = {
  stage: "schema",
  async up({ queryInterface, transaction, tableExists }) {
    if (!(await tableExists(TABLE))) return; // fresh install: the model creates it with this index
    const options = { transaction };

    const columns = await queryInterface.describeTable(TABLE, options);
    if (!columns.accountId) {
      await queryInterface.addColumn(TABLE, "accountId", { type: DataTypes.STRING, allowNull: true }, options);
    }

    const current = (await queryInterface.showIndex(TABLE, options)).find((index) => index.name === NAME);
    if (current) {
      const fields = (current.fields || []).map((f) => f.attribute);
      if (current.unique && fields.join() === WANTED.join()) return;
      await queryInterface.removeIndex(TABLE, NAME, options);
    }
    await queryInterface.addIndex(TABLE, WANTED, { name: NAME, unique: true, transaction });
  },
};
