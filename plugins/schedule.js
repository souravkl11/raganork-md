const { Module } = require("../main");
const { scheduledMessages } = require("./utils/db/schedulers");
const moment = require("moment");
let config = require("../config");
let a = config.MODE == "public" ? false : true;

function isValidJID(text) {
  return (
    text.endsWith("@g.us") ||
    text.endsWith("@s.whatsapp.net") ||
    text.endsWith("@lid")
  );
}
function parseTime(timeStr) {
  const now = moment();
  const durationMatch =
    timeStr.match(/^(\d+)([dhms])$/i) ||
    timeStr.match(/^(\d+)h(\d+)m$/i) ||
    timeStr.match(/^(\d+)m(\d+)s$/i);
  if (durationMatch) {
    let duration = moment.duration();
    if (timeStr.includes("h") && timeStr.includes("m")) {
      const [, hours, minutes] = timeStr.match(/^(\d+)h(\d+)m$/i);
      duration.add(parseInt(hours), "hours").add(parseInt(minutes), "minutes");
    } else if (timeStr.includes("m") && timeStr.includes("s")) {
      const [, minutes, seconds] = timeStr.match(/^(\d+)m(\d+)s$/i);
      duration
        .add(parseInt(minutes), "minutes")
        .add(parseInt(seconds), "seconds");
    } else {
      const [, value, unit] = durationMatch;
      const unitMap = { d: "days", h: "hours", m: "minutes", s: "seconds" };
      duration.add(parseInt(value), unitMap[unit.toLowerCase()]);
    }
    return now.add(duration).subtract(1, "minute").toDate();
  }
  const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})(\s*[ap]m)?$/i);
  if (timeMatch) {
    let [, hours, minutes, period] = timeMatch;
    hours = parseInt(hours);
    minutes = parseInt(minutes);
    if (period) {
      period = period.trim().toLowerCase();
      if (period === "pm" && hours !== 12) hours += 12;
      if (period === "am" && hours === 12) hours = 0;
    }
    const targetTime = moment().hours(hours).minutes(minutes).seconds(0);
    if (targetTime.isBefore(now)) {
      targetTime.add(1, "day");
    }
    return targetTime.subtract(1, "minute").toDate();
  }
  const dateTime = moment(timeStr, [
    "YYYY-MM-DD HH:mm",
    "DD/MM/YYYY HH:mm",
    "MM/DD/YYYY HH:mm",
  ]);
  if (dateTime.isValid()) {
    return dateTime.subtract(1, "minute").toDate();
  }
  return null;
}
async function createMessageObject(replyMessage) {
  let messageObj = {};
  if (replyMessage.text) {
    messageObj.text = replyMessage.text;
  }
  if (replyMessage.image) {
    const buffer = await replyMessage.download("buffer");
    messageObj.image = buffer.toString("base64");
    if (replyMessage.caption) messageObj.caption = replyMessage.caption;
    messageObj._mediaType = "image";
  }
  if (replyMessage.video) {
    const buffer = await replyMessage.download("buffer");
    messageObj.video = buffer.toString("base64");
    if (replyMessage.caption) messageObj.caption = replyMessage.caption;
    messageObj._mediaType = "video";
    if (replyMessage.gifPlayback) messageObj.gifPlayback = true;
  }
  if (replyMessage.audio) {
    const buffer = await replyMessage.download("buffer");
    messageObj.audio = buffer.toString("base64");
    messageObj.mimetype = replyMessage.mimetype || "audio/mp4";
    messageObj._mediaType = "audio";
    if (replyMessage.ptt) messageObj.ptt = true;
  }
  if (replyMessage.document) {
    const buffer = await replyMessage.download("buffer");
    messageObj.document = buffer.toString("base64");
    messageObj.fileName = replyMessage.fileName || "document";
    messageObj.mimetype = replyMessage.mimetype;
    messageObj._mediaType = "document";
  }
  if (replyMessage.sticker) {
    const buffer = await replyMessage.download("buffer");
    messageObj.sticker = buffer.toString("base64");
    messageObj._mediaType = "sticker";
  }
  return JSON.stringify(messageObj);
}
Module(
  {
    pattern: "schedule ?(.*)",
    fromMe: a,
    use: "utility",
    desc: "Schedule a message to be sent later. Reply to a message with: schedule <jid> <time> or schedule <time> <jid>",
  },
  async (m, match) => {
    if (match[1] === "d") return;
    if (!m.reply_message) {
      return await m.sendReply(
        "_Reply to a message you want to schedule_\n\n*Usage:*\n• schedule <jid> <time>\n• schedule <time> <jid>\n\n*Time formats:*\n• 2h30m (2 hours 30 minutes)\n• 1d (1 day)\n• 30m (30 minutes)\n• 14:30 (2:30 PM today)\n• 2:45pm (2:45 PM today)"
      );
    }
    if (!match[1]) {
      return await m.sendReply(
        "_Please provide JID and time_\n\n*Example:*\n• schedule 919876543210@s.whatsapp.net 2h\n• schedule 919876543210@lid 2h\n• schedule 30m 919876543210@s.whatsapp.net"
      );
    }
    const args = match[1].trim().split(/\s+/);
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
    const originalTime = moment(scheduleTime).add(1, "minute").toDate();
    if (originalTime <= new Date()) {
      return await m.sendReply("_Schedule time must be in the future_");
    }
    const minTime = moment().add(2, "minutes").toDate();
    if (originalTime < minTime) {
      return await m.sendReply(
        "_Minimum scheduling time is 2 minutes. Please schedule for at least 2 minutes from now._"
      );
    }
    try {
      const messageData = await createMessageObject(m.reply_message);
      await scheduledMessages.add(jid, messageData, scheduleTime);
      const timeFromNow = moment(scheduleTime).add(1, "minute").fromNow();
      const formattedTime = moment(scheduleTime)
        .add(1, "minute")
        .format("DD/MM/YYYY HH:mm");
      await m.sendReply(
        `✅ *Message scheduled successfully!*\n\n📅 *Time:* ${formattedTime}\n⏰ *From now:* ${timeFromNow}\n📱 *Target:* ${jid}`
      );
    } catch (error) {
      console.error("Schedule error:", error);
      await m.sendReply("_Failed to schedule message. Please try again._");
    }
  }
);
Module(
  {
    pattern: "scheduled ?(.*)",
    fromMe: a,
    use: "utility",
    desc: "List all pending scheduled messages",
  },
  async (m, match) => {
    try {
      const pending = await scheduledMessages.getAllPending();
      if (pending.length === 0) {
        return await m.sendReply("📭 _No pending scheduled messages_");
      }
      let response = "📋 *Scheduled Messages*\n\n";
      pending.sort(
        (a, b) => a.scheduleTime.getTime() - b.scheduleTime.getTime()
      );
      pending.forEach((msg, index) => {
        const timeFromNow = moment(msg.scheduleTime).add(1, "minute").fromNow();
        const formattedTime = moment(msg.scheduleTime)
          .add(1, "minute")
          .format("DD/MM/YYYY HH:mm");
        const preview = JSON.parse(msg.message);
        let content = preview.text || preview.caption || "Media message";
        if (content.length > 30) content = content.substring(0, 30) + "...";
        response += `${index + 1}. *ID:* ${msg.id}\n`;
        response += `   *To:* ${msg.jid}\n`;
        response += `   *Time:* ${formattedTime}\n`;
        response += `   *In:* ${timeFromNow}\n`;
        response += `   *Content:* ${content}\n\n`;
      });
      response += '_Use "cancel <id>" to cancel a scheduled message_';
      await m.sendReply(response);
    } catch (error) {
      console.error("List scheduled error:", error);
      await m.sendReply("_Failed to fetch scheduled messages_");
    }
  }
);
Module(
  {
    pattern: "cancel ?(.*)",
    fromMe: a,
    use: "utility",
    desc: "Cancel a scheduled message by ID",
  },
  async (m, match) => {
    if (!match[1]) {
      return await m.sendReply(
        "_Please provide message ID to cancel_\n\n*Usage:* cancel <id>"
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
