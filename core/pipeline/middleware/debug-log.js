// DEBUG: one console line per message, then the whole payload
const { debugOn } = require("../../helpers");

module.exports = async function debugLog(env, next) {
  if (debugOn()) {
    const { msg } = env;
    console.log(
      `[msg] ${env.isGroup ? "group" : env.isPM ? "pm" : env.jid.endsWith("@newsletter") ? "channel" : "status"} ${env.jid} from ${env.sender}${
        env.fromMe ? " (me)" : ""
      } | ${env.type}: ${env.text || "<no text>"}
       ${JSON.stringify(msg.message, null, 2)}`,
    );
  }
  await next();
};
