const config = require("../../config");
const { ownerTarget } = require("../identity");
const { version } = require("../../package.json");
const ui = require("../ui");

function capitalizeFirstLetter(s) {
  return typeof s !== "string" || s.length === 0
    ? s
    : s[0].toUpperCase() + s.slice(1);
}

const prefixOf = (cfg) =>
  cfg.HANDLERS && cfg.HANDLERS !== "false" ? String(cfg.HANDLERS).charAt(0) : "";

const VERSION_KEY = "LAST_STARTED_VERSION";
let announce = null;

async function recordStartedVersion() {
  const { isNewerVersion, takeUpdateNote } = require("../services/updater");
  const { BotVariable } = require("../database");
  const note = takeUpdateNote();
  try {
    const last = (await BotVariable.findByPk(VERSION_KEY, { raw: true }))?.value;
    if (last && !isNewerVersion(version, last)) return;
    if (last) announce = { version, commits: note?.commits || [] };
    await BotVariable.upsert({ key: VERSION_KEY, value: version });
  } catch (_) {}
}

function updateText(n) {
  const { getString } = require("../../plugins/utils/lang");
  const lines = n.commits.map((m, i) => `${i + 1}• ${m}`).join("\n");
  return getString("start_message").UPDATED.format(n.version) + (lines ? `\n\n${lines}` : "");
}

function buildStartMessage(config, n = null) {
  const p = prefixOf(config);
  return (
    (n ? `${updateText(n)}\n\n` : `*_Raganork started!_*\n\n`) +
    `_Version:_ *v${version}*\n` +
    `_Mode:_ *${capitalizeFirstLetter(config.MODE || "private")}*\n` +
    `_Language:_ *${capitalizeFirstLetter(config.LANGUAGE || "english")}*\n` +
    `_Handlers:_ *${config.HANDLERS || "none"}*\n\n` +
    `_Use_ \`${p}settings\` _to view and change all options._`
  );
}

function buttonsTip(cfg) {
  if (typeof cfg.isDynamic !== "function" || cfg.isDynamic("BUTTONS") || process.env.BUTTONS !== undefined) return "";
  const { getString } = require("../../plugins/utils/lang");
  return getString("start_message").BUTTONS_TIP.replaceAll("{p}", prefixOf(cfg));
}

async function sendStartMessage(sock, cfg = config) {
  const target = ownerTarget(sock);
  const n = announce;
  if (cfg.DISABLE_START_MESSAGE) {
    if (n) await sock.sendMessage(target, { text: updateText(n) });
    return;
  }
  const text = buildStartMessage(cfg, n) + buttonsTip(cfg);
  if (cfg.BUTTONS === true) {
    const p = prefixOf(cfg);
    return await ui.sendButtons(
      sock,
      target,
      {
        text,
        footer: "Interactive buttons are on · use at your own risk",
        buttons: [
          { text: "⚙️ Settings", id: `${p}settings` },
          { text: "📜 Menu", id: `${p}menu` },
        ],
      },
      { force: true },
    );
  }
  await sock.sendMessage(target, { text });
}

const forgetStartedVersion = () => (announce = null);

module.exports = { buildStartMessage, buttonsTip, sendStartMessage, recordStartedVersion, forgetStartedVersion };
