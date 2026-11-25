const { Module } = require("../main");
const config = require("../config");
const { isSudo } = require("../core/sudo");
const { botIds } = require("../core/identity");
const { uploadToCatbox } = require("./utils/upload");
const { cooldown, accountKey } = require("./utils");

const fs = require("fs");
const path = require("path");

const { helpPrefix } = require("../core/plugins/registry");

const { setVar, delVar } = require("./manage");
const { getString } = require("./utils/lang");
const Lang = getString("mention");

let lastMentionRaw;
let lastMentionParsed = null;
function getMentionReply() {
  const raw = config.MENTION_REPLY;
  if (raw === lastMentionRaw) return lastMentionParsed;
  lastMentionRaw = raw;
  try {
    lastMentionParsed = raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error("Error parsing mention reply:", error);
    lastMentionParsed = null;
  }
  return lastMentionParsed;
}

async function setMentionReply(data) {
  try {
    return await setVar("MENTION_REPLY", JSON.stringify(data));
  } catch (error) {
    console.error("Error setting mention reply:", error);
    return false;
  }
}

async function deleteMentionReply() {
  try {
    return await delVar("MENTION_REPLY");
  } catch (error) {
    console.error("Error deleting mention reply:", error);
    return false;
  }
}

function isSudoUser(jid) {
  return isSudo(jid);
}

Module(
  {
    pattern: "mention ?(.*)",
    fromMe: true,
    desc: Lang.DESC,
    usage: Lang.USAGE,
  },
  async (message, match) => {
    const args = match[1]?.trim().split(" ");
    const subcommand = args?.[0]?.toLowerCase();
    const input = args?.slice(1).join(" ");
    const p = helpPrefix();

    if (!subcommand) {
      return await message.sendReply(
        Lang.NEED_SUB.replaceAll("{p}", p)
      );
    }

    switch (subcommand) {
      case "del":
      case "delete":
        const success = await deleteMentionReply();
        if (success) {
          return await message.sendReply(Lang.DELETED);
        } else {
          return await message.sendReply(Lang.DELETE_FAILED);
        }

      case "get":
      case "show":
        const mentionData = getMentionReply();
        if (!mentionData) {
          return await message.sendReply(
            Lang.NOT_SET.replaceAll("{p}", p)
          );
        }

        let responseText = Lang.CURRENT;
        responseText += Lang.TYPE.format(mentionData.type.toUpperCase());
        if (mentionData.caption) {
          responseText += Lang.CAPTION.format(mentionData.caption);
        }
        if (mentionData.url) {
          responseText += Lang.MEDIA_URL.format(mentionData.url);
        }
        responseText += Lang.SET_ON.format(new Date(mentionData.timestamp).toLocaleString());

        return await message.sendReply(responseText);

      case "set":
        if (message.reply_message) {
          try {
            const replyMsg = message.reply_message;
            let mentionData = {
              type: "text",
              content: "",
              caption: "",
              url: "",
              timestamp: new Date().toISOString(),
            };

            if (
              replyMsg.image ||
              replyMsg.video ||
              replyMsg.audio ||
              replyMsg.document ||
              replyMsg.sticker
            ) {
              let mediaType = "document";
              if (replyMsg.image) mediaType = "image";
              else if (replyMsg.video) mediaType = "video";
              else if (replyMsg.audio) mediaType = "audio";
              else if (replyMsg.sticker) mediaType = "sticker";

              const downloadedFilePath = await replyMsg.download();

              let uploadResult = null;
              try {
                uploadResult = await uploadToCatbox(downloadedFilePath);
              } catch (error) {
                console.error("Mention media upload failed:", error.message);
              } finally {
                fs.rmSync(downloadedFilePath, { force: true });
              }

              if (uploadResult && /^https?:\/\//i.test(uploadResult.url)) {
                mentionData.type = mediaType;
                mentionData.url = uploadResult.url;
                mentionData.caption = replyMsg.text || "";
              } else {
                return await message.sendReply(
                  Lang.UPLOAD_FAILED
                );
              }
            } else if (replyMsg.text) {
              mentionData.type = "text";
              mentionData.content = replyMsg.text;
            } else {
              return await message.sendReply(
                Lang.UNSUPPORTED
              );
            }

            const success = await setMentionReply(mentionData);
            if (success) {
              return await message.sendReply(
                Lang.SET_MEDIA.format(
                  mentionData.type.toUpperCase(),
                  mentionData.content || mentionData.caption || Lang.MEDIA_FILE
                )
              );
            } else {
              return await message.sendReply(Lang.SET_FAILED);
            }
          } catch (error) {
            console.error("Error setting mention reply:", error);
            return await message.sendReply(
              Lang.SET_ERROR
            );
          }
        }

        if (input && input.trim()) {
          const mentionData = {
            type: "text",
            content: input.trim(),
            caption: "",
            url: "",
            timestamp: new Date().toISOString(),
          };

          const success = await setMentionReply(mentionData);
          if (success) {
            return await message.sendReply(
              Lang.SET_TEXT.format(mentionData.content)
            );
          } else {
            return await message.sendReply(Lang.SET_FAILED);
          }
        }

        return await message.sendReply(
          Lang.NEED_INPUT.replaceAll("{p}", p)
        );

      case "help":
        const helpText = Lang.HELP.replaceAll("{p}", p);

        return await message.sendReply(helpText);

      default:
        return await message.sendReply(
          Lang.UNKNOWN.format(subcommand).replaceAll("{p}", p)
        );
    }
  }
);

Module(
  {
    on: "text",
    fromMe: false,
  },
  async (message) => {
    try {
      if (message.fromBot) return;
      if (
        !message.mention ||
        !Array.isArray(message.mention) ||
        message.mention.length === 0
      ) {
        return;
      }

      const { lidNumber, pnNumber } = botIds(message.client);
      const botNumbers = [lidNumber, pnNumber].filter(Boolean);

      let isMentioned = false;

      for (const mentionedJid of message.mention) {
        const mentionedNumericId = mentionedJid?.split("@")[0]?.split(":")[0];

        if (mentionedNumericId && botNumbers.includes(mentionedNumericId)) {
          isMentioned = true;
          break;
        }

        if (isSudoUser(mentionedJid)) {
          isMentioned = true;
          break;
        }
      }

      if (!isMentioned) {
        return;
      }

      const mentionData = getMentionReply();
      if (!mentionData) {
        return;
      }

      if (!cooldown(accountKey("mention", message.jid), 30 * 1000)) return;

      switch (mentionData.type) {
        case "text":
          if (mentionData.content) {
            await message.sendReply(mentionData.content);
          }
          break;

        case "image":
          if (mentionData.url) {
            await message.sendReply({ url: mentionData.url }, "image", {
              caption: mentionData.caption || "",
            });
          }
          break;

        case "video":
          if (mentionData.url) {
            await message.sendReply({ url: mentionData.url }, "video", {
              caption: mentionData.caption || "",
            });
          }
          break;

        case "audio":
          if (mentionData.url) {
            await message.sendReply({ url: mentionData.url }, "audio", {
              ptt: true,
              mimetype: "audio/mpeg",
            });
          }
          break;

        case "sticker":
          if (mentionData.url) {
            await message.sendReply({ url: mentionData.url }, "sticker");
          }
          break;

        case "document":
          if (mentionData.url) {
            await message.sendReply({ url: mentionData.url }, "document", {
              caption: mentionData.caption || "",
            });
          }
          break;
      }
    } catch (error) {
      console.error("Error in auto mention reply:", error);
    }
  }
);
