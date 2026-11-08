const config = require("../config");
const axios = require("axios");
const cron = require("node-cron");
const simpleGit = require("simple-git");
const git = simpleGit();

const {
  automute,
  autounmute,
  scheduledMessages,
} = require("../plugins/utils/db/schedulers");
const localPackageJson = require("../package.json");
const renderDeploy = require("../plugins/utils/render-api");
const { spawn } = require("child_process");

const PRESENCE_INTERVAL = 10000;
const UPDATE_INTERVAL = 120000;

// db-wide cron jobs (automute, scheduled messages) run on one owner session only,
// otherwise multi-session setups would send everything n times
const activeTasks = new Map();
let ownerSessionId = null;

// sessionId -> { client, presenceTimer }
const sessions = new Map();

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

function destroyTasks() {
  activeTasks.forEach((task) => {
    try {
      task.destroy();
    } catch (_) {}
  });
  activeTasks.clear();
}

async function notifyOwners(text) {
  const sent = new Set();
  for (const { client } of sessions.values()) {
    const me = client.user?.id?.split(":")[0];
    const owner = (config.SUDO || "").split(",")[0].trim() || me;
    if (!owner || sent.has(owner)) continue;
    sent.add(owner);
    try {
      await client.sendMessage(owner + "@s.whatsapp.net", { text });
    } catch (_) {}
  }
}

