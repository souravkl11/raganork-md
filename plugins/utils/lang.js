const { LANGUAGE } = require('../../config');
const { existsSync, readFileSync } = require('fs');
const path = require('path');
require('../../core/string-format');
const load = (name) => JSON.parse(readFileSync(path.join(__dirname, 'lang', name + '.json')));
const english = load('english');
const wanted = /^[a-z_-]+$/i.test(LANGUAGE || '') && existsSync(path.join(__dirname, 'lang', LANGUAGE + '.json')) ? load(LANGUAGE) : english;
// missing keys fall back to english so a partial translation never prints undefined
const json = { ...wanted, STRINGS: {} };
for (const section of new Set([...Object.keys(english.STRINGS), ...Object.keys(wanted.STRINGS || {})]))
  json.STRINGS[section] = { ...english.STRINGS[section], ...(wanted.STRINGS || {})[section] };
function getString(file) { return json['STRINGS'][file]; }
module.exports = { language: json, getString: getString }
