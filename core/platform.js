// where the bot runs. one answer for config (isHeroku, PLATFORM, ...), the auto-updater
// and the .update command. platform variables win, because the host sets them whatever
// the image or folder is called; the install directory is the fallback for hosts that
// set none (the Dockerfile clones into /rgnk, the Heroku and Railway images use the others)
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

const LABELS = {
  heroku: "Heroku",
  railway: "Railway",
  koyeb: "Koyeb",
  render: "Render",
  local: "Other server",
};

const has = (env, key) => env[key] !== undefined && env[key] !== "";

// -> "render" | "railway" | "koyeb" | "heroku" | "local"
function detect({ env = process.env, dir = ROOT } = {}) {
  if (has(env, "RENDER_SERVICE_ID")) return "render";
  if (has(env, "RAILWAY_SERVICE_ID")) return "railway";
  if (has(env, "KOYEB_SERVICE_ID")) return "koyeb";
  if (has(env, "DYNO")) return "heroku";
  if (dir.startsWith("/rgnk")) return "koyeb";
  if (dir.startsWith("/skl")) return "heroku";
  if (dir.startsWith("/railway")) return "railway";
  return "local";
}

const dirOf = ({ dir: d = ROOT } = {}) => d;

function describe(options) {
  const name = detect(options);
  return {
    name,
    label: LABELS[name],
    isHeroku: name === "heroku",
    isKoyeb: name === "koyeb",
    isRailway: name === "railway",
    isRender: name === "render",
    // the Dockerfile's folder, whatever the host's variables say. a bot in it cannot keep
    // a git update (the container is rebuilt on every deploy), so .update refuses there
    inKoyebImage: dirOf(options).startsWith("/rgnk"),
    // as before: everything except Koyeb and Heroku counts, Railway and Render included
    isVPS: name !== "koyeb" && name !== "heroku",
  };
}

module.exports = { detect, describe, current: () => describe() };
