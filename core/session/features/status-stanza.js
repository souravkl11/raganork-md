const { loadBaileys, frameDebugOn } = require("../../helpers");

// an Android companion gets statuses as <status> stanzas, which Baileys ignores (so they go
// unacked and are resent). the payload is identical, so relay it to the <message> handler,
// which acks with class=status.
//   from=status@broadcast  a contact's status update
//   from=<group>@g.us      a status posted to that group (skmsg, decrypts like a group message)
const groupStatusIds = new Set();
const MAX_TRACKED = 500;

function rememberGroupStatus(jid, id) {
  groupStatusIds.add(`${jid}:${id}`);
  if (groupStatusIds.size > MAX_TRACKED) {
    groupStatusIds.delete(groupStatusIds.values().next().value);
  }
}

// the decrypted message may not carry a groupStatusMessage wrapper, so remember which
// ids came in as a group <status>
function isGroupStatusPost(jid, id) {
  return groupStatusIds.has(`${jid}:${id}`);
}

function bridgeStatusStanzas(sock) {
  const ws = sock?.ws;
  if (!ws?.on || !ws?.emit) return false;
  ws.on("CB:status", (node) => {
    const from = node?.attrs?.from;
    const isGroup = typeof from === "string" && from.endsWith("@g.us");
    if (from !== "status@broadcast" && !isGroup) return;
    // step aside once Baileys has a <status> handler of its own
    if (ws.listenerCount && ws.listenerCount("CB:status") > 1) return;
    if (isGroup && node.attrs.id) rememberGroupStatus(from, node.attrs.id);
    ws.emit("CB:message", node);
  });
  return true;
}

const isHosted = (jid) => jid?.endsWith("@hosted") || jid?.endsWith("@hosted.lid");

async function relayGroupStatusStanza(sock, jid, message, attrs = {}) {
  const { encodeWAMessage, encodeSignedDeviceIdentity, generateMessageIDV2 } = await loadBaileys();
  const creds = sock.authState.creds;
  const meId = creds.me.id;
  const meLid = creds.me.lid;

  const meta = await sock.groupMetadata(jid);
  const senderIdentity = (meta?.addressingMode || "lid") === "lid" && meLid ? meLid : meId;

  const { ciphertext, senderKeyDistributionMessage } = await sock.signalRepository.encryptGroupMessage({
    group: jid,
    data: encodeWAMessage(message),
    meId: senderIdentity,
  });

  // devices that never got our sender key could not decrypt the skmsg
  const memory = (await sock.authState.keys.get("sender-key-memory", [jid]))[jid] || {};
  const devices = await sock.getUSyncDevices(meta.participants.map((p) => p.id), true, false);
  const missing = devices
    .filter((d) => !memory[d.jid] && !isHosted(d.jid) && d.device !== 99)
    .map((d) => d.jid);

  const content = [];
  if (missing.length) {
    await sock.assertSessions(missing);
    const { nodes, shouldIncludeDeviceIdentity } = await sock.createParticipantNodes(missing, {
      senderKeyDistributionMessage: {
        axolotlSenderKeyDistributionMessage: senderKeyDistributionMessage,
        groupId: jid,
      },
    });
    content.push({ tag: "participants", attrs: {}, content: nodes });
    if (shouldIncludeDeviceIdentity) {
      content.push({
        tag: "device-identity",
        attrs: {},
        content: encodeSignedDeviceIdentity(creds.account, true),
      });
    }
  }
  content.push({ tag: "enc", attrs: { v: "2", type: "skmsg" }, content: ciphertext });

  const id = generateMessageIDV2(sock.user?.id);
  const node = { tag: "status", attrs: { id, to: jid, type: "text", ...attrs }, content };
  if (frameDebugOn()) console.log(`[frame out] ${describe(node)}`);
  await sock.sendNode(node);

  if (missing.length) {
    for (const deviceJid of missing) memory[deviceJid] = true;
    await sock.authState.keys.set({ "sender-key-memory": { [jid]: memory } });
  }
  return id;
}

const SKIP_TAGS = new Set(["receipt", "presence", "chatstate"]);

function describe(node, depth = 0) {
  if (!node || typeof node !== "object") return "";
  const attrs = Object.entries(node.attrs || {})
    .map(([k, v]) => `${k}=${v}`)
    .join(" ");
  let out = `<${node.tag}${attrs ? " " + attrs : ""}`;
  if (Array.isArray(node.content) && depth < 3) {
    const kids = node.content.map((c) => describe(c, depth + 1)).filter(Boolean);
    out += kids.length ? `>${kids.join("")}</${node.tag}>` : "/>";
  } else if (node.content) {
    out += `>[${node.content.length ?? 0}b]</${node.tag}>`;
  } else {
    out += "/>";
  }
  return out;
}

function isGroupFrame(node) {
  const { from, participant, recipient } = node.attrs || {};
  return [from, participant, recipient].some((j) => typeof j === "string" && j.endsWith("@g.us"));
}

function logGroupFrames(sock) {
  const ws = sock?.ws;
  if (!ws?.on) return false;
  ws.on("frame", (node) => {
    if (!frameDebugOn() || !node?.tag) return;
    const failedReceipt = node.tag === "receipt" && ["retry", "error"].includes(node.attrs?.type);
    if (SKIP_TAGS.has(node.tag) && !failedReceipt) return;
    if (node.tag !== "status" && !isGroupFrame(node)) return;
    try {
      console.log(`[frame] ${describe(node)}`);
    } catch {}
  });
  return true;
}

module.exports = {
  bridgeStatusStanzas,
  isGroupStatusPost,
  rememberGroupStatus,
  relayGroupStatusStanza,
  logGroupFrames,
  describe,
};
