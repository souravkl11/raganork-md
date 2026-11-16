// a value derived from a config key (a split list, parsed limits), parsed again
// only when the raw value changes. same idea as core/sudo.js: no cache to invalidate,
// so there is nothing for a config:changed listener to forget.
const config = require("../../config");

function derived(key, parse) {
  let primed = false;
  let lastRaw;
  let value;
  return () => {
    const raw = config[key];
    if (!primed || raw !== lastRaw) {
      value = parse(raw);
      lastRaw = raw;
      primed = true;
    }
    return value;
  };
}

module.exports = { derived };
