const { bindings } = require("./baileys");

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 60000;
const STABLE_CONNECTION_MS = 60000;
// once the fast attempts are used up, keep trying at this pace instead of giving up
const SLOW_RETRY_MS = 10 * 60 * 1000;
const SLOW_RETRY_JITTER = 0.2;
const SLOW_RETRY_LOG_EVERY_MS = 60 * 60 * 1000;

function planReconnect({ statusCode, attempts, maxAttempts }) {
  const { DisconnectReason } = bindings;
  let delay;
  let slow = false;
  if (statusCode === DisconnectReason.restartRequired) {
    attempts++;
    delay = 0; // expected right after pairing
  } else if (attempts >= maxAttempts) {
    slow = true;
    delay = SLOW_RETRY_MS * (1 - SLOW_RETRY_JITTER + Math.random() * 2 * SLOW_RETRY_JITTER);
  } else {
    const attempt = attempts++;
    if (statusCode === DisconnectReason.connectionReplaced) {
      // another instance took over this session (e.g. deploy overlap); back off hard
      delay = 2 * 60000 + Math.random() * 3 * 60000;
    } else {
      delay = Math.min(RECONNECT_MAX_MS, RECONNECT_BASE_MS * 2 ** attempt);
      delay = delay / 2 + Math.random() * (delay / 2);
    }
  }
  return { delay, slow, attempts };
}

module.exports = { planReconnect, STABLE_CONNECTION_MS, SLOW_RETRY_MS, SLOW_RETRY_LOG_EVERY_MS };
