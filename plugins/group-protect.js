const { Module } = require("../main");
const {
  isAdmin,
  antilinkConfig,
  antiStatusMention,
  antiword,
  antibot,
  antispam,
  antipromote,
  antidemote,
  pdm,
  setWarn,
  getWarn,
  linkDetector,
  groupAdminGuard,
} = require("./utils");
const config = require("../config");
const { helpPrefix } = require("../core/plugins/registry");
const badWords = require("./utils/badwords");
const { setVar, containsDisallowedWords, listOf } = require("./manage");
const { isGroupStatusPost } = require("../core/session/features/status-stanza");
const { debugOn } = require("../core/helpers");

Module(
  {
    pattern: "antibot ?(.*)",
    fromMe: false,
    desc: "Detects other bot's messages and kicks.",
    use: "group",
  },
  async (message, match) => {
    if (await groupAdminGuard(message)) {
      match[1] = match[1] ? match[1].toLowerCase() : "";
      var db = await antibot.get();
      const jids = [];
      db.map((data) => {
        jids.push(data.jid);
      });
      if (match[1] === "on") {
        if (!(await isAdmin(message)))
          return await message.sendReply("_I'm not an admin!_");
        await antibot.set(message.jid);
      }
      if (match[1] === "off") {
        await antibot.delete(message.jid);
      }
      if (match[1] !== "on" && match[1] !== "off") {
        var status = jids.includes(message.jid) ? "on" : "off";
        var { subject } = await message.client.groupMetadata(message.jid);
        return await message.sendReply(
          `_Antibot menu of ${subject}_` +
            "\n\n_Antibot is currently turned *" +
            status +
            `*_\n\n_Use ${helpPrefix()}antibot on/off_`
        );
      }
      await message.sendReply(
        match[1] === "on" ? "_Antibot activated!_" : "_Antibot turned off!_"
      );
    }
  }
);

Module(
  {
    pattern: "antispam ?(.*)",
    fromMe: false,
    desc: "Detects spam messages and kicks user.",
    use: "group",
  },
  async (message, match) => {
    if (await groupAdminGuard(message)) {
      match[1] = match[1] ? match[1].toLowerCase() : "";
      var db = await antispam.get();
      const jids = [];
      db.map((data) => {
        jids.push(data.jid);
      });
      if (match[1] === "on") {
        if (!(await isAdmin(message)))
          return await message.sendReply("_I'm not an admin!_");
        await antispam.set(message.jid);
      }
      if (match[1] === "off") {
        await antispam.delete(message.jid);
      }
      if (match[1] !== "on" && match[1] !== "off") {
        var status = jids.includes(message.jid) ? "on" : "off";
        var { subject } = await message.client.groupMetadata(message.jid);
        return await message.sendReply(
          `_Anti spam menu of ${subject}_` +
            "\n\n_Antispam is currently turned *" +
            status +
            `*_\n\n_Use ${helpPrefix()}antispam on/off_`
        );
      }
      await message.sendReply(
        match[1] === "on" ? "_Antispam activated!_" : "_Antispam turned off!_"
      );
    }
  }
);

Module(
  {
    pattern: "pdm ?(.*)",
    fromMe: false,
    desc: "Detects promote/demote and sends alert.",
    use: "group",
  },
  async (message, match) => {
    if (await groupAdminGuard(message)) {
      match[1] = match[1] ? match[1].toLowerCase() : "";
      var db = await pdm.get();
      const jids = [];
      db.map((data) => {
        jids.push(data.jid);
      });
      if (match[1] === "on") {
        await pdm.set(message.jid);
      }
      if (match[1] === "off") {
        await pdm.delete(message.jid);
      }
      if (match[1] !== "on" && match[1] !== "off") {
        var status = jids.includes(message.jid) ? "on" : "off";
        var { subject } = await message.client.groupMetadata(message.jid);
        return await message.sendReply(
          `_Promote|demote alert message menu of ${subject}_` +
            "\n\n_PDM alert is currently turned *" +
            status +
            `*_\n\n_Use ${helpPrefix()}pdm on/off_`
        );
      }
      await message.sendReply(
        match[1] === "on" ? "_Pdm activated!_" : "_Pdm turned off!_"
      );
    }
  }
);

