const path = require("path");
const fs = require("fs");
const os = require("os");
const { Readable } = require("stream");
const ffmpeg = require("fluent-ffmpeg");

// process-wide ffmpeg guard: every save()/pipe() goes through run(), so patching it
// caps concurrent encodes and gives every job a kill timeout, whatever plugin started it
const FFMPEG_CONCURRENCY = Math.max(1, parseInt(process.env.FFMPEG_CONCURRENCY || "2", 10) || 2);
const FFMPEG_TIMEOUT_S = Math.max(30, parseInt(process.env.FFMPEG_TIMEOUT || "600", 10) || 600);
(function limitFfmpeg() {
  const proto = ffmpeg.prototype;
  if (proto.__rgnkLimited) return;
  proto.__rgnkLimited = true;
  const originalRun = proto.run;
  let active = 0;
  const waiting = [];

  const next = () => {
    while (active < FFMPEG_CONCURRENCY && waiting.length) {
      active++;
      waiting.shift()();
    }
  };

  proto.run = proto.exec = proto.execute = function (...args) {
    if (!this.options.timeout) this.options.timeout = FFMPEG_TIMEOUT_S;
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      active--;
      next();
    };
    this.once("end", release);
    this.once("error", release);

    let queued = false;
    const start = () => {
      try {
        originalRun.apply(this, args);
      } catch (err) {
        // started right away: throw to the caller like before. started later: report via event
        if (!queued) {
          release();
          throw err;
        }
        this.emit("error", err);
      }
    };
    waiting.push(start);
    next();
    if (waiting.includes(start)) queued = true;
    return this;
  };
})();

// temp file name that can't collide with a parallel job
function uniqueTempPath(name) {
  const ext = path.extname(name);
  const base = path.basename(name, ext);
  return getTempPath(
    `${base}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`,
  );
}

// promise wrapper for a fluent-ffmpeg command writing to a file
function runFfmpeg(command, output) {
  return new Promise((resolve, reject) => {
    command
      .on("end", () => resolve(output))
      .on("error", (err) => reject(err))
      .save(output);
  });
}

let TEMP_DIR;
if (process.env.TEMP_DIR) {
  TEMP_DIR = process.env.TEMP_DIR;
  os.tmpdir = () => path.join(__dirname, "..", TEMP_DIR);
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

// temp files get unique names now, so sweep old ones instead of relying on overwrites
let tempSweepTimer = null;
async function sweepTempDir(dir = TEMP_DIR, maxAgeMs = 30 * 60 * 1000) {
  let entries;
  try {
    entries = await fs.promises.readdir(dir, { withFileTypes: true });
  } catch (_) {
    return;
  }
  const cutoff = Date.now() - maxAgeMs;
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    try {
      if (entry.isDirectory()) {
        await sweepTempDir(full, maxAgeMs);
        const left = await fs.promises.readdir(full);
        if (left.length === 0) await fs.promises.rmdir(full);
      } else if ((await fs.promises.stat(full)).mtimeMs < cutoff) {
        await fs.promises.unlink(full);
      }
    } catch (_) {}
  }
}

function startTempSweeper() {
  if (tempSweepTimer) return;
  sweepTempDir();
  tempSweepTimer = setInterval(sweepTempDir, 15 * 60 * 1000);
  tempSweepTimer.unref?.();
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
    const img = await jimp.read(url);
    const { width, height } = img.bitmap;
    // fit inside 300x300, never upscale
    const scale = Math.min(1, 300 / Math.max(width, height));
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
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
  } catch (e) {}
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
    const inputStream = Readable.from(inputBuffer);
    const outputStream = ffmpeg(inputStream)
      .audioCodec("libopus")
      .format("ogg")
      .pipe();

    const chunks = [];
    outputStream.on("data", (chunk) => chunks.push(chunk));
    outputStream.on("end", () => resolve(Buffer.concat(chunks)));
    outputStream.on("error", reject);
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

// ============================================
// BUTTON/INTERACTIVE MESSAGE HELPERS
// ============================================

function buildInteractiveButtons(buttons = []) {
  return buttons.map((b, i) => {
    if (b && b.name && b.buttonParamsJson) return b;
    if (b && (b.id || b.text)) {
      return {
        name: "quick_reply",
        buttonParamsJson: JSON.stringify({
          display_text: b.text || b.displayText || "Button " + (i + 1),
          id: b.id || "quick_" + (i + 1),
        }),
      };
    }
    if (b && b.buttonId && b.buttonText?.displayText) {
      return {
        name: "quick_reply",
        buttonParamsJson: JSON.stringify({
          display_text: b.buttonText.displayText,
          id: b.buttonId,
        }),
      };
    }
    return b;
  });
}

