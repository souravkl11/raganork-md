const {LANGUAGE} = require('../../config');
const {existsSync,readFileSync} = require('fs');
const json = existsSync(__dirname+'/lang/' + LANGUAGE + '.json') ? JSON.parse(readFileSync(__dirname+'/lang/' + LANGUAGE + '.json')) : JSON.parse(readFileSync(__dirname+'/lang/english.json'));
function getString(file) { return json['STRINGS'][file]; }
module.exports = {language: json, getString: getString }