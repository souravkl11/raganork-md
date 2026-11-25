const config = require("../../config");
const { ownerTarget } = require("../identity");
const { version } = require("../../package.json");
const ui = require("../ui");

function capitalizeFirstLetter(s) {
  return typeof s !== "string" || s.length === 0
    ? s
    : s[0].toUpperCase() + s.slice(1);
}

// same rule as registry.helpPrefix, but for the config passed in
const prefixOf = (cfg) =>
  cfg.HANDLERS && cfg.HANDLERS !== "false" ? String(cfg.HANDLERS).charAt(0) : "";

// short on purpose: every option lives in .settings
function buildStartMessage(config) {
  const p = prefixOf(config);
  return (
    `*_Raganork started!_*\n\n` +
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
  const text = buildStartMessage(cfg) + buttonsTip(cfg);
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

module.exports = { buildStartMessage, buttonsTip, sendStartMessage };
