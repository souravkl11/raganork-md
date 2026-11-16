function TimeCalculator(a) {
  let b = Math.floor(a / 31536e3),
    c = Math.floor((a % 31536e3) / 2628e3),
    d = Math.floor(((a % 31536e3) % 2628e3) / 86400),
    e = Math.floor((a % 86400) / 3600),
    f = Math.floor((a % 3600) / 60),
    g = Math.floor(a % 60);
  return (
    (b > 0 ? b + (1 === b ? " year, " : " years, ") : "") +
    (c > 0 ? c + (1 === c ? " month, " : " months, ") : "") +
    (d > 0 ? d + (1 === d ? " day, " : " days, ") : "") +
    (e > 0 ? e + (1 === e ? " hour, " : " hours, ") : "") +
    (f > 0 ? f + (1 === f ? " minute " : " minutes, ") : "") +
    (g > 0 ? g + (1 === g ? " second" : " seconds ") : "")
  );
}
const { Module } = require("../main");

// dd/mm/yyyy or dd-mm-yyyy as a local date, null when it is not a real day
function parseDate(text) {
  const parts = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(String(text).trim());
  if (!parts) return null;
  const [day, month, year] = parts.slice(1).map(Number);
  const date = new Date(year, month - 1, day);
  const real =
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  return real ? date : null;
}
const BAD_DATE = "_Date must be in dd/mm/yyyy format_";
Module(
  {
    pattern: "age ?(.*)",
    desc: "Age calculator .age dob",
    use: "utility",
  },
  async (m, t) => {
    if (!t[1]) return await m.sendReply("_Give me your Date of Birth_");
    const dob = parseDate(t[1]);
    if (!dob) return await m.sendReply(BAD_DATE);
    var age = (Date.now() - dob.getTime()) / 1000;
    if (age < 0) return await m.sendReply("_Date of birth must be in the past_");
    return await m.sendReply("```" + TimeCalculator(age) + "```");
  }
);
Module(
  {
    pattern: "cntd ?(.*)",
    desc: "Counts Date",
    use: "utility",
  },
  async (m, t) => {
    if (!t[1]) return await m.sendReply("_Give me a future date!_");
    const target = parseDate(t[1]);
    if (!target) return await m.sendReply(BAD_DATE);
    var remaining = (target.getTime() - Date.now()) / 1000;
    if (remaining < 0) return await m.sendReply("_Give me a future date!_");
    return await m.sendReply("_" + TimeCalculator(remaining) + " remaining_");
  }
);
Module(
  {
    pattern: "ping",
    use: "utility",
    desc: "Measures ping",
  },
  async (message, match) => {
    const start = process.hrtime();
    let sent_msg = await message.sendReply("*❮ ᴛᴇsᴛɪɴɢ ᴘɪɴɢ ❯*");
    const diff = process.hrtime(start);
    const ms = (diff[0] * 1e3 + diff[1] / 1e6).toFixed(2);
    await message.edit("*ʟᴀᴛᴇɴᴄʏ: " + ms + " _ᴍs_*", message.jid, sent_msg.key);
  }
);

module.exports = { parseDate };
