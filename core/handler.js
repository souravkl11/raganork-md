const config = require("../config");
const { GroupUpdate } = require("./constructors");
String.prototype.format = function () {
  let i = 0,
    args = arguments;
  return this.replace(/{}/g, function () {
    return typeof args[i] != "undefined" ? args[i++] : "";
  });
};
const { commands } = require("./plugins/registry");
const { loadAll } = require("./plugins/loader");
const { handle } = require("./pipeline");
const { ownerTarget } = require("./identity");

// resolves once db config, plugins and table sync are done; entry points wait on it
const ready = loadAll();
ready.catch((error) => {
  console.error("Failed to load plugins:", error);
});

const handler = async (message, client) => {
  await ready;
  await handle(message, client);
};

const groupUpdate = async (client, update) => {
  await ready;
  for (const cmd of commands.filter((cmd) => cmd.on === "group-update")) {
    if (config.BLOCK_CHAT.includes(update.id) || !update.action) return;
    const processor = new GroupUpdate(client, update);
    try {
      await cmd.function(processor);
    } catch (error) {
      if (
        ["connect", "rate", "Connect", "Timed", "auth", "forb", "busy"].some(
          (e) => error.message.includes(e),
        )
      )
        return;
      if (config.NOLOG === "true") return;
      console.error(
        `[GroupUpdate] Error in handler for ${update.id}:`,
        error.message,
      );
    }
  }
};

const startEvent = async (client) => {
  await ready;
  const startCommands = commands.filter((cmd) => cmd.on === "start");
  if (startCommands.length === 0) return;
  const executeStartCommand = async (cmd, index) => {
    const timeout = new Promise((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(`Start event #${index + 1} timed out after 30 seconds`),
          ),
        30000,
      ),
    );

    try {
      await Promise.race([cmd.function(client), timeout]);
    } catch (error) {
      if (
        ["connect", "rate", "Connect", "Timed", "auth", "forb", "busy"].some(
          (e) => error.message.includes(e),
        )
      )
        return;
      if (config.NOLOG === "true") return;
      console.error(
        `[StartEvent] Error in handler #${index + 1}:`,
        error.message,
      );
      try {
        await client.sendMessage(
          ownerTarget(client),
          {
            text: `\`\`\`START EVENT ERROR (Handler #${index + 1}):\n\n${
              error.message
            }\`\`\``,
          },
        );
      } catch {}
    }
  };

  Promise.allSettled(
    startCommands.map((cmd, index) => executeStartCommand(cmd, index)),
  );
};

module.exports = { handler, groupUpdate, startEvent, ready };
