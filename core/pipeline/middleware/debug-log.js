// DEBUG: one console line per message, then the whole payload
const config = require("../../../config");

module.exports = async function debugLog(env, next) {
  // DEBUG may come from env (boolean) or from the db override (string)
  if (config.DEBUG === true || config.DEBUG === "true") {
    const { msg } = env;
    console.log(
      `[msg] ${env.isGroup ? "group" : "pm"} ${env.jid} from ${env.sender}${
        env.fromMe ? " (me)" : ""
      } | ${env.type}: ${env.text || "<no text>"}
       ${JSON.stringify(msg.message, null, 2)}`,
    );
  }
  await next();
};
