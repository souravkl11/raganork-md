const config = require('../../config');
const { DataTypes } = require('sequelize');

const BgmDB = config.DATABASE.define('bgm', {
    note: {
        type: DataTypes.TEXT,
        allowNull: false
    }
});


async function getBgm() {
    const Notes = await NotesDB.findAll()

    return Notes
}

async function addBgm(bgm) {
    return await BgmDB.create({ bgm });
}

async function deleteBgm() {
    return await BgmDB.destroy({
        where: {},
        truncate: true
    })
}

module.exports = {
    BgmDB,
    getBgm,
    addBgm,
    deleteBgm
};
