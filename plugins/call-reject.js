const { Module } = require("../main");
const config = require("../config");
const { helpPrefix } = require("../core/plugins/registry");
const { setVar } = require("./manage");
const { getString } = require("./utils/lang");
const Lang = getString("call_reject");

Module(
  {
    pattern: "callreject ?(.*)",
    fromMe: true,
    desc: Lang.DESC,
    usage: Lang.USAGE,
    use: "owner",
  },
  async (message, match) => {
    const input = match[1]?.trim();
    const p = helpPrefix();
    const say = (text, ...args) => message.sendReply(text.format(...args).replaceAll("{p}", p));
    const whitelist = () =>
      config.ALLOWED_CALLS
        ? config.ALLOWED_CALLS.split(",")
            .map((n) => n.trim())
            .filter((n) => n)
        : [];

    if (!input) {
      return await say(
        Lang.HELP,
        config.REJECT_CALLS ? Lang.ENABLED : Lang.DISABLED,
        config.CALL_REJECT_MESSAGE ? Lang.SET : Lang.NOT_SET,
        config.ALLOWED_CALLS ? config.ALLOWED_CALLS.split(",").length : 0
      );
    }

    const [action, ...restParts] = input.split(" ");
    const rest = restParts.join(" ");

    switch (action.toLowerCase()) {
      case "on":
      case "enable":
        await setVar("REJECT_CALLS", "true", false);
        await say(Lang.ON);
        break;

      case "off":
      case "disable":
        await setVar("REJECT_CALLS", "false", false);
        await say(Lang.OFF);
        break;

      case "allow":
        if (!rest) {
          if (!message.jid.includes("@g.us")) {
            const chatNumber = message.jid.split("@")[0];
            const myNumber = message.client.user.id.split(":")[0];

            if (chatNumber === myNumber) {
              return await say(Lang.OWN_NUMBER);
            }

            let allowedNumbers = whitelist();

            if (allowedNumbers.includes(chatNumber)) {
              return await say(Lang.ALREADY_WHITELISTED, chatNumber);
            }

            allowedNumbers.push(chatNumber);
            await setVar("ALLOWED_CALLS", allowedNumbers.join(","), false);
            await say(Lang.WHITELISTED, chatNumber);
          } else {
            return await say(Lang.ALLOW_NEED_NUMBER);
          }
        } else {
          const number = rest.replace(/[^0-9]/g, "");
          if (!number) {
            return await say(Lang.ALLOW_INVALID_NUMBER);
          }

          let allowedNumbers = whitelist();

          if (allowedNumbers.includes(number)) {
            return await say(Lang.ALREADY_WHITELISTED, number);
          }

          allowedNumbers.push(number);
          await setVar("ALLOWED_CALLS", allowedNumbers.join(","), false);
          await say(Lang.WHITELISTED, number);
        }
        break;

      case "remove":
        if (!rest) {
          if (!message.jid.includes("@g.us")) {
            const chatNumber = message.jid.split("@")[0];
            let allowedNumbers = whitelist();

            if (!allowedNumbers.includes(chatNumber)) {
              return await say(Lang.NOT_WHITELISTED, chatNumber);
            }

            allowedNumbers = allowedNumbers.filter((n) => n !== chatNumber);
            await setVar("ALLOWED_CALLS", allowedNumbers.join(","), false);
            await say(Lang.REMOVED, chatNumber);
          } else {
            return await say(Lang.REMOVE_NEED_NUMBER);
          }
        } else {
          const number = rest.replace(/[^0-9]/g, "");
          if (!number) {
            return await say(Lang.REMOVE_INVALID_NUMBER);
          }

          let allowedNumbers = whitelist();

          if (!allowedNumbers.includes(number)) {
            return await say(Lang.NOT_WHITELISTED, number);
          }

          allowedNumbers = allowedNumbers.filter((n) => n !== number);
          await setVar("ALLOWED_CALLS", allowedNumbers.join(","), false);
          await say(Lang.REMOVED, number);
        }
        break;

      case "list": {
        const allowedNumbers = whitelist();

        if (allowedNumbers.length === 0) {
          return await say(Lang.LIST_EMPTY);
        }

        const numbersText = allowedNumbers
          .map((num, index) => `${index + 1}. +${num}`)
          .join("\n");
        await say(Lang.LIST, numbersText, allowedNumbers.length);
        break;
      }

      case "clear": {
        const currentAllowed = whitelist();

        if (currentAllowed.length === 0) {
          return await say(Lang.ALREADY_EMPTY);
        }

        await setVar("ALLOWED_CALLS", "", false);
        await say(Lang.CLEARED, currentAllowed.length);
        break;
      }

      case "msg":
      case "message":
        if (!rest) {
          return await say(Lang.MSG_HELP, config.CALL_REJECT_MESSAGE || Lang.MSG_NOT_SET);
        }

        if (rest.toLowerCase() === "off" || rest.toLowerCase() === "disable") {
          await setVar("CALL_REJECT_MESSAGE", "", false);
          await say(Lang.MSG_OFF);
        } else {
          await setVar("CALL_REJECT_MESSAGE", rest, false);
          await message.sendReply(Lang.MSG_SET.format(rest));
        }
        break;

      default:
        await say(Lang.INVALID);
        break;
    }
  }
);
