const { getYoutubeAuth, setYoutubeAuth, clearYoutubeAuth } = require("../../core/db/models/youtube");

const KEY = "tv_oauth";
const listeners = new Set();
let cached;
let running = null;

async function getCredentials() {
  if (cached === undefined) cached = await getYoutubeAuth(KEY).catch(() => null);
  return cached;
}

async function saveCredentials(credentials) {
  cached = credentials;
  await setYoutubeAuth(KEY, credentials);
  listeners.forEach((fn) => fn(credentials));
}

async function logout() {
  cached = null;
  await clearYoutubeAuth(KEY);
  listeners.forEach((fn) => fn(null));
}

const onCredentialsChange = (fn) => listeners.add(fn);

function login(onCode) {
  if (running) {
    running.code.then(onCode, () => {});
    return running.done;
  }
  let gotCode;
  const code = new Promise((resolve) => (gotCode = resolve));
  code.then(onCode, () => {});

  const done = (async () => {
    const { Innertube, UniversalCache } = await import("youtubei.js");
    const innertube = await Innertube.create({ cache: new UniversalCache(false), generate_session_locally: true });
    const session = innertube.session;
    return new Promise((resolve, reject) => {
      let timer;
      session.once("auth-pending", (data) => {
        gotCode(data);
        timer = setTimeout(() => reject(new Error("Login code expired. Run the login command again.")), ((data.expires_in || 1800) + 15) * 1000);
      });
      session.once("auth", async ({ credentials }) => {
        clearTimeout(timer);
        await saveCredentials(credentials).catch((err) => console.error("[youtube] saving login failed:", err.message));
        resolve(credentials);
      });
      session.once("auth-error", (err) => {
        clearTimeout(timer);
        reject(err);
      });
      session.signIn().catch(reject);
    });
  })().finally(() => {
    running = null;
  });

  running = { code, done };
  return done;
}

module.exports = { getCredentials, saveCredentials, logout, login, onCredentialsChange };
