// process-level lifecycle: signal handling, graceful shutdown, and last-resort
// error handlers so one bad promise in a plugin cannot take the bot down.
const { logger } = require("../config");

const shutdownTasks = [];
let shuttingDown = null;
let installed = false;
const stats = { unhandledRejections: 0, startedAt: Date.now() };

// last-shown time per message, so a rejection in a hot path cannot flood the logs
const recentlyPrinted = new Map();
const PRINT_EVERY_MS = 60 * 1000;

function onShutdown(task) {
  shutdownTasks.push(task);
}

// idempotent: every caller awaits the same run
function shutdown(reason = "shutdown") {
  if (!shuttingDown) {
    shuttingDown = (async () => {
      console.log(`\nShutting down (${reason})...`);
      logger.info({ reason }, "Shutting down");
      for (const task of shutdownTasks) {
        try {
          await task(reason);
        } catch (err) {
          logger.error({ err }, "Shutdown task failed");
        }
      }
    })();
  }
  return shuttingDown;
}

// the timer is not unref'd: if nothing else keeps the loop alive it must still fire,
// otherwise the process would exit 0 in the middle of a failed shutdown
function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(resolve, ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function handleUnhandledRejection(reason) {
  stats.unhandledRejections++;
  logger.error({ err: reason }, "Unhandled promise rejection");
  const key = String(reason?.message || reason).slice(0, 200);
  const now = Date.now();
  if (now - (recentlyPrinted.get(key) || 0) < PRINT_EVERY_MS) return;
  recentlyPrinted.set(key, now);
  if (recentlyPrinted.size > 200) recentlyPrinted.clear();
  console.error("[unhandledRejection]", reason?.stack || reason);
}

function install({ exit = (code) => process.exit(code), shutdownTimeoutMs = 10000 } = {}) {
  if (installed) return;
  installed = true;

  const stop = (signal) => {
    withTimeout(shutdown(signal), shutdownTimeoutMs).finally(() => exit(0));
  };
  process.on("SIGINT", () => stop("SIGINT"));
  process.on("SIGTERM", () => stop("SIGTERM"));

  process.on("unhandledRejection", handleUnhandledRejection);

  // state may be corrupt after an uncaught exception: save what we can and exit,
  // the supervisor (pm2 / platform) restarts us
  process.on("uncaughtException", (err) => {
    console.error("[uncaughtException]", err?.stack || err);
    logger.fatal({ err }, "Uncaught exception");
    withTimeout(shutdown("uncaughtException"), shutdownTimeoutMs).finally(() => exit(1));
  });
}

module.exports = { install, shutdown, onShutdown, stats, handleUnhandledRejection };
