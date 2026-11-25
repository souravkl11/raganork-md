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
const { getString } = require("./utils/lang");
const Lang = getString("group_protect");

Module(
  {
    pattern: "antibot ?(.*)",
    fromMe: false,
    desc: Lang.DETECTS_OTHER_BOTS_MESSAGES_AND,
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
          return await message.sendReply(Lang.IM_NOT_AN_ADMIN);
        await antibot.set(message.jid);
      }
      if (match[1] === "off") {
        await antibot.delete(message.jid);
      }
      if (match[1] !== "on" && match[1] !== "off") {
        var status = jids.includes(message.jid) ? "on" : "off";
        var { subject } = await message.client.groupMetadata(message.jid);
        return await message.sendReply(
          Lang.ANTIBOT_MENU_OF_ANTIBOT_IS.format(subject, status).replaceAll("{p}", helpPrefix())
        );
      }
      await message.sendReply(
        match[1] === "on" ? Lang.ANTIBOT_ACTIVATED : Lang.ANTIBOT_TURNED_OFF
      );
    }
  }
);

Module(
  {
    pattern: "antispam ?(.*)",
    fromMe: false,
    desc: Lang.DETECTS_SPAM_MESSAGES_AND_KICKS,
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
          return await message.sendReply(Lang.IM_NOT_AN_ADMIN);
        await antispam.set(message.jid);
      }
      if (match[1] === "off") {
        await antispam.delete(message.jid);
      }
      if (match[1] !== "on" && match[1] !== "off") {
        var status = jids.includes(message.jid) ? "on" : "off";
        var { subject } = await message.client.groupMetadata(message.jid);
        return await message.sendReply(
          Lang.ANTI_SPAM_MENU_OF_ANTISPAM.format(subject, status).replaceAll("{p}", helpPrefix())
        );
      }
      await message.sendReply(
        match[1] === "on" ? Lang.ANTISPAM_ACTIVATED : Lang.ANTISPAM_TURNED_OFF
      );
    }
  }
);

Module(
  {
    pattern: "pdm ?(.*)",
    fromMe: false,
    desc: Lang.DETECTS_PROMOTE_DEMOTE_AND_SENDS,
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
          Lang.PROMOTE_DEMOTE_ALERT_MESSAGE_MENU.format(subject, status).replaceAll("{p}", helpPrefix())
        );
      }
      await message.sendReply(
        match[1] === "on" ? Lang.PDM_ACTIVATED : Lang.PDM_TURNED_OFF
      );
    }
  }
);

Module(
  {
    pattern: "antidemote ?(.*)",
    fromMe: true,
    desc: Lang.DETECTS_DEMOTE_AND_AUTOMATICALLY_PROMOTES,
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
        Lang.ANTI_DEMOTE_MENU_OF_THIS.format(subject, status).replaceAll("{p}", helpPrefix())
      );
    }
    await message.sendReply(
      match[1] === "on" ? Lang.ANTIDEMOTE_ACTIVATED : Lang.ANTIDEMOTE_TURNED_OFF
    );
  }
);

Module(
  {
    pattern: "antipromote ?(.*)",
    fromMe: true,
    desc: Lang.DETECTS_PROMOTE_AND_AUTOMATICALLY_DEMOTES,
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
        Lang.ANTI_PROMOTE_MENU_OF_THIS.format(subject, status).replaceAll("{p}", helpPrefix())
      );
    }
    await message.sendReply(
      match[1] === "on"
        ? Lang.ANTIPROMOTE_ACTIVATED
        : Lang.ANTIPROMOTE_TURNED_OFF
    );
  }
);

