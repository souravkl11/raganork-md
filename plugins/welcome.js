const { Module } = require("../main");
const config = require("../config");
const { isAdmin, welcome, goodbye } = require("./utils");
const {
  parseWelcomeMessage,
  sendWelcomeMessage,
} = require("./utils/welcome-parser");

Module(
  {
    pattern: "welcome ?(.*)",
    fromMe: false,
    desc: "Set welcome message for group. Use placeholders: $mention, $user, $group, $desc, $count, $pp, $gpp, $date, $time",
    usage:
      ".welcome Hey $mention, welcome to $group! $pp\n.welcome on/off (to enable/disable)\n.welcome get (to view current message)\n.welcome del (to delete)",
    use: "group",
  },
  async (message, match) => {
    let adminAccess = config.ADMIN_ACCESS
      ? await isAdmin(message, message.sender)
      : false;
    if (!message.fromOwner && !adminAccess) return;
    const input = match[1]?.toLowerCase();
    if (!input) {
      return await message.sendReply(`*Welcome Message Setup*

*Usage:*
• \`.welcome <message>\` - Set welcome message
• \`.welcome on/off\` - Enable/disable welcome
• \`.welcome get\` - View current message
• \`.welcome del\` - Delete welcome message
• \`.welcome status\` - Show all groups status (owner only)
• \`.welcome help\` - Show detailed help with examples

*Placeholders:*
• \`$mention\` - Mention the user
• \`$user\` - User's name
• \`$group\` - Group name
• \`$desc\` - Group description
• \`$count\` - Member count
• \`$pp\` - User's profile picture
• \`$gpp\` - Group profile picture
• \`$date\` - Current date
• \`$time\` - Current time

*Example:*
\`.welcome Hey $mention! Welcome to $group 🎉 $pp\`
\`.welcome Welcome $user to our amazing group! We now have $count members! $gpp\``);
    }
    if (input === "on") {
      const current = await welcome.get(message.jid);
      if (!current) {
        return await message.sendReply(
          "_No welcome message set! Set one first using:_\n*.welcome <your message>*"
        );
      }
      await welcome.toggle(message.jid, true);
      return await message.sendReply("_Welcome messages enabled!_ ✅");
    }
    if (input === "off") {
      await welcome.toggle(message.jid, false);
      return await message.sendReply("_Welcome messages disabled!_ ❌");
    }
    if (input === "get") {
      const current = await welcome.get(message.jid);
      if (!current) {
        return await message.sendReply(
          "_No welcome message set for this group!_"
        );
      }
      return await message.sendReply(
        `*Current Welcome Message:*\n\n${current.message}\n\n*Status:* ${
          current.enabled ? "Enabled ✅" : "Disabled ❌"
        }`
      );
    }
    if (input === "del" || input === "delete") {
      const deleted = await welcome.delete(message.jid);
      if (deleted) {
        return await message.sendReply(
          "_Welcome message deleted successfully!_ 🗑️"
        );
      }
      return await message.sendReply("_No welcome message found to delete!_");
    }

    if (input === "status") {
      if (!message.fromOwner) return;

      try {
        const welcomeData = await welcome.get();
        const goodbyeData = await goodbye.get();

        if (!welcomeData.length && !goodbyeData.length) {
          return await message.sendReply(
            "_No welcome or goodbye messages configured in any groups!_"
          );
        }

        let statusText = "*🎉 WELCOME & GOODBYE STATUS 🎉*\n\n";

        if (welcomeData.length > 0) {
          statusText += "*📥 WELCOME MESSAGES:*\n";
          for (let i = 0; i < welcomeData.length; i++) {
            const data = welcomeData[i];
            try {
              const groupMeta = await message.client.groupMetadata(data.jid);
              const groupName = groupMeta.subject || "Unknown Group";
              const status = data.enabled ? "✅ Enabled" : "❌ Disabled";
              statusText += `${
                i + 1
              }. *${groupName}*\n   Status: ${status}\n   Preview: ${data.message.substring(
                0,
                50
              )}${data.message.length > 50 ? "..." : ""}\n\n`;
            } catch {
              statusText += `${i + 1}. *Unknown Group*\n   Status: ${
                data.enabled ? "✅ Enabled" : "❌ Disabled"
              }\n\n`;
            }
          }
        }

        if (goodbyeData.length > 0) {
          statusText += "*📤 GOODBYE MESSAGES:*\n";
          for (let i = 0; i < goodbyeData.length; i++) {
            const data = goodbyeData[i];
            try {
              const groupMeta = await message.client.groupMetadata(data.jid);
              const groupName = groupMeta.subject || "Unknown Group";
              const status = data.enabled ? "✅ Enabled" : "❌ Disabled";
              statusText += `${
                i + 1
              }. *${groupName}*\n   Status: ${status}\n   Preview: ${data.message.substring(
                0,
                50
              )}${data.message.length > 50 ? "..." : ""}\n\n`;
            } catch {
              statusText += `${i + 1}. *Unknown Group*\n   Status: ${
                data.enabled ? "✅ Enabled" : "❌ Disabled"
              }\n\n`;
            }
          }
        }

        await message.sendReply(statusText);
      } catch (error) {
        console.error("Error getting welcome status:", error);
        await message.sendReply("_Error retrieving welcome/goodbye status!_");
      }
      return;
    }

    if (input === "help") {
      const helpText = `*🎉 WELCOME & GOODBYE SYSTEM HELP 🎉*

*📝 BASIC COMMANDS:*
• \`.welcome <message>\` - Set welcome message
• \`.goodbye <message>\` - Set goodbye message
• \`.welcome on/off\` - Enable/disable welcome
• \`.goodbye on/off\` - Enable/disable goodbye
• \`.welcome get\` - View current welcome
• \`.goodbye get\` - View current goodbye
• \`.welcome del\` - Delete welcome message
• \`.goodbye del\` - Delete goodbye message
• \`.welcome status\` - Show all groups status (owner only)
• \`.welcome help\` - Show this detailed help

*🧪 TEST COMMANDS:*
• \`.testwelcome\` - Test current welcome message
• \`.testgoodbye\` - Test current goodbye message

*📋 AVAILABLE PLACEHOLDERS:*
• \`$mention\` - @mentions the user
• \`$user\` - User's display name
• \`$group\` - Group name
• \`$desc\` - Group description
• \`$count\` - Current member count
• \`$pp\` - User's profile picture (fallback to group pic if privacy)
• \`$gpp\` - Group profile picture
• \`$date\` - Current date
• \`$time\` - Current time

*💡 EXAMPLE MESSAGES:*

*Welcome Examples:*
\`Hey $mention! 👋 Welcome to $group! 🎉\`

\`Welcome $user to our amazing community! $pp
We now have $count members! 🚀\`

\`🎊 $mention joined $group!
📖 Description: $desc
👥 Members: $count
📅 Joined on: $date at $time $gpp\`

*Goodbye Examples:*
\`Goodbye $mention! 👋 Thanks for being part of $group! 💔\`

\`$user left the group 😢 $pp
We now have $count members remaining.\`

\`📤 $mention has left $group
📅 Left on: $date at $time
💭 We'll miss you! $gpp\`

*⚠️ NOTES:*
• Messages are limited to 2000 characters
• \`$pp\` and \`$gpp\` will send images with caption
• If user's profile pic fails, group pic is used as fallback
• Use quotes for multi-word messages
• Admin access required to set messages
• Messages work for both joins and leaves`;

      return await message.sendReply(helpText);
    }
    const welcomeMessage = match[1];
    if (welcomeMessage.length > 2000) {
      return await message.sendReply(
        "_Welcome message is too long! Please keep it under 2000 characters._"
      );
    }
    await welcome.set(message.jid, welcomeMessage);
    await message.sendReply(
      `_Welcome message set successfully!_ ✅\n\n*Preview:*\n${welcomeMessage}\n\n💡 _Tip: Use_ \`.testwelcome\` _to test your message!_`
    );
  }
);
Module(
  {
    pattern: "goodbye ?(.*)",
    fromMe: false,
    desc: "Set goodbye message for group. Use placeholders: $mention, $user, $group, $desc, $count, $pp, $gpp, $date, $time",
    usage:
      ".goodbye Bye $mention, thanks for being part of $group! $pp\n.goodbye on/off (to enable/disable)\n.goodbye get (to view current message)\n.goodbye del (to delete)",
    use: "group",
  },
  async (message, match) => {
    let adminAccess = config.ADMIN_ACCESS
      ? await isAdmin(message, message.sender)
      : false;
    if (!message.fromOwner && !adminAccess) return;
    const input = match[1]?.toLowerCase();
    if (!input) {
      return await message.sendReply(`*Goodbye Message Setup*
*Usage:*
• \`.goodbye <message>\` - Set goodbye message
• \`.goodbye on/off\` - Enable/disable goodbye
• \`.goodbye get\` - View current message
• \`.goodbye del\` - Delete goodbye message
*Placeholders:*
• \`$mention\` - Mention the user
• \`$user\` - User's name  
• \`$group\` - Group name
• \`$desc\` - Group description
• \`$count\` - Member count
• \`$pp\` - User's profile picture
• \`$gpp\` - Group profile picture
• \`$date\` - Current date
• \`$time\` - Current time
*Example:*
\`.goodbye Bye $mention! Thanks for being part of $group 👋 $pp\`
\`.goodbye $user left the group. We now have $count members. $gpp\``);
    }
    if (input === "on") {
      const current = await goodbye.get(message.jid);
      if (!current) {
        return await message.sendReply(
          "_No goodbye message set! Set one first using:_\n*.goodbye <your message>*"
        );
      }
      await goodbye.toggle(message.jid, true);
      return await message.sendReply("_Goodbye messages enabled!_ ✅");
    }
    if (input === "off") {
      await goodbye.toggle(message.jid, false);
      return await message.sendReply("_Goodbye messages disabled!_ ❌");
    }
    if (input === "get") {
      const current = await goodbye.get(message.jid);
      if (!current) {
        return await message.sendReply(
          "_No goodbye message set for this group!_"
        );
      }
      return await message.sendReply(
        `*Current Goodbye Message:*\n\n${current.message}\n\n*Status:* ${
          current.enabled ? "Enabled ✅" : "Disabled ❌"
        }`
      );
    }
    if (input === "del" || input === "delete") {
      const deleted = await goodbye.delete(message.jid);
      if (deleted) {
        return await message.sendReply(
          "_Goodbye message deleted successfully!_ 🗑️"
        );
      }
      return await message.sendReply("_No goodbye message found to delete!_");
    }
    const goodbyeMessage = match[1];
    if (goodbyeMessage.length > 2000) {
      return await message.sendReply(
        "_Goodbye message is too long! Please keep it under 2000 characters._"
      );
    }
    await goodbye.set(message.jid, goodbyeMessage);
    await message.sendReply(
      `_Goodbye message set successfully!_ ✅\n\n*Preview:*\n${goodbyeMessage}\n\n💡 _Tip: Use_ \`.testgoodbye\` _to test your message!_`
    );
  }
);
Module(
  {
    pattern: "testwelcome ?(.*)",
    fromMe: false,
    desc: "Test the welcome message for current group",
    usage: ".testwelcome",
    use: "group",
  },
  async (message, match) => {
    let adminAccess = config.ADMIN_ACCESS
      ? await isAdmin(message, message.sender)
      : false;
    if (!message.fromOwner && !adminAccess) return;
    const welcomeData = await welcome.get(message.jid);
    if (!welcomeData || !welcomeData.enabled) {
      return await message.sendReply(
        "_No welcome message set or welcome is disabled for this group!_"
      );
    }
    const parsedMessage = await parseWelcomeMessage(
      welcomeData.message,
      message,
      [message.sender]
    );
    if (parsedMessage) {
      await message.sendReply("*Testing Welcome Message:*");
      await sendWelcomeMessage(message, parsedMessage);
    } else {
      await message.sendReply("_Error parsing welcome message!_");
    }
  }
);
Module(
  {
    pattern: "testgoodbye ?(.*)",
    fromMe: false,
    desc: "Test the goodbye message for current group",
    usage: ".testgoodbye",
    use: "group",
  },
  async (message, match) => {
    let adminAccess = config.ADMIN_ACCESS
      ? await isAdmin(message, message.sender)
      : false;
    if (!message.fromOwner && !adminAccess) return;
    const goodbyeData = await goodbye.get(message.jid);
    if (!goodbyeData || !goodbyeData.enabled) {
      return await message.sendReply(
        "_No goodbye message set or goodbye is disabled for this group!_"
      );
    }
    const parsedMessage = await parseWelcomeMessage(
      goodbyeData.message,
      message,
      [message.sender]
    );
    if (parsedMessage) {
      await message.sendReply("*Testing Goodbye Message:*");
      await sendWelcomeMessage(message, parsedMessage);
    } else {
      await message.sendReply("_Error parsing goodbye message!_");
    }
  }
);
