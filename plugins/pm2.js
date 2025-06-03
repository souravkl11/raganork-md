const { Module } = require('../main');
const { exec } = require('child_process');
const { MODE } = require('../config');
const PM2_ID = process.env.PM2_ID || '0';
let auto = MODE == 'public' ? false : true;

function restartPM2(command) {
  return new Promise((resolve, reject) => {
    exec(`pm2 ${command} ${PM2_ID}`, (error, stdout, stderr) => {
      if (error) return reject(stderr || stdout || error.message);
      return resolve(stdout);
    });
  });
}

Module({
  pattern: 'reload',
  fromMe: auto,
  desc: 'Reload the bot using PM2',
  use: 'system'
}, async (m) => {
  try {
    await m.sendReply('_Reloading bot..._');
    const output = await restartPM2('reload');
    await m.sendReply('```' + output + '```');
  } catch (err) {
    await m.sendReply('❌ Error:\n' + err);
  }
});

Module({
  pattern: 'restart',
  fromMe: auto,
  desc: 'Restart the bot using PM2',
  use: 'system'
}, async (m) => {
  try {
    await m.sendReply('_Restarting bot..._');
    const output = await restartPM2('restart');
    await m.sendReply('```' + output + '```');
  } catch (err) {
    await m.sendReply('❌ Error:\n' + err);
  }
});
