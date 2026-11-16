const { Module } = require("../main");
const { scheduledMessages } = require("./utils/db/schedulers");
const { helpPrefix } = require("../core/plugins/registry");

function isValidJID(text) {
  return (
    text.endsWith("@g.us") ||
    text.endsWith("@s.whatsapp.net") ||
    text.endsWith("@lid")
  );
}
const pad = (n) => String(n).padStart(2, "0");
const MAX_MEDIA_BYTES = 5 * 1024 * 1024;

function localDate(year, month, day, hours, minutes) {
  const date = new Date(year, month - 1, day, hours, minutes, 0, 0);
  const valid =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day &&
    hours < 24 &&
    minutes < 60;
  return valid ? date : null;
}

// returns the moment to store: one minute before the requested time, as the minute scheduler expects
function parseTime(timeStr, now = new Date()) {
  const text = String(timeStr).trim();
  const MINUTE = 60 * 1000;
  const unitMs = { d: 86400000, h: 3600000, m: MINUTE, s: 1000 };

  const single = text.match(/^(\d+)([dhms])$/i);
  const compound = text.match(/^(\d+)h(\d+)m$/i) || text.match(/^(\d+)m(\d+)s$/i);
  if (single || compound) {
    let ms;
    if (single) {
      ms = parseInt(single[1]) * unitMs[single[2].toLowerCase()];
    } else {
      const [first, second] = /h/i.test(text) ? [unitMs.h, unitMs.m] : [unitMs.m, unitMs.s];
      ms = parseInt(compound[1]) * first + parseInt(compound[2]) * second;
    }
    return Number.isSafeInteger(ms) ? new Date(now.getTime() + ms - MINUTE) : null;
  }

  const clock = text.match(/^(\d{1,2}):(\d{2})(\s*[ap]m)?$/i);
  if (clock) {
    let hours = parseInt(clock[1]);
    const minutes = parseInt(clock[2]);
    if (clock[3]) {
      const period = clock[3].trim().toLowerCase();
      if (hours < 1 || hours > 12) return null;
      if (period === "pm" && hours !== 12) hours += 12;
      if (period === "am" && hours === 12) hours = 0;
    }
    if (hours > 23 || minutes > 59) return null;
    const target = new Date(now);
    target.setHours(hours, minutes, 0, 0);
    if (target < now) target.setDate(target.getDate() + 1);
    return new Date(target.getTime() - MINUTE);
  }

  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})[ T]\s*(\d{1,2}):(\d{2})$/);
  if (iso) {
    const [year, month, day, hours, minutes] = iso.slice(1).map(Number);
    const date = localDate(year, month, day, hours, minutes);
    return date && new Date(date.getTime() - MINUTE);
  }

  const slashed = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/);
  if (slashed) {
    const [a, b, year, hours, minutes] = slashed.slice(1).map(Number);
    const date = localDate(year, b, a, hours, minutes) || localDate(year, a, b, hours, minutes);
    return date && new Date(date.getTime() - MINUTE);
  }
  return null;
}

