const simpleGit = require("simple-git");
const git = simpleGit();
const { Module } = require("../main");
// const { update } = require('./misc/koyeb');
const renderDeploy = require("./utils/render-api");
const config = require("../config");
const fs = require("fs").promises;
const axios = require("axios");

const handler = config.HANDLERS !== "false" ? config.HANDLERS.split("")[0] : "";
const localPackageJson = require("../package.json");

async function isGitRepo() {
  try {
    await fs.access(".git");
    return true;
  } catch (e) {
    return false;
  }
}

async function getRemoteVersion() {
  try {
    const remotePackageJsonUrl = `https://raw.githubusercontent.com/souravkl11/raganork-md/main/package.json`;
    const response = await axios.get(remotePackageJsonUrl);
    return response.data.version;
  } catch (error) {
    throw new Error("Failed to fetch remote version");
  }
}

Module(
  {
    pattern: "update ?(.*)",
    fromMe: true,
    desc: "Checks for and applies bot updates.",
    use: "owner",
  },
  async (message, match) => {
    if (!(await isGitRepo())) {
      return await message.sendReply(
        "_This bot isn't running from a Git repository. Automatic updates aren't available._"
      );
    }

    const command = match[1] ? match[1].toLowerCase() : "";
    const processingMsg = await message.sendReply("_Checking for updates..._");

    try {
      // fetch remote version & commits
      await git.fetch();
      const commits = await git.log(["main" + "..origin/" + "main"]);
      const localVersion = localPackageJson.version;
      let remoteVersion;

      try {
        remoteVersion = await getRemoteVersion();
      } catch (error) {
        return await message.edit(
          "_Failed to check remote version. Please try again later._",
          message.jid,
          processingMsg.key
        );
      }

      const hasCommits = commits.total > 0;
      const versionChanged = remoteVersion !== localVersion;

      if (!hasCommits && !versionChanged) {
        return await message.edit(
          "_Bot is up to date!_",
          message.jid,
          processingMsg.key
        );
      }

      const isBetaUpdate = hasCommits && !versionChanged;
      const isStableUpdate = hasCommits && versionChanged;

      if (!command) {
        let updateInfo = "";

        if (isStableUpdate) {
          updateInfo = `*_UPDATE AVAILABLE_*\n\n`;
          updateInfo += `📦 Current version: *${localVersion}*\n`;
          updateInfo += `📦 New version: *${remoteVersion}*\n\n`;
          updateInfo += `*_CHANGELOG:_*\n\n`;
          for (let i in commits.all) {
            updateInfo += `${parseInt(i) + 1}• *${commits.all[i].message}*\n`;
          }
          updateInfo += `\n_Use "${handler}update start" to apply the update_`;
        } else if (isBetaUpdate) {
          updateInfo = `*_BETA UPDATE AVAILABLE_*\n\n`;
          updateInfo += `📦 Current version: *${localVersion}*\n`;
          updateInfo += `⚠️ New commits available (version unchanged)\n\n`;
          updateInfo += `*_CHANGELOG:_*\n\n`;
          for (let i in commits.all) {
            updateInfo += `${parseInt(i) + 1}• *${commits.all[i].message}*\n`;
          }
          updateInfo += `\n_Use "${handler}update beta" to apply beta updates_`;
        }

        return await message.edit(updateInfo, message.jid, processingMsg.key);
      }

      if (command === "start") {
        if (!isStableUpdate) {
          if (isBetaUpdate) {
            return await message.edit(
              `_Only beta updates available. Use "${handler}update beta" to apply them._`,
              message.jid,
              processingMsg.key
            );
          }
          return await message.edit(
            "_No stable updates available!_",
            message.jid,
            processingMsg.key
          );
        }

        await message.edit(
          "_Starting update..._",
          message.jid,
          processingMsg.key
        );

        if (process.env.RENDER_SERVICE_ID) {
          if (!config.RENDER_API_KEY) {
            return await message.edit(
              "_Missing RENDER_API_KEY!_",
              message.jid,
              processingMsg.key
            );
          }

          await renderDeploy(
            process.env.RENDER_SERVICE_ID,
            config.RENDER_API_KEY
          );
          return await message.edit(
            "_Render deploy started!_",
            message.jid,
            processingMsg.key
          );
        }

        if (!__dirname.startsWith("/rgnk")) {
          await git.reset("hard", ["HEAD"]);
          await git.pull();
          await message.edit(
            `_Successfully updated to version ${remoteVersion}. Please manually update npm modules if applicable!_`,
            message.jid,
            processingMsg.key
          );
          process.exit(0);
        } else {
          return await message.edit(
            "_Please visit the hosted platform and hit deploy to update._",
            message.jid,
            processingMsg.key
          );
        }
      } else if (command === "beta") {
        if (!hasCommits) {
          return await message.edit(
            "_No beta updates available!_",
            message.jid,
            processingMsg.key
          );
        }

        await message.edit(
          "_Starting beta update..._",
          message.jid,
          processingMsg.key
        );

        if (process.env.RENDER_SERVICE_ID) {
          if (!config.RENDER_API_KEY) {
            return await message.edit(
              "_Missing RENDER_API_KEY!_",
              message.jid,
              processingMsg.key
            );
          }

          await renderDeploy(
            process.env.RENDER_SERVICE_ID,
            config.RENDER_API_KEY
          );
          return await message.edit(
            "_Render deploy started for beta update!_",
            message.jid,
            processingMsg.key
          );
        }

        if (!__dirname.startsWith("/rgnk")) {
          await git.reset("hard", ["HEAD"]);
          await git.pull();
          await message.edit(
            `_Successfully applied beta update (${commits.total} commit${
              commits.total > 1 ? "s" : ""
            }). Please manually update npm modules if applicable!_`,
            message.jid,
            processingMsg.key
          );
          process.exit(0);
        } else {
          return await message.edit(
            "_Please visit the hosted platform and hit deploy to update._",
            message.jid,
            processingMsg.key
          );
        }
      } else {
        return await message.edit(
          `_Invalid command. Use "${handler}update" to check updates, "${handler}update start" for stable updates, or "${handler}update beta" for beta updates._`,
          message.jid,
          processingMsg.key
        );
      }
    } catch (error) {
      console.error("Update error:", error);
      return await message.edit(
        "_An error occurred while checking for updates._",
        message.jid,
        processingMsg.key
      );
    }
  }
);
