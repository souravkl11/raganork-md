// the command queue: jobs for one chat run one at a time in arrival order, and a global
// cap limits how many chats run a job at once. a job that runs past the timeout is
// reported and stops holding its slots (it keeps running; nothing is killed), so a hung
// download cannot block its chat or fill the cap forever.
//
// the queue is shared by every session. a job runs in the session context it was queued
// from, not in the context of whichever job happened to finish before it.
const context = require("../context");

function createQueue({ limit = () => 8, timeout = () => 300000, onTimeout } = {}) {
  const lanes = new Map(); // key -> { key, jobs: [], active }
  const waiting = []; // lanes that have a job ready and wait for a global slot
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

  // queue `job` behind earlier jobs with the same key. the promise settles with the job
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
