const { Module } = require("../main");
const platform = require("../core/platform");
const lifecycle = require("../core/lifecycle");
const { updater } = require("../core/services/updater");
const { helpPrefix } = require("../core/plugins/registry");
const { getString } = require("./utils/lang");
const Lang = getString("update");

Module(
  {
    pattern: "update ?(.*)",
    fromMe: true,
    desc: Lang.DESC,
    use: "owner",
  },
  async (message, match) => {
    if (!(await updater.isGitRepo())) {
      return await message.sendReply(
        Lang.NO_GIT
      );
    }

    // "start force" and "beta force" overwrite local changes outside plugins/
    const words = (match[1] ? match[1].toLowerCase() : "").split(/\s+/).filter(Boolean);
    const command = words[0] || "";
    const force = words.includes("force");
    const processingMsg = await message.sendReply(Lang.CHECKING);
    const edit = (text) => message.edit(text.replaceAll("{p}", helpPrefix()), message.jid, processingMsg.key);

    try {
      let info;
      try {
        info = await updater.check();
      } catch (error) {
        if (error.message === "Failed to fetch remote version") {
          return await edit(Lang.REMOTE_FAILED);
        }
        throw error;
      }
      const { commits, localVersion, remoteVersion, hasCommits, versionChanged } = info;
      const { isStable: isStableUpdate, isBeta: isBetaUpdate } = info;

      if (!hasCommits) {
        if (versionChanged) await updater.resetVersion(remoteVersion);
        return await edit(Lang.UP_TO_DATE);
      }

      if (!command) {
        let updateInfo = "";

        if (isStableUpdate) {
          updateInfo = Lang.STABLE_HEADER.format(localVersion, remoteVersion);
          for (let i in commits.all) {
            updateInfo += `${parseInt(i) + 1}• *${commits.all[i].message}*\n`;
          }
          updateInfo += Lang.STABLE_FOOTER;
        } else if (isBetaUpdate) {
          updateInfo = Lang.BETA_HEADER.format(localVersion);
          for (let i in commits.all) {
            updateInfo += `${parseInt(i) + 1}• *${commits.all[i].message}*\n`;
          }
          updateInfo += Lang.BETA_FOOTER;
        }

        return await edit(updateInfo);
      }

      if (command === "start" || command === "beta") {
        const beta = command === "beta";
        if (beta && !hasCommits) {
          return await edit(Lang.NO_BETA);
        }
        if (!beta && !isStableUpdate) {
          if (isBetaUpdate) {
            return await edit(
              Lang.ONLY_BETA
            );
          }
          return await edit(Lang.NO_STABLE);
        }

        await edit(beta ? Lang.STARTING_BETA : Lang.STARTING);

        if (process.env.RENDER_SERVICE_ID) {
          const result = await updater.deployOnRender();
          if (!result.started) return await edit(Lang.NO_RENDER_KEY);
          return await edit(
            beta ? Lang.RENDER_BETA : Lang.RENDER
          );
        }

        // the image folder counts too: Railway or Heroku running the /rgnk image still
        // cannot keep a git update
        const where = platform.current();
        if (where.isKoyeb || where.inKoyebImage) {
          return await edit(Lang.KOYEB);
        }

        const result = await updater.applyLocal({ force });
        if (!result.updated) {
          return await edit(
            Lang.DIRTY.format(updater.describeDirty(result.dirty), command)
          );
        }
        if (result.installError) {
          return await edit(
            Lang.INSTALL_FAILED.format(result.installError)
          );
        }
        const movedNote = result.moved?.length
          ? Lang.MOVED.format(result.moved.map((f) => `• ${f}`).join("\n"))
          : "";
        await edit(
          (beta
            ? Lang.BETA_DONE.format(commits.total, commits.total > 1 ? Lang.PLURAL : "")
            : Lang.DONE.format(remoteVersion)) +
            (result.installed ? Lang.INSTALLED : "") +
            movedNote
        );
        await lifecycle.restart(beta ? "beta update" : "update");
      } else {
        return await edit(
          Lang.INVALID
        );
      }
    } catch (error) {
      console.error("Update error:", error);
      return await edit(Lang.ERROR);
    }
  }
);
