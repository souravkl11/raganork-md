const config = require("../config");
const context = require("./context");
const events = require("./events");
const lifecycle = require("./lifecycle");
const platform = require("./platform");
const { ownerTarget } = require("./identity");
const cron = require("node-cron");

const {
  automute,
  autounmute,
  scheduledMessages,
} = require("./db/models/schedules");
const localPackageJson = require("../package.json");
const { updater } = require("./services/updater");

const PRESENCE_INTERVAL = 10000;
const UPDATE_INTERVAL = 120000;

const activeTasks = new Map();

const sessions = new Map();

// unbackfilled rows are visible to every session, so only the first one acts on them
function mayHandle(sessionId, row) {
  if (row.accountId != null) return true;
  return sessions.keys().next().value === sessionId;
}

let updateTimer = null;
let updaterNotified = false;
let isAutoUpdating = false;

function isNewerVersion(remote, local) {
  const a = String(remote || "").split(".").map((n) => parseInt(n, 10) || 0);
  const b = String(local || "").split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] || 0;
    const y = b[i] || 0;
    if (x !== y) return x > y;
  }
  return false;
}

function destroyTasks(sessionId) {
  const mine = activeTasks.get(sessionId);
  if (!mine) return;
  for (const task of mine) {
    try {
      task.destroy();
    } catch (_) {}
  }
  activeTasks.delete(sessionId);
}

function destroyAllTasks() {
  for (const sessionId of [...activeTasks.keys()]) destroyTasks(sessionId);
}

function trackTask(sessionId, task) {
  if (!activeTasks.has(sessionId)) activeTasks.set(sessionId, []);
  activeTasks.get(sessionId).push(task);
}

async function notifyOwners(text) {
  const sent = new Set();
  for (const { client, session } of sessions.values()) {
    const target = () => ownerTarget(client);
    const owner = session ? context.run(session, target) : target();
    if (sent.has(owner)) continue;
    sent.add(owner);
    try {
      await client.sendMessage(owner, { text });
    } catch (_) {}
  }
}

function startTask(sessionId, expression, run) {
  const task = cron.schedule(expression, run, { scheduled: false });
  trackTask(sessionId, task);
  return new Promise((resolve) => {
    setImmediate(() => {
      task.start();
      resolve();
    });
  });
}

function muteTask(client, jid, row, sessionId, inSession, setting, text) {
  return () =>
    inSession(async () => {
      if (!mayHandle(sessionId, row)) return;
      try {
        await client.groupSettingUpdate(jid, setting);
        await client.sendMessage(jid, { text: text() });
      } catch (error) {
        console.error(`Error in ${setting === "announcement" ? "automute" : "autounmute"} task for ${jid}:`, error);
      }
    });
}

async function sendDueMessages(client, sessionId) {
  try {
    const messagesToSend = await scheduledMessages.getDueForSending();
    for (const msg of messagesToSend) {
      if (!mayHandle(sessionId, msg.dataValues)) continue;
      try {
        const jid = msg.dataValues.jid;
        let messageData;

        try {
          messageData = JSON.parse(msg.dataValues.message);
          if (messageData._mediaType) {
            const mediaType = messageData._mediaType;
            const base64Data = messageData[mediaType];

            if (base64Data) {
              const buffer = Buffer.from(base64Data, "base64");
              messageData[mediaType] = buffer;
              delete messageData._mediaType;
            }
          }
        } catch (parseError) {
          messageData = { text: msg.dataValues.message };
        }

        await client.sendMessage(jid, messageData);
        await scheduledMessages.markAsSent(msg.dataValues.id);
        console.log(`✅ Sent scheduled message to ${jid}`);
      } catch (error) {
        console.error(
          `❌ Failed to send scheduled message to ${msg.dataValues.jid}:`,
          error
        );
      }
    }
  } catch (error) {
    console.error("Error in scheduled messages task:", error);
  }
}

const signatures = new Map();

function signatureOf(mutes, unmutes, pending) {
  const rows = (list) => list.map((r) => [r.dataValues.id, r.dataValues.chat, r.dataValues.time]);
  return JSON.stringify([rows(mutes), rows(unmutes), pending.length > 0]);
}

