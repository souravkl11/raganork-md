// signal handling, graceful shutdown, and last-resort error handlers
const { logger } = require("../config");

const shutdownTasks = [];
let shuttingDown = null;
let installed = false;
const stats = { unhandledRejections: 0, startedAt: Date.now() };

const recentlyPrinted = new Map();
const PRINT_EVERY_MS = 60 * 1000;

function onShutdown(task) {
  shutdownTasks.push(task);
}

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

// not unref'd: it must fire even if nothing else keeps the loop alive
function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(resolve, ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

const SUPERVISOR_ENV = ["pm_id", "KOYEB_SERVICE_ID", "RENDER_SERVICE_ID", "RAILWAY_SERVICE_ID", "DYNO"];

function isSupervised(env = process.env) {
  return SUPERVISOR_ENV.some((key) => env[key] !== undefined && env[key] !== "");
}

let restarting = null;

// exits 0 and lets the supervisor/panel restart us; self-spawning next to one would run
// the session twice. SELF_RESTART=true opts in to spawning a detached copy.
function restart(
  reason = "restart",
  {
    exit = (code) => process.exit(code),
    spawn = (...args) => require("child_process").spawn(...args),
    env = process.env,
    shutdownTimeoutMs = 10000,
  } = {},
) {
  if (!restarting) {
    restarting = (async () => {
      await withTimeout(shutdown(reason), shutdownTimeoutMs);
      let code = 0;
      if (!isSupervised(env) && env.SELF_RESTART !== "true") {
        console.log("Exiting. Start the bot again (or set SELF_RESTART=true to restart in place).");
      } else if (!isSupervised(env)) {
        try {
          const child = spawn(process.execPath, [...process.execArgv, ...process.argv.slice(1)], {
            detached: true,
            stdio: "inherit",
            env,
          });
          child?.unref?.();
        } catch (err) {
          logger.error({ err }, "Could not start a new process, exiting");
          console.error("Could not start a new process:", err?.message || err);
          code = 1;
        }
      }
      exit(code);
    })();
  }
  return restarting;
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

  process.on("uncaughtException", (err) => {
    console.error("[uncaughtException]", err?.stack || err);
    logger.fatal({ err }, "Uncaught exception");
    withTimeout(shutdown("uncaughtException"), shutdownTimeoutMs).finally(() => exit(1));
  });
}

module.exports = { install, shutdown, restart, isSupervised, onShutdown, stats, handleUnhandledRejection };