Module(
  {
    pattern: "antidemote ?(.*)",
    fromMe: true,
    desc: "Detects demote and automatically promotes demoted one and demotes person who demoted.",
    use: "group",
  },
  async (message, match) => {
    if (!(await groupAdminGuard(message, { ownerOnly: true }))) return;
    match[1] = match[1] ? match[1].toLowerCase() : "";
    var db = await antidemote.get();
    const jids = [];
    db.map((data) => {
      jids.push(data.jid);
    });
    if (match[1] === "on") {
      await antidemote.set(message.jid);
    }
    if (match[1] === "off") {
      await antidemote.delete(message.jid);
    }
    if (match[1] !== "on" && match[1] !== "off") {
      var status = jids.includes(message.jid) ? "on" : "off";
      var { subject } = await message.client.groupMetadata(message.jid);
      return await message.sendReply(
        `_Anti demote menu of ${subject}_` +
          "\n\n_This feature is currently turned *" +
          status +
          `*_\n\n_Use ${helpPrefix()}antidemote on/off_`
      );
    }
    await message.sendReply(
      match[1] === "on" ? "_Antidemote activated!_" : "_Antidemote turned off!_"
    );
  }
);

Module(
  {
    pattern: "antipromote ?(.*)",
    fromMe: true,
    desc: "Detects promote and automatically demotes promoted one and demotes person who promoted.",
    use: "group",
  },
  async (message, match) => {
    if (!(await groupAdminGuard(message, { ownerOnly: true }))) return;
    match[1] = match[1] ? match[1].toLowerCase() : "";
    var db = await antipromote.get();
    const jids = [];
    db.map((data) => {
      jids.push(data.jid);
    });
    if (match[1] === "on") {
      await antipromote.set(message.jid);
    }
    if (match[1] === "off") {
      await antipromote.delete(message.jid);
    }
    if (match[1] !== "on" && match[1] !== "off") {
      var status = jids.includes(message.jid) ? "on" : "off";
      var { subject } = await message.client.groupMetadata(message.jid);
      return await message.sendReply(
        `_Anti promote menu of ${subject}_` +
          "\n\n_This feature is currently turned *" +
          status +
          `*_\n\n_Use ${helpPrefix()}antipromote on/off_`
      );
    }
    await message.sendReply(
      match[1] === "on"
        ? "_Antipromote activated!_"
        : "_Antipromote turned off!_"
    );
  }
);

