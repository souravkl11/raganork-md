const config = require("../config");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { BotVariable } = require("../core/database");
const { Message, Image, Video, GroupUpdate } = require("./constructors");
const { antibot, antispam } = require("../plugins/utils");
const {
  stickcmd,
  AutoMuteDB,
  AutoUnMuteDB,
  StickyCmdDB,
  ScheduledMessageDB,
} = require("../plugins/utils/db/schedulers");
const {
  storeMessage,
  trackSpamMessage,
  Chat,
  User,
  UserStats,
  SpamTracker,
  ensureFullContentColumnExists,
  getRecentMessageCount,
  AntiDeleteCache,
} = require("../core/store");
const { filter } = require("../plugins/utils/db/functions");
String.prototype.format = function () {
  let i = 0,
    args = arguments;
  return this.replace(/{}/g, function () {
    return typeof args[i] != "undefined" ? args[i++] : "";
  });
};
let commands;
(async () => {
  await BotVariable.sync();
  const variables = await BotVariable.findAll();

  if (variables.length > 0) {
    // Convert database variables to a plain object
    const dbConfig = {};
    variables.forEach((v) => {
      dbConfig[v.key] = v.value;
    });

    config.loadFromDB(dbConfig);
  }
  commands = require("../main").commands;
  fs.readdirSync("./plugins/sql/")
    .filter((plugin) => path.extname(plugin) === ".js")
    .forEach((plugin) => require(`../plugins/sql/${plugin}`));

  fs.readdirSync("./plugins")
    .filter((plugin) => path.extname(plugin) === ".js")
    .forEach((plugin) => {
      try {
        require(`../plugins/${plugin}`);
      } catch (error) {
        console.error(`Error loading plugin ${plugin}:`, error);
      }
    });

  const plugindb = require("../plugins/sql/plugin");
  await Chat.sync();
  await User.sync();
  // add new columns before sync(), which would otherwise try to index a missing column
  await ensureFullContentColumnExists();
  await AntiDeleteCache.sync();
  await UserStats.sync();
  // SpamTracker is now in-memory, no sync needed
  await AutoMuteDB.sync();
  await AutoUnMuteDB.sync();
  await StickyCmdDB.sync();
  await ScheduledMessageDB.sync();
  await config.sequelize.sync();

  const plugins = await plugindb.PluginDB.findAll();
  for (const plugin of plugins) {
    const pluginPath = `./plugins/${plugin.dataValues.name}.js`;
    if (!fs.existsSync(pluginPath)) {
      try {
        const response = await axios(plugin.dataValues.url);
        fs.writeFileSync(pluginPath, response.data);
        require("." + pluginPath);
      } catch (error) {
        console.error(`Error on plugin: ${plugin.dataValues.name}\n\n${error}`);
      }
    }
  }
})();

const msgCount = parseInt((config.ANTISPAM_COUNT || "5/60").split("/")[0]);
const msgTime = parseInt(
  (config.ANTISPAM_COUNT || "5/60").split("/")[1] + "000",
);
const { getSudoMap, getSudoList, isSudo } = require("./sudo");

