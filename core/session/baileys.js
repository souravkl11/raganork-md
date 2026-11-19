const { loadBaileys } = require("../helpers");

// filled in once baileys loads: read at call time, never at require time
const bindings = {};

const ready = loadBaileys()
  .then((baileys) => {
    bindings.makeWASocket = baileys.default;
    bindings.DisconnectReason = baileys.DisconnectReason;
    bindings.fetchLatestBaileysVersion = baileys.fetchLatestBaileysVersion;
  })
  .catch((err) => {
    console.error("Failed to load baileys:", err.message);
  });

// resolved once per process: WA_VERSION env ("2.3000.x") > latest published > baileys default
let waVersionPromise = null;
function resolveWaVersion() {
  if (!waVersionPromise) {
    waVersionPromise = (async () => {
      if (process.env.WA_VERSION) {
        const parts = process.env.WA_VERSION.split(/[.,]/).map(Number);
        if (parts.length === 3 && parts.every(Number.isFinite)) return parts;
      }
      try {
        const latest = await Promise.race([
          bindings.fetchLatestBaileysVersion(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("timeout")), 5000).unref?.(),
          ),
        ]);
        if (Array.isArray(latest?.version)) return latest.version;
      } catch (_) {}
      return undefined; // let baileys use its bundled version
    })();
  }
  return waVersionPromise;
}

module.exports = { bindings, ready, resolveWaVersion };