Module(
  {
    pattern: "antilink ?(.*)",
    fromMe: false,
    desc: "Advanced antilink system with warn/kick/delete modes and flexible link filtering",
    use: "group",
  },
  async (message, match) => {
    if (!(await groupAdminGuard(message))) return;

    const input = match[1] ? match[1].toLowerCase().trim() : "";
    const args = input.split(" ");
    const command = args[0];
    const value = args.slice(1).join(" ");

    let settings = await antilinkConfig.get(message.jid);

    try {
      switch (command) {
        case "on":
        case "enable":
          if (!(await isAdmin(message))) {
            return await message.sendReply("_I'm not an admin!_");
          }

          if (!settings) {
            settings = await antilinkConfig.set(message.jid, {
              mode: "delete",
              enabled: true,
              updatedBy: message.sender,
            });
          } else {
            settings = await antilinkConfig.update(message.jid, {
              enabled: true,
              updatedBy: message.sender,
            });
          }

          return await message.sendReply(
            `✅ *Antilink Enabled!*\n\n` +
              `• Mode: *${settings.mode.toUpperCase()}*\n` +
              `• Type: *${settings.isWhitelist ? "WHITELIST" : "BLACKLIST"}*\n` +
              `• Use \`${helpPrefix()}antilink help\` for more options`
          );

        case "off":
        case "disable":
          if (settings) {
            await antilinkConfig.update(message.jid, {
              enabled: false,
              updatedBy: message.sender,
            });
          }

          return await message.sendReply("❌ *Antilink Disabled!*");

        case "mode":
          if (!value || !["warn", "kick", "delete"].includes(value)) {
            return await message.sendReply(
              `_Invalid mode! Available modes:_\n\n` +
                `• \`warn\` - Warn users for links\n` +
                `• \`kick\` - Kick users for links\n` +
                `• \`delete\` - Only delete the message\n\n` +
                `_Usage:_ \`${helpPrefix()}antilink mode delete\``
            );
          }

          if (!(await isAdmin(message))) {
            return await message.sendReply("_I'm not an admin!_");
          }

          if (!settings) {
            settings = await antilinkConfig.set(message.jid, {
              mode: value,
              enabled: true,
              updatedBy: message.sender,
            });
          } else {
            settings = await antilinkConfig.update(message.jid, {
              mode: value,
              updatedBy: message.sender,
            });
          }

          return await message.sendReply(
            `✅ *Antilink mode set to ${value.toUpperCase()}!*\n\n` +
              `${
                value === "warn"
                  ? "⚠️ Users will be warned for sending links"
                  : value === "kick"
                  ? "👢 Users will be kicked for sending links"
                  : "🗑️ Links will be deleted without action"
              }`
          );

        case "allow":
        case "whitelist":
          if (!value) {
            return await message.sendReply(
              `_Add domains to whitelist:_\n\n` +
                `_Usage:_ \`${helpPrefix()}antilink allow google.com,youtube.com\`\n` +
                `_Current:_ ${settings?.allowedLinks || "gist,instagram,youtu"}`
            );
          }

          const allowedDomains = value
            .split(",")
            .map((d) => d.trim())
            .filter((d) => d);

          if (!settings) {
            settings = await antilinkConfig.set(message.jid, {
              allowedLinks: allowedDomains.join(","),
              isWhitelist: true,
              enabled: true,
              updatedBy: message.sender,
            });
          } else {
            settings = await antilinkConfig.update(message.jid, {
              allowedLinks: allowedDomains.join(","),
              isWhitelist: true,
              updatedBy: message.sender,
            });
          }

          return await message.sendReply(
            `✅ *Allowed links updated!*\n\n` +
              `*Whitelist mode:* Only these domains are allowed\n` +
              `*Domains:* ${allowedDomains.join(", ")}`
          );

        case "block":
        case "blacklist":
          if (!value) {
            return await message.sendReply(
              `_Add domains to blacklist:_\n\n` +
                `_Usage:_ \`${helpPrefix()}antilink block facebook.com,twitter.com\`\n` +
                `_Current:_ ${settings?.blockedLinks || "None"}`
            );
          }

          const blockedDomains = value
            .split(",")
            .map((d) => d.trim())
            .filter((d) => d);

          if (!settings) {
            settings = await antilinkConfig.set(message.jid, {
              blockedLinks: blockedDomains.join(","),
              isWhitelist: false,
              enabled: true,
              updatedBy: message.sender,
            });
          } else {
            settings = await antilinkConfig.update(message.jid, {
              blockedLinks: blockedDomains.join(","),
              isWhitelist: false,
              updatedBy: message.sender,
            });
          }

          return await message.sendReply(
            `✅ *Blocked links updated!*\n\n` +
              `*Blacklist mode:* These domains are blocked\n` +
              `*Domains:* ${blockedDomains.join(", ")}`
          );

        case "message":
        case "msg":
          if (!value) {
            return await message.sendReply(
              `_Set custom warning message:_\n\n` +
                `_Usage:_ \`${helpPrefix()}antilink message Links not allowed!\`\n` +
                `_Current:_ ${settings?.customMessage || "Default message"}`
            );
          }

          if (!settings) {
            settings = await antilinkConfig.set(message.jid, {
              customMessage: value,
              enabled: true,
              updatedBy: message.sender,
            });
          } else {
            settings = await antilinkConfig.update(message.jid, {
              customMessage: value,
              updatedBy: message.sender,
            });
          }

          return await message.sendReply(
            `✅ *Custom message set!*\n\n` + `*Message:* ${value}`
          );

        case "reset":
          if (settings) {
            await antilinkConfig.delete(message.jid);
          }
          return await message.sendReply(
            "🔄 *Antilink settings reset to default!*"
          );

        case "help":
          return await message.sendReply(
            `🛡️ *Antilink System Help*\n\n` +
              `*Basic Commands:*\n` +
              `• \`${helpPrefix()}antilink on/off\` - Enable/disable\n` +
              `• \`${helpPrefix()}antilink mode warn/kick/delete\` - Set action\n\n` +
              `*Link Control:*\n` +
              `• \`${helpPrefix()}antilink allow domain1,domain2\` - Whitelist mode\n` +
              `• \`${helpPrefix()}antilink block domain1,domain2\` - Blacklist mode\n\n` +
              `*Customization:*\n` +
              `• \`${helpPrefix()}antilink message Your text\` - Custom warning\n` +
              `• \`${helpPrefix()}antilink reset\` - Reset to default\n` +
              `• \`${helpPrefix()}antilink status\` - View current settings\n\n` +
              `*Detection:*\n` +
              `• Catches \`https://example.com\`\n` +
              `• Catches \`www.example.com\`\n` +
              `• Catches \`example.com\`\n` +
              `• Catches \`example.com/path\`\n\n` +
              `*Modes:*\n` +
              `• *WARN* - Issues warnings, kicks after limit\n` +
              `• *KICK* - Immediately kicks users\n` +
              `• *DELETE* - Only deletes the message`
          );

        case "status":
        default:
          if (!settings) {
            settings = {
              enabled: false,
              mode: "delete",
              allowedLinks: "gist,instagram,youtu",
              blockedLinks: null,
              isWhitelist: true,
              customMessage: null,
            };
          }

          const { subject } = await message.client.groupMetadata(message.jid);

          return await message.sendReply(
            `🛡️ *Antilink Status - ${subject}*\n\n` +
              `*Status:* ${settings.enabled ? "✅ ENABLED" : "❌ DISABLED"}\n` +
              `*Mode:* ${settings.mode?.toUpperCase() || "DELETE"}\n` +
              `*Type:* ${
                settings.isWhitelist ? "⚪ WHITELIST" : "⚫ BLACKLIST"
              }\n\n` +
              `*${settings.isWhitelist ? "Allowed" : "Blocked"} Domains:*\n` +
              `${
                settings.isWhitelist
                  ? settings.allowedLinks || "gist,instagram,youtu"
                  : settings.blockedLinks || "None"
              }\n\n` +
              `*Custom Message:* ${settings.customMessage || "Default"}\n\n` +
              `_Use \`${helpPrefix()}antilink help\` for all commands_`
          );
      }
    } catch (error) {
      console.error("Antilink error:", error);
      return await message.sendReply(
        "_An error occurred while updating antilink settings._"
      );
    }
  }
);