async function buildTasks(client) {
const setupMuteSchedules = async () => {
  const autoMutes = await automute.get();
  const muteTaskPromises = [];

  if (!autoMutes || autoMutes.length === 0) {
    return;
  }

  for (const record of autoMutes) {
    const [hours, mins] = record.dataValues.time.split(" ");
    const jid = record.dataValues.chat;
    const taskName = `automute-${jid}`;

    muteTaskPromises.push(
      new Promise((resolve) => {
        const task = cron.schedule(
          `${mins} ${hours} * * *`,
          async () => {
            try {
              await client.groupSettingUpdate(jid, "announcement");
              await client.sendMessage(jid, { text: config.AUTOMUTE_MSG });
            } catch (error) {
              console.error(`Error in automute task for ${jid}:`, error);
            }
          },
          {
            scheduled: false,
          }
        );

        activeTasks.set(taskName, task);

        // Use setImmediate to defer the start to next event loop tick
        setImmediate(() => {
          task.start();
          resolve();
        });
      })
    );
  }

  const autoUnMutes = await autounmute.get();

  if (!autoUnMutes || autoUnMutes.length === 0) {
    await Promise.all(muteTaskPromises);
    return;
  }

  for (const record of autoUnMutes) {
    const [hours, mins] = record.dataValues.time.split(" ");
    const jid = record.dataValues.chat;
    const taskName = `autounmute-${jid}`;

    muteTaskPromises.push(
      new Promise((resolve) => {
        const task = cron.schedule(
          `${mins} ${hours} * * *`,
          async () => {
            try {
              await client.groupSettingUpdate(jid, "not_announcement");
              await client.sendMessage(jid, { text: config.AUTOUNMUTE_MSG });
            } catch (error) {
              console.error(`Error in autounmute task for ${jid}:`, error);
            }
          },
          {
            scheduled: false,
          }
        );

        activeTasks.set(taskName, task);

        // Use setImmediate to defer the start to next event loop tick
        setImmediate(() => {
          task.start();
          resolve();
        });
      })
    );
  }

  // Wait for all mute tasks to be set up (but not necessarily started)
  await Promise.all(muteTaskPromises);
};

const setupScheduledMessages = async () => {
  const pendingMessages = await scheduledMessages.getAllPending();

  if (!pendingMessages || pendingMessages.length === 0) {
    return;
  }

  const taskName = "scheduled-messages";

  return new Promise((resolve) => {
    const task = cron.schedule(
      "* * * * *",
      async () => {
        try {
          const messagesToSend = await scheduledMessages.getDueForSending();
          for (const msg of messagesToSend) {
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
      },
      {
        scheduled: false,
      }
    );

    activeTasks.set(taskName, task);

    // Use setImmediate to defer the start to next event loop tick
    setImmediate(() => {
      task.start();
      resolve();
    });
  });
};

  await Promise.all([setupMuteSchedules(), setupScheduledMessages()]);
}

function detectPlatform() {
  if (process.env.RENDER_SERVICE_ID) return "render";
  if (process.env.RAILWAY_SERVICE_ID) return "railway";
  if (process.env.KOYEB_SERVICE_ID) return "koyeb";
  if (process.env.DYNO) return "heroku";
  return "local";
}

function supportsAutoUpdate() {
  return (
    config.AUTO_UPDATE &&
    (detectPlatform() === "render" || detectPlatform() === "local")
  );
}

async function performAutoUpdate() {
  if (!config.AUTO_UPDATE || isAutoUpdating) return;

  try {
    const isRepo = await git.checkIsRepo();
    if (!isRepo) return;

    await git.fetch();
    const commits = await git.log(["main..origin/main"]);
    const localVersion = localPackageJson.version;
    const remotePackageJsonUrl = `https://raw.githubusercontent.com/souravkl11/raganork-md/main/package.json`;
    const response = await axios.get(remotePackageJsonUrl);
    const remoteVersion = response.data.version;

    const hasCommits = commits.total > 0;
    const versionChanged = remoteVersion !== localVersion;
    const isStableUpdate = hasCommits && versionChanged;

    if (!isStableUpdate) return;

    isAutoUpdating = true;
    const platform = detectPlatform();

    console.log(
      `🔄 Auto-update started: ${localVersion} → ${remoteVersion} (platform: ${platform})`
    );

    if (platform === "render") {
      if (!config.RENDER_API_KEY) {
        console.error("❌ Auto-update failed: RENDER_API_KEY not set");
        isAutoUpdating = false;
        return;
      }

      try {
        await renderDeploy(
          process.env.RENDER_SERVICE_ID,
          config.RENDER_API_KEY
        );
        console.log("✅ Auto-update: Render deploy initiated");
      } catch (err) {
        console.error("❌ Auto-update failed on Render:", err.message);
        isAutoUpdating = false;
      }
      return;
    }

    if (platform === "local") {
      try {
        await git.reset("hard", ["HEAD"]);
        await git.pull();

        try {
          const diff = await git.diff(["HEAD~1", "HEAD", "--name-only"]);
          if (diff.includes("yarn.lock")) {
            console.log("📦 yarn.lock changed, running yarn install...");

            await new Promise((resolve, reject) => {
              const yarnProcess = spawn("yarn", ["install"], {
                cwd: process.cwd(),
                stdio: "inherit",
              });

              yarnProcess.on("close", (code) => {
                if (code !== 0) {
                  reject(new Error(`yarn install exited with code ${code}`));
                } else {
                  resolve();
                }
              });

              yarnProcess.on("error", reject);
            });

            console.log("✅ yarn install completed");
          }
        } catch (yarnErr) {
          console.error(
            "⚠️  Could not check yarn.lock diff:",
            yarnErr.message
          );
        }

        console.log(
          `✅ Auto-update completed: ${localVersion} → ${remoteVersion}`
        );
        process.exit(0);
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
    const remotePackageJsonUrl = `https://raw.githubusercontent.com/souravkl11/raganork-md/main/package.json`;
    const response = await axios.get(remotePackageJsonUrl);
    const remotePackageJson = response.data;
    const localVersion = localPackageJson.version;
    const remoteVersion = remotePackageJson.version;

    if (isNewerVersion(remoteVersion, localVersion)) {
      const platform = detectPlatform();
      const autoUpdateSupported = supportsAutoUpdate();

      let changelog = `*_UPDATE AVAILABLE_*\n\nYour current version: *${localVersion}*\nNew version: *${remoteVersion}*\n\n`;

      let fetchedGitChangelog = false;
      try {
        const isRepo = await git.checkIsRepo();
        if (isRepo) {
          await git.fetch();
          const commits = await git.log(["main..origin/main"]);

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

      // mark first so a failing socket cannot make us re-run git fetch forever
      updaterNotified = true;
      await notifyOwners(changelog.trim());

      // trigger auto-update if supported and enabled
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
  updateTimer = setInterval(checkUpdates, UPDATE_INTERVAL);
  updateTimer.unref?.();
}

const Schedule = async (client, sessionId = client?.user?.id || "default") => {
  const existing = sessions.get(sessionId);
  if (existing?.presenceTimer) clearInterval(existing.presenceTimer);

  const presenceTimer = setInterval(
    () => sendOfflinePresence(sessionId),
    PRESENCE_INTERVAL,
  );
  presenceTimer.unref?.();
  sessions.set(sessionId, { client, presenceTimer });

  if (!ownerSessionId || !sessions.has(ownerSessionId)) {
    ownerSessionId = sessionId;
  }
  // rebuild cron jobs when the owner (re)connects so they bind to the live socket
  // and pick up rows added since the last connect
  if (ownerSessionId === sessionId) {
    destroyTasks();
    await buildTasks(client);
  }

  startUpdateChecker();
};

// with a sessionId: drop only that session's timers. without: tear everything down.
Schedule.cleanup = async (sessionId) => {
  if (sessionId !== undefined) {
    const entry = sessions.get(sessionId);
    if (entry?.presenceTimer) clearInterval(entry.presenceTimer);
    sessions.delete(sessionId);
    if (ownerSessionId === sessionId) {
      destroyTasks();
      ownerSessionId = null;
    }
    return;
  }
  for (const entry of sessions.values()) {
    if (entry.presenceTimer) clearInterval(entry.presenceTimer);
  }
  sessions.clear();
  destroyTasks();
  ownerSessionId = null;
  if (updateTimer) clearInterval(updateTimer);
  updateTimer = null;
};

Schedule.isNewerVersion = isNewerVersion;

module.exports = Schedule;
