const crypto = require("crypto");
const { logger } = require("../../config");

const REGISTRY_KEY = "HATCHED_SESSIONS";
const ID_PREFIX = "hatch-";
// baileys gives up on its own well before this; this only catches a socket that hangs
const LINK_TIMEOUT_MS = 5 * 60 * 1000;

const isHatchedId = (id) => typeof id === "string" && id.startsWith(ID_PREFIX);
const newHatchId = () => ID_PREFIX + crypto.randomBytes(4).toString("hex");

let active = null;
let registryLock = Promise.resolve();

function parseRegistry(value) {
  return [...new Set(String(value || "").split(",").map((s) => s.trim()).filter(isHatchedId))];
}

// throws on a db error, so callers can tell "none saved" from "couldn't read"
async function loadRegistry() {
  const { BotVariable } = require("../database");
  const row = await BotVariable.findByPk(REGISTRY_KEY, { raw: true });
  return parseRegistry(row?.value);
}

function updateRegistry(change) {
  const run = registryLock.then(async () => {
    const { BotVariable } = require("../database");
    const ids = change(await loadRegistry());
    await BotVariable.upsert({ key: REGISTRY_KEY, value: ids.join(",") });
  });
  registryLock = run.catch(() => {});
  return run;
}

const register = (id) => updateRegistry((ids) => (ids.includes(id) ? ids : [...ids, id]));
const unregister = (id) => updateRegistry((ids) => ids.filter((x) => x !== id));

const accountOf = (bot) => bot.authState?.getAccountId?.() || bot.accountId;

function findBotByNumber(manager, number, except = null) {
  return [...manager.bots.values()].find(
    (b) => b !== except && !b.stopped && b.authState?.hasAccountId?.() && accountOf(b) === number,
  );
}

async function dropSession(manager, bot) {
  const { CustomAuthState } = require("../auth");
  if (manager.bots.get(bot.sessionId) === bot) manager.bots.delete(bot.sessionId);
  await CustomAuthState.deleteSessionById(bot.sessionId).catch((err) =>
    logger.error({ session: bot.sessionId, err }, "Failed to delete hatched session"),
  );
  await unregister(bot.sessionId).catch((err) =>
    logger.error({ session: bot.sessionId, err }, "Failed to unregister hatched session"),
  );
  manager.onSessionStateChange?.();
}

async function stopSocket(bot, { logout = false } = {}) {
  bot.stopped = true;
  bot._clearConnectionTimers();
  const sock = bot.sock;
  if (logout && sock) {
    try {
      await sock.logout();
    } catch (_) {}
  }
  bot._teardownSocket();
  bot.sock = null;
  bot.isConnected = false;
}

// report(event, data) is how the caller hears back: qr, code, linked, failed
async function startHatch({ manager, method, report }) {
  if (active) throw Object.assign(new Error("A bot is already being linked"), { code: "BUSY" });
  const { WhatsAppBot } = require("./bot");
  const { bindings } = require("./baileys");

  const bot = new WhatsAppBot(newHatchId());
  bot.manager = manager;
  const run = { bot, done: false, timer: null };
  active = run;

  const emit = async (event, data = {}) => {
    try {
      await report(event, data);
    } catch (err) {
      logger.error({ session: bot.sessionId, event, err }, "Hatch report failed");
    }
  };

  const fail = async (reason, { logout = false } = {}) => {
    if (run.done) return;
    run.done = true;
    clearTimeout(run.timer);
    if (active === run) active = null;
    bot.hatch = null;
    await stopSocket(bot, { logout });
    await dropSession(manager, bot);
    await emit("failed", { reason });
  };
  run.fail = fail;

  bot.hatch = {
    method,
    onQr: (qr) => emit("qr", { qr }),
    onCode: (code) => emit("code", { code, number: method.number }),
    onPairingError: () => fail("pairing"),
    // true means the close was handled here and normal reconnect logic must not run
    onClose: async (statusCode) => {
      if (run.done) return true;
      const { DisconnectReason } = bindings;
      // a scan or pairing ends with restartRequired; once creds are linked, reconnect normally
      if (statusCode === DisconnectReason.restartRequired || bot.authState?.isLinked()) return false;
      await fail(statusCode === DisconnectReason.timedOut ? "timeout" : "closed");
      return true;
    },
    // false means the new link was rejected and the open must not continue
    onOpen: async () => {
      if (run.done) return true;
      const number = accountOf(bot);
      if (findBotByNumber(manager, number, bot)) {
        await fail("duplicate", { logout: true });
        return false;
      }
      run.done = true;
      clearTimeout(run.timer);
      if (active === run) active = null;
      bot.hatch = null;
      bot.accountId = number;
      bot.accountResolved = true;
      let saved = true;
      try {
        await register(bot.sessionId);
      } catch (err) {
        saved = false;
        logger.error({ session: bot.sessionId, err }, "Failed to save hatched session");
      }
      console.log(`- 🐣 [${bot.sessionId}] Hatched a new bot: +${number}`);
      await emit("linked", { number, saved });
      return true;
    },
  };

  manager.bots.set(bot.sessionId, bot);
  run.timer = setTimeout(() => fail("timeout"), LINK_TIMEOUT_MS);
  run.timer.unref?.();
  try {
    await bot.initialize();
  } catch (err) {
    logger.error({ session: bot.sessionId, err }, "Failed to start hatched bot");
    await fail("error");
  }
  return bot;
}

async function cancelHatch() {
  if (!active) return false;
  await active.fail("cancelled", { logout: true });
  return true;
}

async function removeHatched(manager, bot) {
  if (!isHatchedId(bot.sessionId)) throw new Error("Only hatched bots can be removed from chat");
  if (active?.bot === bot) return cancelHatch();
  await stopSocket(bot, { logout: true });
  await dropSession(manager, bot);
  return true;
}

// called after whatsapp logged a running hatched bot out (unlinked from the phone)
async function forgetHatched(bot) {
  if (!isHatchedId(bot.sessionId)) return;
  if (bot.manager) await dropSession(bot.manager, bot);
  else await unregister(bot.sessionId).catch(() => {});
}

function qrPng(text, { scale = 10, margin = 4 } = {}) {
  const QRCode = require("qrcode-terminal/vendor/QRCode");
  const QRErrorCorrectLevel = require("qrcode-terminal/vendor/QRCode/QRErrorCorrectLevel");
  const Jimp = require("jimp");
  const qr = new QRCode(-1, QRErrorCorrectLevel.L);
  qr.addData(text);
  qr.make();
  const count = qr.getModuleCount();
  const size = (count + margin * 2) * scale;
  const image = new Jimp(size, size, 0xffffffff);
  const { data } = image.bitmap;
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (!qr.isDark(row, col)) continue;
      image.scan((col + margin) * scale, (row + margin) * scale, scale, scale, (_x, _y, idx) => {
        data[idx] = data[idx + 1] = data[idx + 2] = 0;
      });
    }
  }
  return image.getBufferAsync(Jimp.MIME_PNG);
}

module.exports = {
  REGISTRY_KEY,
  isHatchedId,
  loadRegistry,
  register,
  unregister,
  startHatch,
  cancelHatch,
  removeHatched,
  forgetHatched,
  findBotByNumber,
  isHatching: () => Boolean(active),
  hatchingBot: () => active?.bot || null,
  qrPng,
};
