const { Module, commands } = require("../main");
const config = require("../config");
const axios = require("axios");
const { setVar } = require("./manage");
const { getString } = require("./utils/lang");
const Lang = getString("chatbot");
const { cooldown, accountKey } = require("./utils");
const { helpPrefix, patternFor, currentHandlerPrefix } = require("../core/plugins/registry");
const { parseText } = require("../core/pipeline/normalize");
const { derived } = require("../core/config/derived");
const fs = require("fs");

const API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/";
const DEFAULT_MODEL = "gemma-4-31b-it";
const DEFAULT_SYSTEM_PROMPT =
  "You are a helpful AI assistant named Raganork. Be concise, friendly, and informative.";
const REPLY_COOLDOWN_MS = 2000;

const chatContexts = new Map();
const chatQueues = new Map();

const model = () => config.CHATBOT_MODEL || DEFAULT_MODEL;
const systemPrompt = () => config.CHATBOT_SYSTEM_PROMPT || DEFAULT_SYSTEM_PROMPT;
const enabledChats = derived(
  "CHATBOT",
  (raw) =>
    new Set(
      String(raw || "")
        .split(",")
        .map((jid) => jid.trim())
        .filter((jid) => jid && jid !== "off"),
    ),
);

function inOrder(key, job) {
  const run = (chatQueues.get(key) || Promise.resolve()).then(job);
  const tail = run.catch(() => {});
  chatQueues.set(key, tail);
  tail.then(() => {
    if (chatQueues.get(key) === tail) chatQueues.delete(key);
  });
  return run;
}

function looksLikeCommand(text) {
  const prefix = currentHandlerPrefix();
  if (prefix !== "^" && !config.MULTI_HANDLERS && new RegExp(prefix).test(text)) return true;
  const parsed = parseText(text);
  return commands.some(
    (cmd) => !cmd.on && cmd.pattern !== undefined && patternFor(cmd).test(parsed),
  );
}

async function imageToGenerativePart(imageBuffer) {
  try {
    const data = imageBuffer.toString("base64");

    return {
      inlineData: {
        mimeType: "image/jpeg",
        data: data,
      },
    };
  } catch (error) {
    console.error("Error processing image:", error.message);
    return null;
  }
}

function extractResponseText(data) {
  if (!data || !data.candidates || data.candidates.length === 0) {
    return null;
  }
  const candidate = data.candidates[0];
  const parts = candidate?.content?.parts;
  if (!Array.isArray(parts) || parts.length === 0) {
    return null;
  }

  const contentParts = parts.filter(
    (part) => !part.thought && typeof part.text === "string",
  );
  if (contentParts.length > 0) {
    return contentParts
      .map((p) => p.text)
      .join("")
      .trim();
  }

  const anyTextParts = parts.filter((part) => typeof part.text === "string");
  if (anyTextParts.length > 0) {
    return anyTextParts
      .map((p) => p.text)
      .join("")
      .trim();
  }

  return null;
}

async function callGemmaAPI(apiKey, contents, systemText = systemPrompt()) {
  const apiUrl = `${API_BASE_URL}${encodeURIComponent(model())}:generateContent`;
  const payload = {
    systemInstruction: {
      parts: [{ text: systemText }],
    },
    contents: contents,
    tools: [
      {
        googleSearch: {},
      },
    ],
    generationConfig: {
      maxOutputTokens: 2048,
      temperature: 0.7,
      thinkingConfig: {
        thinkingLevel: "HIGH",
      },
    },
  };

  const requestHeaders = {
    "Content-Type": "application/json",
    "x-goog-api-key": apiKey,
  };

  try {
    return await axios.post(apiUrl, payload, {
      headers: requestHeaders,
      timeout: 30000,
    });
  } catch (err) {
    if (
      err.response &&
      err.response.status === 400 &&
      (payload.tools || payload.generationConfig?.thinkingConfig)
    ) {
      console.warn(
        "Gemma request failed with 400, retrying without optional tools/thinkingConfig:",
        err.response.data?.error?.message || err.message,
      );
      const fallbackPayload = {
        systemInstruction: payload.systemInstruction,
        contents: payload.contents,
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.7,
        },
      };
      return await axios.post(apiUrl, fallbackPayload, {
        headers: requestHeaders,
        timeout: 30000,
      });
    }
    throw err;
  }
}

