const { sequelize } = require("../index");
const { DataTypes } = require("sequelize");

const YoutubeAuthDB = sequelize.define(
  "YoutubeAuth",
  {
    key: { type: DataTypes.STRING, primaryKey: true },
    value: { type: DataTypes.TEXT, allowNull: false },
  },
  { tableName: "youtube_auth" },
);

let synced = null;
function ready() {
  synced ??= YoutubeAuthDB.sync().catch((err) => {
    synced = null;
    throw err;
  });
  return synced;
}

async function getYoutubeAuth(key) {
  await ready();
  const row = await YoutubeAuthDB.findByPk(key);
  return row ? JSON.parse(row.value) : null;
}

async function setYoutubeAuth(key, value) {
  await ready();
  await YoutubeAuthDB.upsert({ key, value: JSON.stringify(value) });
}

async function clearYoutubeAuth(key) {
  await ready();
  await YoutubeAuthDB.destroy({ where: { key } });
}

module.exports = { YoutubeAuthDB, getYoutubeAuth, setYoutubeAuth, clearYoutubeAuth };