async function buildTasks(client, session, sessionId, { force = false } = {}) {
  const inSession = (fn) => (session ? context.run(session, fn) : fn());
  if (force) {
    destroyTasks(sessionId);
    signatures.delete(sessionId);
  }

  const [mutes, unmutes, pending] = await inSession(() =>
    Promise.all([automute.get(), autounmute.get(), scheduledMessages.getAllPending()])
  );
  if (sessions.get(sessionId)?.client !== client) return false;

  const signature = signatureOf(mutes || [], unmutes || [], pending || []);
  if (!force && signatures.get(sessionId) === signature) return false;

  destroyTasks(sessionId);
  signatures.set(sessionId, signature);

  const started = [];
  const add = (expression, run, label) => {
    try {
      started.push(startTask(sessionId, expression, run));
    } catch (error) {
      console.error(`Could not schedule ${label}:`, error.message);
    }
  };

  for (const [list, setting, text] of [
    [mutes || [], "announcement", () => config.AUTOMUTE_MSG],
    [unmutes || [], "not_announcement", () => config.AUTOUNMUTE_MSG],
  ]) {
    for (const record of list) {
      const row = record.dataValues;
      const [hours, mins] = row.time.split(" ");
      add(`${mins} ${hours} * * *`, muteTask(client, row.chat, row, sessionId, inSession, setting, text), `${setting} for ${row.chat}`);
    }
  }

  if (pending && pending.length > 0) {
    add("* * * * *", () => inSession(() => sendDueMessages(client, sessionId)), "scheduled messages");
  }

  await Promise.all(started);
  return true;
}

// one build at a time per session so reconnects and edits cannot interleave
const builds = new Map();

function enqueue(sessionId, fn) {
  const next = (builds.get(sessionId) || Promise.resolve()).catch(() => {}).then(fn);
  builds.set(sessionId, next);
  const clear = () => {
    if (builds.get(sessionId) === next) builds.delete(sessionId);
  };
  next.then(clear, clear);
  return next;
}

function rebuild(sessionId, options) {
  return enqueue(sessionId, async () => {
    const entry = sessions.get(sessionId);
    if (entry) await buildTasks(entry.client, entry.session, sessionId, options);
  });
}

events.on("schedule:changed", ({ accountId } = {}) => {
  const first = sessions.keys().next().value;
  for (const [sessionId, entry] of sessions) {
    const concerned = accountId == null || entry.session?.accountId === accountId || sessionId === first;
    if (!concerned) continue;
    rebuild(sessionId).catch((error) => console.error("Could not rebuild schedules:", error.message));
  }
});

const detectPlatform = () => platform.detect();

function supportsAutoUpdate() {
  return (
    config.AUTO_UPDATE &&
    (detectPlatform() === "render" || detectPlatform() === "local")
  );
}

async function performAutoUpdate() {
  if (!config.AUTO_UPDATE || isAutoUpdating) return;

  try {
    if (!(await updater.isGitRepo())) return;

    const info = await updater.check();
    if (!info.isStable) return;
    const { localVersion, remoteVersion } = info;

    isAutoUpdating = true;
    const platform = detectPlatform();

    console.log(
      `🔄 Auto-update started: ${localVersion} → ${remoteVersion} (platform: ${platform})`
    );

    if (platform === "render") {
      try {
        const result = await updater.deployOnRender();
        if (!result.started) {
          console.error("❌ Auto-update failed: RENDER_API_KEY not set");
          isAutoUpdating = false;
          return;
        }
        console.log("✅ Auto-update: Render deploy initiated");
      } catch (err) {
        console.error("❌ Auto-update failed on Render:", err.message);
        isAutoUpdating = false;
      }
      return;
    }

    if (platform === "local") {
      try {
        const result = await updater.applyLocal();
        if (!result.updated) {
          isAutoUpdating = false;
          console.error("❌ Auto-update skipped: local changes outside plugins/", result.dirty);
          await notifyOwners(
            `*_AUTO-UPDATE SKIPPED_*\n\nThese files were changed here and an update would overwrite them:\n${updater.describeDirty(result.dirty)}\n\n_Revert them, or send "${(config.HANDLERS || ".").split("")[0]}update start force" to update anyway._`
          );
          return;
        }

        console.log(
          `✅ Auto-update completed: ${localVersion} → ${remoteVersion}`
        );
        if (result.installError) {
          isAutoUpdating = false;
          await notifyOwners(
            `*_AUTO-UPDATE_*\n\nUpdated to ${remoteVersion}, but installing modules failed: ${result.installError}\n\n_Run "yarn install" in the bot folder, then restart the bot. It was not restarted._`
          );
          return;
        }
        if (result.moved?.length) {
          await notifyOwners(
            `*_AUTO-UPDATE_*\n\nThe bot now ships these files, so your copies were renamed to <name>.bak:\n${result.moved.map((f) => `• ${f}`).join("\n")}`
          );
        }
        await lifecycle.restart("auto-update");
      } catch (updateErr) {
        console.error("❌ Auto-update failed:", updateErr.message);
        isAutoUpdating = false;
      }
    }
  } catch (error) {
    console.error("Auto-update check error:", error.message);
    isAutoUpdating = false;
  }
}

