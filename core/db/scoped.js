// session scoping for models with an "accountId" column.
//
//   scoped(Model)   adds hooks that read the account from core/context synchronously:
//     reads and bulk writes (find, count, bulk update, bulk destroy) only see
//       (accountId = <current> OR accountId IS NULL)
//     the NULL half keeps rows that are not backfilled yet visible, so a delayed
//     backfill never makes a setting disappear
//     creates, bulkCreates and upserts get accountId = <current> unless one is set
//   inside context.runUnscoped, or with no context at all, nothing is added.
//   STRICT_SCOPE=1 (tests) throws when a scoped model is used with no context at all,
//   which finds entry points that forgot to run inside a session.
//
// not covered: raw SQL, Model.increment/aggregate (sum, max), and instance methods.
// instance update/destroy/increment act on the primary key, so they are safe when the
// instance came from a scoped query. a plain `upsert` is wrapped instead of hooked:
// sequelize builds the insert values before beforeUpsert runs, so a hook cannot stamp it.
const { DataTypes, Op } = require("sequelize");
const context = require("../context");

const HOOK = "scoped";

// the account to scope to, or null when this call should not be scoped
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
      // destroy({ truncate: true }) is TRUNCATE TABLE and ignores the where clause:
      // inside a session that would wipe every account's rows
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

// the column and index every scoped table has; the index name is spelled the same way
// in 002-add-account-id so sync() does not add a second one
const accountColumn = { type: DataTypes.STRING, allowNull: true };
const accountOptions = (table) => ({ indexes: [{ name: `${table}_account_id`, fields: ["accountId"] }] });

module.exports = { scoped, accountColumn, accountOptions };
