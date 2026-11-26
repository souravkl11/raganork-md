const http = require("http");
const lifecycle = require("./lifecycle");
const config = require("../config");
const { SESSION, logger } = config;
const { initializeDatabase } = require("./database");
const { BotManager } = require("./session/manager");
const { getQueueLength } = require("./store");
const {
  ensureTempDir,
  TEMP_DIR,
  loadBaileys,
  initializeKickBot,
  cleanupKickBot,
  startTempSweeper,
} = require("./helpers");

const toMB = (bytes) => Math.round(bytes / 1024 / 1024);

function buildStatus(manager) {
  const mem = process.memoryUsage();
  return {
    // session ids are backend keys: never publish them
    sessions: [...(manager?.bots?.values() || [])].map((bot, i) => ({
      session: i + 1,
      connected: Boolean(bot.isConnected),
      lastOpenAt: bot.lastOpenAt ? new Date(bot.lastOpenAt).toISOString() : null,
      reconnectAttempts: bot.reconnectAttempts,
      loggedOut: Boolean(bot.loggedOut),
      stopReason: bot.stopReason || null,
    })),
    uptimeSec: Math.round(process.uptime()),
    rssMB: toMB(mem.rss),
    heapUsedMB: toMB(mem.heapUsed),
    unhandledRejections: lifecycle.stats.unhandledRejections,
    messageQueue: getQueueLength(),
  };
}

function createServer(manager) {
  return http.createServer((req, res) => {
    const path = (req.url || "").split("?")[0];
    if (path === "/health") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("OK");
    } else if (path === "/status") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(buildStatus(manager)));
    } else {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("Raganork Bot is running!");
    }
  });
}

async function boot() {
  lifecycle.install();

  ensureTempDir();
  startTempSweeper();
  logger.info(`Created temporary directory at ${TEMP_DIR}`);
  console.log(`Raganork-MD v${require("../package.json").version}`);
  console.log(`- Configured sessions: ${SESSION.join(", ")}\n- For multiple sessions, set SESSION=session1,session2,session3`);
  logger.info(`Configured sessions: ${SESSION.join(", ")}`);
  if (SESSION.length === 0) {
    const warnMsg =
      "⚠️ No sessions configured. Please set SESSION environment variable.";
    console.warn(warnMsg);
    logger.warn(warnMsg);
    return null;
  }

  try {
    await initializeDatabase();
    console.log("- Database initialized");
    logger.info("Database initialized successfully.");
  } catch (dbError) {
    console.error(
      "🚫 Failed to initialize database or load configuration. Bot cannot start.",
      dbError
    );
    logger.fatal(
      { err: dbError },
      "🚫 Failed to initialize database or load configuration. Bot cannot start."
    );
    throw dbError;
  }

  await require("./schedulers").updateBeforeConnect();
  await require("./session/start-message").recordStartedVersion();

  await loadBaileys();
  await require("./handler").ready;

  const manager = new BotManager();
  lifecycle.onShutdown(() => cleanupKickBot());
  lifecycle.onShutdown(() => manager.shutdown());

  await manager.initializeBots();
  console.log("- Bot initialization complete.");
  logger.info("Bot initialization complete");

  let server = null;
  if (process.env.USE_SERVER !== "false") {
    const PORT = process.env.PORT || 3000;
    server = createServer(manager);
    server.listen(PORT, () => {
      logger.info(`Web server listening on port ${PORT}`);
    });
    lifecycle.onShutdown(() => new Promise((resolve) => server.close(resolve)));
  }

  initializeKickBot();
  return { manager, server };
}

module.exports = { boot, createServer, buildStatus };
