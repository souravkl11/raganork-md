const { Module } = require("../main");
const config = require("../config");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { commands, commandName, withSource, unload } = require("../core/plugins/registry");
const { PluginDB, installPlugin } = require("./sql/plugin");
let { getString } = require("./utils/lang");
let Lang = getString("external_plugin");

// the name becomes a file name, so block anything that could leave plugins/
const NAME_RE = /^[a-z0-9_-]+$/i;
const INVALID_NAME =
  "_Invalid plugin name. Use only letters, numbers, - and _ in the name._";
const fileOf = (name) => path.join(__dirname, name + ".js");

const FETCH_TIMEOUT_MS = () => parseInt(process.env.PLUGIN_FETCH_TIMEOUT || "15000", 10);
const MAX_PLUGIN_BYTES = 2 * 1024 * 1024;

const fetchPlugin = (url) =>
  axios(url, {
    timeout: FETCH_TIMEOUT_MS(),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS()),
    maxContentLength: MAX_PLUGIN_BYTES,
    responseType: "text",
    transformResponse: (data) => data,
  });

const jsNames = (files) =>
  new Set(
    files
      .filter((f) => f.endsWith(".js") && !f.includes("/") && !f.includes("\\"))
      .map((f) => f.slice(0, -3).toLowerCase())
  );