const handler = async (message, client) => {
  const msg = message.messages[0];
  if (!msg || !msg.key.remoteJid || !msg.message) return;
  const botNumber = client.user?.lid?.split(":")[0];
  const isGroup = msg.key.remoteJid.endsWith("@g.us");
  const senderJid = isGroup
    ? msg.key.participant || msg.key.participantAlt
    : msg.key.fromMe
      ? botNumber + "@lid"
      : msg.key.addressingMode === "pn"
        ? msg.key.remoteJidAlt
        : msg.key.remoteJid;
  if (!senderJid) return;
  if (config.READ_MESSAGES && msg.key.remoteJid !== "status@broadcast") {
    if (msg.message?.audioMessage) {
      await client.sendReceipts([msg.key], "played");
    } else {
      await client.readMessages([msg.key]);
    }
  }
  const isPM =
    !msg.key.remoteJid.endsWith("@g.us") &&
    msg.key.remoteJid !== "status@broadcast";

  // get first sudo from SUDO_MAP or fallback to bot
  let sudoOrMe =
    client.user?.lid || client.user?.id?.split(":")[0] + "@s.whatsapp.net";
  const sudoMap = getSudoMap();
  if (sudoMap.length > 0) {
    sudoOrMe = sudoMap[0];
  }
  if (msg.key.remoteJid === "status@broadcast" && config.AUTO_READ_STATUS) {
    const mtps = Object.keys(msg.message);
    if (
      [
        "audioMessage",
        "imageMessage",
        "videoMessage",
        "extendedTextMessage",
      ].some((type) => mtps.includes(type))
    ) {
      await client.readMessages([{ ...msg.key, participant: msg.key.remoteJidAlt }]);
    }
  }
  const blockedChats = (config.BLOCK_CHAT || "")?.split(",");
  const blockedJids = (config.RG || "")?.split(",");
  if (
    blockedChats.includes(msg.key.remoteJid) ||
    blockedJids.includes(msg.key.remoteJid)
  )
    return;
  await storeMessage(msg);
  if (msg.key.remoteJid.endsWith("us") || config.PM_ANTISPAM) {
    const antibotDb = await antibot.get();
    const antibotJids = antibotDb.map((data) => data.jid);
    if (
      antibotJids.includes(msg.key.remoteJid) &&
      !msg.key.fromMe &&
      ["RGNK", "BAE5", "QUEEN"].some((prefix) => msg.key.id.startsWith(prefix))
    ) {
      const metadata = await client.groupMetadata(msg.key.remoteJid);
      const admins = metadata.participants
        .filter((v) => v.admin)
        .map((x) => x.id);
      const senderJid = msg.key.participant || msg.key.participantAlt;
      const isAdmin = admins.includes(senderJid);

      if (!isAdmin) {
        await client.sendMessage(
          msg.key.remoteJid,
          { text: `_Bot detected!_`, mentions: [senderJid] },
          { quoted: msg },
        );
        await client.groupParticipantsUpdate(
          msg.key.remoteJid,
          [senderJid],
          "remove",
        );
      }
    }

    try {
      const antispamDb = await antispam.get();
      const antispamJids = antispamDb.map((data) => data.jid);

      if (
        antispamJids.includes(msg.key.remoteJid) ||
        (isPM && config.PM_ANTISPAM)
      ) {
        const Mtypes = [
          "videoMessage",
          "imageMessage",
          "conversation",
          "buttonsResponseMessage",
          "locationMessage",
          "templateButtonReplyMessage",
          "listResponseMessage",
          "extendedTextMessage",
          "stickerMessage",
          "contactMessage",
          "productMessage",
          "audioMessage",
        ];

        let Mtype;
        try {
          Mtype = Object.keys(msg.message)[0];
        } catch {
          return;
        }

        if (Mtypes.includes(Mtype)) {
          const userJid = isGroup
            ? msg.key.participant || msg.key.participantAlt
            : msg.key.remoteJid;
          const chatJid = msg.key.remoteJid;
          await trackSpamMessage(userJid, chatJid, msg.key.id);

          const recentCount = await getRecentMessageCount(
            userJid,
            chatJid,
            msgTime,
          );

          if (recentCount >= msgCount) {
            if (isPM) {
              await client.sendMessage(
                msg.key.remoteJid,
                { text: `_Spam detected, you have been blocked!_` },
                { quoted: msg },
              );
              await client.updateBlockStatus(msg.key.remoteJid, "block");
              return await client.sendMessage(
                sudoOrMe,
                {
                  text: `_*=== Spam block report ===*_\n\n_User:_ @${
                    userJid?.split("@")[0]
                  }\n_MessageType: ${Mtype}_\n_Time: ${new Date().toLocaleTimeString()}_`,
                  mentions: [userJid],
                },
                { quoted: msg },
              );
            }
            const metadata = await client.groupMetadata(msg.key.remoteJid);
            const admins = metadata.participants
              .filter((v) => v.admin)
              .map((x) => x.id);
            const isAdmin = admins.includes(userJid);

            if (!isAdmin) {
              await client.sendMessage(
                msg.key.remoteJid,
                {
                  text: `_Spam detected! @${userJid?.split("@")[0]} kicked!_`,
                  mentions: [userJid],
                },
                { quoted: msg },
              );
              await client.groupParticipantsUpdate(
                msg.key.remoteJid,
                [userJid],
                "remove",
              );
            } else {
              await client.sendMessage(
                msg.key.remoteJid,
                {
                  text: `_Spam detected! @${
                    userJid?.split("@")[0]
                  } is an admin!_`,
                  mentions: [userJid],
                },
                { quoted: msg },
              );
            }
          }
        }
      }
    } catch (error) {
      console.error(error);
    }
  }
  if (
    config.PMB_VAR &&
    isPM &&
    !msg.key.fromMe &&
    !isSudo(msg.key.remoteJidAlt || msg.key.remoteJid)
  ) {
    await client.sendMessage(msg.key.remoteJid, { text: config.PMB });
    await client.updateBlockStatus(msg.key.remoteJid, "block");
  }

  if (
    config.DIS_PM &&
    isPM &&
    !msg.key.fromMe &&
    !isSudo(msg.key.remoteJidAlt || msg.key.remoteJid)
  )
    return;

  let textMsg = false;
  if (msg.message?.conversation) {
    textMsg = msg.message.conversation;
  } else if (msg.message?.extendedTextMessage) {
    textMsg = msg.message.extendedTextMessage.text;
  } else if (msg.message?.imageMessage?.caption) {
    textMsg = msg.message.imageMessage.caption;
  } else if (
    msg.message?.interactiveResponseMessage?.contextInfo?.participant &&
    msg.message.interactiveResponseMessage.contextInfo.participant.split(
      "@",
    )[0] === botNumber
  ) {
    textMsg = JSON.parse(
      msg.message.interactiveResponseMessage.nativeFlowResponseMessage
        .paramsJson,
    ).id;
  } else if (
    msg.message?.templateButtonReplyMessage?.contextInfo?.participant &&
    msg.message.templateButtonReplyMessage.contextInfo.participant.split(
      "@",
    )[0] === botNumber
  ) {
    textMsg = msg.message.templateButtonReplyMessage.selectedId;
  } else if (msg.message?.videoMessage?.caption) {
    textMsg = msg.message.videoMessage.caption;
  } else if (msg.message?.stickerMessage) {
    const stickers = await stickcmd.get();
    const inside = msg.message.stickerMessage.fileSha256.toString();
    const files = stickers.map((e) => e.dataValues.file);
    if (files.includes(inside)) {
      const found = stickers.find((e) => e.dataValues.file === inside);
      textMsg = found.command;
    }
  }

  // DEBUG may come from env (boolean) or from the db override (string)
  if (config.DEBUG === true || config.DEBUG === "true") {
    const type = Object.keys(msg.message)[0];
    console.log(
      `[msg] ${isGroup ? "group" : "pm"} ${msg.key.remoteJid} from ${senderJid}${
        msg.key.fromMe ? " (me)" : ""
      } | ${type}: ${textMsg || "<no text>"}`,
    );
  }

  const parseText = (text) => {
    if (text) {
      const splitText = text.charAt(0).toLowerCase() + text.slice(1);
      const sCorrect =
        splitText.charAt(0) +
        splitText.charAt(1).replace(" ", "") +
        splitText.slice(2);
      return (
        splitText.charAt(0) +
        sCorrect.charAt(1).toLowerCase() +
        sCorrect.slice(2)
      );
    } else {
      return null;
    }
  };

  // Check for filter matches (auto-reply triggers)
  if (textMsg && !msg.key.fromMe) {
    try {
      const matchedFilter = await filter.checkMatch(textMsg, msg.key.remoteJid);
      if (matchedFilter) {
        // Send the auto-reply
        await client.sendMessage(
          msg.key.remoteJid,
          {
            text: matchedFilter.response,
          },
          { quoted: msg },
        );

        // If this is an exact match filter, we might want to prevent command processing
        // but we'll let commands still process for flexibility
      }
    } catch (error) {
      console.error("Filter matching error:", error);
    }
  }

  const sudos = getSudoList();

  // get sudo LIDs from cached SUDO_MAP
  const sudoLids = getSudoMap();
  // computed once per message instead of once per command
  const parsedText = parseText(textMsg);
  const disabledCommands =
    typeof config.DISABLED_COMMANDS === "string"
      ? config.DISABLED_COMMANDS.split(",")
      : [];

  commands.map(async (cmd) => {
    if (
      (cmd.on !== undefined &&
        (cmd.on === "image" || cmd.on === "photo") &&
        msg.message &&
        msg.message.imageMessage !== null &&
        (cmd.pattern === undefined ||
          (cmd.pattern !== undefined &&
            cmd.pattern.test(parsedText)))) ||
      (cmd.pattern !== undefined && cmd.pattern.test(parsedText)) ||
      (cmd.on !== undefined && cmd.on === "text" && textMsg) ||
      (cmd.on !== undefined &&
        cmd.on === "button" &&
        msg.message &&
        (msg.message.buttonsResponseMessage ||
          msg.message.listResponseMessage ||
          msg.message.templateButtonReplyMessage)) ||
      (cmd.on !== undefined && cmd.on === "message" && msg.message) ||
      (cmd.on !== undefined &&
        cmd.on === "group-update" &&
        msg.messageStubType) ||
      (cmd.on !== undefined &&
        cmd.on === "video" &&
        msg.message &&
        msg.message.videoMessage !== null &&
        (cmd.pattern === undefined ||
          (cmd.pattern !== undefined && cmd.pattern.test(parsedText))))
    ) {
      let whats;
      const fromMemsg = msg.key.fromMe;
      const fromMecmd = cmd.fromMe;
      if (
        cmd.on !== "group-update" &&
        !senderJid.includes(botNumber) &&
        fromMecmd &&
        !fromMemsg &&
        !sudoLids.includes(senderJid)
      )
        return;

      if (
        !config.READ_MESSAGES &&
        config.READ_COMMAND &&
        cmd.on === undefined
      ) {
        await client.readMessages([msg.key]);
      }
      if (
        cmd.pattern &&
        disabledCommands.includes(cmd.pattern.toString().match(/[\w]+/)[0])
      ) {
        return await client.sendMessage(
          msg.key.remoteJid,
          {
            text: "_The command you are trying to execute is currently disabled by owner!_",
          },
          { quoted: msg },
        );
      }
      if (config.CMD_REACTION && cmd.pattern && !cmd.on) {
        try {
          await client.sendMessage(msg.key.remoteJid, {
            react: { text: "🔃", key: msg.key },
          });
        } catch (error) {
          console.error(
            `Error sending reaction for command ${cmd.pattern}:`,
            error,
          );
        }
      }
      const match = textMsg ? parsedText.match(cmd.pattern) : null;

      if (cmd.on === "image" || cmd.on === "photo") {
        whats = new Image(client, msg);
      } else if (cmd.on === "video") {
        whats = new Video(client, msg);
      } else if (cmd.on === "button") {
        whats = new Message(client, msg);
      } else {
        whats = new Message(client, msg);
      }

      try {
        await cmd.function(whats, match);

        if (config.CMD_REACTION && cmd.pattern && !cmd.on) {
          try {
            await client.sendMessage(msg.key.remoteJid, {
              react: { text: "✅", key: msg.key },
            });
          } catch (error) {
            console.error(
              `Error sending reaction for command ${cmd.pattern}:`,
              error,
            );
          }
        }
      } catch (error) {
        if (
          error?.message?.includes("connect") ||
          error?.message?.includes("Timed") ||
          error?.message?.includes("locked")
        )
          return;
        if (config.NOLOG === "true" || !error.message) return;
        try {
          if (config.DEBUG) console.log(error);
          await client.sendMessage(
            msg.key.remoteJid,
            { text: "_" + error.message.trim() + "_" },
            { quoted: msg },
          );
          try {
            await client.sendMessage(msg.key.remoteJid, {
              react: { text: "❌", key: msg.key },
            });
          } catch (error) {
            console.error(
              `Error sending reaction for command ${cmd.pattern}:`,
              error,
            );
          }
        } catch {}
      }
    }
  });
};

const groupUpdate = async (client, update) => {
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
          client.user?.id?.split(":")[0] + "@s.whatsapp.net",
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
  ).then(() => {
    // console.log(`[StartEvent] All start event handlers completed`);
  });
};

module.exports = { handler, groupUpdate, startEvent };
