const { WhatsAppBot } = require("./bot");
const { logger, SESSION } = require('../../config');
const { sequelize } = require("../database");
const { CustomAuthState } = require("../auth");
const configStore = require("../config/store");
const { flushQueueOnShutdown, stopFlushTimer } = require("../store");
const { ownerTarget } = require("../identity");
const { createAnnouncementFeed } = require("../private");
const { version } = require("../../package.json");

const RECENT_ANNOUNCEMENTS = 50;

class BotManager {
    constructor() {
        this.bots = new Map();
        this.feed = null;
        this.recentAnnouncements = [];
    }

    connectedBots() {
        return [...this.bots.values()].filter((bot) => bot.isConnected && bot.sock);
    }

    onSessionStateChange() {
        if (!this.feed) {
            if (this.connectedBots().length === 0) return;
            this.feed = createAnnouncementFeed({
                version,
                getSessionCount: () => this.connectedBots().length,
                onAnnouncement: (text, id) => this.broadcastAnnouncement(text, id),
                onError: (err) => logger.debug({ err: err?.message || err }, 'announcement feed error'),
            });
            return;
        }
        this.feed.refresh();
    }

    async broadcastAnnouncement(text, id) {
        const dedupeKey = id || text;
        if (this.recentAnnouncements.includes(dedupeKey)) return;
        this.recentAnnouncements.push(dedupeKey);
        if (this.recentAnnouncements.length > RECENT_ANNOUNCEMENTS) this.recentAnnouncements.shift();

        const sentTo = new Set();
        for (const bot of this.connectedBots()) {
            const target = () => ownerTarget(bot.sock);
            const owner = bot.inSession ? bot.inSession(target) : target();
            if (sentTo.has(owner)) continue;
            sentTo.add(owner);
            try {
                await bot.sock.sendMessage(owner, { text });
            } catch (err) {
                logger.error({ session: bot.sessionId, err }, 'Failed to send announcement message');
            }
        }
    }

    async initializeBots() {
        logger.info({ sessions: SESSION }, `Initializing all configured bots.`);
        await CustomAuthState.deleteGarbageSessions(SESSION);
        const loaded = [];
        for (const sessionId of SESSION) {
            try {
                logger.info({ session: sessionId }, `Attempting to initialize bot for session.`);
                const bot = new WhatsAppBot(sessionId);
                bot.manager = this;
                await bot.loadAuth();
                loaded.push(bot);
            } catch (error) {
                logger.error({ session: sessionId, err: error }, `Overall failure to initialize bot in BotManager`);
            }
        }

        await configStore.reloadSessions();

        for (const bot of loaded) {
            const sessionId = bot.sessionId;
            try {
                await bot.connect();
                if (bot.sock) { 
                    this.bots.set(sessionId, bot);
                    logger.info({ session: sessionId }, `Bot initialization scheduled. Connection status will follow.`);
                } else {
                    logger.error({ session: sessionId }, `Bot object for session could not be initialized (sock is null).`);
                }
            } catch (error) {

                logger.error({ session: sessionId, err: error }, `Overall failure to initialize bot in BotManager`);
            }
        }
    }

    getBot(sessionId) {
        return this.bots.get(sessionId);
    }

    async sendMessage(sessionId, jid, message) {
        const bot = this.getBot(sessionId);
        if (!bot) {
            throw new Error(`No bot found or initialized for session: ${sessionId}`);
        }
        return await bot.sendMessage(jid, message);
    }

    async shutdown() {
        logger.info('Shutting down all bots...');
        if (this.feed) {
            this.feed.close();
            this.feed = null;
        }

    try {
      stopFlushTimer();
      await flushQueueOnShutdown();
    } catch (err) {
      logger.error({ err }, "Failed to flush message queue during shutdown");
    }

    try {
      logger.info("Saving all session data before shutdown...");
      await CustomAuthState.saveAllSessions();
      logger.info("All session data saved successfully");
    } catch (error) {
      logger.error({ err: error }, "Error saving sessions during shutdown");
    }

        for (const [sessionId, bot] of this.bots.entries()) {
            try {
                await bot.disconnect(false); 
                logger.info({ session: sessionId }, `Bot disconnected successfully.`);
            } catch (error) {
                logger.error({ session: sessionId, err: error }, `Error during bot disconnection.`);
            }
        }
        this.bots.clear(); 

        try {
            CustomAuthState.stopPeriodicSave();
            logger.info('Auth periodic save timer stopped');
        } catch (error) {
            logger.error({ err: error }, 'Error stopping periodic save timer');
        }

        try {
            const Schedule = require('../schedulers');
            await Schedule.cleanup();
            logger.info('Scheduled tasks cleaned up');
        } catch (error) {
            logger.error({ err: error }, 'Error cleaning up scheduled tasks');
        }

        if (sequelize) {
            try {
                await sequelize.close();
                logger.info('Database connection closed.');
            } catch (error) {
                logger.error({ err: error }, 'Error closing database connection.');
            }
        }
    }
}

module.exports = { BotManager };