function validateAuthoringButtons(buttons) {
  const errors = [];
  const warnings = [];
  if (buttons == null) {
    return { errors: [], warnings: [], valid: true, cleaned: [] };
  }
  if (!Array.isArray(buttons)) {
    errors.push("buttons must be an array");
    return { errors, warnings, valid: false, cleaned: [] };
  }
  const SOFT_BUTTON_CAP = 25;
  if (buttons.length === 0) {
    warnings.push("buttons array is empty");
  } else if (buttons.length > SOFT_BUTTON_CAP) {
    warnings.push(
      `buttons count (${buttons.length}) exceeds soft cap of ${SOFT_BUTTON_CAP}; may be rejected by client`
    );
  }

  const cleaned = buttons.map((b, idx) => {
    if (b == null || typeof b !== "object") {
      errors.push(`button[${idx}] is not an object`);
      return b;
    }
    if (b.name && b.buttonParamsJson) {
      if (typeof b.buttonParamsJson !== "string") {
        errors.push(`button[${idx}] buttonParamsJson must be string`);
      } else {
        try {
          JSON.parse(b.buttonParamsJson);
        } catch (e) {
          errors.push(
            `button[${idx}] buttonParamsJson is not valid JSON: ${e.message}`
          );
        }
      }
      return b;
    }
    if (b.id || b.text || b.displayText) {
      if (!(b.id || b.text || b.displayText)) {
        errors.push(
          `button[${idx}] legacy shape missing id or text/displayText`
        );
      }
      return b;
    }
    if (
      b.buttonId &&
      b.buttonText &&
      typeof b.buttonText === "object" &&
      b.buttonText.displayText
    ) {
      return b;
    }
    if (b.buttonParamsJson) {
      if (typeof b.buttonParamsJson !== "string") {
        warnings.push(
          `button[${idx}] has non-string buttonParamsJson; will attempt to stringify`
        );
        try {
          b.buttonParamsJson = JSON.stringify(b.buttonParamsJson);
        } catch {
          errors.push(
            `button[${idx}] buttonParamsJson could not be serialized`
          );
        }
      } else {
        try {
          JSON.parse(b.buttonParamsJson);
        } catch (e) {
          warnings.push(
            `button[${idx}] buttonParamsJson not valid JSON (${e.message})`
          );
        }
      }
      if (!b.name) {
        warnings.push(`button[${idx}] missing name; defaulting to quick_reply`);
        b.name = "quick_reply";
      }
      return b;
    }
    warnings.push(`button[${idx}] unrecognized shape; passing through unchanged`);
    return b;
  });

  return { errors, warnings, valid: errors.length === 0, cleaned };
}

function validateInteractiveMessageContent(content) {
  const errors = [];
  const warnings = [];
  if (!content || typeof content !== "object") {
    return { errors: ["content must be an object"], warnings, valid: false };
  }
  const interactive = content.interactiveMessage;
  if (!interactive) {
    return { errors, warnings, valid: true };
  }
  const nativeFlow = interactive.nativeFlowMessage;
  if (!nativeFlow) {
    errors.push("interactiveMessage.nativeFlowMessage missing");
    return { errors, warnings, valid: false };
  }
  if (!Array.isArray(nativeFlow.buttons)) {
    errors.push("nativeFlowMessage.buttons must be an array");
    return { errors, warnings, valid: false };
  }
  if (nativeFlow.buttons.length === 0) {
    warnings.push("nativeFlowMessage.buttons is empty");
  }
  nativeFlow.buttons.forEach((btn, i) => {
    if (!btn || typeof btn !== "object") {
      errors.push(`buttons[${i}] is not an object`);
      return;
    }
    if (!btn.buttonParamsJson) {
      warnings.push(`buttons[${i}] missing buttonParamsJson (may fail to render)`);
    } else if (typeof btn.buttonParamsJson !== "string") {
      errors.push(`buttons[${i}] buttonParamsJson must be string`);
    } else {
      try {
        JSON.parse(btn.buttonParamsJson);
      } catch (e) {
        warnings.push(
          `buttons[${i}] buttonParamsJson invalid JSON (${e.message})`
        );
      }
    }
    if (!btn.name) {
      warnings.push(`buttons[${i}] missing name; defaulting to quick_reply`);
      btn.name = "quick_reply";
    }
  });
  return { errors, warnings, valid: errors.length === 0 };
}

function getButtonType(message) {
  if (message.listMessage) {
    return "list";
  } else if (message.buttonsMessage) {
    return "buttons";
  } else if (message.interactiveMessage?.nativeFlowMessage) {
    return "native_flow";
  }
  return null;
}

function getButtonArgs(message) {
  const nativeFlow = message.interactiveMessage?.nativeFlowMessage;

  if (nativeFlow || message.buttonsMessage) {
    return {
      tag: "biz",
      attrs: {},
      content: [
        {
          tag: "interactive",
          attrs: {
            type: "native_flow",
            v: "1",
          },
          content: [
            {
              tag: "native_flow",
              attrs: {
                v: "9",
                name: "mixed",
              },
            },
          ],
        },
      ],
    };
  } else if (message.listMessage) {
    return {
      tag: "biz",
      attrs: {},
      content: [
        {
          tag: "list",
          attrs: {
            v: "2",
            type: "product_list",
          },
        },
      ],
    };
  } else {
    return {
      tag: "biz",
      attrs: {},
    };
  }
}

module.exports = {
  loadBaileys,
  suppressLibsignalLogs,
  genThumb,
  convertToOgg,
  toBuffer,
  initializeKickBot,
  cleanupKickBot,
  buildInteractiveButtons,
  validateAuthoringButtons,
  validateInteractiveMessageContent,
  getButtonType,
  getButtonArgs,
  TEMP_DIR,
  ensureTempDir,
  getTempPath,
  getTempSubdir,
  uniqueTempPath,
  runFfmpeg,
  startTempSweeper,
};
