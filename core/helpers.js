const path = require("path");
const fs = require("fs");
const os = require("os");
const { spawn } = require("child_process");

let TEMP_DIR;
if (process.env.TEMP_DIR) {
  TEMP_DIR = process.env.TEMP_DIR;
} else {
  TEMP_DIR = path.join(os.tmpdir(), "raganork");
}

function ensureTempDir() {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
  return TEMP_DIR;
}

function getTempPath(filename) {
  ensureTempDir();
  return path.join(TEMP_DIR, filename);
}

function getTempSubdir(subdir) {
  const subdirPath = path.join(TEMP_DIR, subdir);
  if (!fs.existsSync(subdirPath)) {
    fs.mkdirSync(subdirPath, { recursive: true });
  }
  return subdirPath;
}

async function loadBaileys() {
  try {
    const baileys = await import("baileys");
    return baileys;
  } catch (err) {
    try {
      const baileys = require("baileys");
      return baileys;
    } catch (requireErr) {
      throw new Error(
        `Failed to load baileys: ${err.message}. Fallback error: ${requireErr.message}`
      );
    }
  }
}

function suppressLibsignalLogs() {
  try {
    ["session_record.js", "session_builder.js", "session_cipher.js"].forEach(
      (file) => {
        const filePath = path.join(
          __dirname,
          "..",
          "node_modules",
          "libsignal",
          "src",
          file
        );
        if (fs.existsSync(filePath)) {
          let content = fs.readFileSync(filePath, "utf8");
          const modified = content.replace(/^(\s*console\..+;)$/gm, "// $1");
          if (content !== modified)
            fs.writeFileSync(filePath, modified, "utf8");
        }
      }
    );
  } catch {}
}

const jimp = require("jimp");

async function genThumb(url) {
  try {
    let size = 301;
    const img = await jimp.read(url);
    function getPossibleRatio(a, b) {
      for (var i = 0; size + 2 > size + 1; i++) {
        a = a > size || b > size ? a / 1.001 : a;
        b = a > size || b > size ? b / 1.001 : b;
        if (parseInt(a) < size && parseInt(b) < size)
          return { w: parseInt(a), h: parseInt(b) };
      }
    }
    var { w, h } = getPossibleRatio(img.bitmap.width, img.bitmap.height);
    return await img.resize(w, h).getBufferAsync("image/jpeg");
  } catch (error) {
    console.error("Error generating thumbnail:", error);
    return null;
  }
}

let activeKickBotTasks = [];
let isKickBotInitialized = false;

function detectHostnames() {
  const hostnames = [];
  if (process.env.KOYEB_PUBLIC_DOMAIN?.trim()) {
    hostnames.push(`https://${process.env.KOYEB_PUBLIC_DOMAIN.trim()}`);
  }
  if (process.env.RENDER_EXTERNAL_HOSTNAME?.trim()) {
    hostnames.push(`https://${process.env.RENDER_EXTERNAL_HOSTNAME.trim()}`);
  }
  if (process.env.RAILWAY_PUBLIC_DOMAIN?.trim()) {
    hostnames.push(`https://${process.env.RAILWAY_PUBLIC_DOMAIN.trim()}`);
  }
  return hostnames;
}

async function pingHostname(url) {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "Raganork-KickBot/1.0" },
    });
    if (response.ok) {
      return true;
    }
  } catch (e) {
  }
  return false;
}

async function initializeKickBot() {
  if (isKickBotInitialized) return;
  const hostnames = detectHostnames();
  if (hostnames.length === 0) return;

  isKickBotInitialized = true;
  console.log(`[Kick-Bot] Active for: ${hostnames[0]}`);

  await Promise.allSettled(hostnames.map(pingHostname));

  const intervalId = setInterval(
    () => Promise.allSettled(hostnames.map(pingHostname)),
    8 * 60 * 1000
  );

  activeKickBotTasks.push(intervalId);
}

function cleanupKickBot() {
  activeKickBotTasks.forEach(clearInterval);
  activeKickBotTasks = [];
  isKickBotInitialized = false;
}

function convertToOgg(inputBuffer) {
  return new Promise((resolve, reject) => {
    try {
      const ffmpeg = spawn("ffmpeg", [
        "-y",
        "-i",
        "pipe:0",
        "-c:a",
        "libopus",
        "-f",
        "ogg",
        "pipe:1",
      ]);

      const chunks = [];
      ffmpeg.stdout.on("data", (c) => chunks.push(c));
      ffmpeg.stderr.on("data", () => {});
      ffmpeg.on("error", (err) => reject(err));
      ffmpeg.on("close", (code) => {
        if (code === 0) resolve(Buffer.concat(chunks));
        else reject(new Error("ffmpeg exited with code " + code));
      });

      ffmpeg.stdin.write(inputBuffer);
      ffmpeg.stdin.end();
    } catch (err) {
      reject(err);
    }
  });
}

async function toBuffer(input) {
  const fs = require("fs");
  if (Buffer.isBuffer(input)) return input;
  if (input instanceof Uint8Array) return Buffer.from(input);
  if (input && input.url) {
    const url = input.url;
    if (typeof url === "string" && /^https?:\/\//i.test(url)) {
      return await require("../plugins/utils").getBuffer(url);
    }
    if (typeof url === "string" && fs.existsSync(url))
      return fs.readFileSync(url);
    if (Buffer.isBuffer(url)) return url;
  }
  if (typeof input === "string" && fs.existsSync(input))
    return fs.readFileSync(input);
  const d = input && (input.data || input.buffer);
  if (Buffer.isBuffer(d)) return d;
  if (Array.isArray(d)) return Buffer.from(d);
  if (d instanceof Uint8Array) return Buffer.from(d);

  return null;
}

module.exports = {
  loadBaileys,
  suppressLibsignalLogs,
  genThumb,
  convertToOgg,
  toBuffer,
  initializeKickBot,
  cleanupKickBot,
  TEMP_DIR,
  ensureTempDir,
  getTempPath,
  getTempSubdir,
};