// .antistatus: statuses aimed at this group, of two kinds, each with its own switch:
//   mention  a member's own status that mentions the group  (row.enabled, the original column)
//   post     a status posted to the group itself            (row.postEnabled)
// the status is always deleted; the shared action decides what happens to the member.
const STATUS_ACTIONS = {
  delete: "🗑️ delete the status",
  warn: "⚠️ delete the status and warn the member (kick at the warn limit)",
  kick: "👢 delete the status and kick the member",
};
// "both": rows saved before warn existed
const statusAction = (action) => (action === "both" ? "kick" : STATUS_ACTIONS[action] ? action : "delete");

const STATUS_KINDS = {
  mention: {
    field: "enabled",
    label: "Status mentions",
    defaultReply: "⚠️ *@user*, mentioning this group in a status is not allowed here.",
    warnReason: "Mentioning the group in a status",
    detect: (message) => Boolean(message.data?.message?.groupStatusMentionMessage),
    // a mention is an ordinary group message
    remove: (message) => message.client.sendMessage(message.jid, { delete: message.data.key }),
  },
  post: {
    field: "postEnabled",
    label: "Group status posts",
    defaultReply: "⚠️ *@user*, posting statuses in this group is not allowed.",
    warnReason: "Posting a status in the group",
    detect: (message) => {
      const m = message.data?.message;
      return Boolean(
        m?.groupStatusMessageV2 || m?.groupStatusMessage || isGroupStatusPost(message.jid, message.id)
      );
    },
    remove: (message) => message.revokeGroupStatus(message.data.key),
  },
};

