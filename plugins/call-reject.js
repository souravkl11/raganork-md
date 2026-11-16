const { Module } = require("../main");
const config = require("../config");
const { helpPrefix } = require("../core/plugins/registry");
const { setVar } = require("./manage");

Module(
  {
    pattern: "callreject ?(.*)",
    fromMe: true,
    desc: "Comprehensive call rejection management system",
    usage:
      ".callreject on/off\n.callreject allow <number>\n.callreject remove <number>\n.callreject list\n.callreject clear\n.callreject msg <message>\n.callreject msg off",
    use: "owner",
  },
  async (message, match) => {
    const input = match[1]?.trim();

    if (!input) {
      return await message.sendReply(
        "*📞 Call Rejection Management*\n\n" +
          "*Basic Controls:*\n" +
          `• \`${helpPrefix()}callreject on\` - Enable call rejection\n` +
          `• \`${helpPrefix()}callreject off\` - Disable call rejection\n\n` +
          "*Whitelist Management:*\n" +
          `• \`${helpPrefix()}callreject allow <number>\` - Whitelist a number\n` +
          `• \`${helpPrefix()}callreject remove <number>\` - Remove from whitelist\n` +
          `• \`${helpPrefix()}callreject list\` - Show whitelisted numbers\n` +
          `• \`${helpPrefix()}callreject clear\` - Clear all whitelisted numbers\n\n` +
          "*Message Settings:*\n" +
          `• \`${helpPrefix()}callreject msg <text>\` - Set rejection message\n` +
          `• \`${helpPrefix()}callreject msg off\` - Disable rejection message\n\n` +
          "*Current Status:*\n" +
          `• Call Rejection: ${
            config.REJECT_CALLS ? "✅ Enabled" : "❌ Disabled"
          }\n` +
          `• Rejection Message: ${
            config.CALL_REJECT_MESSAGE ? "✅ Set" : "❌ Not Set"
          }\n` +
          `• Whitelisted Numbers: ${
            config.ALLOWED_CALLS ? config.ALLOWED_CALLS.split(",").length : 0
          }`
      );
    }

    const [action, ...restParts] = input.split(" ");
    const rest = restParts.join(" ");

    switch (action.toLowerCase()) {
      case "on":
      case "enable":
        await setVar("REJECT_CALLS", "true", false);
        await message.sendReply(
          "*✅ Call rejection enabled*\n\nAll incoming calls will be rejected except whitelisted numbers."
        );
        break;

      case "off":
      case "disable":
        await setVar("REJECT_CALLS", "false", false);
        await message.sendReply(
          "*❌ Call rejection disabled*\n\nAll incoming calls will be accepted."
        );
        break;

      case "allow":
        if (!rest) {
          if (!message.jid.includes("@g.us")) {
            const chatNumber = message.jid.split("@")[0];
            const myNumber = message.client.user.id.split(":")[0];

            if (chatNumber === myNumber) {
              return await message.sendReply(
                "*❌ You cannot whitelist your own number*"
              );
            }

            let allowedNumbers = config.ALLOWED_CALLS
              ? config.ALLOWED_CALLS.split(",")
                  .map((n) => n.trim())
                  .filter((n) => n)
              : [];

            if (allowedNumbers.includes(chatNumber)) {
              return await message.sendReply(
                `*📞 Number +${chatNumber} is already whitelisted*`
              );
            }

            allowedNumbers.push(chatNumber);
            await setVar("ALLOWED_CALLS", allowedNumbers.join(","), false);
            await message.sendReply(
              `*✅ Whitelisted +${chatNumber}*\n\nThis number can now call you even when call rejection is enabled.`
            );
          } else {
            return await message.sendReply(
              `*❌ Please provide a phone number*\n\n*Usage:* \`${helpPrefix()}callreject allow 919876543210\`\n\n*Note:* In DM chats, you can use \`${helpPrefix()}callreject allow\` without a number to whitelist that contact.`
            );
          }
        } else {
          const number = rest.replace(/[^0-9]/g, "");
          if (!number) {
            return await message.sendReply(
              `*❌ Please provide a valid phone number*\n\n*Usage:* \`${helpPrefix()}callreject allow 919876543210\``
            );
          }

          let allowedNumbers = config.ALLOWED_CALLS
            ? config.ALLOWED_CALLS.split(",")
                .map((n) => n.trim())
                .filter((n) => n)
            : [];

          if (allowedNumbers.includes(number)) {
            return await message.sendReply(
              `*📞 Number +${number} is already whitelisted*`
            );
          }

          allowedNumbers.push(number);
          await setVar("ALLOWED_CALLS", allowedNumbers.join(","), false);
          await message.sendReply(
            `*✅ Whitelisted +${number}*\n\nThis number can now call you even when call rejection is enabled.`
          );
        }
        break;

      case "remove":
        if (!rest) {
          if (!message.jid.includes("@g.us")) {
            const chatNumber = message.jid.split("@")[0];
            let allowedNumbers = config.ALLOWED_CALLS
              ? config.ALLOWED_CALLS.split(",")
                  .map((n) => n.trim())
                  .filter((n) => n)
              : [];

            if (!allowedNumbers.includes(chatNumber)) {
              return await message.sendReply(
                `*📞 Number +${chatNumber} is not whitelisted*`
              );
            }

            allowedNumbers = allowedNumbers.filter((n) => n !== chatNumber);
            await setVar("ALLOWED_CALLS", allowedNumbers.join(","), false);
            await message.sendReply(
              `*🚫 Removed +${chatNumber} from whitelist*\n\nThis number will now be blocked when call rejection is enabled.`
            );
          } else {
            return await message.sendReply(
              `*❌ Please provide a phone number*\n\n*Usage:* \`${helpPrefix()}callreject remove 919876543210\`\n\n*Note:* In DM chats, you can use \`${helpPrefix()}callreject remove\` without a number to remove that contact from whitelist.`
            );
          }
        } else {
          const number = rest.replace(/[^0-9]/g, "");
          if (!number) {
            return await message.sendReply(
              `*❌ Please provide a valid phone number*\n\n*Usage:* \`${helpPrefix()}callreject remove 919876543210\``
            );
          }

          let allowedNumbers = config.ALLOWED_CALLS
            ? config.ALLOWED_CALLS.split(",")
                .map((n) => n.trim())
                .filter((n) => n)
            : [];

          if (!allowedNumbers.includes(number)) {
            return await message.sendReply(
              `*📞 Number +${number} is not whitelisted*`
            );
          }

          allowedNumbers = allowedNumbers.filter((n) => n !== number);
          await setVar("ALLOWED_CALLS", allowedNumbers.join(","), false);
          await message.sendReply(
            `*🚫 Removed +${number} from whitelist*\n\nThis number will now be blocked when call rejection is enabled.`
          );
        }
        break;

      case "list":
        const allowedNumbers = config.ALLOWED_CALLS
          ? config.ALLOWED_CALLS.split(",")
              .map((n) => n.trim())
              .filter((n) => n)
          : [];

        if (allowedNumbers.length === 0) {
          return await message.sendReply(
            "*📞 No numbers in the whitelist*\n\nAll calls will be rejected when call rejection is enabled."
          );
        }

        const numbersText = allowedNumbers
          .map((num, index) => `${index + 1}. +${num}`)
          .join("\n");
        await message.sendReply(
          `*📞 Whitelisted Numbers*\n\n${numbersText}\n\n*Total:* ${allowedNumbers.length} numbers`
        );
        break;

      case "clear":
        const currentAllowed = config.ALLOWED_CALLS
          ? config.ALLOWED_CALLS.split(",")
              .map((n) => n.trim())
              .filter((n) => n)
          : [];

        if (currentAllowed.length === 0) {
          return await message.sendReply("*📞 Whitelist is already empty*");
        }

        await setVar("ALLOWED_CALLS", "", false);
        await message.sendReply(
          `*🗑️ Cleared whitelist*\n\nRemoved ${currentAllowed.length} numbers from the whitelist. All calls will now be rejected when call rejection is enabled.`
        );
        break;

      case "msg":
      case "message":
        if (!rest) {
          const currentMsg = config.CALL_REJECT_MESSAGE;
          return await message.sendReply(
            "*📞 Call Rejection Message*\n\n" +
              `*Current Message:* ${currentMsg || "Not set"}\n\n` +
              "*Commands:*\n" +
              `• \`${helpPrefix()}callreject msg <your message>\` - Set rejection message\n` +
              `• \`${helpPrefix()}callreject msg off\` - Disable rejection message\n\n` +
              `*Example:* \`${helpPrefix()}callreject msg Sorry, I'm busy right now. I'll call you back later.\``
          );
        }

        if (rest.toLowerCase() === "off" || rest.toLowerCase() === "disable") {
          await setVar("CALL_REJECT_MESSAGE", "", false);
          await message.sendReply(
            "*🔇 Call rejection message disabled*\n\nRejected callers will not receive any message."
          );
        } else {
          await setVar("CALL_REJECT_MESSAGE", rest, false);
          await message.sendReply(
            `*✅ Call rejection message set*\n\n*Message:* "${rest}"\n\nThis message will be sent to rejected callers.`
          );
        }
        break;

      default:
        await message.sendReply(
          "*❌ Invalid command*\n\n" +
            "*Valid commands:* on, off, allow, remove, list, clear, msg\n\n" +
            "*Examples:*\n" +
            `• \`${helpPrefix()}callreject on\` - Enable call rejection\n` +
            `• \`${helpPrefix()}callreject allow 919876543210\` - Whitelist a number\n` +
            `• \`${helpPrefix()}callreject msg I'm busy\` - Set rejection message\n\n` +
            `Type \`${helpPrefix()}callreject\` for full help menu.`
        );
        break;
    }
  }
);

