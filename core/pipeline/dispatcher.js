// finds the commands a message triggers and runs them.
//
// every matching command runs (not just the first). what changed from the old handler:
//
//  - lanes. a command with a pattern and no `on` is a user command (".ping", ".yt ..."):
//    those go through the command queue, one at a time per chat in arrival order, with a
//    global cap (CMD_CONCURRENCY, default 8) and a timeout (CMD_TIMEOUT seconds, default
//    300) that logs and frees the slot but never kills the command. everything with an
//    `on` event (afk, chatbot, mention, listeners that watch every text) runs at once,
//    outside the queue and the cap, exactly as before. otherwise one slow download would
//    delay the next message's listeners in that chat, and eight downloads in other chats
//    would stop every listener in the bot.
//  - the read receipt, the disabled notice and the loading reaction still happen the moment
//    the message arrives; only the command's own function waits its turn.
//  - errors go through the policy in ./errors.
//
// dispatch() returns as soon as the commands are started, so the message loop in core/bot.js
// never waits for a command.
const config = require("../../config");
const context = require("../context");
const { Message, Image, Video } = require("../constructors");
const { commands, patternFor, commandName } = require("../plugins/registry");
const { derived } = require("../config/derived");
const { isOwner } = require("../identity");
const { parseText } = require("./normalize");
const { classify, POLICY } = require("./errors");
const { createQueue } = require("./queue");

const disabledCommandList = derived("DISABLED_COMMANDS", (raw) =>
  typeof raw === "string" ? raw.split(",") : [],
);

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

// does this command want this message? `pattern` is the command's regex for the session
// (cmd.pattern unless the registry says otherwise). the pattern is tested against
// parsedText even when it is null, as the old handler did.
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

// may this sender run it? owner-only commands (fromMe) need the bot's own account, a
// message sent from it, or a sudo. group-update events are never gated.
const isOwnerMessage = (env) => Boolean(env.fromMe) || isOwner(env.sender, env.sock);

function permitted(cmd, env) {
  if (cmd.on === "group-update") return true;
  if (!cmd.fromMe) return true;
  return isOwnerMessage(env);
}

// the command name the disabled list is checked against, independent of anyone's prefix
const nameOf = commandName;

const isUserCommand = (cmd) => Boolean(cmd.pattern && !cmd.on);

async function react(env, cmd, emoji) {
  try {
    await env.sock.sendMessage(env.jid, { react: { text: emoji, key: env.msg.key } });
  } catch (error) {
    console.error(`Error sending reaction for command ${cmd.pattern}:`, error);
  }
}

// reply and reaction for a failed command, as POLICY says for its class
async function handleError(cmd, env, error) {
  if (config.NOLOG === "true") return;
  const kind = classify(error);
  const policy = POLICY[kind];
  if (policy.log === "error") {
    console.error(`[dispatcher] ${cmd.pattern || cmd.on} failed in ${env.jid}:`, error?.stack || error);
  } else if (policy.log === "warn") {
    console.warn(`[dispatcher] ${cmd.pattern || cmd.on} was rate limited in ${env.jid}: ${error?.message}`);
  } else if (policy.log === "debug") {
    config.logger?.debug?.({ err: error?.message }, "command failed on a connection error");
  }
  if (config.DEBUG) console.log(error);
  // the owner (or a sudo) still sees bug and rate-limit text in the chat: that is how
  // owners debug a plugin. everyone else only gets the reaction
  const ownerSees = (kind === "bug" || kind === "rate-limit") && isOwnerMessage(env);
  if ((policy.reply || ownerSees) && error?.message?.trim()) {
    try {
      await env.sock.sendMessage(
        env.jid,
        { text: "_" + error.message.trim() + "_" },
        { quoted: env.msg },
      );
    } catch {
      return;
    }
  }
  if (policy.react) await react(env, cmd, "❌");
}

const brokenConstructors = new WeakSet();

function build(cmd, env) {
  if (cmd.on === "image" || cmd.on === "photo") return new Image(env.sock, env.msg);
  if (cmd.on === "video") return new Video(env.sock, env.msg);
  return new Message(env.sock, env.msg);
}

// the steps that happen the moment the message arrives: the command read, the disabled
// notice, the loading reaction and building the message object. resolves to the function
// that runs the command, or null when there is nothing to run
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
  if (config.CMD_REACTION && isUserCommand(cmd)) await react(env, cmd, "🔃");
  const match = env.text ? env.parsedText.match(pattern) : null;

  let whats;
  try {
    whats = build(cmd, env);
  } catch (error) {
    // a listener whose event does not fit this message (an on: image listener without a
    // pattern is matched by every message). log it once per command, not per message
    if (!brokenConstructors.has(cmd.function)) {
      brokenConstructors.add(cmd.function);
      console.error(`[dispatcher] cannot build the message object for ${cmd.on}:`, error?.stack || error);
    }
    return null;
  }

  return async () => {
    try {
      await cmd.function(whats, match);
      if (config.CMD_REACTION && isUserCommand(cmd)) await react(env, cmd, "✅");
    } catch (error) {
      await handleError(cmd, env, error);
    }
  };
}

// starts one command. a user command takes its place in its chat's queue right here,
// before any await, so the queue order is the order messages arrived in and not the order
// their read receipts came back; the preparation runs alongside and the job waits for it
function runCommand(cmd, env, disabled, pattern) {
  const prepared = prepare(cmd, env, disabled, pattern);
  if (!isUserCommand(cmd)) return prepared.then((run) => run?.());
  prepared.catch(() => {}); // a failure is reported through the queued job below
  return queue(
    `${context.accountId() || "_"}:${env.jid}`,
    async () => {
      const run = await prepared;
      if (run) await run();
    },
    { name: String(cmd.pattern), jid: env.jid },
  );
}

// start every command this message triggers; resolves once they are started
function dispatch(env) {
  env.parsedText = parseText(env.text);
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

module.exports = { dispatch, matches, permitted, runCommand, handleError, queue };