const onOff = (value) => (value ? "✅ ON" : "❌ OFF");
const statusSummary = (conf) =>
  `*Status mentions:* ${onOff(conf.enabled)}\n` +
  `*Group status posts:* ${onOff(conf.postEnabled)}\n` +
  `*Action:* ${STATUS_ACTIONS[statusAction(conf.action)]}\n` +
  `*Reply:* ${onOff(conf.replyEnabled)}\n` +
  `*Reply text:* ${conf.customMessage || "Default"}`;

Module(
  {
    pattern: "antistatus(?: |$)(.*)",
    fromMe: false,
    desc: "Deletes statuses that mention this group or are posted to it, and can warn or kick the member",
    use: "group",
  },
  async (message, match) => {
    if (!(await groupAdminGuard(message))) return;

    const input = (match[1] || "").trim();
    let [command = "", ...rest] = input.split(/\s+/);
    command = command.toLowerCase();
    const value = rest.join(" ").trim();
    const name = `${helpPrefix()}antistatus`;
    const by = { updatedBy: message.sender };
    const needBotAdmin = async () => {
      if (await isAdmin(message)) return false;
      await message.sendReply("_I'm not an admin!_");
      return true;
    };

    let conf = await antiStatusMention.get(message.jid);

    try {
      switch (command) {
        case "on":
        case "off": {
          const on = command === "on";
          if (on && (await needBotAdmin())) return;
          conf = await antiStatusMention.set(message.jid, { enabled: on, postEnabled: on, ...by });
          return await message.sendReply(
            `${on ? "✅" : "❌"} *Anti status turned ${command.toUpperCase()}!*\n\n${statusSummary(conf)}` +
              (on ? `\n\n_Use \`${name} help\` for more options_` : "")
          );
        }

        case "mention":
        case "post": {
          const kind = STATUS_KINDS[command];
          const toggle = value.toLowerCase();
          if (toggle !== "on" && toggle !== "off") {
            return await message.sendReply(
              `_Usage:_ \`${name} ${command} on/off\`\n` +
                `_Currently:_ ${conf?.[kind.field] ? "on" : "off"}`
            );
          }
          if (toggle === "on" && (await needBotAdmin())) return;
          conf = await antiStatusMention.set(message.jid, { [kind.field]: toggle === "on", ...by });
          return await message.sendReply(
            `✅ *${kind.label} turned ${toggle.toUpperCase()}!*\n\n${statusSummary(conf)}`
          );
        }

        case "action":
        case "mode": {
          const action = value.toLowerCase();
          if (!STATUS_ACTIONS[action]) {
            return await message.sendReply(
              `_Choose what happens to the member:_\n\n` +
                `• \`delete\` - delete the status only\n` +
                `• \`warn\` - delete it and warn the member (kicked at the warn limit)\n` +
                `• \`kick\` - delete it and kick the member\n\n` +
                `_Usage:_ \`${name} action warn\``
            );
          }
          if (await needBotAdmin()) return;
          conf = await antiStatusMention.set(message.jid, { action, ...by });
          return await message.sendReply(
            `✅ *Action set to ${action.toUpperCase()}!*\n\nWill ${STATUS_ACTIONS[action]}.` +
              (!conf.enabled && !conf.postEnabled ? `\n\n_Anti status is still off, use \`${name} on\`_` : "")
          );
        }

        case "reply": {
          const toggle = value.toLowerCase();
          if (toggle !== "on" && toggle !== "off") {
            return await message.sendReply(
              `_Send a message in the group after acting?_\n\n` +
                `_Usage:_ \`${name} reply on/off\`\n` +
                `_Currently:_ ${conf?.replyEnabled ? "on" : "off"}`
            );
          }
          conf = await antiStatusMention.set(message.jid, { replyEnabled: toggle === "on", ...by });
          return await message.sendReply(`✅ *Reply turned ${toggle.toUpperCase()}!*`);
        }

        case "message":
        case "msg": {
          if (!value) {
            return await message.sendReply(
              `_Set the reply sent after acting:_\n\n` +
                `_Usage:_ \`${name} message No statuses here @user\`\n` +
                `• \`@user\` becomes a mention of the member\n` +
                `• \`${name} message reset\` goes back to the default\n\n` +
                `_Current:_ ${conf?.customMessage || "Default"}`
            );
          }
          if (["reset", "default"].includes(value.toLowerCase())) {
            await antiStatusMention.set(message.jid, { customMessage: null, ...by });
            return await message.sendReply("🔄 *Reply text reset to the default!*");
          }
          conf = await antiStatusMention.set(message.jid, {
            customMessage: value,
            replyEnabled: true,
            ...by,
          });
          return await message.sendReply(
            `✅ *Reply text set, and reply turned ON!*\n\n*Message:* ${value}`
          );
        }

        case "reset":
          if (conf) await antiStatusMention.delete(message.jid);
          return await message.sendReply("🔄 *Anti status settings reset!*");

        case "help":
          return await message.sendReply(
            `🛡️ *Anti Status Help*\n\n` +
              `_Acts on statuses aimed at this group: a member's own status that mentions it, or a ` +
              `status posted to the group. Admins and the owner are skipped, and the bot must be an admin._\n\n` +
              `• \`${name} on/off\` - Both kinds on/off\n` +
              `• \`${name} mention on/off\` - Statuses that mention this group\n` +
              `• \`${name} post on/off\` - Statuses posted to this group\n` +
              `• \`${name} action delete/warn/kick\` - What happens to the member\n` +
              `• \`${name} reply on/off\` - Send a message afterwards (always sent on warn)\n` +
              `• \`${name} message <text>\` - Custom reply (\`@user\` mentions them)\n` +
              `• \`${name} message reset\` - Default reply\n` +
              `• \`${name} reset\` - Remove the settings\n` +
              `• \`${name} status\` - View current settings`
          );

        case "status":
        default: {
          const { subject } = await message.client.groupMetadata(message.jid);
          const shown = conf || { enabled: false, postEnabled: false, action: "delete", replyEnabled: false };
          return await message.sendReply(
            `🛡️ *Anti Status - ${subject}*\n\n${statusSummary(shown)}\n\n` +
              `_Use \`${name} help\` for all commands_`
          );
        }
      }
    } catch (error) {
      console.error("Anti status error:", error);
      return await message.sendReply("_An error occurred while updating anti status settings._");
    }
  }
);

