// per-account scoping via hooks: reads see (accountId = current OR NULL), creates get
// stamped. not covered: raw SQL, increment/aggregate. upsert is wrapped rather than
// hooked because sequelize builds insert values before beforeUpsert runs.
const { DataTypes, Op } = require("sequelize");
const context = require("../context");

const HOOK = "scoped";

function activeAccount(model, action) {
  const store = context.current();
  if (!store) {
    if (process.env.STRICT_SCOPE === "1") {
      throw new Error(`Scoped model ${model.name} used without a session context (${action})`);
    }
    return null;
  }
  if (store.unscoped) return null;
  return store.accountId || null;
}

function isEmptyWhere(where) {
  if (!where) return true;
  return typeof where === "object" && !Array.isArray(where) && Reflect.ownKeys(where).length === 0;
}

function restrict(options, accountId) {
  const clause = { [Op.or]: [{ accountId }, { accountId: null }] };
  options.where = isEmptyWhere(options.where) ? clause : { [Op.and]: [options.where, clause] };
}

function scoped(model) {
  if (!model.rawAttributes.accountId) {
    throw new Error(`scoped(${model.name}): the model has no accountId attribute`);
  }
  if (model.options.scopedByAccount) return model;
  model.options.scopedByAccount = true;

  for (const hook of ["beforeFind", "beforeCount", "beforeBulkDestroy", "beforeBulkUpdate"]) {
    model.addHook(hook, HOOK, (options) => {
      const accountId = activeAccount(model, hook);
      if (!accountId) return;
      // truncate ignores where and would wipe every account's rows
      if (hook === "beforeBulkDestroy") options.truncate = false;
      restrict(options, accountId);
    });
  }

  model.addHook("beforeCreate", HOOK, (instance) => {
    const accountId = activeAccount(model, "create");
    if (accountId && instance.get("accountId") == null) instance.set("accountId", accountId);
  });

  model.addHook("beforeBulkCreate", HOOK, (instances) => {
    const accountId = activeAccount(model, "bulkCreate");
    if (!accountId) return;
    for (const instance of instances) {
      if (instance.get("accountId") == null) instance.set("accountId", accountId);
    }
  });

  const upsert = model.upsert;
  model.upsert = function scopedUpsert(values, options) {
    const accountId = activeAccount(model, "upsert");
    if (accountId && values && values.accountId == null) values = { ...values, accountId };
    return upsert.call(this, values, options);
  };

  return model;
}

// index name must match 002-add-account-id or sync() adds a duplicate
const accountColumn = { type: DataTypes.STRING, allowNull: true };
const accountOptions = (table) => ({ indexes: [{ name: `${table}_account_id`, fields: ["accountId"] }] });

module.exports = { scoped, accountColumn, accountOptions };
