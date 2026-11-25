// .hatch: link another number as a new bot in this process, from chat (qr or pairing code)
const { Module } = require("../main");
const context = require("../core/context");
const hatchery = require("../core/session/hatchery");
const { isLocalSession, cleanNumber } = require("../core/session/terminal-login");
const { helpPrefix } = require("../core/plugins/registry");
const { getString } = require("./utils/lang");
const Lang = getString("hatch");

const WIZARD_TTL_MS = 3 * 60 * 1000;
// chat key -> { step: "confirm" | "method" | "number", at, action? }
const wizards = new Map();

const p = (text) => text.replaceAll("{p}", helpPrefix());
const isPhoneNumber = (digits) => digits.length >= 7 && digits.length <= 15;
const currentBot = () => context.current()?.bot || null;
const wizardKey = (m) => `${currentBot()?.sessionId || ""}|${m.jid}`;

function wizardFor(m) {
  const key = wizardKey(m);
  const state = wizards.get(key);
  if (state && Date.now() - state.at > WIZARD_TTL_MS) wizards.delete(key);
  return wizards.get(key) || null;
}

const setWizard = (m, step, extra = {}) => wizards.set(wizardKey(m), { step, at: Date.now(), ...extra });
const clearWizard = (m) => wizards.delete(wizardKey(m));

function describeBot(bot, index) {
  const linked = bot.authState?.hasAccountId?.();
  const number = linked ? `+${bot.authState.getAccountId()}` : Lang.NOT_LINKED;
  const status = bot.hatch ? Lang.LINKING : bot.isConnected ? Lang.ONLINE : Lang.OFFLINE;
  const source = hatchery.isHatchedId(bot.sessionId)
    ? Lang.SRC_HATCHED
    : isLocalSession(bot.sessionId)
      ? Lang.SRC_TERMINAL
      : Lang.SRC_WEB;
  return Lang.LIST_ITEM.format(index + 1, number, status, source);
}

// replies go through whichever socket the requesting bot has now, it may reconnect mid-link
function replier(parent, jid) {
  return async (content) => {
    if (!parent.sock || !parent.isConnected) return null;
    return await parent.inSession(() => parent.sock.sendMessage(jid, content));
  };
}

async function begin(m, method) {
  const parent = currentBot();
  const manager = parent?.manager;
  if (!manager) return await m.sendReply(Lang.FAILED);
  if (hatchery.isHatching()) return await m.sendReply(p(Lang.BUSY));
  if (method.type === "pairing" && hatchery.findBotByNumber(manager, method.number)) {
    return await m.sendReply(Lang.ALREADY_RUNNING.format(method.number));
  }

  const send = replier(parent, m.jid);
  let lastQr = null;
  let qrCount = 0;
  const dropLastQr = async () => {
    if (!lastQr) return;
    await send({ delete: lastQr }).catch(() => {});
    lastQr = null;
  };

  const report = async (event, data) => {
    if (event === "qr") {
      qrCount++;
      const image = await hatchery.qrPng(data.qr);
      const sent = await send({ image, caption: `${Lang.QR_CAPTION.format(qrCount)}\n\n${p(Lang.CANCEL_HINT)}` });
      await dropLastQr();
      lastQr = sent?.key || null;
    } else if (event === "code") {
      await send({ text: `${Lang.CODE_INTRO.format(data.number)}\n\n${p(Lang.CANCEL_HINT)}` });
      // alone in its own message so it copies cleanly
      await send({ text: data.code });
    } else if (event === "linked") {
      await dropLastQr();
      await send({ text: p(Lang.LINKED.format(data.number)) + (data.saved ? "" : `\n\n${Lang.NOT_SAVED}`) });
    } else if (event === "failed") {
      await dropLastQr();
      const text = {
        timeout: Lang.TIMEOUT,
        duplicate: Lang.DUPLICATE,
        pairing: Lang.PAIR_FAILED,
        cancelled: null,
      }[data.reason];
      if (text !== null) await send({ text: p(text ?? Lang.FAILED) });
    }
  };

  await m.sendReply(Lang.STARTING);
  try {
    await hatchery.startHatch({ manager, method, report });
  } catch (error) {
    if (error.code === "BUSY") return await m.sendReply(p(Lang.BUSY));
    throw error;
  }
}

async function list(m) {
  const manager = currentBot()?.manager;
  if (!manager) return await m.sendReply(Lang.FAILED);
  const lines = [...manager.bots.values()].map(describeBot);
  return await m.sendReply(`${Lang.LIST_HEADER}\n\n${lines.join("\n")}\n\n${p(Lang.LIST_FOOTER)}`);
}