async function getAIResponse(message, chatJid, imageBuffer = null) {
  const apiKey = config.GEMINI_API_KEY;
  if (!apiKey) {
    return Lang.NO_KEY_INLINE.format(helpPrefix());
  }

  try {
    const context = chatContexts.get(accountKey(chatJid)) || [];
    const contents = [];

    const recentContext = context.slice(-10);
    let startIndex = 0;
    if (recentContext.length > 0 && recentContext[0].role === "model") {
      startIndex = 1;
    }
    for (let i = startIndex; i < recentContext.length; i++) {
      const msg = recentContext[i];
      if (msg.role && msg.text) {
        contents.push({
          role: msg.role === "assistant" ? "model" : msg.role,
          parts: [{ text: msg.text }],
        });
      }
    }

    const currentParts = [{ text: message }];
    if (imageBuffer) {
      const imagePart = await imageToGenerativePart(imageBuffer);
      if (imagePart) {
        currentParts.push(imagePart);
      }
    }

    contents.push({
      role: "user",
      parts: currentParts,
    });

    const response = await callGemmaAPI(apiKey, contents, systemPrompt());
    const aiResponse = extractResponseText(response.data);
    if (aiResponse) {
      if (!chatContexts.has(accountKey(chatJid))) {
        if (chatContexts.size >= 500) {
          const oldestChatKey = chatContexts.keys().next().value;
          if (oldestChatKey) chatContexts.delete(oldestChatKey);
        }
        chatContexts.set(accountKey(chatJid), []);
      }
      const contextArray = chatContexts.get(accountKey(chatJid));
      const contextMessage = imageBuffer
        ? `${message} [Image included]`
        : message;
      contextArray.push({ role: "user", text: contextMessage });
      contextArray.push({ role: "model", text: aiResponse });

      if (contextArray.length > 20) {
        contextArray.splice(0, contextArray.length - 20);
      }

      return aiResponse;
    } else {
      return Lang.UNEXPECTED;
    }
  } catch (error) {
    console.error("Error getting AI response:", error.message);

    if (error.response && error.response.status === 429) {
      return Lang.RATE_LIMIT;
    }

    if (error.response) {
      return Lang.API_ERROR.format(error.response.data?.error?.message || Lang.UNKNOWN_ERROR);
    }

    return Lang.NETWORK_ERROR;
  }
}

function isChatbotEnabled(jid) {
  if (enabledChats().has(jid)) {
    return true;
  }

  const isGroup = jid.includes("@g.us");
  if (isGroup && config.CHATBOT_ALL_GROUPS === "true") {
    return true;
  }

  if (!isGroup && config.CHATBOT_ALL_DMS === "true") {
    return true;
  }

  return false;
}

async function enableChatbot(jid) {
  await setVar("CHATBOT", [...new Set([...enabledChats(), jid])].join(","));
}

async function disableChatbot(jid) {
  chatContexts.delete(accountKey(jid));
  await setVar(
    "CHATBOT",
    [...enabledChats()].filter((chat) => chat !== jid).join(","),
  );
}

function clearContext(jid) {
  chatContexts.delete(accountKey(jid));
}

async function clearAllContexts(target) {
  const prefix = accountKey("");
  for (const key of [...chatContexts.keys()]) {
    if (!key.startsWith(prefix)) continue;
    const isGroup = key.slice(prefix.length).includes("@g.us");
    if (isGroup === (target === "groups")) chatContexts.delete(key);
  }
}