Module(
  {
    pattern: "antilink ?(.*)",
    fromMe: false,
    desc: Lang.ADVANCED_ANTILINK_SYSTEM_WITH_WARN,
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
            return await message.sendReply(Lang.IM_NOT_AN_ADMIN);
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
            Lang.ANTILINK_ENABLED_MODE_TYPE_USE.format(settings.mode.toUpperCase(), settings.isWhitelist ? Lang.WHITELIST_UPPER : Lang.BLACKLIST_UPPER).replaceAll("{p}", helpPrefix())
          );

        case "off":
        case "disable":
          if (settings) {
            await antilinkConfig.update(message.jid, {
              enabled: false,
              updatedBy: message.sender,
            });
          }

          return await message.sendReply(Lang.ANTILINK_DISABLED);

        case "mode":
          if (!value || !["warn", "kick", "delete"].includes(value)) {
            return await message.sendReply(
              Lang.INVALID_MODE_AVAILABLE_MODES_WARN.replaceAll("{p}", helpPrefix())
            );
          }

          if (!(await isAdmin(message))) {
            return await message.sendReply(Lang.IM_NOT_AN_ADMIN);
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
            Lang.ANTILINK_MODE_SET_TO.format(value.toUpperCase(), value === "warn"
                  ? Lang.USERS_WILL_BE_WARNED_FOR
                  : value === "kick"
                  ? Lang.USERS_WILL_BE_KICKED_FOR
                  : Lang.LINKS_WILL_BE_DELETED_WITHOUT)
          );

        case "allow":
        case "whitelist":
          if (!value) {
            return await message.sendReply(
              Lang.ADD_DOMAINS_TO_WHITELIST_USAGE.format(settings?.allowedLinks || "gist,instagram,youtu").replaceAll("{p}", helpPrefix())
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
            Lang.ALLOWED_LINKS_UPDATED_WHITELIST_MODE.format(allowedDomains.join(", "))
          );

        case "block":
        case "blacklist":
          if (!value) {
            return await message.sendReply(
              Lang.ADD_DOMAINS_TO_BLACKLIST_USAGE.format(settings?.blockedLinks || Lang.NONE).replaceAll("{p}", helpPrefix())
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
            Lang.BLOCKED_LINKS_UPDATED_BLACKLIST_MODE.format(blockedDomains.join(", "))
          );

        case "message":
        case "msg":
          if (!value) {
            return await message.sendReply(
              Lang.SET_CUSTOM_WARNING_MESSAGE_USAGE.format(settings?.customMessage || Lang.DEFAULT_MESSAGE).replaceAll("{p}", helpPrefix())
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
            Lang.CUSTOM_MESSAGE_SET_MESSAGE.format(value)
          );

        case "reset":
          if (settings) {
            await antilinkConfig.delete(message.jid);
          }
          return await message.sendReply(
            Lang.ANTILINK_SETTINGS_RESET_TO_DEFAULT
          );

        case "help":
          return await message.sendReply(
            Lang.ANTILINK_SYSTEM_HELP_BASIC_COMMANDS.replaceAll("{p}", helpPrefix())
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
            Lang.ANTILINK_STATUS_STATUS_MODE_TYPE.format(subject, settings.enabled ? Lang.ENABLED : Lang.DISABLED, settings.mode?.toUpperCase() || Lang.MODE_DELETE, settings.isWhitelist ? Lang.WHITELIST : Lang.BLACKLIST, settings.isWhitelist ? Lang.ALLOWED_WORD : Lang.BLOCKED_WORD, settings.isWhitelist
                  ? settings.allowedLinks || "gist,instagram,youtu"
                  : settings.blockedLinks || Lang.NONE, settings.customMessage || Lang.DEFAULT).replaceAll("{p}", helpPrefix())
          );
      }
    } catch (error) {
      console.error("Antilink error:", error);
      return await message.sendReply(
        Lang.AN_ERROR_OCCURRED_WHILE_UPDATING
      );
    }
  }
);

// .antistatus: statuses aimed at this group, of two kinds, each with its own switch:
//   mention  a member's own status that mentions the group  (row.enabled, the original column)
//   post     a status posted to the group itself            (row.postEnabled)
// the status is always deleted; the shared action decides what happens to the member.
const STATUS_ACTIONS = {
  delete: Lang.ACTION_DELETE,
  warn: Lang.DELETE_THE_STATUS_AND_WARN,
  kick: Lang.ACTION_KICK,
};
// "both": rows saved before warn existed
const statusAction = (action) => (action === "both" ? "kick" : STATUS_ACTIONS[action] ? action : "delete");

