// normalize -> middleware chain (`async (env, next)`; skipping next() drops the message) -> dispatcher

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

async function handle(raw, sock) {
  const env = normalize(raw, sock);
  if (!env) return;
  await chain(env, dispatch);
}

module.exports = { compose, handle, middleware };
