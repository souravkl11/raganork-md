// typed registry of every config key the bot itself knows about.
// keys that are not listed here (gist plugin keys, AFK_DATA, SUDO_MAP, ...) are
// treated as { type: "string", scope: "session" }: stored and returned untouched.
//
// type decisions. a type is only non-string where today's code already treats the
// value as a boolean or number; every other key is compared as a string somewhere
// (or may hold a string from the db) and stays a raw string:
//
//   bool    PM_ANTISPAM ALWAYS_ONLINE MANGLISH_CHATBOT ADMIN_ACCESS MULTI_HANDLERS
//           DISABLE_START_MESSAGE AUTO_READ_STATUS READ_MESSAGES PMB_VAR DIS_PM
//           REJECT_CALLS READ_COMMAND  (every settingsMenu key, plus MANGLISH_CHATBOT:
//           these were already turned into booleans when loaded from the db)
//           AUTO_UPDATE  (new: a db "false" used to stay a truthy string)
//   int     MAX_RECONNECT_ATTEMPTS CMD_CONCURRENCY CMD_TIMEOUT
//   string  everything else, notably:
//     ANTI_DELETE        "chat" | "sudo" | "custom" | "off" or false; compared as a string in core/bot.js
//     CMD_REACTION       bool from env, raw string from the db today; only truthiness is read, but a
//                        db "false" is truthy, so making it bool would change what a live bot does
//     DEBUG              true from env, string from the db; core/handler.js checks === true || "true"
//     NOLOG              compared with === "true"
//     DISABLED_COMMANDS  array from env, comma string from the db; core/handler.js only honours the string
//     MODE               compared with === "private" / !== "public"; lowercased so ".mode Private" works
//     WARN, ANTISPAM_COUNT, BLOCK_CHAT, ALLOWED, HANDLERS, ...  split or parsed by their readers
//   csv and json exist as types but no key uses them yet: consumers parse those strings lazily
//   (core/sudo.js), and changing the stored shape would break gist plugins that split them.

const legacyBool = (raw) => raw === "true" || raw === "on";

const entries = {
  ALIVE: { type: "string", default: "_I am alive! (use .setalive help for custom alive msg)_" },
  BLOCK_CHAT: { type: "string", default: "" },
  // bool, but the default has always been the empty string
  PM_ANTISPAM: { type: "bool", default: "" },
  ALWAYS_ONLINE: { type: "bool", default: false },
  MANGLISH_CHATBOT: { type: "bool", default: false },
  ADMIN_ACCESS: { type: "bool", default: false },
  AUTOMUTE_MSG: { type: "string", default: "_Group automuted!_\n_(edit AUTOMUTE_MSG)_" },
  ANTIWORD_WARN: { type: "string", default: "" },
  ANTI_SPAM: { type: "string", default: "919074309534-1632403322@g.us" },
  MULTI_HANDLERS: { type: "bool", default: false },
  AUTO_LIKE_STATUS: { type: "bool", default: false },
  DISABLE_START_MESSAGE: { type: "bool", default: false },
  NOLOG: { type: "string", default: false, scope: "global" },
  DISABLED_COMMANDS: {
    type: "string",
    default: [],
    env: (raw) => (raw ? raw.split(",") : []),
  },
  ANTI_BOT: { type: "string", default: "" },
  ANTISPAM_COUNT: { type: "string", default: "6/10" },
  AUTOUNMUTE_MSG: { type: "string", default: "_Group auto unmuted!_\n_(edit AUTOUNMUTE_MSG)_" },
  AUTO_READ_STATUS: { type: "bool", default: false },
  READ_MESSAGES: { type: "bool", default: false },
  PMB_VAR: { type: "bool", default: false },
  DIS_PM: { type: "bool", default: false },
  REJECT_CALLS: { type: "bool", default: false },
  ALLOWED_CALLS: { type: "string", default: "" },
  CALL_REJECT_MESSAGE: { type: "string", default: "" },
  PMB: { type: "string", default: "_Personal messages not allowed, BLOCKED!_" },
  READ_COMMAND: { type: "bool", default: true },
  RG: { type: "string", default: "919074309534-1632403322@g.us,120363116963909366@g.us" },
  BOT_INFO: { type: "string", default: "𝖱𝖺𝗀𝖺𝗇𝗈𝗋𝗄;𝖱𝗒𝗓𝖾𝗇;default" },
  RBG_KEY: { type: "string", default: "" },
  ALLOWED: { type: "string", default: "91,94,2" },
  NOT_ALLOWED: { type: "string", default: "852" },
  CHATBOT: { type: "string", default: "off" },
  // live and per session: the dispatcher builds each command's regex from the session's own value
  HANDLERS: { type: "string", default: ".," },
  STICKER_DATA: { type: "string", default: "Raganork" },
  BOT_NAME: { type: "string", default: "Raganork" },
  AUDIO_DATA: {
    type: "string",
    default: "default",
    env: (raw) => (raw === undefined || raw === "private" ? "default" : raw),
  },
  TAKE_KEY: { type: "string", default: "" },
  CMD_REACTION: { type: "string", default: false, env: legacyBool },
  MODE: { type: "string", default: "private", normalize: (v) => v.trim().toLowerCase() },
  WARN: { type: "string", default: "4" },
  ANTILINK_WARN: { type: "string", default: "" },
  ANTI_DELETE: { type: "string", default: false, env: legacyBool },
  SUDO: { type: "string", default: "" },
  LANGUAGE: { type: "string", default: "english", scope: "global", restart: true },
  AUTO_UPDATE: { type: "bool", default: true, scope: "global" },
  SUPPORT_GROUP: { type: "string", default: "https://t.me/raganork_in" },
  MAX_RECONNECT_ATTEMPTS: { type: "int", default: 10, scope: "global" },
  // command queue (core/pipeline/dispatcher.js): chats running a command at once, and seconds
  // before a running command stops holding its slot
  CMD_CONCURRENCY: { type: "int", default: 8, scope: "global" },
  CMD_TIMEOUT: { type: "int", default: 300, scope: "global" },

  // built in config.js (they are needed before the config object exists)
  DEBUG: { type: "string", default: false, scope: "global", env: legacyBool, external: true },
  DATABASE_URL: { type: "string", scope: "global", external: true },
  SESSION: { type: "string", scope: "global", external: true },
  // read straight from the environment by their consumers; never materialised
  LOG_LEVEL: { type: "string", default: "warn", scope: "global", external: true },
  RENDER_API_KEY: { type: "string", default: "", scope: "global", external: true },
};

const FALLBACK = Object.freeze({ type: "string", scope: "session", restart: false });

const schema = new Map(
  Object.entries(entries).map(([key, entry]) => [
    key,
    Object.freeze({ scope: "session", restart: false, ...entry }),
  ]),
);

function entryFor(key) {
  return schema.get(key) || FALLBACK;
}

module.exports = {
  schema,
  entryFor,
  has: (key) => schema.has(key),
  typeOf: (key) => entryFor(key).type,
  scopeOf: (key) => entryFor(key).scope,
  needsRestart: (key) => entryFor(key).restart === true,
};