const STATUS_KINDS = {
  mention: {
    field: "enabled",
    label: Lang.STATUS_MENTIONS,
    defaultReply: Lang.USER_MENTIONING_THIS_GROUP_IN,
    warnReason: Lang.MENTIONING_THE_GROUP_IN_A,
    detect: (message) => Boolean(message.data?.message?.groupStatusMentionMessage),
    // a mention is an ordinary group message
    remove: (message) => message.client.sendMessage(message.jid, { delete: message.data.key }),
  },
  post: {
    field: "postEnabled",
    label: Lang.GROUP_STATUS_POSTS,
    defaultReply: Lang.USER_POSTING_STATUSES_IN_THIS,
    warnReason: Lang.POSTING_A_STATUS_IN_THE,
    detect: (message) => {
      const m = message.data?.message;
      return Boolean(
        m?.groupStatusMessageV2 || m?.groupStatusMessage || isGroupStatusPost(message.jid, message.id)
      );
    },
    remove: (message) => message.revokeGroupStatus(message.data.key),
  },
};

const onOff = (value) => (value ? Lang.ON : Lang.OFF);
const statusSummary = (conf) =>
  Lang.STATUS_SUMMARY.format(
    onOff(conf.enabled),
    onOff(conf.postEnabled),
    STATUS_ACTIONS[statusAction(conf.action)],
    onOff(conf.replyEnabled),
    conf.customMessage || Lang.DEFAULT
  );

