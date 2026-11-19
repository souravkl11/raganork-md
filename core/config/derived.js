// re-parses a config value only when the raw value changes; nothing to invalidate
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
