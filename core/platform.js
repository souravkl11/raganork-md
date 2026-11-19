// detects the host platform. platform env vars win; the install dir is the fallback.
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
    // the Dockerfile folder: the container is rebuilt on deploy, so git updates cannot stick
    inKoyebImage: dirOf(options).startsWith("/rgnk"),
    isVPS: name !== "koyeb" && name !== "heroku",
  };
}

module.exports = { detect, describe, current: () => describe() };
