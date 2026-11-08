// parsed SUDO / SUDO_MAP, re-parsed only when the config value changes
const config = require("../config");

let lastSudoMapValue;
let sudoMap = [];
let lastSudoValue;
let sudoList = [];

function getSudoMap() {
  const raw = config.SUDO_MAP;
  if (raw !== lastSudoMapValue) {
    lastSudoMapValue = raw;
    try {
      const parsed = raw ? JSON.parse(raw) : [];
      sudoMap = Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      sudoMap = [];
    }
  }
  return sudoMap;
}

function getSudoList() {
  const raw = config.SUDO;
  if (raw !== lastSudoValue) {
    lastSudoValue = raw;
    sudoList = raw ? raw.split(",").map((s) => s.trim()) : [];
  }
  return sudoList;
}

function isSudo(jid) {
  return Boolean(jid) && getSudoMap().includes(jid);
}

module.exports = { getSudoMap, getSudoList, isSudo };
