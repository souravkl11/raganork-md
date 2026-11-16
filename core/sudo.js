// kept for plugins that require("../core/sudo"); the code lives in core/identity.js
const { getSudoMap, getSudoList, isSudo } = require("./identity");

module.exports = { getSudoMap, getSudoList, isSudo };
