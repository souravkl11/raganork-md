const schema = require("./schema");

const CATEGORIES = [
  {
    name: "General",
    items: [
      { key: "MODE", title: "Bot mode", kind: "enum", options: [{ value: "private" }, { value: "public" }], desc: "who can use commands" },
      { key: "HANDLERS", title: "Command prefixes", kind: "text", desc: "characters that start a command" },
      { key: "MULTI_HANDLERS", title: "With & without prefix", kind: "bool", desc: "commands work with or without prefix" },
      { key: "LANGUAGE", title: "Language", kind: "enum", options: [{ value: "english" }, { value: "manglish" }, { value: "turkish" }] },
      { key: "BOT_NAME", title: "Bot name", kind: "text" },
      { key: "BOT_INFO", title: "Bot info", kind: "text", desc: "name;owner;image", via: "setinfo" },
      { key: "BUTTONS", title: "Interactive buttons", kind: "bool", desc: "experimental, use at your own risk", aliases: ["BUTTON"] },
    ],
  },
  {
    name: "Presence & read",
    items: [
      { key: "ALWAYS_ONLINE", title: "Always online", kind: "bool" },
      { key: "READ_MESSAGES", title: "Auto read all messages", kind: "bool" },
      { key: "READ_COMMAND", title: "Auto read commands", kind: "bool" },
      { key: "CMD_REACTION", title: "Command reactions", kind: "bool", offValue: "" },
    ],
  },
  {
    name: "Status",
    items: [
      { key: "AUTO_READ_STATUS", title: "Auto view status", kind: "bool" },
      { key: "AUTO_LIKE_STATUS", title: "Auto like status", kind: "bool" },
    ],
  },
  {
    name: "Private chats",
    items: [
      { key: "DIS_PM", title: "Disable bot in PM", kind: "bool" },
      { key: "PMB_VAR", title: "PM auto blocker", kind: "bool" },
      { key: "PMB", title: "PM block message", kind: "text" },
      { key: "PM_ANTISPAM", title: "PM antispam block", kind: "bool" },
      { key: "ANTISPAM_COUNT", title: "Antispam limit", kind: "text", desc: "messages/seconds, e.g. 6/10" },
    ],
  },
  {
    name: "Calls",
    items: [
      { key: "REJECT_CALLS", title: "Auto reject calls", kind: "bool" },
      { key: "CALL_REJECT_MESSAGE", title: "Call reject message", kind: "text" },
    ],
  },
  {
    name: "Groups",
    items: [
      { key: "ADMIN_ACCESS", title: "Admin sudo", kind: "bool", desc: "group admins can use group commands" },
      {
        key: "ANTI_DELETE",
        title: "Anti delete",
        kind: "enum",
        options: [
          { value: "off", also: { ANTI_DELETE_JID: "" } },
          { value: "chat", also: { ANTI_DELETE_JID: "" } },
          { value: "sudo", also: { ANTI_DELETE_JID: "" } },
        ],
        desc: "custom target: use .antidelete <jid>",
      },
      { key: "WARN", title: "Warn limit", kind: "number" },
      { key: "AUTOMUTE_MSG", title: "Auto mute message", kind: "text" },
      { key: "AUTOUNMUTE_MSG", title: "Auto unmute message", kind: "text" },
    ],
  },
  {
    name: "Media",
    items: [
      { key: "STICKER_DATA", title: "Sticker pack", kind: "text" },
      { key: "AUDIO_DATA", title: "Audio metadata", kind: "text", desc: "title;artist;image url" },
    ],
  },
  {
    name: "System",
    items: [
      { key: "AUTO_UPDATE", title: "Auto update", kind: "bool" },
      { key: "DISABLE_START_MESSAGE", title: "Disable start message", kind: "bool" },
      { key: "CMD_TIMEOUT", title: "Command timeout (s)", kind: "number" },
      { key: "CMD_CONCURRENCY", title: "Command concurrency", kind: "number" },
      { key: "MAX_RECONNECT_ATTEMPTS", title: "Max reconnect attempts", kind: "number" },
    ],
  },
];

const byKey = new Map();
for (const cat of CATEGORIES) {
  for (const item of cat.items) {
    Object.freeze(item);
    byKey.set(item.key, { ...item, category: cat.name });
  }
}

const TRUE_WORDS = new Set(["true", "on", "1", "yes"]);
const isOn = (value) => value === true || TRUE_WORDS.has(String(value ?? "").trim().toLowerCase());

function settingsCatalog() {
  return CATEGORIES;
}

const byAlias = new Map();
for (const s of byKey.values()) for (const alias of s.aliases || []) byAlias.set(alias, s);

const settingFor = (key) => {
  const name = String(key || "").trim().toUpperCase();
  return byKey.get(name) || byAlias.get(name) || null;
};

const allSettings = () => [...byKey.values()];

// legacy shape for older plugins: bool keys only, typed bool in the schema
const legacySettingsMenu = () =>
  allSettings()
    .filter((s) => s.kind === "bool" && schema.typeOf(s.key) === "bool")
    .map((s) => ({ title: s.title, env_var: s.key }));

module.exports = { settingsCatalog, settingFor, allSettings, legacySettingsMenu, isOn };
