// the message pipeline: normalize a raw upsert, run it through the middleware chain,
// then hand it to the dispatcher. a middleware is `async (env, next)`; not calling
// next() ends the message. errors thrown by a middleware reject handle(), as they
// rejected the old handler.

// koa-style composition of `async (env, next)` functions; `last` runs after the final one
function compose(stack) {
  return (env, last) => {
    let called = -1;
    const run = (i) => {
      if (i <= called) return Promise.reject(new Error("next() called more than once"));
      called = i;
      const fn = i === stack.length ? last : stack[i];
      if (!fn) return Promise.resolve();
      try {
        return Promise.resolve(fn(env, () => run(i + 1)));
      } catch (error) {
        return Promise.reject(error);
      }
    };
    return run(0);
  };
}

const { normalize } = require("./normalize");
const { dispatch } = require("./dispatcher");

// the chain, in the order a message goes through it. to add a stage, write
// `async (env, next)` in ./middleware and put it here
const middleware = [
  require("./middleware/receipts"),
  require("./middleware/blocklist"),
  require("./middleware/store"),
  require("./middleware/antibot"),
  require("./middleware/antispam"),
  require("./middleware/pm-guard"),
  require("./middleware/text"),
  require("./middleware/sticker-cmd"),
  require("./middleware/debug-log"),
  require("./middleware/filters"),
];
const chain = compose(middleware);

// one messages.upsert batch: resolves when the middleware are done and the commands are
// started (not finished: see dispatcher)
async function handle(raw, sock) {
  const env = normalize(raw, sock);
  if (!env) return;
  await chain(env, dispatch);
}

module.exports = { compose, handle, middleware };
