// an Android companion (WA_BROWSER=android) gets status updates as <status> stanzas
// instead of the <message> stanzas a browser companion gets. Baileys only listens for
// <message>, so those statuses were dropped unread and unacked (WhatsApp then sends
// them again as offline). the stanza is otherwise the same: from=status@broadcast,
// participant, participant_pn, an <enc type="skmsg"> child. Baileys' message handler
// only reads the tag when it builds the ack (class = tag), so handing it the stanza
// unchanged decrypts it as a normal status and acks it with class=status.
function bridgeStatusStanzas(sock) {
  const ws = sock?.ws;
  if (!ws?.on || !ws?.emit) return false;
  ws.on("CB:status", (node) => {
    // only status updates, and only while Baileys has no <status> handler of its own
    if (node?.attrs?.from !== "status@broadcast") return;
    if (ws.listenerCount && ws.listenerCount("CB:status") > 1) return;
    ws.emit("CB:message", node);
  });
  return true;
}

module.exports = { bridgeStatusStanzas };