const handledStatuses = new Set();

Module(
  {
    on: "message",
    fromMe: false,
  },
  async (message) => {
    if (!message.isGroup || message.fromMe) return;
    const kind = Object.values(STATUS_KINDS).find((k) => k.detect(message));
    if (!kind) return;

    const conf = await antiStatusMention.get(message.jid);
    if (!conf || !conf[kind.field]) return;

    const poster = message.sender;
    if (!poster) return;
    // exempt on purpose; said out loud under DEBUG since a silent skip looks like a bug
    const exempt = message.fromOwner ? "owner/sudo" : (await isAdmin(message, poster)) ? "group admin" : null;
    if (exempt) {
      if (debugOn()) console.log(`[antistatus] skipped ${poster} in ${message.jid}: ${exempt} is exempt`);
      return;
    }
    if (!(await isAdmin(message))) {
      console.warn(`[antistatus] not an admin in ${message.jid}, cannot act`);
      return;
    }

    const handledKey = `${message.jid}:${message.id}`;
    if (handledStatuses.has(handledKey)) return;
    handledStatuses.add(handledKey);
    if (handledStatuses.size > 500) handledStatuses.delete(handledStatuses.values().next().value);

    try {
      await kind.remove(message);
    } catch (error) {
      console.error("Anti status delete error:", error);
    }

    const number = poster.split("@")[0].split(":")[0];
    const notice = (conf.customMessage || kind.defaultReply).replace(/@user/gi, `@${number}`);
    const action = statusAction(conf.action);
    if (action === "warn") {
      // warnMember sends the notice with the warn count, and kicks at the limit
      return await warnMember(message, poster, kind.warnReason, notice);
    }
    if (action === "kick") {
      try {
        await message.client.groupParticipantsUpdate(message.jid, [poster], "remove");
      } catch (error) {
        console.error("Anti status kick error:", error);
      }
    }
    if (conf.replyEnabled) {
      await message.sendMessage(notice, "text", { mentions: [poster] });
    }
  }
);

