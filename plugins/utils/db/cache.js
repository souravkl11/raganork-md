// memoizes a db list read. writers call .invalidate(); the ttl is only a safety net
// for rows changed outside this process.
function cachedList(loader, ttlMs = 60000) {
  let value = null;
  let loadedAt = 0;
  let generation = 0;
  let pending = null;

  const get = async () => {
    if (value && Date.now() - loadedAt < ttlMs) return value;
    if (pending) return pending;
    const gen = generation;
    pending = loader()
      .then((rows) => {
        // an invalidate() during the load means these rows may already be stale
        if (gen === generation) {
          value = rows;
          loadedAt = Date.now();
        }
        return rows;
      })
      .finally(() => {
        pending = null;
      });
    return pending;
  };

  get.invalidate = () => {
    generation++;
    value = null;
    loadedAt = 0;
  };

  return get;
}

module.exports = { cachedList };
