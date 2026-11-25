// command registry lives in core/plugins/registry.js. this file is kept because
// every plugin (including third-party ones) does require("../main").
const { Module, commands } = require("./core/plugins/registry");
const { UserError } = require("./core/pipeline/errors");

module.exports = {
  Module,
  commands,
  UserError,
};
