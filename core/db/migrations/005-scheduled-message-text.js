// scheduled messages carry base64 media, far past the old STRING(2048) on postgres.
// widening varchar to text is expand-only: older code keeps working on it.
// sqlite does not enforce the declared length, so there is nothing to change there.
const { DataTypes } = require("sequelize");

const TABLE = "scheduled_messages";

module.exports = {
  stage: "schema",
  async up({ queryInterface, dialect, transaction, tableExists }) {
    if (dialect !== "postgres") return;
    if (!(await tableExists(TABLE))) return; // fresh install: the model creates it with TEXT
    const options = { transaction };

    const columns = await queryInterface.describeTable(TABLE, options);
    if (!columns.message || /^TEXT$/i.test(columns.message.type)) return;
    await queryInterface.changeColumn(TABLE, "message", { type: DataTypes.TEXT, allowNull: false }, options);
  },
};