Module(
  {
    pattern: "chatbot ?(.*)",
    fromMe: true,
    desc: Lang.DESC,
    usage: Lang.USAGE,
  },
  async (message, match) => {
    const input = match[1]?.trim();
    const chatJid = message.jid;
    const say = (text, ...args) => message.sendReply(text.format(...args).replaceAll("{p}", helpPrefix()));
    const onOff = (on) => (on ? Lang.ENABLED : Lang.DISABLED);
    const keyState = () => (config.GEMINI_API_KEY ? Lang.KEY_SET : Lang.KEY_MISSING);

    if (!input) {
      const isEnabled = isChatbotEnabled(chatJid);
      const globalGroups = config.CHATBOT_ALL_GROUPS === "true";
      const globalDMs = config.CHATBOT_ALL_DMS === "true";
      const currentModel = model();
      const contextSize = chatContexts.get(accountKey(chatJid))?.length || 0;
      const hasApiKey = !!config.GEMINI_API_KEY;

      return await say(
        Lang.MENU + (hasApiKey ? Lang.MENU_COMMANDS : Lang.MENU_SETUP),
        isEnabled ? Lang.ENABLED_PLAIN : Lang.DISABLED_PLAIN,
        keyState(),
        onOff(globalGroups),
        onOff(globalDMs),
        currentModel,
        contextSize,
        systemPrompt().substring(0, 100) + (systemPrompt().length > 100 ? "..." : "")
      );
    }

    const args = input.split(" ");
    const command = args[0].toLowerCase();
    const target = args[1]?.toLowerCase();

    switch (command) {
      case "on":
        if (!config.GEMINI_API_KEY) {
          return await say(Lang.NO_KEY);
        }

        if (target === "groups") {
          await setVar("CHATBOT_ALL_GROUPS", "true");
          return await say(Lang.ON_GROUPS, model());
        } else if (target === "dms") {
          await setVar("CHATBOT_ALL_DMS", "true");
          return await say(Lang.ON_DMS, model());
        } else {
          await enableChatbot(chatJid);
          return await say(Lang.ON_CHAT, chatJid.includes("@g.us") ? Lang.GROUP : Lang.DM, model());
        }

      case "off":
        if (target === "groups") {
          await setVar("CHATBOT_ALL_GROUPS", "false");
          return await say(Lang.OFF_GROUPS);
        } else if (target === "dms") {
          await setVar("CHATBOT_ALL_DMS", "false");
          return await say(Lang.OFF_DMS);
        } else {
          await disableChatbot(chatJid);
          return await say(Lang.OFF_CHAT);
        }

      case "set": {
        const promptMatch = input.match(/set\s+"([^"]+)"/);
        if (!promptMatch) {
          return await say(Lang.NEED_PROMPT);
        }
        const newPrompt = promptMatch[1];
        await setVar("CHATBOT_SYSTEM_PROMPT", newPrompt);
        return await message.sendReply(Lang.PROMPT_SET.format(newPrompt));
      }

      case "clear":
        if (target === "groups" || target === "dms") {
          await clearAllContexts(target);
          return await message.sendReply(
            target === "groups" ? Lang.CLEARED_GROUPS : Lang.CLEARED_DMS
          );
        } else {
          clearContext(chatJid);
          return await message.sendReply(Lang.CLEARED);
        }

      case "status": {
        const isEnabled = isChatbotEnabled(chatJid);
        const isEnabledIndividually = enabledChats().has(chatJid);
        const globalGroups = config.CHATBOT_ALL_GROUPS === "true";
        const globalDMs = config.CHATBOT_ALL_DMS === "true";
        const currentModel = model();
        const contextSize = chatContexts.get(accountKey(chatJid))?.length || 0;
        const isGroup = chatJid.includes("@g.us");

        let enabledReason = "";
        if (isEnabledIndividually) {
          enabledReason = Lang.VIA_CHAT;
        } else if (isGroup && globalGroups) {
          enabledReason = Lang.VIA_GROUPS;
        } else if (!isGroup && globalDMs) {
          enabledReason = Lang.VIA_DMS;
        }

        const statusText =
          Lang.STATUS_HEAD.format(onOff(isEnabled)) +
          (isEnabled && enabledReason ? Lang.STATUS_VIA.format(enabledReason) : "") +
          Lang.STATUS_BODY.format(onOff(globalGroups), onOff(globalDMs), currentModel, contextSize, systemPrompt(), keyState());

        return await message.sendReply(statusText);
      }

      default:
        return await say(Lang.UNKNOWN, command);
    }
  },
);

