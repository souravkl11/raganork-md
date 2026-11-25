const { Module } = require("../main");
const { scheduledMessages } = require("./utils/db/schedulers");
const { helpPrefix } = require("../core/plugins/registry");
const { getString } = require("./utils/lang");
const Lang = getString("schedule");

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
  if (abs < 1) text = Lang.FEW_SECONDS;
  else if (abs < 60) text = (abs === 1 ? Lang.MINUTE : Lang.MINUTES).format(abs);
  else if (abs < 1440) {
    const h = Math.round(abs / 60);
    text = (h === 1 ? Lang.HOUR : Lang.HOURS).format(h);
  } else {
    const d = Math.round(abs / 1440);
    text = (d === 1 ? Lang.DAY : Lang.DAYS).format(d);
  }
  return (minutes < 0 ? Lang.AGO : Lang.IN).format(text);
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
      return await m.sendReply(Lang.NONE_PENDING);
    }
    let response = Lang.LIST_HEADER;
    pending.sort((a, b) => a.scheduleTime.getTime() - b.scheduleTime.getTime());
    pending.forEach((msg, index) => {
      const due = new Date(msg.scheduleTime.getTime() + 60000);
      const preview = JSON.parse(msg.message);
      let content = preview.text || preview.caption || Lang.MEDIA_MESSAGE;
      if (content.length > 30) content = content.substring(0, 30) + "...";
      response += Lang.LIST_ITEM.format(index + 1, msg.id, msg.jid, formatTime(due), fromNow(due), content);
    });
    response += Lang.LIST_FOOTER.format(helpPrefix());
    await m.sendReply(response);
  } catch (error) {
    console.error("List scheduled error:", error);
    await m.sendReply(Lang.LIST_FAILED);
  }
}

// .scheduled (the old spelling) reaches this pattern as "schedule" + "d"
Module(
  {
    pattern: "schedule ?(.*)",
    fromMe: true,
    use: "utility",
    desc: Lang.DESC,
  },
  async (m, match) => {
    const prefix = helpPrefix();
    const input = (match[1] || "").trim();
    if (/^(?:list|d)(?:\s|$)/i.test(input)) return await listScheduled(m);
    if (!m.reply_message) {
      return await m.sendReply(
        Lang.NEED_REPLY.replaceAll("{p}", prefix)
      );
    }
    if (!input) {
      return await m.sendReply(
        Lang.NEED_INPUT.replaceAll("{p}", prefix)
      );
    }
    const args = input.split(/\s+/);
    if (args.length < 2) {
      return await m.sendReply(Lang.NEED_BOTH);
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
          Lang.BAD_JID
        );
      }
    }
    const scheduleTime = parseTime(timeStr);
    if (!scheduleTime) {
      return await m.sendReply(
        Lang.BAD_TIME
      );
    }
    const originalTime = new Date(scheduleTime.getTime() + 60000);
    if (originalTime <= new Date()) {
      return await m.sendReply(Lang.PAST);
    }
    if (originalTime < new Date(Date.now() + 2 * 60000)) {
      return await m.sendReply(
        Lang.TOO_SOON
      );
    }
    try {
      const messageData = await createMessageObject(m.reply_message);
      await scheduledMessages.add(jid, messageData, scheduleTime);
      await m.sendReply(
        Lang.SCHEDULED.format(formatTime(originalTime), fromNow(originalTime), jid)
      );
    } catch (error) {
      if (error.message === "MEDIA_TOO_LARGE") {
        return await m.sendReply(
          Lang.TOO_LARGE.format(MAX_MEDIA_BYTES / 1024 / 1024)
        );
      }
      console.error("Schedule error:", error);
      await m.sendReply(Lang.FAILED);
    }
  }
);
Module(
  {
    pattern: "cancel ?(.*)",
    fromMe: true,
    use: "utility",
    desc: Lang.CANCEL_DESC,
  },
  async (m, match) => {
    if (!match[1]) {
      return await m.sendReply(
        Lang.CANCEL_NEED_ID.format(helpPrefix())
      );
    }
    const messageId = parseInt(match[1].trim());
    if (isNaN(messageId)) {
      return await m.sendReply(Lang.CANCEL_BAD_ID);
    }
    try {
      const success = await scheduledMessages.delete(messageId);
      if (success) {
        await m.sendReply(
          Lang.CANCELLED.format(messageId)
        );
      } else {
        await m.sendReply(Lang.NOT_FOUND);
      }
    } catch (error) {
      console.error("Cancel scheduled error:", error);
      await m.sendReply(Lang.CANCEL_FAILED);
    }
  }
);

module.exports = { parseTime };
