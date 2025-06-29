const { Module } = require('../main');
const { 
  extractVideoId, 
  getYoutubeTitle, 
  setClientInstance, 
  initializeYouTubeUtils, 
  createQualityPrompt, 
  handleQualitySelection,
  createAudioQualityPrompt,
  handleAudioQualitySelection,
  convertToNetscape,
  createSongSearchPrompt,
  handleSongSelection,
  downloadSong,
  downloadVideo
} = require('./utils/yt');
const { setVar } = require('./manage');
const fs = require('fs');
const path = require('path');
const botConfig = require('../config');
const isFromMe = botConfig.MODE === 'public' ? false : true;
initializeYouTubeUtils();
const cookiesPath = path.join(__dirname, '../cookies.txt');

// Helper function to extract the first URL from a string
function extractFirstUrl(text) {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[\w\-._~:/?#[\]@!$&'()*+,;=%]+)|(www\.[\w\-._~:/?#[\]@!$&'()*+,;=%]+)/i;
  const match = text.match(urlRegex);
  return match ? match[0] : null;
}

Module({
  pattern: 'ytv ?(.*)',
  fromMe: isFromMe,
  desc: 'YouTube video with quality selector',
  type: 'downloader'
}, async (message, match) => {
  let url = extractFirstUrl(match[1]?.trim());
  if (!url) {
    url = extractFirstUrl(message.reply_message?.text);
  }
  if (!url) {
    await message.sendReply('_Downloading video matching "' + (match[1]?.trim() || '') + '"_');
    try {
      return await message.sendReply(await downloadVideo(match[1]?.trim()), "video")
    } catch (e) {
      if (e.message.includes("403")) await message.sendReply("_Your server IP has no search access to YouTube._");
      return await message.sendReply("_No matching results found!_")
    }
  }
  setClientInstance(message.client);
  const videoIdOnly = extractVideoId(url);
  if (!videoIdOnly) {
    return await message.sendReply('❌ _Invalid YouTube URL or video ID not found._');
  }
  try {
    const title = await getYoutubeTitle(url);
    await createQualityPrompt(url, title, message.client, message.jid, message.data);
  } catch (error) {
    if (error.message.includes("cookie")) return await message.sendReply("_YouTube cookies not set, please read the tutorial on telegram chat (t.me/raganork_in)_");
    console.error('Error creating quality prompt:', error);
    return await message.sendReply(`❌ _${error.message}_`);
  }
});

Module({
  pattern: 'yta ?(.*)',
  fromMe: isFromMe,
  desc: 'YouTube audio with quality selector',
  type: 'downloader'
}, async (message, match) => {
  setClientInstance(message.client);
  let url = extractFirstUrl(match[1]?.trim());
  if (!url) {
    url = extractFirstUrl(message.reply_message?.text);
  }
  if (!url) {
    return await message.sendReply('❌ _Provide a valid YouTube URL!_\n\nExample: `.yta <url>`');
  }
  const videoIdOnly = extractVideoId(url);
  if (!videoIdOnly) {
    return await message.sendReply('❌ _Invalid YouTube URL or video ID not found._');
  }
  try {
    const title = await getYoutubeTitle(url);
    await createAudioQualityPrompt(url, title, message.client, message.jid, message.data);
  } catch (error) {
    if (error.message.includes("cookie")) return await message.sendReply("_YouTube cookies not set, please read the tutorial on telegram chat (t.me/raganork_in)_");
    console.error('Error creating audio quality prompt:', error);
    return await message.sendReply(`❌ _${error.message}_`);
  }
});

Module({
  pattern: 'song ?(.*)',
  fromMe: isFromMe,
  desc: 'Search and download songs from YouTube',
  type: 'downloader'
}, async (message, match) => {

  setClientInstance(message.client);

  const query = match[1]?.trim();

  if (!query) {
    return await message.sendReply('❌ _Provide a search query!_\n\nExample: `.song Timeless`');
  }

  try {

    await createSongSearchPrompt(query, message.client, message.jid, message.data);

  } catch (error) {
    console.error('Error creating song search prompt:', error);
    return await message.sendReply(`❌ _${error.message}_`);
  }
});

Module({
  pattern: 'play ?(.*)',
  fromMe: isFromMe,
  desc: 'Directly plays songs from YouTube',
  type: 'downloader'
}, async (message, match) => {

  setClientInstance(message.client);

  const query = match[1]?.trim();

  if (!query) {
    return await message.sendReply('❌ _Provide a search query!_\n\nExample: `.play Timeless`');
  }

  try {
    await message.sendReply(`_Playing song matching "${query}"_`);
    await message.client.sendMessage(message.jid, {audio: {stream: await downloadSong(query)}, mimetype: 'audio/mp4'}, { quoted: message.data });

  } catch (error) {
    console.error('Error creating song search prompt:', error);
    return await message.sendReply(`❌ _${error.message}_`);
  }
});

Module({
  pattern: 'setytcookies ?(.*)',
  fromMe: true,
  desc: 'Set YouTube cookies for video downloads',
  type: 'owner'
}, async (message, match) => {
  const cookies = message.reply_message?.text
  if (!cookies) {
    return await message.sendReply('_Please reply to a message containing the cookies!_');
  }
  try {
    const netscapeCookies = convertToNetscape(cookies);
    await setVar('YT_COOKIES', netscapeCookies);
    fs.writeFileSync(cookiesPath, netscapeCookies);
    return await message.sendReply('✅ _YouTube cookies have been set successfully!_');
  } catch (error) {
    console.error('Error setting YouTube cookies:', error);
    return await message.sendReply(`❌ _Failed to set YouTube cookies: ${error.message}_`);
  }
});

Module({
  on: 'text',
  fromMe: isFromMe
}, async (message) => {
try {
  setClientInstance(message.client);

  if (!message.reply_message || message.reply_message.data.key.remoteJid !== message.jid) {
    return;
  }

  const jid = message.jid;
  const text = message.message.trim();

  if (!/^(?:[1-9]|10)$/.test(text)) {
    return;
  }

  console.log(`Received selection: ${text} from ${jid}`);

  const repliedId = message.reply_message.id;

  let success = await handleSongSelection(jid, text, repliedId, message.client, message.quoted);

  if (!success && /^[1-8]$/.test(text)) {
    success = await handleQualitySelection(jid, text, repliedId, message.client, message.quoted);
  }

  if (!success && /^[1-4]$/.test(text)) {
    success = await handleAudioQualitySelection(jid, text, repliedId, message.client, message.quoted);
  }

  if (success) {
    console.log(`Successfully processed selection ${text} for ${jid}`);
  }
} catch(error){
    if (error.message.includes("cookie")) return await message.sendReply("_YouTube cookies not set, please read the tutorial on telegram chat (t.me/raganork_in)_");
}
});

Module({
  pattern: 'video ?(.*)',
  fromMe: isFromMe,
  desc: 'Directly downloads a YouTube video (auto quality)',
  type: 'downloader'
}, async (message, match) => {
  setClientInstance(message.client);
  let query = extractFirstUrl(match[1]?.trim());
  if (!query) {
    query = extractFirstUrl(message.reply_message?.text);
  }
  if (!query) {
    return await message.sendReply('❌ _Provide a YouTube URL or search query!_\n\nExample: `.video https://youtu.be/xyz` or `.video Timeless`');
  }
  if (/instagram\.com\//i.test(query)) {
    return await message.sendReply('❌ _Instagram links are not supported here. Use the `.insta` command instead!_');
  }
  try {
    await message.sendReply(`_Downloading video matching "${query}"_`);
    const videoStream = await downloadVideo(query);
    if (!videoStream) {
      return await message.sendReply('❌ _Failed to download video. No results or error occurred._');
    }
    await message.client.sendMessage(message.jid, {video: { stream: videoStream }}, { quoted: message.data})
  } catch (error) {
    if (error.message && error.message.includes('cookie')) {
      return await message.sendReply('_YouTube cookies not set, please read the tutorial on telegram chat (t.me/raganork_in)_');
    }
    console.error('Error in .video command:', error);
    return await message.sendReply(`❌ _${error.message || error}_`);
  }
});