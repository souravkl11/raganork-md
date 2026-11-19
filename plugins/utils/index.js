const dbOperations = require("./db/functions");
const mediaProcessing = require("./mediaProcessors");
const utils = require("./misc");
const language = require("./manglish");

const {
  getWarn,
  setWarn,
  resetWarn,
  decrementWarn,
  getWarnCount,
  getAllWarns,
  antilinkConfig,
  antiStatusMention,
  antiword,
  antifake,
  antipromote,
  antidemote,
  antispam,
  antibot,
  pdm,
  welcome,
  goodbye,
  filter,
} = dbOperations;

const {
  addExif,
  bass,
  circle,
  blur,
  attp,
  sticker,
  rotate,
  avMix,
  webp2mp4,
  addID3,
  trim,
} = mediaProcessing;

const {
  parseUptime,
  isNumeric,
  isAdmin,
  mentionjid,
  getJson,
  bytesToSize,
  isFake,
  processOnwa,
  findMusic,
  downloadGram,
  pinterestDl,
  fb,
  igStalk,
  tiktok,
  story,
  gtts,
  getBuffer,
  lyrics,
  pinterestSearch,
} = utils;

const { malayalamToManglish, manglishToMalayalam } = language;

const aiTTS = require("./ai-tts");

const { gis } = require("./gis");

const { uploadToImgbb, uploadToCatbox } = require("./upload");

const linkDetector = require("./link-detector");

const fancy = require("./fancy");

const guards = require("./guards");

module.exports = {
  getWarn,
  setWarn,
  fancy,
  resetWarn,
  decrementWarn,
  getWarnCount,
  getAllWarns,
  antilinkConfig,
  antiStatusMention,
  antiword,
  antifake,
  antipromote,
  antidemote,
  antispam,
  antibot,
  pdm,
  welcome,
  goodbye,
  filter,

  addExif,
  bass,
  circle,
  blur,
  attp,
  sticker,
  rotate,
  avMix,
  webp2mp4,
  addID3,
  trim,

  parseUptime,
  isNumeric,
  isAdmin,
  mentionjid,
  getJson,
  bytesToSize,
  isFake,
  aiTTS,
  processOnwa,
  findMusic,
  downloadGram,
  pinterestDl,
  fb,
  igStalk,
  tiktok,
  story,
  gtts,
  getBuffer,
  pinterestSearch,

  malayalamToManglish,
  manglishToMalayalam,

  gis,

  uploadToImgbb,
  uploadToCatbox,

  linkDetector,
  lyrics,

  ...guards,
};
