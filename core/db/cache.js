const context = require("../context");

// per-account memoized db reads. invalidate() clears every account: unscoped writers
// can't say whose rows changed. the ttl is a safety net for out-of-process changes.
function cachedList(loader, ttlMs = 60000) {
  const entries = new Map();
  const loading = new Map();
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
