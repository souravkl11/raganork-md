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
    desc: "Auto mention reply management",
    usage:
      ".mention set (reply to message) | .mention set <text> | .mention get | .mention del | .mention help",
  },
  async (message, match) => {
    const args = match[1]?.trim().split(" ");
    const subcommand = args?.[0]?.toLowerCase();
    const input = args?.slice(1).join(" ");

    if (!subcommand) {
      return await message.sendReply(
        `Please specify a subcommand!\n\n*Available commands:*\n• \`${helpPrefix()}mention set\` - Set mention reply (reply to message or add text)\n• \`${helpPrefix()}mention get\` - View current mention reply\n• \`${helpPrefix()}mention del\` - Delete mention reply\n• \`${helpPrefix()}mention help\` - Show detailed help`
      );
    }

    switch (subcommand) {
      case "del":
      case "delete":
        const success = await deleteMentionReply();
        if (success) {
          return await message.sendReply("Mention reply deleted successfully!");
        } else {
          return await message.sendReply("Failed to delete mention reply!");
        }

      case "get":
      case "show":
        const mentionData = getMentionReply();
        if (!mentionData) {
          return await message.sendReply(
            `No mention reply set!\n\n*Usage:*\n• Reply to any message and type \`${helpPrefix()}mention set\`\n• Or use \`${helpPrefix()}mention set <text>\` for text message`
          );
        }

        let responseText = "*Current Mention Reply:*\n\n";
        responseText += `*Type:* \`${mentionData.type.toUpperCase()}\`\n`;
        if (mentionData.caption) {
          responseText += `*Caption:* _${mentionData.caption}_\n`;
        }
        if (mentionData.url) {
          responseText += `*Media URL:* \`${mentionData.url}\`\n`;
        }
        responseText += `*Set on:* _${new Date(
          mentionData.timestamp
        ).toLocaleString()}_`;

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
                  "Failed to upload media! Please try again."
                );
              }
            } else if (replyMsg.text) {
              mentionData.type = "text";
              mentionData.content = replyMsg.text;
            } else {
              return await message.sendReply(
                "Unsupported message type for mention reply!"
              );
            }

            const success = await setMentionReply(mentionData);
            if (success) {
              return await message.sendReply(
                `Mention reply set successfully!\n\n*Type:* \`${mentionData.type.toUpperCase()}\`\n*Content:* _${
                  mentionData.content || mentionData.caption || "Media file"
                }_`
              );
            } else {
              return await message.sendReply("Failed to set mention reply!");
            }
          } catch (error) {
            console.error("Error setting mention reply:", error);
            return await message.sendReply(
              "Error setting mention reply! Please try again."
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
              `Mention reply set successfully!\n\n*Content:* _${mentionData.content}_`
            );
          } else {
            return await message.sendReply("Failed to set mention reply!");
          }
        }

        return await message.sendReply(
          `Please provide input for set command!\n\n*Usage:*\n• Reply to any message and type \`${helpPrefix()}mention set\`\n• Or use \`${helpPrefix()}mention set <text>\` for text message`
        );

      case "help":
        const helpText = `*Auto Mention Reply Help*

*What is it?*
When someone mentions the bot or sudo users, the bot automatically sends a saved reply message.

*Commands:* _(Owner only)_
• \`${helpPrefix()}mention set\` - Reply to any message to set it as mention reply
• \`${helpPrefix()}mention set <text>\` - Set text as mention reply
• \`${helpPrefix()}mention get\` - View current mention reply
• \`${helpPrefix()}mention del\` - Delete mention reply

*Supported Types:*
• Text messages
• Images _(with captions)_
• Videos _(with captions)_
• Audio files
• Stickers
• Documents

*How it works:*
1. Set a mention reply using the commands above
2. When someone mentions @bot or @sudo in a message
3. Bot automatically sends the saved reply

*Examples:*
• Reply to an image and type \`${helpPrefix()}mention set\`
• \`${helpPrefix()}mention set Hello! I'm a bot\`
• \`${helpPrefix()}mention get\` - to see current reply
• \`${helpPrefix()}mention del\` - to remove reply

_Note: Media files are uploaded to cloud storage for reliability._`;

        return await message.sendReply(helpText);

      default:
        return await message.sendReply(
          `Unknown subcommand: \`${subcommand}\`\n\n*Available commands:*\n• \`${helpPrefix()}mention set\` - Set mention reply\n• \`${helpPrefix()}mention get\` - View current mention reply\n• \`${helpPrefix()}mention del\` - Delete mention reply\n• \`${helpPrefix()}mention help\` - Show help`
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
