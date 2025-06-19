// Import all modules
const dbOperations = require('./db/functions');
const mediaProcessing = require('./mediaProcessors');
const utils = require('./misc');
const language = require('./manglish');

// Grouped database operations
const {
    getWarn, setWarn, resetWarn,
    antilink, antiword, antifake,
    antipromote, antidemote, antispam,
    antibot, pdm, welcome, goodbye
} = dbOperations;

// Media processing functions
const {
    addExif, bass, circle, blur, attp,
    aadhar, sticker, rotate, avMix, webp2mp4
} = mediaProcessing;

// Utility functions
const {
    parseUptime, isNumeric, isAdmin,
    mentionjid, getJson, bytesToSize,
    isFake, 
    processOnwa, findMusic, searchYT,
    downloadGram, pin, fb, igStalk,
    tiktok, story, getThumb, gtts, getBuffer
} = utils;

// Language functions
const { malayalamToManglish, manglishToMalayalam } = language;

const {gis, pinSearch} = require('./gis');

const uploadImage = require('./imgbb');

module.exports = {
    // Database Operations
    getWarn, setWarn, resetWarn,
    antilink, antiword, antifake,
    antipromote, antidemote, antispam,
    antibot, pdm, welcome, goodbye,
    
    // Media Processing
    addExif, bass, circle, blur, attp,
    aadhar, sticker, rotate, avMix, webp2mp4,
    
    // Utilities
    parseUptime, isNumeric, isAdmin,
    mentionjid, getJson, bytesToSize,
    isFake,
    processOnwa, findMusic, searchYT,
    downloadGram, pin, fb, igStalk,
    tiktok, story, getThumb, gtts, getBuffer,
    
    // Language
    malayalamToManglish, manglishToMalayalam,

    // GIS
    gis, pinSearch,

    // Image Upload
    uploadImage
};