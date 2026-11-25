const config = require("../../config");
const { isHatchedId } = require("./hatchery");

const isLocalSession = (sessionId) =>
  (config.LOCAL_SESSIONS || []).includes(sessionId) || isHatchedId(sessionId);

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

const PROMPT_TIMEOUT_MS = 2 * 60 * 1000;

// panel consoles and pm2 give no input and would hang here
async function askNumber(sessionId, input = process.stdin, output = process.stdout) {
  if (!input.isTTY) return null;
  const readline = require("readline");
  const rl = readline.createInterface({ input, output });
  const question = (text) => new Promise((resolve) => rl.question(text, resolve));
  const timer = setTimeout(() => rl.close(), PROMPT_TIMEOUT_MS);
  const closed = new Promise((resolve) => rl.once("close", () => resolve(null)));
  try {
    for (let tries = 0; tries < 3; tries++) {
      const answer = await Promise.race([
        question(`📱 [${sessionId}] Enter your WhatsApp number with country code (e.g. 919876543210): `),
        closed,
      ]);
      if (answer === null) return null;
      const number = cleanNumber(answer);
      if (isValidNumber(number)) return number;
      console.log(`⚠️ "${answer.trim()}" doesn't look like a phone number.`);
    }
    return null;
  } finally {
    clearTimeout(timer);
    rl.close();
  }
}

async function chooseLoginMethod(sessionId, env = process.env, input = process.stdin) {
  if ((config.LOGIN_METHODS || {})[sessionId] !== "pair") return { type: "qr" };
  const number = pairingNumberFor(sessionId, env);
  if (number && isValidNumber(number)) return { type: "pairing", number };
  if (!number) {
    const typed = await askNumber(sessionId, input);
    if (typed) return { type: "pairing", number: typed };
  }
  console.warn(
    number
      ? `⚠️ [${sessionId}] PAIRING_NUMBER "${number}" doesn't look like a phone number, showing a QR code instead.`
      : `⚠️ [${sessionId}] No number for SESSION=pair. This console takes no input, so set PAIRING_NUMBER (your number with country code, e.g. 919876543210). Showing a QR code instead.`,
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
    if (bot.hatch?.onCode) {
      await bot.hatch.onCode(formatCode(code));
      return true;
    }
    console.log(`\n🔗 [${bot.sessionId}] Pairing code for +${method.number}:`);
    console.log(`\n      ${formatCode(code)}\n`);
    console.log("📱 Open WhatsApp → Settings → Linked Devices → Link a Device → Link with phone number instead");
    console.log("⏰ Enter the code soon, it expires in about a minute.\n");
  } catch (error) {
    sock.__pairingRequested = false;
    config.logger.error({ session: bot.sessionId, err: error }, "Failed to request pairing code");
    console.error(`[${bot.sessionId}] Could not get a pairing code: ${error.message}`);
    await bot.hatch?.onPairingError?.(error);
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
