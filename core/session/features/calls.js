const config = require("../../../config");
const { logger } = config;

// rejects incoming calls when REJECT_CALLS is on, unless the caller is in ALLOWED_CALLS
async function handleCall(bot, callUpdate) {
  try {
    logger.info({ session: bot.sessionId }, `Incoming call.`);
    if (config.REJECT_CALLS === true) {
      const _call = callUpdate[0];
      if (_call && _call.status === "offer") {
        const allowedCallers = config.ALLOWED_CALLS
          ? config.ALLOWED_CALLS.split(",").map((num) => num.trim())
          : [];
        const callerNumber = _call.from.split("@")[0];

        const isAllowed = allowedCallers.some((allowed) =>
          callerNumber.includes(allowed),
        );

        if (!isAllowed) {
          await bot.sock.rejectCall(_call.id, _call.from);
          logger.info(
            {
              session: bot.sessionId,
              callId: _call.id,
              caller: callerNumber,
            },
            `Call rejected from non-allowed caller`,
          );

          if (
            config.CALL_REJECT_MESSAGE &&
            config.CALL_REJECT_MESSAGE.trim()
          ) {
            try {
              await bot.sock.sendMessage(_call.from, {
                text: config.CALL_REJECT_MESSAGE,
              });
              logger.info(
                { session: bot.sessionId, caller: callerNumber },
                `Sent call rejection message`,
              );
            } catch (msgError) {
              logger.error(
                {
                  session: bot.sessionId,
                  caller: callerNumber,
                  err: msgError,
                },
                `Failed to send call rejection message`,
              );
            }
          }
        } else {
          logger.info(
            {
              session: bot.sessionId,
              callId: _call.id,
              caller: callerNumber,
            },
            `Call allowed from whitelisted caller`,
          );
        }
      }
    }
  } catch (error) {
    logger.error(
      { session: bot.sessionId, err: error },
      `Error handling call`,
    );
  }
}

module.exports = { handleCall };
