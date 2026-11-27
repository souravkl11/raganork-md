// runs every command a message matches. user commands (pattern, no `on`) go through a
// per-chat queue with a global cap; `on` listeners run immediately outside it.
const config = require("../../config");
const context = require("../context");
const { Message, Image, Video } = require("../constructors");
const { commands, patternFor, commandName, currentHandlerPrefix } = require("../plugins/registry");
const { derived } = require("../config/derived");
const { parseBool } = require("../config/store");
const { isOwner } = require("../identity");
const { parseText } = require("./normalize");
const { classify, POLICY } = require("./errors");
const { createQueue } = require("./queue");

const disabledCommandList = derived("DISABLED_COMMANDS", (raw) =>
  typeof raw === "string" ? raw.split(",") : [],
);

const parseAliases = (raw) => {
  const map = new Map();
  for (const pair of typeof raw === "string" ? raw.split(",") : []) {
    const [alias, target] = pair.split("=").map((s) => s?.trim().toLowerCase());
    if (alias && target) map.set(alias, target);
  }
  return map;
};
const aliasMap = derived("ALIASES", parseAliases);

const wordAfterPrefix = new Map();
function applyAlias(text) {
  const aliases = aliasMap();
  if (!aliases.size || !text) return text;
  const prefix = currentHandlerPrefix();
  let re = wordAfterPrefix.get(prefix);
  if (!re) {
    wordAfterPrefix.clear();
    re = new RegExp(`(${prefix})(\\S+)`, "su");
    wordAfterPrefix.set(prefix, re);
  }
  const m = text.match(re);
  const target = m && aliases.get(m[2].toLowerCase());
  return target ? m[1] + target + text.slice(m[0].length) : text;
}

const positiveInt = (value, fallback) => {
  const n = parseInt(value, 10);
  return n > 0 ? n : fallback;
};

const queue = createQueue({
  limit: () => positiveInt(config.CMD_CONCURRENCY, 8),
  timeout: () => positiveInt(config.CMD_TIMEOUT, 300) * 1000,
  onTimeout: ({ name, jid }) =>
    console.warn(`[dispatcher] ${name} in ${jid} is still running after the command timeout`),
});

function matches(cmd, env, pattern = cmd.pattern) {
  const { msg, text, parsedText } = env;
  const patternOk = pattern === undefined || pattern.test(parsedText);
  return Boolean(
    ((cmd.on === "image" || cmd.on === "photo") && msg.message && msg.message.imageMessage !== null && patternOk) ||
      (pattern !== undefined && pattern.test(parsedText)) ||
      (cmd.on === "text" && text) ||
      (cmd.on === "button" &&
        msg.message &&
        (msg.message.buttonsResponseMessage ||
          msg.message.listResponseMessage ||
          msg.message.templateButtonReplyMessage)) ||
      (cmd.on === "message" && msg.message) ||
      (cmd.on === "group-update" && msg.messageStubType) ||
      (cmd.on === "video" && msg.message && msg.message.videoMessage !== null && patternOk),
  );
}

const isOwnerMessage = (env) => Boolean(env.fromMe) || isOwner(env.sender, env.sock);

function permitted(cmd, env) {
  if (cmd.on === "group-update") return true;
  if (!cmd.fromMe) return true;
  return isOwnerMessage(env);
}

const nameOf = commandName;

const isUserCommand = (cmd) => Boolean(cmd.pattern && !cmd.on);
// the key stays a string, so ".setvar CMD_REACTION=false" would otherwise be truthy
const showReactions = (cmd) =>
  isUserCommand(cmd) && (parseBool(config.CMD_REACTION) ?? Boolean(config.CMD_REACTION));

async function react(env, cmd, emoji) {
  try {
    await env.sock.sendMessage(env.jid, { react: { text: emoji, key: env.msg.key } });
  } catch (error) {
    console.error(`Error sending reaction for command ${cmd.pattern}:`, error);
  }
}

// DB errors repeat on every message while it's down: log at most once a minute
const INFRA_LOG_INTERVAL = 60_000;
let infraLoggedAt = 0;
let infraSkipped = 0;
function logInfra(cmd, error) {
  const now = Date.now();
  if (now - infraLoggedAt < INFRA_LOG_INTERVAL) {
    infraSkipped++;
    return;
  }
  const skipped = infraSkipped ? ` (${infraSkipped} more since the last log)` : "";
  infraLoggedAt = now;
  infraSkipped = 0;
  console.error(`[dispatcher] database error in ${cmd.pattern || cmd.on}${skipped}:`, error?.message || error);
}

