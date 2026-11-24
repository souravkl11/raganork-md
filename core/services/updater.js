// git updates for .update and auto-update. dependencies live on `deps` for test stubs.
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

// plugins/ holds installed gist plugins and hand edits; never block an update on them
const SAFE_DIR = "plugins/";
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
      const response = await deps.axios.get(`${REMOTE_PACKAGE_URL}?t=${Date.now()}`, {
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });
      return response.data.version;
    } catch (error) {
      throw new Error("Failed to fetch remote version");
    }
  }

  async function getFetchedVersion() {
    try {
      const raw = await deps.git.show(["origin/main:package.json"]);
      const version = JSON.parse(String(raw)).version;
      if (version) return version;
    } catch (_) {}
    return getRemoteVersion();
  }

  async function fetchCommits() {
    await deps.git.fetch();
    return deps.git.log(["main..origin/main"]);
  }

  async function check() {
    const commits = await fetchCommits();
    const remoteVersion = await getFetchedVersion();
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

  async function dirtyFiles() {
    const status = await deps.git.status();
    return changedPaths(status).filter((p) => !p.startsWith(SAFE_DIR) && !GENERATED.has(p));
  }

  // untracked files the pull would overwrite make git abort, so rename them to .bak
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

  // reset --hard drops local edits, so refuse unless forced
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

  async function deployOnRender() {
    if (!deps.config.RENDER_API_KEY) return { started: false, reason: "no-key" };
    await deps.renderDeploy(process.env.RENDER_SERVICE_ID, deps.config.RENDER_API_KEY);
    return { started: true };
  }

  async function resetVersion(version) {
    const file = path.join(process.cwd(), "package.json");
    const raw = await fs.readFile(file, "utf8");
    await fs.writeFile(file, raw.replace(/("version"\s*:\s*)"[^"]*"/, `$1"${version}"`));
    deps.localVersion = version;
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
    resetVersion,
  };
}

module.exports = { createUpdater, changedPaths, updater: createUpdater(), REMOTE_PACKAGE_URL };