function readShippedFiles() {
  try {
    const out = execFileSync("git", ["ls-files", "--", "plugins/*.js"], {
      cwd: path.join(__dirname, ".."),
      encoding: "utf8",
      timeout: 5000,
      stdio: ["ignore", "pipe", "ignore"],
    });
    const names = jsNames(
      out.split("\n").map((line) => line.trim().replace(/^plugins\//, ""))
    );
    if (names.size) return { names, tracked: true };
  } catch (_) {
  }
  return { names: jsNames(fs.readdirSync(__dirname)), tracked: false };
}
const shipped = readShippedFiles();

async function isShippedFile(name) {
  const lower = name.toLowerCase();
  if (!shipped.names.has(lower)) return false;
  if (shipped.tracked) return true;
  await PluginDB.sync();
  const recorded = await PluginDB.findAll();
  return !recorded.some((plugin) => plugin.dataValues.name.toLowerCase() === lower);
}

const protectedReply = (name) =>
  `_'${name}' is a built-in plugin file and cannot be installed over, updated or removed._`;

// loads the plugin now; on failure the previous version is restored
function loadPlugin(file, previous) {
  unload(file);
  try {
    withSource(file, () => require(file));
    return null;
  } catch (error) {
    unload(file);
    if (previous !== null) {
      fs.writeFileSync(file, previous);
      try {
        withSource(file, () => require(file));
      } catch (_) {
        unload(file);
      }
    } else {
      fs.rmSync(file, { force: true });
    }
    return error;
  }
}

const EXPLICIT_NAME_RE = /^[ \t]*name:[ \t]*(["'])([^"'\r\n]*)\1[ \t]*,/m;
const explicitName = (source) => EXPLICIT_NAME_RE.exec(source)?.[2].trim() || null;

function scrapedName(source) {
  const first = /pattern: ["'](.*)["'],/.exec(source)?.[1].split(" ")[0];
  return first && NAME_RE.test(first) ? first : null;
}

// for regex/runtime patterns: load under a throwaway name and read what it registers
function nameFromLoad(source) {
  const probe = path.join(__dirname, `zz-probe-${process.pid}-${Date.now()}.js`);
  fs.writeFileSync(probe, source);
  try {
    withSource(probe, () => require(probe));
    const first = commands.find((cmd) => cmd.source === probe && cmd.pattern !== undefined);
    return { name: first ? commandName(first) || null : null };
  } catch (error) {
    return { error };
  } finally {
    unload(probe);
    fs.rmSync(probe, { force: true });
  }
}

function pluginNameOf(source) {
  const own = explicitName(source);
  if (own !== null) return { name: own };
  const scraped = scrapedName(source);
  if (scraped) return { name: scraped };
  return nameFromLoad(source);
}

function readIfExists(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
}

Module(
  {
    pattern: "install ?(.*)",
    fromMe: true,
    use: "owner",
    desc: Lang.INSTALL_DESC,
  },
  async (message, match) => {
    match = match[1] !== "" ? match[1] : message.reply_message.text;
    if (!match || !/\bhttps?:\/\/\S+/gi.test(match))
      return await message.send(Lang.NEED_URL);
    let links = match.match(/\bhttps?:\/\/\S+/gi);
    for (let link of links) {
      try {
        var url = new URL(link);
      } catch {
        return await message.send(Lang.INVALID_URL);
      }
      if (
        url.host === "gist.github.com" ||
        url.host === "gist.githubusercontent.com"
      ) {
        url = !url?.toString().endsWith("raw")
          ? url.toString() + "/raw"
          : url.toString();
      } else {
        url = url.toString();
      }
      try {
        var response = await fetchPlugin(url + "?timestamp=" + new Date());
      } catch {
        return await message.send(Lang.INVALID_URL);
      }
      var plugin_name_temp = (response.data.match(/pattern: ["'](.*)["'],/g) || []).map(
        (e) => e.replace("pattern", "").replace(/[^a-zA-Z]/g, "")
      );
      const found = pluginNameOf(response.data);
      if (found.error) {
        return await message.sendReply(Lang.INVALID_PLUGIN + found.error);
      }
      const plugin_name = found.name;
      if (!plugin_name) {
        return await message.sendReply(
          '_Invalid plugin. No plugin name found! Add a line like_ `name: "my-plugin",` _to the plugin._'
        );
      }
      if (!NAME_RE.test(plugin_name)) {
        return await message.sendReply(INVALID_NAME);
      }
      if (await isShippedFile(plugin_name)) {
        return await message.sendReply(protectedReply(plugin_name));
      }
      const file = fileOf(plugin_name);
      const previous = readIfExists(file);
      fs.writeFileSync(file, response.data);
      plugin_name_temp =
        plugin_name_temp.length > 1 ? plugin_name_temp.join(", ") : plugin_name;
      const failure = loadPlugin(file, previous);
      if (failure) {
        return await message.sendReply(Lang.INVALID_PLUGIN + failure);
      }
      await installPlugin(url, plugin_name);
      await message.send(Lang.INSTALLED.format(plugin_name_temp));
    }
  }
);

Module(
  {
    pattern: "plugin ?(.*)",
    fromMe: true,
    use: "owner",
    desc: Lang.PLUGIN_DESC,
  },
  async (message, match) => {
    var plugins = await PluginDB.findAll();
    if (match[1] !== "") {
      var plugin = plugins.filter(
        (_plugin) => _plugin.dataValues.name === match[1]
      );
      try {
        await message.sendReply(
          `_${plugin[0].dataValues.name}:_ ${plugin[0].dataValues.url}`
        );
      } catch {
        return await message.sendReply(Lang.PLUGIN_NOT_FOUND);
      }
      return;
    }
    var msg = Lang.INSTALLED_PLUGINS;
    var plugins = await PluginDB.findAll();
    if (plugins.length < 1) {
      return await message.send(Lang.NO_PLUGIN);
    } else {
      plugins.map((plugin) => {
        msg +=
          "*" +
          plugin.dataValues.name +
          "* : " +
          (plugin.dataValues.url.endsWith("/raw")
            ? plugin.dataValues.url.replace("raw", "")
            : plugin.dataValues.url) +
          "\n\n";
      });
      return await message.sendReply(msg);
    }
  }
);

Module(
  {
    pattern: "remove(?: |$)(.*)",
    fromMe: true,
    use: "owner",
    desc: Lang.REMOVE_DESC,
  },
  async (message, match) => {
    if (match[1] === "") return await message.send(Lang.NEED_PLUGIN);
    if (await isShippedFile(match[1])) {
      await PluginDB.sync();
      const stale = await PluginDB.findAll({ where: { name: match[1] } });
      if (!stale.length) return await message.sendReply(protectedReply(match[1]));
      await stale[0].destroy();
      return await message.sendReply(
        `_Removed the old install record for '${match[1]}'. The built-in plugin file was kept._`
      );
    }
    var plugin = await PluginDB.findAll({
      where: {
        name: match[1],
      },
    });
    if (plugin.length < 1) {
      return await message.send(Lang.NO_PLUGIN);
    } else {
      await plugin[0].destroy();
      const file = fileOf(match[1]);
      if (path.dirname(file) === __dirname && !/[\\/]/.test(match[1])) {
        unload(file);
        fs.rmSync(file, { force: true });
      }
      await message.sendReply(Lang.DELETED.format(match[1]));
    }
  }
);

Module(
  {
    pattern: "pupdate ?(.*)",
    fromMe: true,
    use: "owner",
    usage: ".pupdate plugin_name",
    desc: "Updates a plugin",
  },
  async (m, match) => {
    const plugin = match[1];
    if (!plugin) return await m.send(Lang.NEED_PLUGIN);
    if (!NAME_RE.test(plugin)) return await m.send(INVALID_NAME);
    if (await isShippedFile(plugin)) return await m.send(protectedReply(plugin));
    await PluginDB.sync();
    var plugins = await PluginDB.findAll({
      where: {
        name: plugin,
      },
    });
    if (plugins.length < 1) {
      return await m.send(Lang.PLUGIN_NOT_FOUND);
    }
    var url = plugins[0].dataValues.url;
    try {
      var response = await fetchPlugin(url + "?timestamp=" + new Date());
    } catch {
      return await m.send(Lang.INVALID_URL);
    }
    const file = fileOf(plugin);
    const previous = readIfExists(file);
    fs.writeFileSync(file, response.data);
    const failure = loadPlugin(file, previous);
    if (failure) return await m.send(Lang.INVALID_PLUGIN + failure);
    await m.send(Lang.PLUGIN_UPDATED.format(plugin));
  }
);
