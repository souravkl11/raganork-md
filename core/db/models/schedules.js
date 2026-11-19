const { sequelize } = require("../index");
const { scoped, accountColumn: accountId, accountOptions } = require("../scoped");
const { cachedList } = require("../cache");
const events = require("../../events");
const context = require("../../context");
const { DataTypes, Op } = require("sequelize");

// tells the scheduler this session's cron jobs are out of date, so no restart is needed
function changed(kind) {
  events.emit("schedule:changed", { kind, accountId: context.accountId() });
}

async function updateOrCreate(model, findCriteria, createData) {
  const existingRecord = await model.findOne({ where: findCriteria });
  if (existingRecord) {
    await existingRecord.destroy();
  }
  await model.create(createData);
  return true;
}

const AutoMuteDB = sequelize.define("automute", {
  accountId,
  chat: { type: DataTypes.STRING, allowNull: false },
  time: { type: DataTypes.STRING, allowNull: false },
}, accountOptions("automutes"));

const automute = {
  async get() {
    return await AutoMuteDB.findAll();
  },
  async set(jid, time) {
    const done = await updateOrCreate(AutoMuteDB, { chat: jid }, { chat: jid, time });
    changed("automute");
    return done;
  },
  async delete(jid) {
    const result = await AutoMuteDB.destroy({ where: { chat: jid } });
    changed("automute");
    return result > 0;
  },
};

const AutoUnMuteDB = sequelize.define("autounmute", {
  accountId,
  chat: { type: DataTypes.STRING, allowNull: false },
  time: { type: DataTypes.STRING, allowNull: false },
}, accountOptions("autounmutes"));

const autounmute = {
  async get() {
    return await AutoUnMuteDB.findAll();
  },
  async set(jid, time) {
    const done = await updateOrCreate(
      AutoUnMuteDB,
      { chat: jid },
      { chat: jid, time }
    );
    changed("autounmute");
    return done;
  },
  async delete(jid) {
    const result = await AutoUnMuteDB.destroy({ where: { chat: jid } });
    changed("autounmute");
    return result > 0;
  },
};

const StickyCmdDB = sequelize.define("stickcmd", {
  accountId,
  command: { type: DataTypes.STRING(1000), allowNull: false },
  file: { type: DataTypes.STRING(1000), allowNull: false },
}, accountOptions("stickcmds"));

const stickcmdList = cachedList(() => StickyCmdDB.findAll());

const stickcmd = {
  async get() {
    return await stickcmdList();
  },
  async set(commandName, fileContent) {
    const existingRecord = await StickyCmdDB.findOne({
      where: { file: fileContent },
    });
    if (existingRecord) {
      await existingRecord.destroy();
    }
    await StickyCmdDB.create({ command: commandName, file: fileContent });
    stickcmdList.invalidate();
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
    stickcmdList.invalidate();
    return result > 0;
  },
};

const ScheduledMessageDB = sequelize.define("scheduled_messages", {
  accountId,
  jid: { type: DataTypes.STRING, allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
  scheduleTime: { type: DataTypes.DATE, allowNull: false },
  isSent: { type: DataTypes.BOOLEAN, defaultValue: false },
}, accountOptions("scheduled_messages"));

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
    changed("scheduledMessages");
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
    changed("scheduledMessages");
    return result > 0;
  },
};

[AutoMuteDB, AutoUnMuteDB, StickyCmdDB, ScheduledMessageDB].forEach(scoped);

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
