// never reads stdin: many panels have a console that takes no input
const config = require("../../config");

const isLocalSession = (sessionId) => (config.LOCAL_SESSIONS || []).includes(sessionId);

const cleanNumber = (raw) => String(raw || "").replace(/\D/g, "");
const isValidNumber = (digits) => digits.length >= 7 && digits.length <= 15;

// comma-separated, one per "pair" session in SESSION order
function pairingNumberFor(sessionId, env = process.env) {
  const numbers = String(env.PAIRING_NUMBER || "")
    .split(",")
    .map(cleanNumber)
    .filter(Boolean);
  const methods = config.LOGIN_METHODS || {};
  const pairSessions = Object.keys(methods).filter((id) => methods[id] === "pair");
  return numbers[Math.max(pairSessions.indexOf(sessionId), 0)] || null;
}

function chooseLoginMethod(sessionId, env = process.env) {
  if ((config.LOGIN_METHODS || {})[sessionId] !== "pair") return { type: "qr" };
  const number = pairingNumberFor(sessionId, env);
  if (number && isValidNumber(number)) return { type: "pairing", number };
  console.warn(
    number
      ? `⚠️ [${sessionId}] PAIRING_NUMBER "${number}" doesn't look like a phone number, showing a QR code instead.`
      : `⚠️ [${sessionId}] SESSION=pair needs PAIRING_NUMBER (your number with country code, e.g. 919876543210). Showing a QR code instead.`,
  );
  return { type: "qr" };
}

function formatCode(code) {
  const text = String(code || "");
  return text.length === 8 ? `${text.slice(0, 4)}-${text.slice(4)}` : text;
}

async function handlePairing(bot, sock) {
  const method = bot.loginMethod;
  if (method?.type !== "pairing") return false;
  if (sock.__pairingRequested) return true;
  sock.__pairingRequested = true;
  try {
    const code = await sock.requestPairingCode(method.number);
    console.log(`\n🔗 [${bot.sessionId}] Pairing code for +${method.number}:`);
    console.log(`\n      ${formatCode(code)}\n`);
    console.log("📱 Open WhatsApp → Settings → Linked Devices → Link a Device → Link with phone number instead");
    console.log("⏰ Enter the code soon, it expires in about a minute.\n");
  } catch (error) {
    sock.__pairingRequested = false;
    config.logger.error({ session: bot.sessionId, err: error }, "Failed to request pairing code");
    console.error(`[${bot.sessionId}] Could not get a pairing code: ${error.message}`);
  }
  return true;
}

module.exports = {
  isLocalSession,
  pairingNumberFor,
  chooseLoginMethod,
  handlePairing,
  formatCode,
  cleanNumber,
};
