// typed registry of known config keys; unknown keys are treated as session-scoped strings.
// only keys already used as booleans/numbers are typed; the rest stay raw strings because
// their readers (and gist plugins) compare or split them as strings.

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
  DISABLE_EVAL: { type: "bool", default: "" },
  BUTTONS: { type: "bool", default: false },
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
  CMD_CONCURRENCY: { type: "int", default: 8, scope: "global" },
  CMD_TIMEOUT: { type: "int", default: 300, scope: "global" },

  // built in config.js / read straight from env by their consumers
  // "frame" also logs raw group frames (debugOn/frameDebugOn in core/helpers.js)
  DEBUG: { type: "string", default: false, scope: "global", env: (raw) => (raw === "frame" ? "frame" : legacyBool(raw)), external: true },
  DATABASE_URL: { type: "string", scope: "global", external: true },
  SESSION: { type: "string", scope: "global", external: true },
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
