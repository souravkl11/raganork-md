// queues the message for the batched message store
const { storeMessage } = require("../../store");

module.exports = async function store(env, next) {
  await storeMessage(env.msg);
  await next();
};
