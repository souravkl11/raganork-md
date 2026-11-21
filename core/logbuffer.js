// keeps the tail of stdout/stderr in memory, and reads pm2's log files, for the .log command
const fs = require("fs");

const MAX_BUFFER_BYTES = 512 * 1024;
const MAX_FILE_READ_BYTES = 2 * 1024 * 1024;

const buffers = { out: [], err: [] };
const sizes = { out: 0, err: 0 };
let installed = false;

const stripAnsi = (s) => s.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "");

function push(kind, chunk) {
  const text = typeof chunk === "string" ? chunk : Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk);
  if (!text) return;
  const stamped = `[${new Date().toISOString()}] ${text}`;
  buffers[kind].push(stamped);
  sizes[kind] += stamped.length;
  while (sizes[kind] > MAX_BUFFER_BYTES && buffers[kind].length > 1) {
    sizes[kind] -= buffers[kind].shift().length;
  }
}

function hook(stream, kind) {
  const original = stream.write.bind(stream);
  stream.write = (chunk, ...rest) => {
    try {
      push(kind, chunk);
    } catch {}
    return original(chunk, ...rest);
  };
}

function install() {
  if (installed) return;
  installed = true;
  hook(process.stdout, "out");
  hook(process.stderr, "err");
}

function lastLines(text, lines) {
  const all = stripAnsi(text).split("\n");
  if (all.length && all[all.length - 1] === "") all.pop();
  return all.slice(-lines).join("\n");
}

function readFileTail(filePath, lines) {
  let fd;
  try {
    const { size } = fs.statSync(filePath);
    const length = Math.min(size, MAX_FILE_READ_BYTES);
    const buf = Buffer.alloc(length);
    fd = fs.openSync(filePath, "r");
    fs.readSync(fd, buf, 0, length, size - length);
    let text = buf.toString("utf8");
    // drop the partial first line when we started mid-file
    if (length < size) text = text.slice(text.indexOf("\n") + 1);
    return lastLines(text, lines);
  } catch {
    return null;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

// pm2 files survive restarts, so they win over the in-memory tail
function getLogs(kind, lines = 300, env = process.env) {
  const filePath = kind === "err" ? env.pm_err_log_path : env.pm_out_log_path;
  if (filePath && fs.existsSync(filePath)) {
    const text = readFileTail(filePath, lines);
    if (text !== null) return { text, source: "pm2" };
  }
  return { text: lastLines(buffers[kind].join(""), lines), source: "memory" };
}

module.exports = { install, getLogs, _push: push };
