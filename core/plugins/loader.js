// order matters: plugins read config (HANDLERS, MODE, LANGUAGE) when they load
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const config = require("../../config");
const { setCurrentSource } = require("./registry");

const PLUGIN_DIR = "./plugins";
const FETCH_TIMEOUT_MS = () => parseInt(process.env.PLUGIN_FETCH_TIMEOUT || "15000", 10);
const MAX_PLUGIN_BYTES = 2 * 1024 * 1024;

async function loadDbConfig() {
  const { BotVariable } = require("../database");
  await BotVariable.sync();
  const variables = await BotVariable.findAll();
  if (variables.length > 0) {
    const dbConfig = {};
    for (const v of variables) dbConfig[v.key] = v.value;
    config.loadFromDB(dbConfig);
  }
}

function requirePlugin(file, { swallow }) {
  const abs = path.resolve(file);
  setCurrentSource(abs);
  try {
    require(abs);
  } catch (error) {
    if (!swallow) throw error;
    console.error(`Error loading plugin ${path.basename(file)}:`, error);
  } finally {
    setCurrentSource(null);
  }
}

function loadDirectory(dir, { swallow }) {
  fs.readdirSync(dir)
    .filter((f) => path.extname(f) === ".js")
    .forEach((f) => requirePlugin(path.join(dir, f), { swallow }));
}

async function syncTables() {
  const {
    Chat,
    User,
    UserStats,
    AntiDeleteCache,
    ensureFullContentColumnExists,
  } = require("../store");
  const {
    AutoMuteDB,
    AutoUnMuteDB,
    StickyCmdDB,
    ScheduledMessageDB,
  } = require("../db/models/schedules");

  await Chat.sync();
  await User.sync();
  // add new columns before sync(), which would otherwise try to index a missing column
  await ensureFullContentColumnExists();
  await AntiDeleteCache.sync();
  await UserStats.sync();
  await AutoMuteDB.sync();
  await AutoUnMuteDB.sync();
  await StickyCmdDB.sync();
  await ScheduledMessageDB.sync();
  await config.sequelize.sync();
}

async function restoreExternalPlugins() {
  const { PluginDB } = require("../db/models/plugin");
  const plugins = await PluginDB.findAll();
  for (const plugin of plugins) {
    const pluginPath = `${PLUGIN_DIR}/${plugin.dataValues.name}.js`;
    // the name comes from the db: never write outside plugins/
    if (path.dirname(path.resolve(pluginPath)) !== path.resolve(PLUGIN_DIR)) {
      console.error(`Skipping plugin with an unsafe name: ${plugin.dataValues.name}`);
      continue;
    }
    if (fs.existsSync(pluginPath)) continue;
    try {
      const response = await axios(plugin.dataValues.url, {
        timeout: FETCH_TIMEOUT_MS(),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS()),
        maxContentLength: MAX_PLUGIN_BYTES,
        responseType: "text",
        transformResponse: (data) => data,
      });
      fs.writeFileSync(pluginPath, response.data);
      requirePlugin(pluginPath, { swallow: false });
    } catch (error) {
      console.error(`Error on plugin: ${plugin.dataValues.name}\n\n${error}`);
    }
  }
}

async function loadAll() {
  // migrations first: syncing a model before them can index a column that does not exist yet
  await require("../database").initializeDatabase();
  await loadDbConfig();
  loadDirectory(`${PLUGIN_DIR}/sql/`, { swallow: false });
  loadDirectory(PLUGIN_DIR, { swallow: true });
  await syncTables();
  await restoreExternalPlugins();
}

module.exports = { loadAll, loadDbConfig, restoreExternalPlugins };
