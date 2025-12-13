const { getBuffer } = require("./misc");

/**
 * Parse welcome/goodbye message with placeholders
 * @param {string} template - Message template with placeholders
 * @param {Object} messageObject - WhatsApp message object
 * @param {Array} participants - Array of participants (for join/leave events)
 * @returns {Object} - Parsed message with text and media
 */
async function parseWelcomeMessage(template, messageObject, participants = []) {
  if (!template || !messageObject) return null;
  try {
    const groupMetadata = await messageObject.client.groupMetadata(
      messageObject.jid
    );
    const participantCount = groupMetadata.participants.length;
    const participant = participants[0]?.id;
    let participantNumber = "";
    let participantName = "";
    if (participant) {
      participantNumber = participant.split("@")[0];
      participantName = participantNumber;
    }
    let parsedMessage = template
      .replace(/\$mention/g, `@${participantNumber}`)
      .replace(/\$user/g, participantName)
      .replace(/\$group/g, groupMetadata.subject || "Unknown Group")
      .replace(/\$desc/g, groupMetadata.desc || "No description")
      .replace(/\$count/g, participantCount.toString())
      .replace(/\$date/g, new Date().toLocaleDateString())
      .replace(/\$time/g, new Date().toLocaleTimeString());
    let profilePicBuffer = null;
    let groupPicBuffer = null;
    if (template.includes("$pp") && participant) {
      try {
        const ppUrl = await messageObject.client.profilePictureUrl(
          participant,
          "image"
        );
        if (ppUrl) {
          profilePicBuffer = await getBuffer(ppUrl);
        }
      } catch (error) {
        console.log("Error fetching profile picture:", error);
        try {
          console.log("Attempting fallback to group picture...");
          const gppUrl = await messageObject.client.profilePictureUrl(
            messageObject.jid,
            "image"
          );
          if (gppUrl) {
            profilePicBuffer = await getBuffer(gppUrl);
            console.log("Successfully used group picture as fallback");
          }
        } catch (fallbackError) {
          console.log("Fallback to group picture also failed:", fallbackError);
        }
      }
      parsedMessage = parsedMessage.replace(/\$pp/g, "").trim();
    }
    if (template.includes("$gpp")) {
      try {
        const gppUrl = await messageObject.client.profilePictureUrl(
          messageObject.jid,
          "image"
        );
        if (gppUrl) {
          groupPicBuffer = await getBuffer(gppUrl);
        }
      } catch (error) {
        console.log("Error fetching group picture:", error);
      }
      parsedMessage = parsedMessage.replace(/\$gpp/g, "").trim();
    }
    return {
      text: parsedMessage,
      mentions: participant ? [participant] : [],
      profilePic: profilePicBuffer,
      groupPic: groupPicBuffer,
    };
  } catch (error) {
    console.error("Error parsing welcome message:", error);
    return null;
  }
}
/**
 * Send parsed welcome/goodbye message
 * @param {Object} messageObject - WhatsApp message object
 * @param {Object} parsedMessage - Parsed message object
 */
async function sendWelcomeMessage(messageObject, parsedMessage) {
  if (!parsedMessage) return;
  try {
    if (parsedMessage.profilePic) {
      await messageObject.client.sendMessage(messageObject.jid, {
        image: parsedMessage.profilePic,
        caption: parsedMessage.text || "",
        mentions: parsedMessage.mentions,
      });
      return;
    }
    if (parsedMessage.groupPic) {
      await messageObject.client.sendMessage(messageObject.jid, {
        image: parsedMessage.groupPic,
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
    console.error("Error sending welcome message:", error);
  }
}
module.exports = {
  parseWelcomeMessage,
  sendWelcomeMessage,
};
