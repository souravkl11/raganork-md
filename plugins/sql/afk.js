/* Codded by @phaticusthiccy
Telegram: t.me/phaticusthiccy
Instagram: www.instagram.com/kyrie.baran
*/

/*
const config = require('../../config');
const { DataTypes } = require('sequelize');

const AFKDB = config.DATABASE.define('AFK', {
    type: {
        type: DataTypes.STRING,
        allowNull: false
    }
});

async function getStatus(status) {
    var Msg = await AFKDB.findAll({
        where: {
            type: status
        }
    });

    if (Msg.length < 1) {
        return false;
    } else {
        if (Msg[0].dataValues == 'afk') {
            return true;
        } else {
            return false;
        }
    }
}

async function setStatus(setAFK) {
    var Msg = await AFKDB.findAll({
        where: {
            type: setAFK
        }
    });

    if (Msg.length < 1) {
        return await AFKDB.create({ type: setAFK });
    } else {
        return await Msg[0].update({ type: setAFK });
    }
}


module.exports = {
    AFKDB: AFKDB,
    getStatus: getStatus,
    setStatus: setStatus
};
*/

/*
Changed Status to Inactive
Some technical issues caused pool connection bugs.
It will be fixed in new versions.
*/
