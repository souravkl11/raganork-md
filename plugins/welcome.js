const { Module } = require("../main");
const { welcome, goodbye, groupAdminGuard } = require("./utils");
const {
  parseWelcomeMessage,
  sendWelcomeMessage,
} = require("./utils/welcome-parser");
const { helpPrefix } = require("../core/plugins/registry");

const MAX_LENGTH = 2000;

const PLACEHOLDERS =
  "$mention, $user, $group, $desc, $count, $pp, $gpp, $date, $time";

async function describeGroups(message, rows, title) {
  if (!rows.length) return "";
  let text = `*${title}:*\n`;
  for (let i = 0; i < rows.length; i++) {
    const data = rows[i];
    const status = data.enabled ? "✅ Enabled" : "❌ Disabled";
    try {
      const groupMeta = await message.client.groupMetadata(data.jid);
      const groupName = groupMeta.subject || "Unknown Group";
      text += `${i + 1}. *${groupName}*\n   Status: ${status}\n   Preview: ${data.message.substring(
        0,
        50
      )}${data.message.length > 50 ? "..." : ""}\n\n`;
    } catch {
      text += `${i + 1}. *Unknown Group*\n   Status: ${status}\n\n`;
    }
  }
  return text;
}

async function showStatus(message) {
  if (!message.fromOwner) return;
  try {
    const welcomeData = await welcome.get();
    const goodbyeData = await goodbye.get();

    if (!welcomeData.length && !goodbyeData.length) {
      return await message.sendReply(
        "_No welcome or goodbye messages configured in any groups!_"
      );
    }

    const statusText =
      "*🎉 WELCOME & GOODBYE STATUS 🎉*\n\n" +
      (await describeGroups(message, welcomeData, "📥 WELCOME MESSAGES")) +
      (await describeGroups(message, goodbyeData, "📤 GOODBYE MESSAGES"));

    await message.sendReply(statusText);
  } catch (error) {
    console.error("Error getting welcome status:", error);
    await message.sendReply("_Error retrieving welcome/goodbye status!_");
  }
}

async function showHelp(message) {
  const p = helpPrefix();
  const helpText = `*🎉 WELCOME & GOODBYE SYSTEM HELP 🎉*

*📝 BASIC COMMANDS:*
• \`${p}welcome <message>\` - Set welcome message
• \`${p}goodbye <message>\` - Set goodbye message
• \`${p}welcome on/off\` - Enable/disable welcome
• \`${p}goodbye on/off\` - Enable/disable goodbye
• \`${p}welcome get\` - View current welcome
• \`${p}goodbye get\` - View current goodbye
• \`${p}welcome del\` - Delete welcome message
• \`${p}goodbye del\` - Delete goodbye message
• \`${p}welcome status\` - Show all groups status (owner only)
• \`${p}welcome help\` - Show this detailed help

*🧪 TEST COMMANDS:*
• \`${p}testwelcome\` - Test current welcome message
• \`${p}testgoodbye\` - Test current goodbye message

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
• Messages are limited to ${MAX_LENGTH} characters
• \`$pp\` and \`$gpp\` will send images with caption
• If user's profile pic fails, group pic is used as fallback
• Use quotes for multi-word messages
• Admin access required to set messages
• Messages work for both joins and leaves`;

  return await message.sendReply(helpText);
}

