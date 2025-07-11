const simpleGit = require('simple-git');
const git = simpleGit();
const { Module } = require('../main');
// const { update } = require('./misc/koyeb');
const renderDeploy = require('./utils/render-api');
const config = require('../config');
const fs = require('fs').promises;

const handler = config.HANDLERS !== 'false' ? config.HANDLERS.split("")[0] : "";

async function isGitRepo() {
  try {
    await fs.access('.git');
    return true;
  } catch (e) {
    return false;
  }
}

Module({
  pattern: 'update ?(.*)',
  fromMe: true,
  desc: "Checks for and applies bot updates.",
  use: 'owner'
}, (async (message, match) => {
  if (!(await isGitRepo())) {
    return await message.sendReply("_This bot isn't running from a Git repository. Automatic updates aren't available._");
  }

  const command = match[1] ? match[1].toLowerCase() : '';
  const processingMsg = await message.sendReply("_Checking for updates..._");

  await git.fetch();
  const commits = await git.log(['main' + '..origin/' + 'main']);

  if (commits.total === 0) {
    return await message.edit("_Bot up to date!_", message.jid, processingMsg.key);
  }

  if (command === 'start') {
    await message.edit("_Starting update..._", message.jid, processingMsg.key);

    if (process.env.RENDER_SERVICE_ID) {
      if (!config.RENDER_API_KEY) {
        return await message.edit("_Missing RENDER_API_KEY!_", message.jid, processingMsg.key);
      }

      await renderDeploy(process.env.RENDER_SERVICE_ID, config.RENDER_API_KEY);
      return await message.edit("_Render deploy started!_", message.jid, processingMsg.key);
    }

    if (!__dirname.startsWith("/rgnk")) {
      await git.reset("hard", ["HEAD"]);
      await git.pull();
      await message.edit("_Successfully updated. Please manually update npm modules if applicable!_", message.jid, processingMsg.key);
      process.exit(0);
    } else {
      return await message.edit("_Please visit the hosted platform and hit deploy to update._", message.jid, processingMsg.key);
    }

  } else {
    let changelog = "_Pending updates:_\n\n";
    for (let i in commits.all) {
      changelog += `${(parseInt(i) + 1)}• *${commits.all[i].message}*\n`;
    }
    changelog += `\n_Use "${handler}update start" to start the update_`;
    return await message.edit(changelog, message.jid, processingMsg.key);
  }
}));