Module(
  {
    pattern: "antistatus(?: |$)(.*)",
    fromMe: false,
    desc: Lang.DELETES_STATUSES_THAT_MENTION_THIS,
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
      await message.sendReply(Lang.IM_NOT_AN_ADMIN);
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
            Lang.ANTI_STATUS_TURNED.format(on ? "✅" : "❌", command.toUpperCase(), statusSummary(conf), (on ? Lang.USE_HELP_FOR_MORE_OPTIONS.format(name) : ""))
          );
        }

        case "mention":
        case "post": {
          const kind = STATUS_KINDS[command];
          const toggle = value.toLowerCase();
          if (toggle !== "on" && toggle !== "off") {
            return await message.sendReply(
              Lang.USAGE_ON_OFF_CURRENTLY.format(name, command, conf?.[kind.field] ? Lang.ON_LOWER : Lang.OFF_LOWER)
            );
          }
          if (toggle === "on" && (await needBotAdmin())) return;
          conf = await antiStatusMention.set(message.jid, { [kind.field]: toggle === "on", ...by });
          return await message.sendReply(
            Lang.TURNED.format(kind.label, toggle === "on" ? Lang.ON_UPPER : Lang.OFF_UPPER, statusSummary(conf))
          );
        }

        case "action":
        case "mode": {
          const action = value.toLowerCase();
          if (!STATUS_ACTIONS[action]) {
            return await message.sendReply(
              Lang.CHOOSE_WHAT_HAPPENS_TO_THE.format(name)
            );
          }
          if (await needBotAdmin()) return;
          conf = await antiStatusMention.set(message.jid, { action, ...by });
          return await message.sendReply(
            Lang.ACTION_SET_TO_WILL.format(action.toUpperCase(), STATUS_ACTIONS[action], (!conf.enabled && !conf.postEnabled ? Lang.ANTI_STATUS_IS_STILL_OFF.format(name) : ""))
          );
        }

        case "reply": {
          const toggle = value.toLowerCase();
          if (toggle !== "on" && toggle !== "off") {
            return await message.sendReply(
              Lang.SEND_A_MESSAGE_IN_THE.format(name, conf?.replyEnabled ? Lang.ON_LOWER : Lang.OFF_LOWER)
            );
          }
          conf = await antiStatusMention.set(message.jid, { replyEnabled: toggle === "on", ...by });
          return await message.sendReply(Lang.REPLY_TURNED.format(toggle === "on" ? Lang.ON_UPPER : Lang.OFF_UPPER));
        }

        case "message":
        case "msg": {
          if (!value) {
            return await message.sendReply(
              Lang.SET_THE_REPLY_SENT_AFTER.format(name, name, conf?.customMessage || Lang.DEFAULT)
            );
          }
          if (["reset", "default"].includes(value.toLowerCase())) {
            await antiStatusMention.set(message.jid, { customMessage: null, ...by });
            return await message.sendReply(Lang.REPLY_TEXT_RESET_TO_THE);
          }
          conf = await antiStatusMention.set(message.jid, {
            customMessage: value,
            replyEnabled: true,
            ...by,
          });
          return await message.sendReply(
            Lang.REPLY_TEXT_SET_AND_REPLY.format(value)
          );
        }

        case "reset":
          if (conf) await antiStatusMention.delete(message.jid);
          return await message.sendReply(Lang.ANTI_STATUS_SETTINGS_RESET);

        case "help":
          return await message.sendReply(
            Lang.ANTI_STATUS_HELP_ACTS_ON.format(name, name, name, name, name, name, name, name, name)
          );

        case "status":
        default: {
          const { subject } = await message.client.groupMetadata(message.jid);
          const shown = conf || { enabled: false, postEnabled: false, action: "delete", replyEnabled: false };
          return await message.sendReply(
            Lang.ANTI_STATUS_USE_HELP_FOR.format(subject, statusSummary(shown), name)
          );
        }
      }
    } catch (error) {
      console.error("Anti status error:", error);
      return await message.sendReply(Lang.AN_ERROR_OCCURRED_WHILE_UPDATING_2);
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
    const exempt = message.fromOwner ? Lang.OWNER_SUDO : (await isAdmin(message, poster)) ? Lang.GROUP_ADMIN : null;
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
    desc: Lang.ACTIVATES_ANTIWORD_KICKS_IF_USER,
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
            return await message.sendReply(Lang.IM_NOT_AN_ADMIN);
          if (!antiwordWarn.includes(message.jid)) {
            antiwordWarn.push(message.jid);
            await setVar("ANTIWORD_WARN", antiwordWarn.join(","), false);
          }
          return await message.sendReply(
            Lang.ANTIWORD_WARN_HAS_BEEN_ACTIVATED
          );
        }
        if (match[1].endsWith("off")) {
          if (!(await isAdmin(message)))
            return await message.sendReply(Lang.IM_NOT_AN_ADMIN);
          if (antiwordWarn.includes(message.jid)) {
            await message.sendReply(Lang.ANTIWORD_WARN_DEACTIVATED);
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
          return await message.sendReply(Lang.IM_NOT_AN_ADMIN);
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
          Lang.ANTIWORD_MENU_OF_ANTIWORD_IS.format(subject, status).replaceAll("{p}", helpPrefix())
        );
      }
      await message.sendReply(
        match[1] === "on" ? Lang.ANTIWORD_ACTIVATED : Lang.ANTIWORD_TURNED_OFF
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
          Lang.ACTION_USER_KICKED_FOR_EXCEEDING.format(notice, current, warnLimit),
          "text",
          { mentions: [usr] }
        );
      } catch (kickError) {
        await message.sendMessage(
          Lang.WARNINGS_ERROR_FAILED_TO_KICK.format(notice, current, warnLimit),
          "text",
          { mentions: [usr] }
        );
      }
    } else {
      await message.sendMessage(
        Lang.WARNINGS_REMAINING.format(notice, current, warnLimit, remaining, remaining === 1
              ? Lang.NEXT_VIOLATION_WILL_RESULT_IN
              : Lang.MORE_WARNINGS_BEFORE_KICK.format(remaining)),
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

  const notice = Lang.WORD_NOT_ALLOWED.format(word);
  if (warnMode) {
    await warnMember(message, message.sender, Lang.REASON_WORD, notice);
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
    Lang.LINK_DETECTED;

  if (antilinkConf.mode === "delete") {
    await message.sendMessage(customMessage, "text", {
      mentions: [usr],
    });
  } else if (antilinkConf.mode === "warn") {
    await warnMember(message, usr, Lang.REASON_LINK, customMessage);
  } else if (antilinkConf.mode === "kick") {
    try {
      await message.client.groupParticipantsUpdate(message.jid, [usr], "remove");
      await message.sendMessage(
        Lang.ACTION_USER_KICKED_FOR_SENDING.format(customMessage),
        "text",
        { mentions: [usr] }
      );
    } catch (kickError) {
      await message.sendMessage(
        Lang.ERROR_FAILED_TO_KICK_USER.format(customMessage),
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
