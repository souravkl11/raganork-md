// String.prototype.format is part of the plugin contract; lang strings use it too
String.prototype.format = function () {
  let i = 0,
    args = arguments;
  return this.replace(/{}/g, function () {
    return typeof args[i] != "undefined" ? args[i++] : "";
  });
};