Module(
  {
    pattern: "antiword ?(.*)",
    fromMe: false,
    desc: "Activates antiword, kicks if user sends not allowed words",
    use: "group",
  },
  async (message, match) => {
    if (await groupAdminGuard(message)) {
      match[1] = match[1] ? match[1].toLowerCase() : "";
      var db = await antiword.get();
      const jids = [];
      db.map((data) => {
        jids.push(data.jid);
      });
      var antiwordWarn = listOf(config.ANTIWORD_WARN);
      if (match[1].includes("warn")) {
        if (match[1].endsWith("on")) {
          if (!(await isAdmin(message)))
            return await message.sendReply("_I'm not an admin!_");
          if (!antiwordWarn.includes(message.jid)) {
            antiwordWarn.push(message.jid);
            await setVar("ANTIWORD_WARN", antiwordWarn.join(","), false);
          }
          return await message.sendReply(
            `_Antiword warn has been activated in this group!_`
          );
        }
        if (match[1].endsWith("off")) {
          if (!(await isAdmin(message)))
            return await message.sendReply("_I'm not an admin!_");
          if (antiwordWarn.includes(message.jid)) {
            await message.sendReply(`_Antiword warn deactivated!_`);
            return await setVar(
              "ANTIWORD_WARN",
              antiwordWarn.filter((x) => x != message.jid).join(","),
              false
            );
          }
        }
      }
      if (match[1] === "on") {
        if (!(await isAdmin(message)))
          return await message.sendReply("_I'm not an admin!_");
        await antiword.set(message.jid);
      }
      if (match[1] === "off") {
        await antiword.delete(message.jid);
      }
      if (match[1] !== "on" && match[1] !== "off") {
        var status =
          jids.includes(message.jid) || antiwordWarn.includes(message.jid)
            ? "on"
            : "off";
        var { subject } = await message.client.groupMetadata(message.jid);
        const p = helpPrefix();
        return await message.sendReply(
          `_Antiword menu of ${subject}_` +
            "\n\n_Antiword is currently turned *" +
            status +
            "*_\n\n_Eg: " +
            p +
            "antiword on/off_\n_" +
            p +
            "antiword warn on/off_\n\n_Use `" +
            p +
            "setvar ANTI_WORDS=word1,word2` to block custom words or set `ANTI_WORDS=auto` to auto detect bad words (It's already enabled by default!)_"
        );
      }
      await message.sendReply(
        match[1] === "on" ? "_Antiword activated!_" : "_Antiword turned off!_"
      );
    }
  }
);