function formatTime(date) {
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromNow(date, now = new Date()) {
  const minutes = Math.round((date.getTime() - now.getTime()) / 60000);
  const abs = Math.abs(minutes);
  let text;
  if (abs < 1) text = "a few seconds";
  else if (abs < 60) text = `${abs} minute${abs === 1 ? "" : "s"}`;
  else if (abs < 1440) {
    const h = Math.round(abs / 60);
    text = `${h} hour${h === 1 ? "" : "s"}`;
  } else {
    const d = Math.round(abs / 1440);
    text = `${d} day${d === 1 ? "" : "s"}`;
  }
  return minutes < 0 ? `${text} ago` : `in ${text}`;
}

async function createMessageObject(replyMessage) {
  let messageObj = {};
  const encode = async () => {
    const buffer = await replyMessage.download("buffer");
    if (buffer.length > MAX_MEDIA_BYTES) throw new Error("MEDIA_TOO_LARGE");
    return buffer.toString("base64");
  };
  if (replyMessage.text) {
    messageObj.text = replyMessage.text;
  }
  if (replyMessage.image) {
    messageObj.image = await encode();
    if (replyMessage.caption) messageObj.caption = replyMessage.caption;
    messageObj._mediaType = "image";
  }
  if (replyMessage.video) {
    messageObj.video = await encode();
    if (replyMessage.caption) messageObj.caption = replyMessage.caption;
    messageObj._mediaType = "video";
    if (replyMessage.gifPlayback) messageObj.gifPlayback = true;
  }
  if (replyMessage.audio) {
    messageObj.audio = await encode();
    messageObj.mimetype = replyMessage.mimetype || "audio/mp4";
    messageObj._mediaType = "audio";
    if (replyMessage.ptt) messageObj.ptt = true;
  }
  if (replyMessage.document) {
    messageObj.document = await encode();
    messageObj.fileName = replyMessage.fileName || "document";
    messageObj.mimetype = replyMessage.mimetype;
    messageObj._mediaType = "document";
  }
  if (replyMessage.sticker) {
    messageObj.sticker = await encode();
    messageObj._mediaType = "sticker";
  }
  return JSON.stringify(messageObj);
}

async function listScheduled(m) {
  try {
    const pending = await scheduledMessages.getAllPending();
    if (pending.length === 0) {
      return await m.sendReply("📭 _No pending scheduled messages_");
    }
    let response = "📋 *Scheduled Messages*\n\n";
    pending.sort((a, b) => a.scheduleTime.getTime() - b.scheduleTime.getTime());
    pending.forEach((msg, index) => {
      const due = new Date(msg.scheduleTime.getTime() + 60000);
      const preview = JSON.parse(msg.message);
      let content = preview.text || preview.caption || "Media message";
      if (content.length > 30) content = content.substring(0, 30) + "...";
      response += `${index + 1}. *ID:* ${msg.id}\n`;
      response += `   *To:* ${msg.jid}\n`;
      response += `   *Time:* ${formatTime(due)}\n`;
      response += `   *In:* ${fromNow(due)}\n`;
      response += `   *Content:* ${content}\n\n`;
    });
    response += `_Use "${helpPrefix()}cancel <id>" to cancel a scheduled message_`;
    await m.sendReply(response);
  } catch (error) {
    console.error("List scheduled error:", error);
    await m.sendReply("_Failed to fetch scheduled messages_");
  }
}

// .scheduled (the old spelling) reaches this pattern as "schedule" + "d"
Module(
  {
    pattern: "schedule ?(.*)",
    fromMe: true,
    use: "utility",
    desc: "Schedule a message to be sent later. Reply to a message with: schedule <jid> <time> or schedule <time> <jid>. `schedule list` shows pending messages",
  },
  async (m, match) => {
    const prefix = helpPrefix();
    const input = (match[1] || "").trim();
    if (/^(?:list|d)(?:\s|$)/i.test(input)) return await listScheduled(m);
    if (!m.reply_message) {
      return await m.sendReply(
        `_Reply to a message you want to schedule_\n\n*Usage:*\n• ${prefix}schedule <jid> <time>\n• ${prefix}schedule <time> <jid>\n• ${prefix}schedule list\n\n*Time formats:*\n• 2h30m (2 hours 30 minutes)\n• 1d (1 day)\n• 30m (30 minutes)\n• 14:30 (2:30 PM today)\n• 2:45pm (2:45 PM today)`
      );
    }
    if (!input) {
      return await m.sendReply(
        `_Please provide JID and time_\n\n*Example:*\n• ${prefix}schedule 919876543210@s.whatsapp.net 2h\n• ${prefix}schedule 919876543210@lid 2h\n• ${prefix}schedule 30m 919876543210@s.whatsapp.net`
      );
    }
    const args = input.split(/\s+/);
    if (args.length < 2) {
      return await m.sendReply("_Please provide both JID and time_");
    }
    let jid, timeStr;
    if (isValidJID(args[0])) {
      jid = args[0];
      timeStr = args.slice(1).join(" ");
    } else if (isValidJID(args[args.length - 1])) {
      jid = args[args.length - 1];
      timeStr = args.slice(0, -1).join(" ");
    } else {
      const jidArg = args.find((arg) => isValidJID(arg));
      if (jidArg) {
        jid = jidArg;
        timeStr = args.filter((arg) => arg !== jidArg).join(" ");
      } else {
        return await m.sendReply(
          "_Invalid JID format. JID should end with @g.us, @s.whatsapp.net, or @lid_"
        );
      }
    }
    const scheduleTime = parseTime(timeStr);
    if (!scheduleTime) {
      return await m.sendReply(
        "_Invalid time format_\n\n*Supported formats:*\n• 2h30m, 1d, 30m, 5s\n• 14:30, 2:45pm\n• YYYY-MM-DD HH:mm"
      );
    }
    const originalTime = new Date(scheduleTime.getTime() + 60000);
    if (originalTime <= new Date()) {
      return await m.sendReply("_Schedule time must be in the future_");
    }
    if (originalTime < new Date(Date.now() + 2 * 60000)) {
      return await m.sendReply(
        "_Minimum scheduling time is 2 minutes. Please schedule for at least 2 minutes from now._"
      );
    }
    try {
      const messageData = await createMessageObject(m.reply_message);
      await scheduledMessages.add(jid, messageData, scheduleTime);
      await m.sendReply(
        `✅ *Message scheduled successfully!*\n\n📅 *Time:* ${formatTime(originalTime)}\n⏰ *From now:* ${fromNow(originalTime)}\n📱 *Target:* ${jid}`
      );
    } catch (error) {
      if (error.message === "MEDIA_TOO_LARGE") {
        return await m.sendReply(
          `_Media is too large to schedule. The limit is ${MAX_MEDIA_BYTES / 1024 / 1024} MB._`
        );
      }
      console.error("Schedule error:", error);
      await m.sendReply("_Failed to schedule message. Please try again._");
    }
  }
);
Module(
  {
    pattern: "cancel ?(.*)",
    fromMe: true,
    use: "utility",
    desc: "Cancel a scheduled message by ID",
  },
  async (m, match) => {
    if (!match[1]) {
      return await m.sendReply(
        `_Please provide message ID to cancel_\n\n*Usage:* ${helpPrefix()}cancel <id>`
      );
    }
    const messageId = parseInt(match[1].trim());
    if (isNaN(messageId)) {
      return await m.sendReply("_Please provide a valid message ID_");
    }
    try {
      const success = await scheduledMessages.delete(messageId);
      if (success) {
        await m.sendReply(
          `✅ *Scheduled message ${messageId} cancelled successfully*`
        );
      } else {
        await m.sendReply("❌ *Message not found or already sent*");
      }
    } catch (error) {
      console.error("Cancel scheduled error:", error);
      await m.sendReply("_Failed to cancel scheduled message_");
    }
  }
);

module.exports = { parseTime };
