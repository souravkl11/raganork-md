const fs = require("fs");
const config = require("../../config");
const { getTempPath, getTempSubdir } = require("../../core/helpers");
const googleTTS = require("google-tts-api");
const priv = require("../../core/private");
const apiCall = priv.apiCall;

// Parse uptime to human readable format
function parseUptime(seconds) {
  function pad(s) {
    return (s < 10 ? "0" : "") + s;
  }

  const hours = Math.floor(seconds / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);
  const secs = Math.floor(seconds % 60);

  return `${pad(hours)} hours ${pad(minutes)} minutes ${pad(secs)} seconds`;
}

// Check if value is numeric
function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

async function isAdmin(message, user = null) {
  if (!user) {
    user = message.client.user?.lid?.split(":")[0] + "@lid";
  }

  const metadata = await message.client.groupMetadata(message.jid);
  const admins = metadata.participants
    .filter((v) => v.admin !== null)
    .map((x) => x.id);
  const me = user.split("@")[0];
  return admins.filter((s) => s.includes(me)).length > 0;
}

// Create mention from JID
function mentionjid(jid) {
  return "@" + jid.split("@")[0].split(":")[0] + " ";
}

// Fetch JSON from URL
async function getJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return await response.json();
}

// Convert bytes to human readable size
function bytesToSize(bytes) {
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  if (bytes == 0) return "0 Byte";
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  return Math.round(bytes / Math.pow(1024, i), 2) + " " + sizes[i];
}

// Check if participant is fake
function isFake(participant, allowed) {
  return !allowed.some((prefix) => participant.startsWith(prefix));
}
// Process WhatsApp number lookup
async function processOnwa(message, match) {
  try {
    const readMore = String.fromCharCode(8206).repeat(4001);

    const createPossibleNumbersArray = (match) => {
      let ph = match.replace(/\+/g, "");
      const total = ph.length;
      const xn = ph.split("").filter((x) => x === "x").length;
      let lst = 0;

      if (xn === 1) lst = 10;
      if (xn === 2) lst = 100;
      if (xn === 3) lst = 1000;
      if (xn > 3) throw new Error("Too many wildcards");

      const possibleNumbers = [];
      for (let i = 0; i < lst; i++) {
        let rs = "";
        if ((ph.replace(/x/g, "") + i).length === total - 2)
          rs = ph.replace("x", "00" + i);
        if ((ph.replace(/x/g, "") + i).length === total - 1)
          rs = ph.replace("x", "0" + i);
        if ((ph.replace(/x/g, "") + i).length === total)
          rs = ph.replace("x", i);
        rs = rs.replace(/x/g, "");
        possibleNumbers.push(rs);
      }
      return possibleNumbers;
    };

    const getOnwaResult = async (message, match) => {
      const possibleNumbers = createPossibleNumbersArray(match);
      if (!possibleNumbers.length) return "_No possible numbers!_";

      const result = { datewise: {}, notonwa: [] };
      const numbersOnWa = (
        await message.client.onWhatsApp(...possibleNumbers)
      ).map((x) => x.jid);
      const numbersNotOnWa = possibleNumbers
        .filter((x) => !numbersOnWa.some((jid) => jid.startsWith(x)))
        .map((e) => "+" + e);

      for (const jid of numbersOnWa) {
        try {
          const { status, setAt } = await message.client.fetchStatus(jid);
          if (status) {
            const date = setAt.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            });

            const year = date.split(",")[2]?.trim() || "No date";
            if (!result.datewise[year]) result.datewise[year] = [];

            result.datewise[year].push({
              status,
              date,
              number: "+" + jid.split("@")[0],
            });
          }
        } catch (error) {
          console.error("Error fetching status:", error);
        }
      }

      result.notonwa = numbersNotOnWa;
      result.onwa = numbersOnWa.map((x) => "+" + x.split("@")[0]);
      return result;
    };

    const result = await getOnwaResult(message, match);
    const notonmsg = `_*❌=== Not registered on WA ===❌:*_\n${readMore}\n${result.notonwa.join(
      "\n",
    )}`;

    let msg = "";
    for (const i in result.datewise) {
      msg +=
        `*⭕=== ${i} ===⭕*\n` +
        result.datewise[i]
          .map(
            (e) =>
              `_Number: ${e.number}_\n_Bio: ${e.status}_\n_Date: ${e.date}_`,
          )
          .join("\n\n") +
        "\n\n";
    }

    const datewisemsg = `*_=== Date wise result ===_*\n${readMore}\n${msg}`;
    const totalnumbersonwa = `_*=== Total registered numbers ===*_\n${readMore}\n${result.onwa.join(
      "\n",
    )}`;

    await message.sendReply(datewisemsg);
    await message.sendReply(notonmsg);
    await message.sendReply(totalnumbersonwa);
  } catch (e) {
    await message.sendReply(e.message);
  }
}

// thin wrappers so existing plugin imports keep working
const findMusic = (file) => priv.identifyMusic(file);
const downloadGram = (url) => priv.instagram(url);
const pinterestDl = (url) => priv.pinterestDl(url);
const pinterestSearch = (query, limit) => priv.pinterestSearch(query, limit);
const lyrics = (query) => priv.lyrics(query);
const fb = (url) => priv.facebook(url);
const igStalk = (username) => priv.igStalk(username);
const tiktok = (url) => priv.tiktok(url);
const spotifyTrack = (url) => priv.spotifyTrack(url);
const story = (user) => priv.instagramStory(user);

async function getBuffer(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

// Google TTS
async function gtts(text, lang) {
  const results = googleTTS
    .getAllAudioUrls(text, {
      lang: lang.toLowerCase(),
      slow: false,
      host: "https://translate.google.com",
      splitPunct: "\n",
    })
    .map((e) => e.url);

  if (results.length === 1) return await getBuffer(results[0]);

  // unique dir per call so parallel requests don't clobber each other
  const jobDir = getTempSubdir(
    `tts/${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  );
  const parts = [];
  for (let i = 0; i < results.length; i++) {
    const part = `${jobDir}/${i}.mp3`;
    fs.writeFileSync(part, await getBuffer(results[i]));
    parts.push(part);
  }
  const out = `${jobDir}/result.mp3`;
  const inputs = parts.flatMap((p) => ["-i", p]);
  const labels = parts.map((_, i) => `[${i}:a]`).join("");

  try {
    await new Promise((resolve, reject) => {
      require("child_process").execFile(
        "ffmpeg",
        [
          "-y",
          ...inputs,
          "-filter_complex",
          `${labels}concat=n=${parts.length}:v=0:a=1`,
          out,
        ],
        { timeout: 120000 },
        (err) => (err ? reject(err) : resolve()),
      );
    });
    return fs.readFileSync(out);
  } finally {
    fs.rm(jobDir, { recursive: true, force: true }, () => {});
  }
}

module.exports = {
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
  pinterestSearch,
  fb,
  igStalk,
  tiktok,
  story,
  gtts,
  getBuffer,
  lyrics,
  apiCall,
  spotifyTrack,
};