async function checkUpdates() {
  if (updaterNotified) return;

  try {
    const localVersion = localPackageJson.version;
    const remoteVersion = await updater.getRemoteVersion();

    if (isNewerVersion(remoteVersion, localVersion)) {
      const platform = detectPlatform();
      const autoUpdateSupported = supportsAutoUpdate();

      let changelog = `*_UPDATE AVAILABLE_*\n\nYour current version: *${localVersion}*\nNew version: *${remoteVersion}*\n\n`;

      let fetchedGitChangelog = false;
      try {
        if (await updater.isGitRepo()) {
          const commits = await updater.fetchCommits();

          if (commits.total > 0) {
            changelog += `*_CHANGELOG:_*\n\n`;
            for (let i in commits.all) {
              changelog += `${parseInt(i) + 1}• *${
                commits.all[i].message
              }*\n`;
            }
            fetchedGitChangelog = true;
          } else {
            fetchedGitChangelog = true;
          }
        }
      } catch (gitError) {
        console.error("Git error during changelog fetch:", gitError.message);
      }

      if (!fetchedGitChangelog) {
        changelog += `_Unable to fetch changelog (Not a Git repo or error occurred)._ \n`;
      }

      changelog += `\n_Please update your bot to get the latest features and fixes._`;

      if (autoUpdateSupported) {
        changelog += `\n\n_⚡ Auto-updating..._`;
      } else if (platform === "local") {
        const handlerPrefix = (config.HANDLERS || ".").split("")[0];
        changelog += `\n\n_Use the "${handlerPrefix}update start" command to apply the update._`;
      } else {
        const platformName =
          platform.charAt(0).toUpperCase() + platform.slice(1);
        changelog += `\n\n_⚠️ Auto-update not supported on ${platformName}. Please update manually._\n_For help, join: ${config.SUPPORT_GROUP}_`;
      }

      // mark first so a failing socket cannot loop git fetch forever
      updaterNotified = true;
      await notifyOwners(changelog.trim());

      if (autoUpdateSupported) {
        await performAutoUpdate();
      }
    }
  } catch (error) {}
}

async function sendOfflinePresence(sessionId) {
  if (config.ALWAYS_ONLINE) return;
  const entry = sessions.get(sessionId);
  if (!entry) return;
  try {
    await entry.client.sendPresenceUpdate("unavailable");
  } catch (_) {}
}

function startUpdateChecker() {
  if (updateTimer) return;
  updateTimer = setInterval(() => context.runUnscoped(checkUpdates), UPDATE_INTERVAL);
  updateTimer.unref?.();
}

const Schedule = async (client, sessionId = client?.user?.id || "default") => {
  const existing = sessions.get(sessionId);
  if (existing?.presenceTimer) clearInterval(existing.presenceTimer);

  const session = context.current();
  const presenceTimer = setInterval(
    () => (session ? context.run(session, () => sendOfflinePresence(sessionId)) : sendOfflinePresence(sessionId)),
    PRESENCE_INTERVAL,
  );
  presenceTimer.unref?.();
  sessions.set(sessionId, { client, presenceTimer, session });

  await rebuild(sessionId, { force: true });

  startUpdateChecker();
};

Schedule.cleanup = async (sessionId) => {
  if (sessionId !== undefined) {
    const entry = sessions.get(sessionId);
    if (entry?.presenceTimer) clearInterval(entry.presenceTimer);
    sessions.delete(sessionId);
    signatures.delete(sessionId);
    destroyTasks(sessionId);
    return;
  }
  for (const entry of sessions.values()) {
    if (entry.presenceTimer) clearInterval(entry.presenceTimer);
  }
  sessions.clear();
  signatures.clear();
  destroyAllTasks();
  if (updateTimer) clearInterval(updateTimer);
  updateTimer = null;
};

Schedule.settled = () => Promise.all([...builds.values()].map((p) => p.catch(() => {})));
Schedule.isNewerVersion = isNewerVersion;
Schedule.performAutoUpdate = performAutoUpdate;

module.exports = Schedule;
