const config = require("../../../config");
const { DataTypes, Op } = require("sequelize");

async function updateOrCreate(model, findCriteria, createData) {
  const existingRecord = await model.findOne({ where: findCriteria });
  if (existingRecord) {
    await existingRecord.destroy();
  }
  await model.create(createData);
  return true;
}

const AutoMuteDB = config.sequelize.define("automute", {
  chat: { type: DataTypes.STRING, allowNull: false },
  time: { type: DataTypes.STRING, allowNull: false },
});

const automute = {
  async get() {
    return await AutoMuteDB.findAll();
  },
  async set(jid, time) {
    return await updateOrCreate(AutoMuteDB, { chat: jid }, { chat: jid, time });
  },
  async delete(jid) {
    const result = await AutoMuteDB.destroy({ where: { chat: jid } });
    return result > 0;
  },
};

const AutoUnMuteDB = config.sequelize.define("autounmute", {
  chat: { type: DataTypes.STRING, allowNull: false },
  time: { type: DataTypes.STRING, allowNull: false },
});

const autounmute = {
  async get() {
    return await AutoUnMuteDB.findAll();
  },
  async set(jid, time) {
    return await updateOrCreate(
      AutoUnMuteDB,
      { chat: jid },
      { chat: jid, time }
    );
  },
  async delete(jid) {
    const result = await AutoUnMuteDB.destroy({ where: { chat: jid } });
    return result > 0;
  },
};

const StickyCmdDB = config.sequelize.define("stickcmd", {
  command: { type: DataTypes.STRING(1000), allowNull: false },
  file: { type: DataTypes.STRING(1000), allowNull: false },
});

const stickcmd = {
  async get() {
    return await StickyCmdDB.findAll();
  },
  async set(commandName, fileContent) {
    const existingRecord = await StickyCmdDB.findOne({
      where: { file: fileContent },
    });
    if (existingRecord) {
      await existingRecord.destroy();
    }
    await StickyCmdDB.create({ command: commandName, file: fileContent });
    return true;
  },
  async delete(identifier, type = "file") {
    const whereClause =
      type === "file"
        ? { file: identifier }
        : type === "command"
        ? { command: identifier }
        : null;
    if (!whereClause) return false;

    const result = await StickyCmdDB.destroy({ where: whereClause });
    return result > 0;
  },
};

const ScheduledMessageDB = config.sequelize.define("scheduled_messages", {
  jid: { type: DataTypes.STRING, allowNull: false },
  message: { type: DataTypes.STRING(2048), allowNull: false },
  scheduleTime: { type: DataTypes.DATE, allowNull: false },
  isSent: { type: DataTypes.BOOLEAN, defaultValue: false },
});

const scheduledMessages = {
  async getDueForSending() {
    return await ScheduledMessageDB.findAll({
      where: {
        scheduleTime: { [Op.lte]: new Date() },
      },
    });
  },
  async getAllPending() {
    return await ScheduledMessageDB.findAll();
  },
  async add(jid, message, scheduleTime) {
    await ScheduledMessageDB.create({
      jid,
      message,
      scheduleTime,
      isSent: false,
    });
    return true;
  },
  async markAsSent(messageId) {
    const result = await ScheduledMessageDB.destroy({
      where: { id: messageId },
    });
    return result > 0;
  },
  async delete(messageId) {
    const result = await ScheduledMessageDB.destroy({
      where: { id: messageId },
    });
    return result > 0;
  },
};

module.exports = {
  automute,
  autounmute,
  stickcmd,
  scheduledMessages,
  AutoMuteDB,
  AutoUnMuteDB,
  StickyCmdDB,
  ScheduledMessageDB,
};
