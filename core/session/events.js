const config = require("../../config");
const { logger } = config;
const { groupUpdate, handler } = require("../handler");
const { handleCall } = require("./features/calls");
const { ANTI_DELETE_MODES } = require("./features/antidelete");
const { readEncryptedEdit } = require("./features/message-edit");
const { bridgeStatusStanzas, logGroupFrames } = require("./features/status-stanza");
const { debugOn } = require("../helpers");

function wireEvents(bot) {
  bridgeStatusStanzas(bot.sock);
  logGroupFrames(bot.sock);
  bot._on("creds.update", async (newCreds) => {
    try {
      logger.info(
        { session: bot.sessionId },
        `Credentials updated by Baileys.`,
      );
      await bot.authState.saveCredentials(newCreds);
    } catch (error) {
      logger.error(
        { session: bot.sessionId, err: error },
        `Failed to save credentials`,
      );
    }
  });

  logger.info(
    { session: bot.sessionId },
    `Using database auth credentials handler`,
  );

  bot._on("call", (callUpdate) => handleCall(bot, callUpdate));

  bot._on("group-participants.update", async (update) => {
    try {
      await groupUpdate(bot.sock, update);
      const metadata = await bot.sock.groupMetadata(update.id);
      bot.groupCache.set(update.id, metadata);
      logger.debug(
        { session: bot.sessionId, jid: update.id, action: update.action },
        `Group participants updated in cache`,
      );
    } catch (err) {
      logger.warn(
        { session: bot.sessionId, jid: update.id, err },
        `Failed to update group participants`,
      );
    }
  });

  bot._on("messages.upsert", async (upsert) => {
    for (const message of upsert.messages) {
      if (message.key && message.key.id && message.key.remoteJid) {
        const cacheKey = `${message.key.remoteJid}_${message.key.id}`;
        bot.messageCache.set(cacheKey, message);
      }
    }
    // DEBUG: log statuses before anything drops them; undecryptable ones never reach [msg]
    if (debugOn()) {
      for (const m of upsert.messages) {
        if (m.key?.remoteJid !== "status@broadcast") continue;
        const content = m.message ? Object.keys(m.message).join(",") : "no content";
        const stub = m.messageStubType ? ` stub ${m.messageStubType}: ${(m.messageStubParameters || []).join(", ")}` : "";
        console.log(`[status] ${upsert.type} ${m.key.participant || "?"} ${m.key.id} | ${content}${stub}`);
      }
    }
    if (upsert.type === "notify") {
      // the handler only reads messages[0]
      for (const m of upsert.messages) {
        try {
          // an encrypted edit is handled as the new message it carries, never as the empty envelope
          const encrypted = await readEncryptedEdit(bot, m);
          const incoming = encrypted ? encrypted.edited : m;
          if (!incoming) {
            logger.debug({ session: bot.sessionId, reason: encrypted.reason }, `Encrypted edit skipped`);
            continue;
          }
          await handler({ messages: [incoming], type: upsert.type }, bot.sock, this);
        } catch (e) {
          logger.error(
            { session: bot.sessionId, err: e },
            `Message handler error`,
          );
          console.error(
            `[${bot.sessionId}] ERROR: Message handler failed. Details:`,
            e.message,
          );
        }
      }
    }
  });

  bot._on("messages.update", async (updates) => {
    for (const update of updates) {
      if (!update.key || !update.key.remoteJid || !update.key.id) {
        continue;
      }

      try {
        if (update.update?.message?.editedMessage) {
          const newMessageObject = {
            key: update.key,
            message: update.update.message.editedMessage.message,
          };
          bot.sock.ev.emit("messages.upsert", {
            messages: [newMessageObject],
            type: "notify",
          });
          continue;
        }

        if (
          ANTI_DELETE_MODES.includes(config.ANTI_DELETE) &&
          !update.update.message &&
          update.update?.messageStubType === 1
        ) {
          await bot._handleAntiDelete(update);
        }
      } catch (error) {
        logger.error(
          { session: bot.sessionId, key: update.key, err: error },
          `Error processing message update`,
        );
      }
    }
  });
}

module.exports = { wireEvents };
