const crypto = require("crypto");
const { loadBaileys } = require("../../helpers");

// newer WhatsApp clients send an edit as a secretEncryptedMessage (MESSAGE_EDIT) sealed with
// the original message's messageSecret, which baileys leaves undecoded. same key derivation as
// poll votes with the "Message Edit" label, and no additional data
const LABEL = "Message Edit";
const WRAPPERS = ["ephemeralMessage", "viewOnceMessage", "viewOnceMessageV2", "deviceSentMessage", "documentWithCaptionMessage"];

function unwrap(message) {
  let content = message;
  for (let i = 0; i < 4 && content; i++) {
    const key = WRAPPERS.find((k) => content[k]?.message);
    if (!key) break;
    content = content[key].message;
  }
  return content;
}

const withoutDevice = (jid) => (jid ? jid.replace(/:\d+@/, "@") : jid);

function secretOf(message) {
  const raw = message?.messageContextInfo?.messageSecret || unwrap(message)?.messageContextInfo?.messageSecret;
  if (!raw) return null;
  const buf = typeof raw === "string" ? Buffer.from(raw, "base64") : Buffer.from(raw);
  return buf.length ? buf : null;
}

function decryptEdit({ encPayload, encIv }, { origId, origSender, editor, secret }) {
  const info = Buffer.concat([
    Buffer.from(origId),
    Buffer.from(origSender),
    Buffer.from(editor),
    Buffer.from(LABEL),
    Buffer.from([1]),
  ]);
  const seed = crypto.createHmac("sha256", Buffer.alloc(32)).update(secret).digest();
  const key = crypto.createHmac("sha256", seed).update(info).digest();
  const payload = Buffer.from(encPayload);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(encIv));
  decipher.setAuthTag(payload.subarray(payload.length - 16));
  return Buffer.concat([decipher.update(payload.subarray(0, payload.length - 16)), decipher.final()]);
}

// the jids the author of the original may have used: only the author can edit, so the
// original's sender and the editor are the same account (its lid or its phone jid)
function authorCandidates(key, sock) {
  const raw = key.fromMe
    ? [sock?.user?.id, sock?.user?.lid]
    : [key.participant || key.remoteJid, key.participantAlt || key.remoteJidAlt];
  return [...new Set(raw.filter(Boolean).map(withoutDevice))];
}

// null when msg is not an encrypted edit. otherwise { edited }: the edited message as a
// fresh message object, or null when it could not be decrypted (the original is not cached,
// or the secret does not fit)
async function readEncryptedEdit(bot, msg) {
  const envelope = unwrap(msg?.message)?.secretEncryptedMessage;
  if (!envelope) return null;
  const { proto } = await loadBaileys();
  const type = envelope.secretEncType;
  const isEdit = type === "MESSAGE_EDIT" || type === proto.Message.SecretEncryptedMessage.SecretEncType.MESSAGE_EDIT;
  if (!isEdit) return null;

  const target = envelope.targetMessageKey;
  const original = target?.id && bot.messageCache.get(`${msg.key.remoteJid}_${target.id}`)?.message;
  const secret = original && secretOf(original);
  if (!secret || !envelope.encPayload || !envelope.encIv) return { edited: null, reason: "original not available" };

  for (const author of authorCandidates(msg.key, bot.sock)) {
    try {
      const plain = proto.Message.decode(
        decryptEdit(envelope, { origId: target.id, origSender: author, editor: author, secret }),
      );
      const edited = plain.protocolMessage?.editedMessage;
      if (!edited) return { edited: null, reason: "no edited content" };
      return {
        edited: {
          key: { ...msg.key, id: plain.protocolMessage.key?.id || target.id },
          message: edited,
          messageTimestamp: msg.messageTimestamp,
          pushName: msg.pushName,
        },
      };
    } catch (_) {
      // wrong identity form: the authentication tag rejects it, try the next one
    }
  }
  return { edited: null, reason: "could not decrypt" };
}

module.exports = { readEncryptedEdit, decryptEdit };
