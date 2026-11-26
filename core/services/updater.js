// git updates for .update and auto-update. dependencies live on `deps` for test stubs.
const fs = require("fs").promises;
const path = require("path");
const axios = require("axios");
const simpleGit = require("simple-git");
const { spawn } = require("child_process");
const config = require("../../config");
const renderDeploy = require("./render-api");
const localPackageJson = require("../../package.json");

const REPO_URL = "https://github.com/souravkl11/raganork-md.git";
const REMOTE_PACKAGE_URL =
  "https://raw.githubusercontent.com/souravkl11/raganork-md/main/package.json";

// plugins/ holds installed gist plugins and hand edits; never block an update on them
const SAFE_DIR = "plugins/";
const GENERATED = new Set(["yarn.lock", "package-lock.json"]);
const DEP_FIELDS = ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies", "resolutions", "overrides"];

function parsePackage(raw) {
  try {
    return JSON.parse(String(raw));
  } catch (_) {
    return null;
  }
}
const depsOf = (pkg) => pkg && JSON.stringify(DEP_FIELDS.map((f) => pkg[f] || null));

// lets the start message after the restart announce the update
const NOTE_FILE = path.join(process.cwd(), ".update-note.json");

function writeUpdateNote(version, commits = []) {
  const lines = commits.slice(0, 10).map((c) => c.message);
  require("fs").writeFileSync(NOTE_FILE, JSON.stringify({ version, commits: lines }));
}

function takeUpdateNote() {
  try {
    const note = JSON.parse(require("fs").readFileSync(NOTE_FILE, "utf8"));
    require("fs").unlinkSync(NOTE_FILE);
    return note.version === require("../../package.json").version ? note : null;
  } catch (_) {
    return null;
  }
}

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
    removeGitDir: () => fs.rm(path.join(process.cwd(), ".git"), { recursive: true, force: true }),
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

  // version bumps touch package.json too
  async function depsChanged(from, to) {
    const changed = String(await deps.git.diff([from, to, "--name-only"])).split("\n").map((f) => f.trim());
    if (changed.includes("yarn.lock")) return true;
    if (!changed.includes("package.json")) return false;
    const [a, b] = await Promise.all(
      [from, to].map((rev) => deps.git.show([`${rev}:package.json`]).then(parsePackage, () => null)),
    );
    return !a || !b || depsOf(a) !== depsOf(b);
  }

  // zip uploads: local edits can't be told from the old release, so the first update overwrites them
  let adopted = false;
  async function adoptZip() {
    if (await deps.isGitRepo()) return true;
    try {
      const git = deps.git;
      await git.raw(["init"]);
      await git.raw(["symbolic-ref", "HEAD", "refs/heads/main"]);
      await git.raw(["remote", "add", "origin", REPO_URL]);
      await git.raw(["fetch", "--filter=blob:none", "origin", "main:refs/remotes/origin/main"]);
      const touched = String(await git.raw(["log", "--format=%H", "-n", "300", "origin/main", "--", "package.json"]))
        .split("\n")
        .filter(Boolean);
      let base = touched[touched.length - 1] || "origin/main";
      for (const hash of touched) {
        const pkg = parsePackage(await git.show([`${hash}:package.json`]).catch(() => ""));
        if (pkg?.version === deps.localVersion) {
          base = hash;
          break;
        }
      }
      await git.raw(["reset", "--mixed", base]);
      await git.raw(["branch", "--set-upstream-to=origin/main", "main"]);
      adopted = true;
      return true;
    } catch (err) {
      console.error("Could not set up git for updates:", err.message);
      await deps.removeGitDir().catch(() => {});
      return false;
    }
  }

  // reset --hard drops local edits, so refuse unless forced
  async function applyLocal({ force = false, install = true } = {}) {
    const dirty = await dirtyFiles();
    if (dirty.length > 0 && !force && !adopted) return { updated: false, dirty };
    if (!install) {
      await deps.git.fetch();
      if (await depsChanged("HEAD", "origin/main")) return { updated: false, dirty: [], needsInstall: true };
    }

    const before = await deps.git.revparse(["HEAD"]).catch(() => null);
    await deps.git.reset("hard", ["HEAD"]);
    const moved = await clearCollisions();
    await deps.git.pull();

    adopted = false;

    let installed = false;
    let installError = null;
    if (before && install) {
      try {
        if (await depsChanged(before, "HEAD")) {
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
    adoptZip,
    depsChanged,
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

module.exports = { createUpdater, changedPaths, updater: createUpdater(), REMOTE_PACKAGE_URL, writeUpdateNote, takeUpdateNote };
