/* Copyright (C) 2020 Yusuf Usta.

Licensed under the  GPL-3.0 License;
you may not use this file except in compliance with the License.

WhatsAsena - Yusuf Usta
*/

const Asena = require("../events")
const { MessageType } = require('@adiwajshing/baileys');
const Language = require("../language")
const Lang = Language.getString("afk")

global.AFK = {
  isAfk: false,
  reason: false,
  lastseen: 0,
}

// https://stackoverflow.com/a/37096512
function secondsToHms(d) {
  d = Number(d)
  var h = Math.floor(d / 3600)
  var m = Math.floor((d % 3600) / 60)
  var s = Math.floor((d % 3600) % 60)

  var hDisplay =
    h > 0 ? h + (h == 1 ? " " + Lang.HOUR + ", " : " " + Lang.HOUR + ", ") : ""
  var mDisplay =
    m > 0
      ? m + (m == 1 ? " " + Lang.MINUTE + ", " : " " + Lang.MINUTE + ", ")
      : ""
  var sDisplay =
    s > 0 ? s + (s == 1 ? " " + Lang.SECOND : " " + Lang.SECOND) : ""
  return hDisplay + mDisplay + sDisplay
}

Asena.addCommand(
  { on: "text", fromMe: false, deleteCommand: false },
  async (message, match) => {
    if (
      global.AFK.isAfk &&
      !message.fromMe &&
      message.jid.endsWith('@g.us') &&
      ((message.mention !== false && message.mention.length !== 0) ||
        message.reply_message !== false)
    ) {
      if (
        message.jid.endsWith('@g.us') &&
        message.mention.length !== 0 &&
        message.reply_message === false
      ) {
        message.mention.map(async (jid) => {
          if (message.client.user.jid.split("@")[0] === jid.split("@")[0]) {
            return await message.client.sendMessage(message.jid,
              Lang.AFK_TEXT +
                "\n" +
                (global.AFK.reason !== false
                  ? "\n*" + Lang.REASON + ":* ```" + global.AFK.reason + "```"
                  : "") +
                (global.AFK.lastseen !== 0
                  ? "\n*" +
                    Lang.LAST_SEEN +
                    "* ```" +
                    secondsToHms(
                      Math.round(new Date().getTime() / 1000) -
                        global.AFK.lastseen
                    ) +
                    " before.```"
                  : ""),MessageType.text,
              { quoted: message.data }
            )
          }
        })
      } else if (message.jid.endsWith('@g.us') && message.reply_message !== false) {
        if (
          message.reply_message.jid.split("@")[0] ===
          message.client.user.jid.split("@")[0]
        ) {
          return await message.client.sendMessage(message.jid,
            Lang.AFK_TEXT +
              "\n" +
              (global.AFK.reason !== false
                ? "\n*" + Lang.REASON + ":* ```" + global.AFK.reason + "```"
                : "") +
              (global.AFK.lastseen !== 0
                ? "\n*" +
                  Lang.LAST_SEEN +
                  "* ```" +
                  secondsToHms(
                    Math.round(new Date().getTime() / 1000) -
                      global.AFK.lastseen
                  ) +
                  " before.```"
                : ""),MessageType.text,
            { quoted: message.data }
          )
        }
      }
    } else if (global.AFK.isAfk && !message.fromMe && !message.jid.endsWith('@g.us')) {
      return await message.client.sendMessage(message.jid,
        Lang.AFK_TEXT +
          "\n" +
          (global.AFK.reason !== false
            ? "\n*" + Lang.REASON + ":* ```" + global.AFK.reason + "```"
            : "") +
          (global.AFK.lastseen !== 0
            ? "\n*" +
              Lang.LAST_SEEN +
              "* ```" +
              secondsToHms(
                Math.round(new Date().getTime() / 1000) - global.AFK.lastseen
              ) +
              " before.```"
            : ""),MessageType.text,
        { quoted: message.data }
      )
    }
  }
)

Asena.addCommand(
  { on: "text", fromMe: true, deleteCommand: false },
  async (message, match) => {
    if (global.AFK.isAfk && !message.id.startsWith("3EB0") && message.fromMe) {
      global.AFK.lastseen = 0
      global.AFK.reason = false
      global.AFK.isAfk = false
      return await message.sendMessage(Lang.IM_NOT_AFK)
    }
  }
)

Asena.addCommand(
  {
    pattern: "afk ?(.*)",
    fromMe: true,
    deleteCommand: false,
    desc: Lang.AFK_DESC,
  },
  async (message, match) => {
    if (!global.AFK.isAfk) {
      global.AFK.lastseen = Math.round(new Date().getTime() / 1000)
      if (match[1] !== "") {
        global.AFK.reason = match[1]
      }
      global.AFK.isAfk = true
      return await message.sendMessage(
        Lang.IM_AFK +
          (global.AFK.reason !== false
            ? "\n*" + Lang.REASON + ":* ```" + global.AFK.reason + "```"
            : "")
      )
    }
  }
)

module.exports = { secondsToHms }
