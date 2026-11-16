const context = require("../../../core/context");

// memoizes a db list read, one entry per account (the loader runs inside the caller's
// session, so scoped models return that account's rows). writers call .invalidate();
// the ttl is only a safety net for rows changed outside this process.
//
// invalidate() clears every account's entry, not just the caller's: rows with no account
// yet are visible to all of them, and a writer running unscoped (timer, migration) cannot
// say whose rows it changed. writes are rare, a reload is one small query.
function cachedList(loader, ttlMs = 60000) {
  const entries = new Map(); // account -> { value, loadedAt }
  const loading = new Map(); // account -> promise
  let generation = 0;

  const get = async () => {
    const key = context.accountId() || "_";
    const entry = entries.get(key);
    if (entry && Date.now() - entry.loadedAt < ttlMs) return entry.value;
    if (loading.has(key)) return loading.get(key);
    const gen = generation;
    const pending = loader()
      .then((rows) => {
        // an invalidate() during the load means these rows may already be stale
        if (gen === generation) entries.set(key, { value: rows, loadedAt: Date.now() });
        return rows;
      })
      .finally(() => {
        if (loading.get(key) === pending) loading.delete(key);
      });
    loading.set(key, pending);
    return pending;
  };

  get.invalidate = () => {
    generation++;
    entries.clear();
    loading.clear();
  };

  return get;
}

module.exports = { cachedList };
