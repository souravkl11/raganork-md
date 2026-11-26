const qrcode = require("qrcode-terminal");
const config = require("../../config");
const { logger } = config;
const { CustomAuthState } = require("../auth");
const { startEvent } = require("../handler");
const Schedule = require("../schedulers");
const { bindings } = require("./baileys");
const { STABLE_CONNECTION_MS } = require("./reconnect");
const { sendStartMessage } = require("./start-message");
const { handlePairing, isLocalSession } = require("./terminal-login");
const { isHatchedId, forgetHatched, removeHatched } = require("./hatchery");

async function handleConnectionUpdate(bot, update) {
  const { connection, lastDisconnect, qr } = update;
  const pairing = Boolean(qr) && (await handlePairing(bot, bot.sock));
  if (qr && !pairing && bot.hatch?.onQr) {
    await bot.hatch.onQr(qr);
  } else if (qr && !pairing) {
    logger.info(
      { session: bot.sessionId },
      `QR code received, generating terminal QR...`,
    );
    console.log(
      `\n🔗 [${bot.sessionId}] Scan this QR code with WhatsApp:`,
    );
    console.log(`┌${"─".repeat(50)}┐`);
    qrcode.generate(qr, { small: true }, (qrcode) => {
      const lines = qrcode.split("\n");
      lines.forEach((line) => {
        console.log(`│${line.padEnd(48)}│`);
      });
    });
    console.log(`└${"─".repeat(50)}┘`);
    console.log(
      `📱 Open WhatsApp → Settings → Linked Devices → Link a Device`,
    );
    console.log(`⏰ QR code expires in 20 seconds. Get ready to scan!\n`);
  }
  const sessionLogger = logger.child({ session: bot.sessionId });

  if (connection === "close") {
    const statusCode = lastDisconnect?.error?.output?.statusCode;
    const shouldReconnect = statusCode !== bindings.DisconnectReason.loggedOut;
    sessionLogger.info(
      { status: statusCode, reconnect: shouldReconnect },
      `Connection closed.`,
    );

    bot.isConnected = false;
    bot._clearConnectionTimers();
    await Schedule.cleanup(bot.sessionId);
    bot.manager?.onSessionStateChange?.();

    if (bot.hatch?.onClose && (await bot.hatch.onClose(statusCode))) return;

    if (statusCode === bindings.DisconnectReason.loggedOut) {
      bot.loggedOut = true;
      bot.stopReason = "logged_out";
      sessionLogger.error(
        `Logged out. Please delete session data and rescan QR.`,
      );
      console.log(
        isHatchedId(bot.sessionId)
          ? `❌ [${bot.sessionId}] HATCHED BOT LOGGED OUT. Link it again with the hatch command.`
          : isLocalSession(bot.sessionId)
            ? `❌ [${bot.sessionId}] SESSION LOGGED OUT. Restart the bot to log in again from the terminal (or rename this SESSION entry, e.g. qr:newname).`
            : `❌ [${bot.sessionId}] SESSION LOGGED OUT. Please rescan QR and update SESSION.`,
      );
      bot._teardownSocket();
      await CustomAuthState.deleteSessionById(bot.sessionId);
      await forgetHatched(bot);
    } else if (
      statusCode === bindings.DisconnectReason.connectionReplaced &&
      bot.reconnectAttempts >= bot.maxReconnectAttempts
    ) {
      // two hosts running one session would otherwise kick each other forever
      bot.stopReason = "replaced";
      sessionLogger.error(
        { attempts: bot.reconnectAttempts },
        `Session replaced by another instance, giving up.`,
      );
      console.error(
        `[${bot.sessionId}] ERROR: Session is being used somewhere else. Not reconnecting.`,
      );
      bot._teardownSocket();
    } else {
      bot._teardownSocket();
      bot._scheduleReconnect(statusCode);
    }
  } else if (connection === "open") {
    if (bot.hatch?.onOpen && !(await bot.hatch.onOpen())) return;
    // logout needs an open socket
    if (bot.forceLogout) {
      bot.forceLogout = false;
      const number = bot.authState?.getAccountId?.();
      try {
        await removeHatched(bot.manager, bot);
        console.log(`- 🚪 [${bot.sessionId}] Hatched bot +${number} logged out (LOGOUT_HATCHED).`);
      } catch (error) {
        logger.error({ session: bot.sessionId, err: error }, `Failed to log out hatched bot`);
      }
      return;
    }
    sessionLogger.info(
      { botId: bot.sock.user?.id },
      `Connection established.`,
    );
    bot.isConnected = true;
    bot.lastOpenAt = Date.now();
    bot.stopReason = null;
    bot.loggedOut = false;
    bot.loginMethod = null;
    // only forgive past failures once the link has stayed up for a while
    if (bot.stableTimer) clearTimeout(bot.stableTimer);
    bot.stableTimer = setTimeout(() => {
      bot.stableTimer = null;
      bot.reconnectAttempts = 0;
    }, STABLE_CONNECTION_MS);
    bot.stableTimer.unref?.();

    // before any owner notice, so legacy SUDO numbers already resolve to lids
    try {
      const { migrateSudoToLID } = require("../database");
      await migrateSudoToLID(bot.sock);
    } catch (error) {
      logger.error(
        { session: bot.sessionId, err: error },
        `Failed to migrate SUDO to LIDs`,
      );
    }

    if (!bot.initialConnectMessageSent) {
      console.log(
        `- ✅ [${bot.sessionId}] Bot started: +${
          bot.sock.user?.id.split(":")[0]
        }`,
      );
      try {
        await sendStartMessage(bot.sock);
        sessionLogger.info(`Initial start message sent`);
      } catch (error) {
        logger.error(
          { session: bot.sessionId, err: error },
          `Failed to send start message`,
        );
      }
      bot.initialConnectMessageSent = true;
    } else {
      sessionLogger.debug(
        `Reconnection successful, skipping start message.`,
      );
    }

    try {
      await startEvent(bot.sock);
    } catch (error) {
      logger.error(
        { session: bot.sessionId, err: error },
        `Failed to execute start event handlers`,
      );
    }

    try {
      await Schedule(bot.sock, bot.sessionId);
    } catch (error) {
      logger.error(
        { session: bot.sessionId, err: error },
        `Failed to start schedules`,
      );
    }
    bot.manager?.onSessionStateChange?.();
  }
}

module.exports = { handleConnectionUpdate };
