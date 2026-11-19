// per-chat FIFO with a global cap. timed-out jobs release their slot but keep running.
// jobs run in the session context they were queued from.
const context = require("../context");

function createQueue({ limit = () => 8, timeout = () => 300000, onTimeout } = {}) {
  const lanes = new Map();
  const waiting = [];
  let running = 0;

  function pump() {
    while (waiting.length && running < Math.max(1, limit())) start(waiting.shift());
  }

  function start(lane) {
    const entry = lane.jobs.shift();
    lane.active = true;
    running++;
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      clearTimeout(timer);
      lane.active = false;
      running--;
      if (lane.jobs.length) waiting.push(lane);
      else lanes.delete(lane.key);
      pump();
    };
    const timer = setTimeout(() => {
      try {
        onTimeout?.(entry.info);
      } finally {
        release();
      }
    }, timeout());
    timer.unref?.();

    const run = () => (entry.ctx ? context.run(entry.ctx, entry.job) : context.exit(entry.job));
    Promise.resolve()
      .then(run)
      .then(
        (value) => {
          release();
          entry.resolve(value);
        },
        (error) => {
          release();
          entry.reject(error);
        },
      );
  }

  return function push(key, job, info) {
    return new Promise((resolve, reject) => {
      let lane = lanes.get(key);
      if (!lane) {
        lane = { key, jobs: [], active: false };
        lanes.set(key, lane);
      }
      lane.jobs.push({ job, info, ctx: context.current(), resolve, reject });
      if (!lane.active && !waiting.includes(lane)) {
        waiting.push(lane);
        pump();
      }
    });
  };
}

module.exports = { createQueue };
