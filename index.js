const path = require("path");
const fs = require("fs");
if (fs.existsSync("./config.env")) {
  require("dotenv").config({ path: "./config.env" });
}

require("./core/logbuffer").install();

const { suppressLibsignalLogs } = require("./core/helpers");

suppressLibsignalLogs();

const { logger } = require("./config");
const { boot } = require("./core/app");

if (require.main === module) {
  boot().catch((error) => {
    console.error(`Fatal error in main execution: ${error.message}`, error);
    logger.fatal({ err: error }, `Fatal error in main execution`);
    process.exit(1);
  });
}
