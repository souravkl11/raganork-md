const config = require("../../config");
const { ownerTarget } = require("../identity");

function capitalizeFirstLetter(s) {
  return typeof s !== "string" || s.length === 0
    ? s
    : s[0].toUpperCase() + s.slice(1);
}

function convertToNumberEmoji(n) {
  const str = n.toString();
  const emojiMap = {
    0: "0️⃣",
    1: "1️⃣",
    2: "2️⃣",
    3: "3️⃣",
    4: "4️⃣",
    5: "5️⃣",
    6: "6️⃣",
    7: "7️⃣",
    8: "8️⃣",
    9: "9️⃣",
  };
  let result = "";
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    result += emojiMap[char] || char;
  }
  return result;
}

function buildStartMessage(config) {
  const readMore = String.fromCharCode(8206).repeat(4001);
  const check = "✅";
  const cross = "❌";
  const started = `*_Raganork started!_*${readMore}\n\n_Mode         :_ *${capitalizeFirstLetter(
    config.MODE,
  )}*\n_Language :_ *${capitalizeFirstLetter(
    config.LANGUAGE,
  )}*\n_Sudo_         _: *${config.SUDO}*_\n_Handlers_  _: *${
    config.HANDLERS
  }*_\n\n*_Extra Configurations_*\n\n_Always online_ ${
    config.ALWAYS_ONLINE ? check : cross
  }\n_Auto status viewer_ ${
    config.AUTO_READ_STATUS ? check : cross
  }\n_Auto reject calls_ ${
    config.REJECT_CALLS ? check : cross
  }\n_Auto read msgs_ ${
    config.READ_MESSAGES ? check : cross
  }\n_PM disabler_ ${config.DIS_PM ? check : cross}\n_PM blocker_ ${
    config.PMB_VAR ? check : cross
  }\n_Disabled commands:_  ${convertToNumberEmoji(
    config.DISABLED_COMMANDS?.length || 0,
  )}\n_Disabled chats_  ${convertToNumberEmoji(
    config.BLOCK_CHAT ? config.BLOCK_CHAT.split(",").length : 0,
  )}`;
  return started;
}

// goes to the first legacy SUDO number, else to the bot itself (phone jid)
async function sendStartMessage(sock, cfg = config) {
  const target = ownerTarget(sock, { map: false, self: "pn" });
  const text = buildStartMessage(cfg);
  await sock.sendMessage(target, { text });
}

module.exports = { buildStartMessage, sendStartMessage };
