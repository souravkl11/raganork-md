const path = require("path");
const fs = require("fs");

async function loadBaileys() {
  try {
    const baileys = await import("baileys");
    return baileys;
  } catch (err) {
    try {
      const baileys = require("baileys");
      return baileys;
    } catch (requireErr) {
      throw new Error(`Failed to load baileys: ${err.message}. Fallback error: ${requireErr.message}`);
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

module.exports = {
  loadBaileys,
  suppressLibsignalLogs,
};
