const { getBuffer } = require("./misc");
const { getTotalUserCount } = require("../../core/store");
const config = require("../../config");
const os = require("os");

/**
 * Parse alive message with bot stats placeholders
 * @param {string} template - Message template with placeholders
 * @param {Object} messageObject - WhatsApp message object
 * @returns {Object} - Parsed message with text and media
 */
async function parseAliveMessage(template, messageObject) {
  if (!template || !messageObject) return null;

  try {
    const used = bytesToSize(os.freemem());
    const total = bytesToSize(os.totalmem());
    const totalUsers = await getTotalUserCount();
    const infoParts = config.BOT_INFO.split(";");
    const botName = infoParts[0] || "My Bot";
    const botOwner = infoParts[1] || "N/A";
    const botVersion = config.VERSION || "1.0.0";
    const mode = config.MODE || "private";
    const serverOS = os.platform() === "linux" ? "Linux" : "Unknown OS";
    const uptime = formatUptime(process.uptime());

    let senderName = "";
    let senderNumber = "";
    if (messageObject.sender) {
      senderNumber = messageObject.sender.split("@")[0];
      try {
        const contact = await messageObject.client.getContact(
          messageObject.sender
        );
        senderName = contact.name || contact.notify || senderNumber;
      } catch {
        senderName = messageObject.senderName || senderNumber;
      }
    }

    let parsedMessage = template
      .replace(/\$botname/g, botName)
      .replace(/\$owner/g, botOwner)
      .replace(/\$version/g, botVersion)
      .replace(/\$mode/g, mode)
      .replace(/\$server/g, serverOS)
      .replace(/\$ram/g, used)
      .replace(/\$totalram/g, total)
      .replace(/\$users/g, totalUsers.toString())
      .replace(/\$uptime/g, uptime)
      .replace(/\$user/g, senderName)
      .replace(/\$number/g, senderNumber)
      .replace(/\$date/g, new Date().toLocaleDateString())
      .replace(/\$time/g, new Date().toLocaleTimeString());

    let profilePicBuffer = null;
    let customMediaBuffer = null;
    let isVideo = false;

    if (template.includes("$pp") && messageObject.sender) {
      try {
        const ppUrl = await messageObject.client.profilePictureUrl(
          messageObject.sender,
          "image"
        );
        if (ppUrl) {
          profilePicBuffer = await getBuffer(ppUrl);
        }
      } catch (error) {
        console.log("Error fetching profile picture:", error);
      }
      parsedMessage = parsedMessage.replace(/\$pp/g, "").trim();
    }

    const mediaRegex = /\$media:(https?:\/\/[^\s]+)/g;
    const mediaMatch = mediaRegex.exec(template);
    if (mediaMatch) {
      const mediaUrl = mediaMatch[1];
      try {
        customMediaBuffer = await getBuffer(mediaUrl);

        isVideo = /\.(mp4|mov|avi|mkv|webm|gif)$/i.test(mediaUrl);
      } catch (error) {
        console.log("Error fetching custom media:", error);
      }
      parsedMessage = parsedMessage.replace(mediaRegex, "").trim();
    }

    return {
      text: parsedMessage,
      profilePic: profilePicBuffer,
      customMedia: customMediaBuffer,
      isVideo: isVideo,
      mentions: messageObject.sender ? [messageObject.sender] : [],
    };
  } catch (error) {
    console.error("Error parsing alive message:", error);
    return null;
  }
}

/**
 * Send parsed alive message
 * @param {Object} messageObject - WhatsApp message object
 * @param {Object} parsedMessage - Parsed message object
 */
async function sendAliveMessage(messageObject, parsedMessage) {
  if (!parsedMessage) return;

  try {
    if (parsedMessage.customMedia) {
      if (parsedMessage.isVideo) {
        await messageObject.client.sendMessage(messageObject.jid, {
          video: parsedMessage.customMedia,
          caption: parsedMessage.text || "",
          gifPlayback: true,
          mentions: parsedMessage.mentions,
        });
      } else {
        await messageObject.client.sendMessage(messageObject.jid, {
          image: parsedMessage.customMedia,
          caption: parsedMessage.text || "",
          mentions: parsedMessage.mentions,
        });
      }
      return;
    }

    if (parsedMessage.profilePic) {
      await messageObject.client.sendMessage(messageObject.jid, {
        image: parsedMessage.profilePic,
        caption: parsedMessage.text || "",
        mentions: parsedMessage.mentions,
      });
      return;
    }

    if (parsedMessage.text) {
      await messageObject.client.sendMessage(messageObject.jid, {
        text: parsedMessage.text,
        mentions: parsedMessage.mentions,
      });
    }
  } catch (error) {
    console.error("Error sending alive message:", error);

    if (parsedMessage.text) {
      try {
        await messageObject.sendReply(parsedMessage.text);
      } catch (fallbackError) {
        console.error("Fallback send also failed:", fallbackError);
      }
    }
  }
}

function bytesToSize(bytes) {
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  if (bytes === 0) return "0 Byte";
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  return Math.round(bytes / Math.pow(1024, i), 2) + " " + sizes[i];
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

module.exports = {
  parseAliveMessage,
  sendAliveMessage,
};