Module(
  {
    on: "text",
    fromMe: false,
  },
  async (message) => {
    try {
      const chatJid = message.jid;
      const senderJid = message.sender;
      const isGroup = message.isGroup;
      const isDM = !isGroup;

      if (!isChatbotEnabled(chatJid)) {
        return;
      }

      if (message.fromMe) {
        return;
      }

      if (!config.GEMINI_API_KEY) {
        return;
      }

      let shouldRespond = false;
      const messageText = message.text;
      if (isDM) {
        shouldRespond = true;
      } else if (isGroup) {
        const botJid = message.client.user?.lid;

        if (message.mention && message.mention.length > 0) {
          const botMentioned = message.mention.some((jid) => {
            const mentionedNum = jid.split("@")[0];
            const botNum = botJid?.split(":")[0];
            return mentionedNum === botNum;
          });
          if (botMentioned) shouldRespond = true;
        }

        if (message.reply_message && message.reply_message.jid) {
          const repliedToNum = message.reply_message.jid.split("@")[0];
          const botNum = botJid?.split(":")[0];
          if (repliedToNum === botNum) shouldRespond = true;
        }
      }

      if (!shouldRespond) {
        return;
      }

      if (messageText && looksLikeCommand(messageText)) {
        return;
      }

      const key = accountKey("chatbot", chatJid);
      if (!cooldown(key, REPLY_COOLDOWN_MS)) return;

      let imageBuffer = null;
      let responseText = messageText;

      if (message.reply_message && message.reply_message.image) {
        try {
          imageBuffer = await message.reply_message.download("buffer");

          if (!messageText || messageText.length < 2) {
            responseText = "What do you see in this image?";
          }
        } catch (error) {
          console.error("Error downloading image:", error);
          return await message.sendReply(
            Lang.IMAGE_FAILED,
          );
        }
      } else if (!messageText || messageText.length < 2) {
        return;
      }

      const aiResponse = await inOrder(key, () =>
        getAIResponse(responseText, chatJid, imageBuffer),
      );

      if (aiResponse) {
        await message.sendReply(aiResponse);
      }
    } catch (error) {
      console.error("Error in message handler:", error);
    }
  },
);

Module(
  {
    pattern: "ai ?(.*)",
    desc: Lang.AI_DESC,
    use: "ai",
  },
  async (message, match) => {
    let imageParts = [];
    let prompt = match[1]?.trim() || "";

    if (message.reply_message) {
      if (message.reply_message.image) {
        try {
          const buffer = await message.reply_message.download("buffer");
          const imagePart = await imageToGenerativePart(buffer);
          if (imagePart) imageParts.push(imagePart);
        } catch (error) {
          console.error("Error downloading image:", error);
          return await message.sendReply(Lang.AI_IMAGE_FAILED);
        }
        if (!prompt) prompt = "What do you see in this image?";
      } else if (message.reply_message.album) {
        try {
          const albumData = await message.reply_message.download();

          for (const imagePath of albumData.images) {
            try {
              const buffer = fs.readFileSync(imagePath);
              const imagePart = await imageToGenerativePart(buffer);
              if (imagePart) imageParts.push(imagePart);
            } catch (err) {
              console.error("Error processing album image:", err);
            }
          }

          if (!imageParts.length) {
            return await message.sendReply(Lang.AI_NO_ALBUM_IMAGES);
          }
          if (!prompt) prompt = "Analyze these images for me.";
        } catch (error) {
          console.error("Error downloading album:", error);
          return await message.sendReply(Lang.AI_ALBUM_FAILED);
        }
      } else if (message.reply_message.text && !prompt) {
        prompt = message.reply_message.text;
      }
    }

    if (!prompt && !imageParts.length) {
      return await message.sendReply(
        Lang.AI_NEED_PROMPT,
      );
    }

    const apiKey = config.GEMINI_API_KEY;
    if (!apiKey) {
      return await message.sendReply(
        Lang.AI_NO_KEY.format(helpPrefix()),
      );
    }

    let sent_msg;
    try {
      sent_msg = await message.sendReply(Lang.THINKING);

      const contents = [
        {
          role: "user",
          parts: [{ text: prompt }, ...imageParts],
        },
      ];

      const response = await callGemmaAPI(
        apiKey,
        contents,
        "You are a helpful AI assistant. Respond naturally and directly. Use WhatsApp markdown (*bold*, _italic_, `code`, ```code blocks```, bullets) where appropriate. Keep responses concise and relevant.",
      );

      const fullText = extractResponseText(response.data);

      if (!fullText) {
        await message.edit(
          Lang.EMPTY,
          message.jid,
          sent_msg.key,
        );
        return;
      }

      await message.edit(fullText, message.jid, sent_msg.key);
    } catch (error) {
      console.error("AI command error:", error.message);
      const errMsg = error.response?.data?.error?.message;
      if (sent_msg) {
        await message.edit(
          Lang.AI_ERROR.format(errMsg ? `: ${errMsg}` : "."),
          message.jid,
          sent_msg.key,
        );
      } else {
        await message.sendReply(
          Lang.AI_ERROR.format(errMsg ? `: ${errMsg}` : "."),
        );
      }
    }
  },
);
