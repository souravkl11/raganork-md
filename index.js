
const path = require('path');
const fs = require('fs');
if (fs.existsSync('./config.env')) {
    require('dotenv').config({ path: './config.env' });
}

const { suppressLibsignalLogs, addYtdlp60fpsSupport } = require('./core/helpers');

suppressLibsignalLogs();
addYtdlp60fpsSupport();

const { initializeDatabase } = require('./core/database');
const { BotManager } = require('./core/manager');
const config = require('./config');
const { SESSION, logger } = config;
const http = require('http'); 

async function main() {
    if (!fs.existsSync('./temp')) {
        fs.mkdirSync('./temp', { recursive: true });
        console.log('Created temporary directory at ./temp');
        logger.info('Created temporary directory at ./temp');
    }
    console.log(`Raganork v${require('./package.json').version}`);
    console.log(`- Configured sessions: ${SESSION.join(', ')}`);
    logger.info(`Configured sessions: ${SESSION.join(', ')}`);
    if (SESSION.length === 0) {
        const warnMsg = '⚠️ No sessions configured. Please set SESSION environment variable.';
        console.warn(warnMsg);
        logger.warn(warnMsg);
        return; 
    }

    try {
        await initializeDatabase(); 
        console.log('- Database initialized');
        logger.info('Database initialized successfully.');

    } catch (dbError) {
        console.error('🚫 Failed to initialize database or load configuration. Bot cannot start.', dbError);
        logger.fatal('🚫 Failed to initialize database or load configuration. Bot cannot start.', dbError);
        process.exit(1); 
    }

    const botManager = new BotManager();

    const shutdownHandler = async (signal) => {
        console.log(`\nReceived ${signal}, shutting down...`);
        logger.info(`Received ${signal}, shutting down...`);
        await botManager.shutdown(); 
        process.exit(0); 
    };

    process.on('SIGINT', () => shutdownHandler('SIGINT')); 
    process.on('SIGTERM', () => shutdownHandler('SIGTERM')); 

    await botManager.initializeBots();
    console.log('- Bot initialization complete.');
    logger.info('Bot initialization complete');
    const PORT = process.env.PORT || 3000; 

    const server = http.createServer((req, res) => {

        if (req.url === '/health') {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('OK');
        } else {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('Raganork Bot is running!');
        }
    });

    server.listen(PORT, () => {
        logger.info(`Web server listening on port ${PORT}`);
    });
    }

/**
 * Validates critical configuration values after loading from database
 */

if (require.main === module) {
    main().catch((error) => {
        console.error(`Fatal error in main execution: ${error.message}`, error);
        logger.fatal({ err: error }, `Fatal error in main execution`);
        process.exit(1); 
    });
}