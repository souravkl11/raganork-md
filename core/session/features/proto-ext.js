// fields baileys' WAProto lacks; numbers and names from baileys' proto-extract run against
// web 2.3000.1056029132. new message types are flattened onto the key baileys already
// understands (stickerMessage/imageMessage/videoMessage) so download/send keep working,
// and re-wrapped on encode.
const { Reader } = require("protobufjs/minimal");

let installed = false;

function decodeTracked(original, r, l, e) {
  if (r && typeof r.pos === "number" && r.buf) {
    const start = r.pos;
    const msg = original(r, l, e);
    return [msg, r.buf.subarray(start, r.pos)];
  }
  return [original(r, l, e), r];
}

function eachField(bytes, wanted, onField) {
  if (!bytes?.length) return;
  const reader = Reader.create(bytes);
  try {
    while (reader.pos < reader.len) {
      const tag = reader.uint32();
      const no = tag >>> 3;
      const wireType = tag & 7;
      if (!wanted.has(no)) reader.skipType(wireType);
      else if (wireType === 2) onField(no, reader.bytes());
      else if (wireType === 0) onField(no, reader.int32());
      else reader.skipType(wireType);
    }
  } catch {}
}

function cloneWithout(m, keys) {
  const copy = Object.assign(Object.create(Object.getPrototypeOf(m)), m);
  for (const key of keys) delete copy[key];
  return copy;
}

function moveToEnd(obj, key) {
  if (!Object.prototype.hasOwnProperty.call(obj, key)) return;
  const value = obj[key];
  delete obj[key];
  obj[key] = value;
}

// kind: "string" | "int32" | a generated message type
function extendType(Type, fields, flags = []) {
  const byNo = new Map(fields.map((f) => [f.no, f]));
  const wanted = new Set(byNo.keys());

  const decode = Type.decode;
  Type.decode = function (r, l, e) {
    const [m, bytes] = decodeTracked(decode, r, l, e);
    eachField(bytes, wanted, (no, value) => {
      const f = byNo.get(no);
      if (f.kind === "string") m[f.name] = Buffer.from(value).toString("utf8");
      else if (f.kind === "int32") m[f.name] = value;
      else m[f.name] = f.kind.decode(value);
    });
    return m;
  };

  const encode = Type.encode;
  Type.encode = function (m, w) {
    w = encode(m, w);
    for (const f of fields) {
      const v = m[f.name];
      if (v == null) continue;
      if (f.kind === "string") w.uint32((f.no << 3) | 2).string(v);
      else if (f.kind === "int32") w.uint32(f.no << 3).int32(v);
      else f.kind.encode(v, w.uint32((f.no << 3) | 2).fork()).ldelim();
    }
    return w;
  };

  const names = [...fields.map((f) => f.name), ...flags];
  const toObject = Type.toObject;
  Type.toObject = function (m, o) {
    const obj = toObject(m, o);
    for (const f of fields) {
      const v = m?.[f.name];
      if (v != null) obj[f.name] = typeof f.kind === "string" ? v : f.kind.toObject(v, o);
    }
    for (const flag of flags) if (m?.[flag]) obj[flag] = true;
    return obj;
  };

  const fromObject = Type.fromObject;
  Type.fromObject = function (d) {
    const m = fromObject(d);
    if (m === d || !d) return m;
    for (const f of fields) {
      const v = d[f.name];
      if (v != null) m[f.name] = typeof f.kind === "string" ? v : f.kind.fromObject(v);
    }
    for (const flag of flags) if (d[flag]) m[flag] = true;
    return m;
  };

  return names;
}

