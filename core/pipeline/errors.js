// classifies command errors: infra and connection are silent, rate-limit and bug only react
// (owners still see the text), user-facing errors are sent to the chat.
// infra is checked first so DB errors are never shown, and connection before bug so a
// "TypeError: fetch failed" from a reset socket isn't treated as a bug.
const CONNECTION_MESSAGE = /connect|Connect|Timed|locked/;
const CONNECTION_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ECONNABORTED",
  "ETIMEDOUT",
  "ENOTFOUND",
  "EAI_AGAIN",
  "EPIPE",
  "SQLITE_BUSY",
]);
// narrow on purpose: a bare "rate" would also match "generate"/"bitrate"
const RATE_LIMIT_MESSAGE = /rate-overlimit|rate limit|rate-limit|too many requests/i;
// hosted Postgres quota errors have no "connect" in the message, so match name/chain/text
const INFRA_NAME = /^Sequelize|^SqliteError$|^DatabaseError$|^PostgresError$/;
const INFRA_MESSAGE =
  /exceeded the quota|quota exceeded|too many (database )?connections|remaining connection slots|password authentication failed|database .* does not exist|SQLITE_(CORRUPT|IOERR|FULL|READONLY|CANTOPEN)/i;
const INFRA_CODES = new Set(["57P01", "57P03", "53300", "53200", "28P01", "28000", "3D000", "XX000"]);

function isInfra(error) {
  if (!error || typeof error !== "object") return false;
  for (let e = error, depth = 0; e && depth < 4; e = e.original || e.parent || e.cause, depth++) {
    if (INFRA_NAME.test(e.name || "") || INFRA_NAME.test(e.constructor?.name || "")) return true;
    if (INFRA_CODES.has(e.code)) return true;
    if (typeof e.message === "string" && INFRA_MESSAGE.test(e.message)) return true;
  }
  return false;
}

const INTERNAL_ERRORS = new Set(["TypeError", "ReferenceError", "SyntaxError", "RangeError"]);

const POLICY = Object.freeze({
  infra: { reply: false, react: false, log: "infra" },
  connection: { reply: false, react: false, log: "debug" },
  "rate-limit": { reply: false, react: true, log: "warn" },
  "user-facing": { reply: true, react: true, log: null },
  bug: { reply: false, react: true, log: "error" },
});

function classify(error) {
  if (isInfra(error)) return "infra";
  const message = typeof error?.message === "string" ? error.message : "";
  const code = error?.code ?? error?.cause?.code;
  if (CONNECTION_MESSAGE.test(message) || CONNECTION_CODES.has(code)) return "connection";
  const status = error?.output?.statusCode ?? error?.data ?? error?.status;
  if (status === 429 || RATE_LIMIT_MESSAGE.test(message)) return "rate-limit";
  if (!message.trim()) return "bug";
  if (INTERNAL_ERRORS.has(error.name) || INTERNAL_ERRORS.has(error.constructor?.name)) return "bug";
  return "user-facing";
}

module.exports = { classify, POLICY };