async function remove(m, arg) {
  const self = currentBot();
  const manager = self?.manager;
  if (!manager) return await m.sendReply(Lang.FAILED);
  const bots = [...manager.bots.values()];
  const digits = cleanNumber(arg);
  if (!digits) return await m.sendReply(p(Lang.REMOVE_USAGE));
  // a short number is a list position, a long one a phone number
  const target =
    digits.length <= 3
      ? bots[parseInt(digits, 10) - 1]
      : bots.find((b) => b.authState?.hasAccountId?.() && b.authState.getAccountId() === digits);
  if (!target) return await m.sendReply(p(Lang.NO_SUCH_BOT));
  if (!hatchery.isHatchedId(target.sessionId)) return await m.sendReply(Lang.NOT_HATCHED);

  const number = target.authState?.hasAccountId?.() ? target.authState.getAccountId() : null;
  // removing the bot that is answering: reply while its socket is still up
  await m.sendReply(number ? Lang.REMOVED.format(number) : Lang.CANCELLED);
  await hatchery.removeHatched(manager, target);
}

Module(
  {
    pattern: "hatch(?: |$)(.*)",
    fromMe: true,
    desc: Lang.DESC,
    usage: Lang.USAGE,
    use: "system",
  },
  async (m, match) => {
    // a hatched number may belong to someone else: only SESSION bots manage the fleet
    if (hatchery.isHatchedId(currentBot()?.sessionId)) return await m.sendReply(Lang.MAIN_ONLY);
    const arg = (match[1] || "").trim();
    const [sub, ...rest] = arg.split(/\s+/);
    const word = (sub || "").toLowerCase();

    if (word === "list") return await list(m);
    if (word === "remove" || word === "del" || word === "delete") return await remove(m, rest.join(" "));
    if (word === "cancel" || word === "stop") {
      clearWizard(m);
      const stopped = await hatchery.cancelHatch();
      return await m.sendReply(stopped ? Lang.CANCELLED : Lang.NOTHING_TO_CANCEL);
    }

    if (hatchery.isHatching()) return await m.sendReply(p(Lang.BUSY));

    let action;
    const number = cleanNumber(word === "pair" || word === "code" ? rest.join("") : arg);
    if (word === "qr") action = { kind: "begin", method: { type: "qr" } };
    else if ((word === "pair" || word === "code") && !number) action = { kind: "ask-number" };
    else if (number) {
      if (!isPhoneNumber(number)) return await m.sendReply(Lang.BAD_NUMBER);
      action = { kind: "begin", method: { type: "pairing", number } };
    } else if (arg) return await m.sendReply(p(Lang.USAGE_HINT));
    else action = { kind: "menu" };

    // anyone in a group could scan the qr, so the owner says yes first
    if (m.isGroup) {
      setWizard(m, "confirm", { action });
      return await m.sendReply(p(Lang.GROUP_CONFIRM));
    }
    return await proceed(m, action);
  }
);

async function proceed(m, action) {
  if (action.kind === "begin") {
    clearWizard(m);
    return await begin(m, action.method);
  }
  if (action.kind === "ask-number") {
    setWizard(m, "number");
    return await m.sendReply(Lang.ASK_NUMBER);
  }
  setWizard(m, "method");
  return await m.sendReply(Lang.MENU);
}

// the wizard's follow-up replies; anything that isn't an answer passes through untouched
Module({ on: "text", fromMe: true }, async (m) => {
  if (!m.fromOwner || m.fromBot) return;
  const state = wizardFor(m);
  if (!state) return;
  const text = String(m.text || "").trim();
  const lower = text.toLowerCase();

  if (lower === "cancel" || lower === Lang.CANCEL_WORD.toLowerCase()) {
    clearWizard(m);
    return await m.sendReply(Lang.CANCELLED);
  }

  if (state.step === "confirm") {
    if (lower !== "yes" && lower !== "y" && lower !== Lang.YES_WORD.toLowerCase()) return;
    if (hatchery.isHatching()) {
      clearWizard(m);
      return await m.sendReply(p(Lang.BUSY));
    }
    return await proceed(m, state.action);
  }

  if (state.step === "method") {
    if (lower === "1" || lower === "qr") {
      clearWizard(m);
      return await begin(m, { type: "qr" });
    }
    if (lower === "2" || lower === "pair" || lower === "code") {
      setWizard(m, "number");
      return await m.sendReply(Lang.ASK_NUMBER);
    }
    return;
  }

  if (state.step === "number") {
    // only text made of phone-number characters counts as an answer
    if (!/^\+?[\d\s()-]+$/.test(text)) return;
    const number = cleanNumber(text);
    if (!isPhoneNumber(number)) return await m.sendReply(Lang.BAD_NUMBER);
    clearWizard(m);
    return await begin(m, { type: "pairing", number });
  }
});