async function warnMember(message, usr, reason, notice) {
  const warnLimit = parseInt(config.WARN || 4);
  try {
    await setWarn(message.jid, usr, reason, message.client.user.id);
    const { current, remaining, exceeded } = await getWarn(
      message.jid,
      usr,
      warnLimit
    );
    if (exceeded) {
      try {
        await message.client.groupParticipantsUpdate(message.jid, [usr], "remove");
        await message.sendMessage(
          `${notice}\n\n` +
            `*Action:* User kicked for exceeding warning limit\n` +
            `*Warnings:* ${current}/${warnLimit}`,
          "text",
          { mentions: [usr] }
        );
      } catch (kickError) {
        await message.sendMessage(
          `${notice}\n\n` +
            `*Warnings:* ${current}/${warnLimit}\n` +
            `*Error:* Failed to kick user`,
          "text",
          { mentions: [usr] }
        );
      }
    } else {
      await message.sendMessage(
        `${notice}\n\n` +
          `*Warnings:* ${current}/${warnLimit}\n` +
          `*Remaining:* ${remaining}\n\n` +
          `${
            remaining === 1
              ? "_Next violation will result in a kick!_"
              : `_${remaining} more warnings before kick._`
          }`,
        "text",
        { mentions: [usr] }
      );
    }
  } catch (error) {
    console.error("Warn error:", error);
    await message.sendMessage(notice, "text", { mentions: [usr] });
  }
}

async function checkAntiword(message) {
  if (!message.isGroup || !message.message) return false;
  const warnMode = listOf(config.ANTIWORD_WARN).includes(message.jid);
  if (!warnMode && !(await antiword.get()).some((d) => d.jid === message.jid))
    return false;

  const setting = (config.ANTI_WORDS || "auto").trim();
  const auto = setting.toLowerCase() === "auto";
  const word = containsDisallowedWords(
    message.message,
    auto ? badWords : setting.split(","),
    { wholeWord: auto }
  );
  if (!word) return false;
  if (message.fromOwner || (await isAdmin(message, message.sender))) return false;

  const notice = `_The word ${word} is not allowed in this chat!_`;
  if (warnMode) {
    await warnMember(message, message.sender, "Sending a disallowed word", notice);
  } else {
    await message.sendReply(notice);
    try {
      await message.client.groupParticipantsUpdate(
        message.jid,
        [message.sender],
        "remove"
      );
    } catch (error) {
      console.error("Antiword kick error:", error);
    }
  }
  try {
    await message.client.sendMessage(message.jid, { delete: message.data.key });
  } catch (error) {
    console.error("Antiword delete error:", error);
  }
  return true;
}

async function checkAntilink(message) {
  const foundLinks = linkDetector.detectLinks(message.message);
  if (foundLinks.length === 0) return;

  const antilinkConf = await antilinkConfig.get(message.jid);
  if (!antilinkConf || !antilinkConf.enabled) return;

  const linkBlocked = foundLinks.some(
    (link) => !antilinkConfig.checkAllowed(link, antilinkConf)
  );
  if (!linkBlocked || (await isAdmin(message, message.sender))) return;

  const usr = message.sender;
  await message.client.sendMessage(message.jid, {
    delete: message.data.key,
  });
  const customMessage =
    antilinkConf.customMessage ||
    `⚠️ *Link Detected!*\n\n_Links are not allowed in this group._`;

  if (antilinkConf.mode === "delete") {
    await message.sendMessage(customMessage, "text", {
      mentions: [usr],
    });
  } else if (antilinkConf.mode === "warn") {
    await warnMember(message, usr, "Sending unauthorized link", customMessage);
  } else if (antilinkConf.mode === "kick") {
    try {
      await message.client.groupParticipantsUpdate(message.jid, [usr], "remove");
      await message.sendMessage(
        `${customMessage}\n\n*Action:* User kicked for sending unauthorized link`,
        "text",
        { mentions: [usr] }
      );
    } catch (kickError) {
      await message.sendMessage(
        `${customMessage}\n\n*Error:* Failed to kick user`,
        "text",
        { mentions: [usr] }
      );
    }
  }
}

Module(
  {
    on: "text",
    fromMe: false,
  },
  async (message, match) => {
    // antiword acting means the message is gone; otherwise antilink still gets its turn
    if (await checkAntiword(message)) return;
    await checkAntilink(message);
  }
);
