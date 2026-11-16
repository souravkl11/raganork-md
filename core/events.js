// in-process event bus. writers emit, consumers subscribe instead of needing a restart.
//   config:changed    { key, value, sessionId }
//   schedule:changed  { kind, accountId }  (automute, autounmute or scheduled messages were written)
const { EventEmitter } = require("events");

const events = new EventEmitter();
events.setMaxListeners(50);

module.exports = events;
