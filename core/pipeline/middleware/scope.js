// antibot and antispam look at groups (a jid ending in "us") and, with PM_ANTISPAM, at PMs
const config = require("../../../config");

module.exports = { inSpamScope: (env) => env.jid.endsWith("us") || Boolean(config.PM_ANTISPAM) };