async function handleError(cmd, env, error) {
  const crossed = await reportError(cmd, env, error);
  if (!crossed && showReactions(cmd)) await react(env, cmd, "");
}

async function reportError(cmd, env, error) {
  if (config.NOLOG === "true") return false;
  const kind = classify(error);
  const policy = POLICY[kind];
  if (policy.log === "infra") {
    logInfra(cmd, error);
  } else if (policy.log === "error") {
    console.error(`[dispatcher] ${cmd.pattern || cmd.on} failed in ${env.jid}:`, error?.stack || error);
  } else if (policy.log === "warn") {
    console.warn(`[dispatcher] ${cmd.pattern || cmd.on} was rate limited in ${env.jid}: ${error?.message}`);
  } else if (policy.log === "debug") {
    config.logger?.debug?.({ err: error?.message }, "command failed on a connection error");
  }
  if (config.DEBUG) console.log(error);
  // owners see bug/rate-limit text so they can debug plugins
  const ownerSees = (kind === "bug" || kind === "rate-limit") && isOwnerMessage(env);
  // listeners run on messages not addressed to the bot, so never post their errors
  if (isUserCommand(cmd) && (policy.reply || ownerSees) && error?.message?.trim()) {
    try {
      await env.sock.sendMessage(
        env.jid,
        { text: "_" + error.message.trim() + "_" },
        { quoted: env.msg },
      );
    } catch {
      return false;
    }
  }
  if (!policy.react || !isUserCommand(cmd)) return false;
  await react(env, cmd, "❌");
  return true;
}

const brokenConstructors = new WeakSet();

function build(cmd, env) {
  if (cmd.on === "image" || cmd.on === "photo") return new Image(env.sock, env.msg);
  if (cmd.on === "video") return new Video(env.sock, env.msg);
  return new Message(env.sock, env.msg);
}

async function prepare(cmd, env, disabled, pattern) {
  const { msg, sock, jid } = env;
  if (!config.READ_MESSAGES && config.READ_COMMAND && cmd.on === undefined) {
    await sock.readMessages([msg.key]);
  }
  if (cmd.pattern && disabled.includes(nameOf(cmd))) {
    await sock.sendMessage(
      jid,
      { text: "_The command you are trying to execute is currently disabled by owner!_" },
      { quoted: msg },
    );
    return null;
  }
  if (showReactions(cmd)) await react(env, cmd, "🔃");
  const match = env.text ? env.parsedText.match(pattern) : null;

  let whats;
  try {
    whats = build(cmd, env);
    if (isUserCommand(cmd)) whats.useCaptionMedia?.();
  } catch (error) {
    if (!brokenConstructors.has(cmd.function)) {
      brokenConstructors.add(cmd.function);
      console.error(`[dispatcher] cannot build the message object for ${cmd.on}:`, error?.stack || error);
    }
    return null;
  }

  return async () => {
    try {
      await cmd.function(whats, match);
      if (showReactions(cmd)) await react(env, cmd, "✅");
    } catch (error) {
      await handleError(cmd, env, error);
    }
  };
}

function runCommand(cmd, env, disabled, pattern) {
  const prepared = prepare(cmd, env, disabled, pattern);
  if (!isUserCommand(cmd) || cmd.bypassQueue) return prepared.then((run) => run?.());
  prepared.catch(() => {});
  return queue(
    `${context.accountId() || "_"}:${env.jid}`,
    async () => {
      const run = await prepared;
      if (run) await run();
    },
    { name: String(cmd.pattern), jid: env.jid },
  );
}

function dispatch(env) {
  env.parsedText = applyAlias(parseText(env.text));
  const disabled = disabledCommandList();
  for (const cmd of commands) {
    try {
      const pattern = patternFor(cmd);
      if (!matches(cmd, env, pattern) || !permitted(cmd, env)) continue;
      runCommand(cmd, env, disabled, pattern).catch((error) => {
        console.error(`[dispatcher] ${cmd.pattern || cmd.on} failed before it started:`, error?.stack || error);
      });
    } catch (error) {
      console.error("[dispatcher] could not match a command:", error?.stack || error);
    }
  }
}

module.exports = { dispatch, matches, permitted, runCommand, handleError, queue, parseAliases, applyAlias };
