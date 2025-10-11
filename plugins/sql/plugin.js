const config = require("../../config");
const { DataTypes } = require("sequelize");

const PluginDB = config.sequelize.define("Plugin", {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  url: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
});

async function installPlugin(address, file) {
  var Plugin = await PluginDB.findAll({
    where: { url: address },
  });

  if (Plugin.length >= 1) {
    return false;
  } else {
    return await PluginDB.create({ url: address, name: file });
  }
}
module.exports = { PluginDB: PluginDB, installPlugin: installPlugin };
