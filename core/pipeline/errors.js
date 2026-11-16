// what to do with an error a command threw. four classes:
//
//   connection   the socket or network is down (a message with "connect", "Connect",
//                "Timed" or "locked", or a network error code). nothing is said to
//                the chat: the user retries when the link is back. no reaction.
//   rate-limit   WhatsApp or an API throttled us (rate-overlimit, status 429, "rate limit",
//                "too many requests"). nothing is said, the cross reaction is sent, a
//                warning is logged. matched narrowly: a bare "rate" would also hide
//                "generate" or "bitrate" texts that plugins show on purpose.
//   bug          an internal JavaScript error (TypeError, ReferenceError, SyntaxError,
//                RangeError), or a throw that is not an Error with a message. the text of
//                such an error means nothing to most users, so it is sent only when the
//                owner or a sudo ran the command (the dispatcher decides); everyone else gets
//                the cross reaction. the stack is always logged. rate-limit text follows the
//                same owner-only rule.
//   user-facing  everything else. plugins write `throw new Error("Reply to an image")`
//                for the user, so any other message is sent as italic text, then the cross.
//
// NOLOG=true silences all four (no reply, no reaction, no log), as it always has.
// the order matters: connection and rate-limit are checked first, so "TypeError: fetch
// failed" caused by a reset connection is a connection error and not a bug.

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
const RATE_LIMIT_MESSAGE = /rate-overlimit|rate limit|rate-limit|too many requests/i;
const INTERNAL_ERRORS = new Set(["TypeError", "ReferenceError", "SyntaxError", "RangeError"]);

const POLICY = Object.freeze({
  connection: { reply: false, react: false, log: "debug" },
  "rate-limit": { reply: false, react: true, log: "warn" },
  "user-facing": { reply: true, react: true, log: null },
  bug: { reply: false, react: true, log: "error" },
});

function classify(error) {
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