function install(proto) {
  if (installed || !proto?.Message?.FutureProofMessage) return;
  installed = true;
  const { Message, ContextInfo } = proto;
  const { StickerMessage, AudioMessage, ImageMessage, VideoMessage, FutureProofMessage } = Message;

  extendType(StickerMessage, [
    { no: 24, name: "premium", kind: "int32" },
    { no: 25, name: "emojis", kind: "string" },
    { no: 26, name: "audioMessage", kind: AudioMessage },
  ]);
  extendType(ImageMessage, [], ["instant"]);
  extendType(VideoMessage, [], ["instant"]);

  const wrappers = [
    { no: 134, name: "audioStickerMessage", key: "stickerMessage", futureProof: true, when: (v) => v.audioMessage },
    { no: 135, name: "instantImageMessage", key: "imageMessage", type: ImageMessage, when: (v) => v.instant },
    { no: 140, name: "instantVideoMessage", key: "videoMessage", type: VideoMessage, when: (v) => v.instant },
  ];
  const wrapperByNo = new Map(wrappers.map((w) => [w.no, w]));
  const SPOILER = 118;
  const OUTER_KEYS = ["messageContextInfo", "senderKeyDistributionMessage"];
  const wanted = new Set([...wrapperByNo.keys(), SPOILER]);

  const messageDecode = Message.decode;
  Message.decode = function (r, l, e) {
    const [msg, bytes] = decodeTracked(messageDecode, r, l, e);
    let found = false;
    eachField(bytes, wanted, (no, value) => {
      found = true;
      if (no === SPOILER) {
        const inner = FutureProofMessage.decode(value).message;
        for (const key of Object.keys(inner || {})) if (msg[key] == null) msg[key] = inner[key];
        msg.spoiler = true;
        return;
      }
      const wrapper = wrapperByNo.get(no);
      if (wrapper.futureProof) {
        const inner = FutureProofMessage.decode(value).message;
        for (const key of Object.keys(inner || {})) if (msg[key] == null) msg[key] = inner[key];
      } else if (msg[wrapper.key] == null) {
        msg[wrapper.key] = wrapper.type.decode(value);
        msg[wrapper.key].instant = true;
      }
    });
    if (found) for (const key of OUTER_KEYS) moveToEnd(msg, key);
    return msg;
  };

  const messageEncode = Message.encode;
  Message.encode = function (m, w) {
    if (m?.spoiler) {
      const outer = {};
      for (const key of OUTER_KEYS) if (m[key] != null) outer[key] = m[key];
      w = messageEncode(outer, w);
      w.uint32((SPOILER << 3) | 2).fork();
      Message.encode(cloneWithout(m, ["spoiler", ...OUTER_KEYS]), w.uint32(10).fork()).ldelim();
      return w.ldelim();
    }
    const active = m ? wrappers.filter((x) => m[x.key] && x.when(m[x.key])) : [];
    if (!active.length) return messageEncode(m, w);
    w = messageEncode(cloneWithout(m, active.map((x) => x.key)), w);
    for (const x of active) {
      w.uint32((x.no << 3) | 2).fork();
      if (x.futureProof) {
        w.uint32((1 << 3) | 2).fork();
        messageEncode({ [x.key]: m[x.key] }, w).ldelim();
      } else {
        x.type.encode(m[x.key], w);
      }
      w.ldelim();
    }
    return w;
  };

  const messageToObject = Message.toObject;
  Message.toObject = function (m, o) {
    const obj = messageToObject(m, o);
    if (m?.spoiler) obj.spoiler = true;
    return obj;
  };

  const messageFromObject = Message.fromObject;
  Message.fromObject = function (d) {
    const m = messageFromObject(d);
    if (m === d || !d) return m;
    if (d.spoiler) m.spoiler = true;
    return m;
  };

  const contextEncode = ContextInfo.encode;
  ContextInfo.encode = function (m, w) {
    const quoted = m?.quotedMessage;
    const active = quoted ? wrappers.filter((x) => quoted[x.key] && x.when(quoted[x.key])) : [];
    if (!active.length) return contextEncode(m, w);
    const plainQuoted = { ...quoted };
    for (const x of active) {
      const strip = x.key === "stickerMessage" ? ["emojis", "audioMessage"] : ["instant"];
      plainQuoted[x.key] = cloneWithout(quoted[x.key], strip);
    }
    return contextEncode({ ...m, quotedMessage: plainQuoted }, w);
  };
}

module.exports = { install };
