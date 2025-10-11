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
const { MODE } = require("../config");
let auto = MODE == "public" ? false : true;
Module(
  {
    pattern: "age ?(.*)",
    fromMe: auto,
    desc: "Age calculator .age dob",
    use: "utility",
  },
  async (m, t) => {
    if (!t[1]) return await m.sendReply("_Give me your Date of Birth_");
    if (
      !/^(0?[1-9]|[12][0-9]|3[01])[\/\-](0?[1-9]|1[012])[\/\-]\d{4}$/.test(t[1])
    )
      return await m.sendReply("_Date must be in dd/mm/yy format_");
    var DOB = t[1];
    var actual = DOB.includes("-")
      ? DOB.split("-")[1] + "-" + DOB.split("-")[0] + "-" + DOB.split("-")[2]
      : DOB.split("/")[1] + "-" + DOB.split("/")[0] + "-" + DOB.split("/")[2];
    var dob = new Date(actual).getTime();
    var today = new Date().getTime();
    var age = (today - dob) / 1000;
    return await m.sendReply("```" + TimeCalculator(age) + "```");
  }
);
Module(
  {
    pattern: "cntd ?(.*)",
    fromMe: auto,
    desc: "Counts Date",
    use: "utility",
  },
  async (m, t) => {
    if (!t[1]) return await m.sendReply("_Give me a future date!_");
    if (
      !/^(0?[1-9]|[12][0-9]|3[01])[\/\-](0?[1-9]|1[012])[\/\-]\d{4}$/.test(t[1])
    )
      return await m.sendReply("_Date must be in dd/mm/yy format_");
    var DOB = t[1];
    var actual = DOB.includes("-")
      ? DOB.split("-")[1] + "-" + DOB.split("-")[0] + "-" + DOB.split("-")[2]
      : DOB.split("/")[1] + "-" + DOB.split("/")[0] + "-" + DOB.split("/")[2];
    var dob = new Date(actual).getTime();
    var today = new Date().getTime();
    var age = (dob - today) / 1000;
    return await m.sendReply("_" + TimeCalculator(age) + " remaining_");
  }
);
Module(
  {
    pattern: "ping",
    fromMe: auto,
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
