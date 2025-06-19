const { DataTypes } = require('sequelize');
const config = require('../../../config');

config.sequelize.sync();

const warnDB = config.sequelize.define('warn', {
    chat: {
      type: DataTypes.STRING,
      allowNull: false
    },
    user: {
        type: DataTypes.TEXT,
        allowNull: false
    }
});

const FakeDB = config.sequelize.define('fake', {
    jid: {
    type: DataTypes.TEXT,
    allowNull: false
}});

const antilinkDB = config.sequelize.define('antilink', {
    jid: {
    type: DataTypes.TEXT,
    allowNull: false
}});

const antiSpamDB = config.sequelize.define('antispam', {
    jid: {
    type: DataTypes.TEXT,
    allowNull: false
}});

const PDMDB = config.sequelize.define('pdm', {
    jid: {
    type: DataTypes.TEXT,
    allowNull: false
}});

const antiDemote = config.sequelize.define('antidemote', {
    jid: {
    type: DataTypes.TEXT,
    allowNull: false
}});

const antiPromote = config.sequelize.define('antipromote', {
    jid: {
    type: DataTypes.TEXT,
    allowNull: false
}});

const antiBotDB = config.sequelize.define('antibot', {
    jid: {
    type: DataTypes.TEXT,
    allowNull: false
}});

const antiWordDB = config.sequelize.define('antiword', {
    jid: {
    type: DataTypes.TEXT,
    allowNull: false
}});

const WelcomeDB = config.sequelize.define('welcome', {
    jid: {
        type: DataTypes.STRING,
        allowNull: false
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    enabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
});

const GoodbyeDB = config.sequelize.define('goodbye', {
    jid: {
        type: DataTypes.STRING,
        allowNull: false
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    enabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
});

module.exports = {
    warnDB,
    FakeDB,
    antilinkDB,
    antiSpamDB,
    PDMDB,
    antiDemote,
    antiPromote,
    antiBotDB,
    antiWordDB,
    WelcomeDB,
    GoodbyeDB
};