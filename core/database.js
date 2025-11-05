const { DataTypes } = require('sequelize');
const { logger, sequelize } = require('../config');

const WhatsappSession = sequelize.define('WhatsappSession', {
    sessionId: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false
    },
    sessionData: {
        type: DataTypes.TEXT,
        allowNull: true,
        get() {
            const rawValue = this.getDataValue('sessionData');
            try {
                return rawValue ? JSON.parse(rawValue) : null;
            } catch (e) {
                logger.error({ session: this.getDataValue('sessionId'), err: e }, `Error parsing sessionData from DB`);
                return null;
            }
        },
        set(value) {
            try {
                this.setDataValue('sessionData', value ? JSON.stringify(value) : null);
            } catch (e) {
                logger.error({ session: this.getDataValue('sessionId') || (value && value.sessionIdFromPayload), err: e }, `Error stringifying sessionData for DB`);
                this.setDataValue('sessionData', null);
            }
        }
    }
});

const BotVariable = sequelize.define('BotVariable', {
    key: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
        unique: true,
        comment: 'The name of the bot variable (e.g., HANDLERS, BOT_NAME)'
    },
    value: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'The value of the bot variable'
    },

}, {
    tableName: 'bot_variables',
    timestamps: true
});

async function initializeDatabase() {
    try {
        await sequelize.authenticate();
        logger.info('Database connection established.');
        await WhatsappSession.sync();
        logger.info('WhatsappSession table synced.');

        await BotVariable.sync();
        logger.info('BotVariable table synced.');

    } catch (error) {
        logger.error('DB initialization error:', error);
        throw error;
    }
}

async function migrateSudoToLID(client) {
    const config = require('../config');
    
    if (config.SUDO && config.SUDO.trim() && !config.SUDO_MAP) {
        try {
            const phoneNumbers = config.SUDO.split(',').map(n => n.trim()).filter(n => n);
            const lids = [];
            
            logger.info(`Migrating ${phoneNumbers.length} SUDO phone numbers to LIDs...`);
            
            for (const phone of phoneNumbers) {
                try {
                    const jid = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`;
                    const lid = await client.signalRepository.lidMapping.getLIDForPN(jid);
                    
                    if (lid) {
                        lids.push(lid);
                        logger.info(`Migrated ${phone} -> ${lid}`);
                    } else {
                        logger.warn(`Could not get LID for ${phone}, skipping`);
                    }
                } catch (e) {
                    logger.error(`Error migrating ${phone}:`, e.message);
                }
            }
            
            if (lids.length > 0) {
                await BotVariable.upsert({
                    key: 'SUDO_MAP',
                    value: JSON.stringify(lids)
                });

                config.SUDO_MAP = JSON.stringify(lids);
                logger.info(`Successfully migrated ${lids.length} SUDO entries to SUDO_MAP`);
            }
        } catch (error) {
            logger.error('SUDO migration error:', error);
        }
    }
}

module.exports = {
    sequelize,
    WhatsappSession,
    BotVariable,
    initializeDatabase,
    migrateSudoToLID
};