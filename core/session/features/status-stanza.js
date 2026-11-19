// an Android companion gets statuses as <status> stanzas, which Baileys ignores (so they go
// unacked and are resent). the payload is identical, so relay it to the <message> handler,
// which acks with class=status.
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
