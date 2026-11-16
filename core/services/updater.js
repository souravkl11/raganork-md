// updating the bot from its git remote. shared by the .update command and the
// scheduler's auto-update. every dependency is on `deps`, so tests swap them for stubs
const fs = require("fs").promises;
const path = require("path");
const axios = require("axios");
const simpleGit = require("simple-git");
const { spawn } = require("child_process");
const config = require("../../config");
const renderDeploy = require("./render-api");
const localPackageJson = require("../../package.json");

const REMOTE_PACKAGE_URL =
  "https://raw.githubusercontent.com/souravkl11/raganork-md/main/package.json";

// plugins/ holds installed gist plugins and hand edits, so changes there never block an update
const SAFE_DIR = "plugins/";
// lockfiles are rewritten by a plain `yarn install`/`npm install`; reset restores them and
// the update reinstalls when yarn.lock changed, so they never block either
const GENERATED = new Set(["yarn.lock", "package-lock.json"]);

function runYarnInstall() {
  return new Promise((resolve, reject) => {
    const child = spawn("yarn", ["install"], { cwd: process.cwd(), stdio: "inherit" });
    child.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`yarn install exited with code ${code}`)),
    );
    child.on("error", reject);
  });
}

// every tracked path git reports as changed. untracked files are left out: reset --hard
// cannot lose them. real simple-git reports everything in `files`; the other lists
// are read too so a partial status still counts
function changedPaths(status) {
  const out = new Set();
  for (const file of status?.files || []) {
    if (file.index === "?" && file.working_dir === "?") continue;
    out.add(file.path);
    if (file.from) out.add(file.from);
  }
  for (const key of ["modified", "created", "deleted", "conflicted", "staged"]) {
    for (const p of status?.[key] || []) out.add(p);
  }
  for (const r of status?.renamed || []) {
    out.add(r.to);
    out.add(r.from);
  }
  return [...out].filter(Boolean).map((p) => p.replace(/\\/g, "/").replace(/^"|"$/g, ""));
}

function createUpdater(overrides = {}) {
  const deps = {
    git: simpleGit(),
    axios,
    renderDeploy,
    config,
    localVersion: localPackageJson.version,
    runYarnInstall,
    isGitRepo: async () => {
      try {
        await fs.access(path.join(process.cwd(), ".git"));
        return true;
      } catch (_) {
        return false;
      }
    },
    moveAside: (file) => fs.rename(file, `${file}.bak`),
    ...overrides,
  };

  async function getRemoteVersion() {
    try {
      const response = await deps.axios.get(REMOTE_PACKAGE_URL);
      return response.data.version;
    } catch (error) {
      throw new Error("Failed to fetch remote version");
    }
  }

  // fetches and compares. throws "Failed to fetch remote version" when the version
  // cannot be read; git errors pass through
  async function fetchCommits() {
    await deps.git.fetch();
    return deps.git.log(["main..origin/main"]);
  }

  async function check() {
    const commits = await fetchCommits();
    const remoteVersion = await getRemoteVersion();
    const localVersion = deps.localVersion;
    const hasCommits = commits.total > 0;
    const versionChanged = remoteVersion !== localVersion;
    return {
      commits,
      localVersion,
      remoteVersion,
      hasCommits,
      versionChanged,
      isStable: hasCommits && versionChanged,
      isBeta: hasCommits && !versionChanged,
    };
  }

  // tracked files that differ from HEAD outside plugins/
  async function dirtyFiles() {
    const status = await deps.git.status();
    return changedPaths(status).filter((p) => !p.startsWith(SAFE_DIR) && !GENERATED.has(p));
  }

  // untracked files the pull would overwrite (an installed plugin the bot now ships)
  // make git abort; they are renamed to <name>.bak instead
  async function clearCollisions() {
    const status = await deps.git.status();
    const untracked = (status?.files || [])
      .filter((f) => f.index === "?" && f.working_dir === "?")
      .map((f) => f.path.replace(/\\/g, "/").replace(/^"|"$/g, ""));
    if (!untracked.length) return [];
    await deps.git.fetch();
    const incoming = String(await deps.git.diff(["--name-only", "--diff-filter=A", "HEAD", "origin/main"]))
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const moved = [];
    for (const file of untracked) {
      const hit = file.endsWith("/")
        ? incoming.some((i) => i.startsWith(file))
        : incoming.includes(file);
      if (!hit) continue;
      const target = file.replace(/\/$/, "");
      await deps.moveAside(target);
      moved.push(target);
    }
    return moved;
  }

  // reset --hard throws local edits away, so refuse when it would: { updated: false, dirty }.
  // force goes ahead anyway. when package.json or yarn.lock came in with the pull, modules are
  // installed before returning; a failed install is reported in installError
  async function applyLocal({ force = false } = {}) {
    const dirty = await dirtyFiles();
    if (dirty.length > 0 && !force) return { updated: false, dirty };

    const before = await deps.git.revparse(["HEAD"]).catch(() => null);
    await deps.git.reset("hard", ["HEAD"]);
    const moved = await clearCollisions();
    await deps.git.pull();

    let installed = false;
    let installError = null;
    if (before) {
      try {
        const changed = String(await deps.git.diff([before, "HEAD", "--name-only"])).split("\n");
        if (changed.some((f) => f.trim() === "package.json" || f.trim() === "yarn.lock")) {
          console.log("📦 dependencies changed, running yarn install...");
          await deps.runYarnInstall();
          console.log("✅ yarn install completed");
          installed = true;
        }
      } catch (err) {
        installError = err.message;
        console.error("⚠️  Could not install modules:", err.message);
      }
    }
    return { updated: true, dirty, installed, installError, moved };
  }

  // { started: false, reason: "no-key" } when RENDER_API_KEY is missing
  async function deployOnRender() {
    if (!deps.config.RENDER_API_KEY) return { started: false, reason: "no-key" };
    await deps.renderDeploy(process.env.RENDER_SERVICE_ID, deps.config.RENDER_API_KEY);
    return { started: true };
  }

  function describeDirty(files) {
    const shown = files.slice(0, 10).map((f) => `• ${f}`).join("\n");
    const more = files.length > 10 ? `\n…and ${files.length - 10} more` : "";
    return `${shown}${more}`;
  }

  return {
    deps,
    isGitRepo: () => deps.isGitRepo(),
    getRemoteVersion,
    fetchCommits,
    check,
    dirtyFiles,
    applyLocal,
    deployOnRender,
    describeDirty,
  };
}

module.exports = { createUpdater, changedPaths, updater: createUpdater(), REMOTE_PACKAGE_URL };
