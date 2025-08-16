const path = require("path");
const fs = require("fs");

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
  suppressLibsignalLogs,
};
