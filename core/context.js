// which session is the running code working for. every socket event and cron tick
// runs inside run(); config and (later) scoped models read the account from here.
const { AsyncLocalStorage } = require("node:async_hooks");

const als = new AsyncLocalStorage();

module.exports = {
  // session = { sessionId, accountId, bot }
  run: (session, fn) => als.run(session, fn),
  // flush timers, cleanup jobs: no session, no scoping
  runUnscoped: (fn) => als.run({ unscoped: true }, fn),
  // run fn with no session, whatever context the caller is in (queue workers use this)
  exit: (fn) => als.exit(fn),
  current: () => als.getStore() || null,
  accountId: () => als.getStore()?.accountId || null,
  isUnscoped: () => als.getStore()?.unscoped === true,
};