function greetingCommand(name, store) {
  const Name = name[0].toUpperCase() + name.slice(1);
  const example =
    name === "welcome"
      ? [
          "Hey $mention! Welcome to $group 🎉 $pp",
          "Welcome $user to our amazing group! We now have $count members! $gpp",
        ]
      : [
          "Bye $mention! Thanks for being part of $group 👋 $pp",
          "$user left the group. We now have $count members. $gpp",
        ];

  Module(
    {
      pattern: `${name} ?(.*)`,
      fromMe: false,
      desc: `Set ${name} message for group. Use placeholders: ${PLACEHOLDERS}`,
      usage:
        name === "welcome"
          ? ".welcome Hey $mention, welcome to $group! $pp\n.welcome on/off (to enable/disable)\n.welcome get (to view current message)\n.welcome del (to delete)"
          : ".goodbye Bye $mention, thanks for being part of $group! $pp\n.goodbye on/off (to enable/disable)\n.goodbye get (to view current message)\n.goodbye del (to delete)",
      use: "group",
    },
    async (message, match) => {
      const text = match[1]?.trim() || "";
      const input = text.toLowerCase();
      const p = helpPrefix();
      const ownerInfo =
        !message.isGroup &&
        message.fromOwner &&
        ["", "help", "status"].includes(input);
      if (!ownerInfo && !(await groupAdminGuard(message))) return;

      if (!input) {
        return await message.sendReply(`*${Name} Message Setup*

*Usage:*
• \`${p}${name} <message>\` - Set ${name} message
• \`${p}${name} on/off\` - Enable/disable ${name}
• \`${p}${name} get\` - View current message
• \`${p}${name} del\` - Delete ${name} message
• \`${p}${name} status\` - Show all groups status (owner only)
• \`${p}${name} help\` - Show detailed help with examples

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
\`${p}${name} ${example[0]}\`
\`${p}${name} ${example[1]}\``);
      }
      if (input === "help") return await showHelp(message);
      if (input === "status") return await showStatus(message);
      if (input === "on") {
        const current = await store.get(message.jid);
        if (!current) {
          return await message.sendReply(
            `_No ${name} message set! Set one first using:_\n*${p}${name} <your message>*`
          );
        }
        await store.toggle(message.jid, true);
        return await message.sendReply(`_${Name} messages enabled!_ ✅`);
      }
      if (input === "off") {
        await store.toggle(message.jid, false);
        return await message.sendReply(`_${Name} messages disabled!_ ❌`);
      }
      if (input === "get") {
        const current = await store.get(message.jid);
        if (!current) {
          return await message.sendReply(
            `_No ${name} message set for this group!_`
          );
        }
        return await message.sendReply(
          `*Current ${Name} Message:*\n\n${current.message}\n\n*Status:* ${
            current.enabled ? "Enabled ✅" : "Disabled ❌"
          }`
        );
      }
      if (input === "del" || input === "delete") {
        const deleted = await store.delete(message.jid);
        if (deleted) {
          return await message.sendReply(
            `_${Name} message deleted successfully!_ 🗑️`
          );
        }
        return await message.sendReply(`_No ${name} message found to delete!_`);
      }

      if (text.length > MAX_LENGTH) {
        return await message.sendReply(
          `_${Name} message is too long! Please keep it under ${MAX_LENGTH} characters._`
        );
      }
      await store.set(message.jid, text);
      await message.sendReply(
        `_${Name} message set successfully!_ ✅\n\n*Preview:*\n${text}\n\n💡 _Tip: Use_ \`${p}test${name}\` _to test your message!_`
      );
    }
  );

  Module(
    {
      pattern: `test${name} ?(.*)`,
      fromMe: false,
      desc: `Test the ${name} message for current group`,
      usage: `.test${name}`,
      use: "group",
    },
    async (message) => {
      if (!(await groupAdminGuard(message))) return;
      const data = await store.get(message.jid);
      if (!data || !data.enabled) {
        return await message.sendReply(
          `_No ${name} message set or ${name} is disabled for this group!_`
        );
      }
      const parsedMessage = await parseWelcomeMessage(data.message, message, [
        { id: message.sender },
      ]);
      if (parsedMessage) {
        await message.sendReply(`*Testing ${Name} Message:*`);
        await sendWelcomeMessage(message, parsedMessage);
      } else {
        await message.sendReply(`_Error parsing ${name} message!_`);
      }
    }
  );
}

greetingCommand("welcome", welcome);
greetingCommand("goodbye", goodbye);
