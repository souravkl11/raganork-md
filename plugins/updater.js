const { Module } = require("../main");
const platform = require("../core/platform");
const lifecycle = require("../core/lifecycle");
const { updater } = require("../core/services/updater");
const { helpPrefix } = require("../core/plugins/registry");

Module(
  {
    pattern: "update ?(.*)",
    fromMe: true,
    desc: "Checks for and applies bot updates.",
    use: "owner",
  },
  async (message, match) => {
    if (!(await updater.isGitRepo())) {
      return await message.sendReply(
        "_This bot isn't running from a Git repository. Automatic updates aren't available._"
      );
    }

    // "start force" and "beta force" overwrite local changes outside plugins/
    const words = (match[1] ? match[1].toLowerCase() : "").split(/\s+/).filter(Boolean);
    const command = words[0] || "";
    const force = words.includes("force");
    const processingMsg = await message.sendReply("_Checking for updates..._");
    const edit = (text) => message.edit(text, message.jid, processingMsg.key);

    try {
      let info;
      try {
        info = await updater.check();
      } catch (error) {
        if (error.message === "Failed to fetch remote version") {
          return await edit("_Failed to check remote version. Please try again later._");
        }
        throw error;
      }
      const { commits, localVersion, remoteVersion, hasCommits, versionChanged } = info;
      const { isStable: isStableUpdate, isBeta: isBetaUpdate } = info;

      if (!hasCommits) {
        if (versionChanged) await updater.resetVersion(remoteVersion);
        return await edit("_Bot is up to date!_");
      }

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
          updateInfo += `\n_Use "${helpPrefix()}update start" to apply the update_`;
        } else if (isBetaUpdate) {
          updateInfo = `*_BETA UPDATE AVAILABLE_*\n\n`;
          updateInfo += `📦 Current version: *${localVersion}*\n`;
          updateInfo += `⚠️ New commits available (version unchanged)\n\n`;
          updateInfo += `*_CHANGELOG:_*\n\n`;
          for (let i in commits.all) {
            updateInfo += `${parseInt(i) + 1}• *${commits.all[i].message}*\n`;
          }
          updateInfo += `\n_Use "${helpPrefix()}update beta" to apply beta updates_`;
        }

        return await edit(updateInfo);
      }

      if (command === "start" || command === "beta") {
        const beta = command === "beta";
        if (beta && !hasCommits) {
          return await edit("_No beta updates available!_");
        }
        if (!beta && !isStableUpdate) {
          if (isBetaUpdate) {
            return await edit(
              `_Only beta updates available. Use "${helpPrefix()}update beta" to apply them._`
            );
          }
          return await edit("_No stable updates available!_");
        }

        await edit(beta ? "_Starting beta update..._" : "_Starting update..._");

        if (process.env.RENDER_SERVICE_ID) {
          const result = await updater.deployOnRender();
          if (!result.started) return await edit("_Missing RENDER_API_KEY!_");
          return await edit(
            beta ? "_Render deploy started for beta update!_" : "_Render deploy started!_"
          );
        }

        // the image folder counts too: Railway or Heroku running the /rgnk image still
        // cannot keep a git update
        const where = platform.current();
        if (where.isKoyeb || where.inKoyebImage) {
          return await edit("_Please visit the hosted platform and hit deploy to update._");
        }

        const result = await updater.applyLocal({ force });
        if (!result.updated) {
          return await edit(
            `_Update cancelled. These files were changed here, and the update would overwrite them:_\n\n${updater.describeDirty(result.dirty)}\n\n_Revert them, or use "${helpPrefix()}update ${command} force" to update anyway._`
          );
        }
        if (result.installError) {
          return await edit(
            `_Updated, but installing modules failed: ${result.installError}_\n\n_Run "yarn install" in the bot folder, then restart the bot. It was not restarted._`
          );
        }
        const movedNote = result.moved?.length
          ? `\n\n_The bot now ships these files, so your copies were renamed to <name>.bak:_\n${result.moved.map((f) => `• ${f}`).join("\n")}`
          : "";
        await edit(
          (beta
            ? `_Successfully applied beta update (${commits.total} commit${
                commits.total > 1 ? "s" : ""
              })._`
            : `_Successfully updated to version ${remoteVersion}._`) +
            (result.installed ? "\n_Modules were installed._" : "") +
            movedNote
        );
        await lifecycle.restart(beta ? "beta update" : "update");
      } else {
        return await edit(
          `_Invalid command. Use "${helpPrefix()}update" to check updates, "${helpPrefix()}update start" for stable updates, or "${helpPrefix()}update beta" for beta updates._`
        );
      }
    } catch (error) {
      console.error("Update error:", error);
      return await edit("_An error occurred while checking for updates._");
    }
  }
);
