const simpleGit = require('simple-git');
const git = simpleGit();
const {Module} = require('../main');
//const {update} = require('./misc/koyeb');
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

    await git.fetch();
    const commits = await git.log(['main' + '..origin/' + 'main']);

    if (commits.total === 0) {
        return await message.client.sendMessage(message.jid, { text: "_Bot up to date!_" });
    }

    if (command === 'start') {
        if (!__dirname.startsWith("/rgnk")) {
            await require("simple-git")().reset("hard", ["HEAD"]);
            await require("simple-git")().pull();
            await message.sendReply("_Successfully updated. Please manually update npm modules if applicable!_");
            process.exit(0);
        } else {
            await message.client.sendMessage(message.jid, { text: "_Please visit the hosted platform and hit deploy to update._" });
        }
    } else {

        let changelog = "_Pending updates:_\n\n";
        for (let i in commits.all) {
            changelog += `${(parseInt(i) + 1)}• *${commits.all[i].message}*\n`;
        }
        changelog += `\n_Use "${handler}update start" to start the update_`;
        return await message.client.sendMessage(message.jid, { text: changelog });
    }
}));