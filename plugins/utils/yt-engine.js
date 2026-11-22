// youtube info and downloads over SABR. notes: yt-workstation/README.md
const fs = require("fs");
const path = require("path");
const { Readable } = require("stream");
const { pipeline } = require("stream/promises");
const config = require("../../config");
const { getTempSubdir } = require("../../core/helpers");
const auth = require("./yt-auth");

const tempDir = () => getTempSubdir("yt");
const BOTGUARD_REQUEST_KEY = "O43z0dpjhgX20SCx4KAo";
const ANON_CLIENTS = ["WEB", "MWEB", "YTMUSIC"];
const DEVICE_FIELDS = ["deviceMake", "deviceModel", "osName", "osVersion"];
const VIDEO_QUALITIES = ["2160p", "1440p", "1080p", "720p", "480p", "360p", "240p", "144p"];
const AUDIO_QUALITIES = ["AUDIO_QUALITY_HIGH", "AUDIO_QUALITY_MEDIUM", "AUDIO_QUALITY_LOW"];
const ANON_BLOCK_MS = 30 * 60 * 1000;
const IP_BLOCK_MS = 10 * 60 * 1000;
const INNERTUBE_TTL_MS = 30 * 60 * 1000;
const INFO_TTL_MS = 2 * 60 * 1000;
const PROFILES_URL = "https://gist.githubusercontent.com/souravkl11/d0d80aa9595de66be90ded00492e5e56/raw/tv-profiles.json";
const PROFILE_FIELDS = {
  name: /^[\w.-]{1,40}$/,
  clientVersion: /^\d{1,2}(\.\d{1,10}){1,3}$/,
  userAgent: /^[\x20-\x7e]{1,300}$/,
  deviceMake: /^[\x20-\x7e]{1,60}$/,
  deviceModel: /^[\x20-\x7e]{1,60}$/,
  osName: /^[\x20-\x7e]{1,60}$/,
  osVersion: /^[\x20-\x7e]{1,60}$/,
};
const BUILTIN_PROFILES = [
  {
    name: "tv_samsung",
    clientVersion: "7.20260707.07.00",
    userAgent:
      "Mozilla/5.0 (SMART-TV; Linux; Tizen 2.4.0) AppleWebKit/538.1 (KHTML, like Gecko) Version/2.4.0 TV Safari/538.1",
    deviceMake: "Samsung",
    deviceModel: "UKS9800",
    osName: "Tizen",
    osVersion: "2.4.0",
  },
];

let libsPromise = null;
function libs() {
  return (libsPromise ??= (async () => {
    const [yt, sabr, gvUtils, botguard, webpo, bgUtils] = await Promise.all([
      import("youtubei.js"),
      import("googlevideo/sabr-stream"),
      import("googlevideo/utils"),
      import("bgutils-js/botguard"),
      import("bgutils-js/webpo"),
      import("bgutils-js/utils"),
    ]);
    yt.Parser.setParserErrorHandler((e) => {
      if (config.DEBUG) console.warn(`[youtubei.js] parser: ${e.error_type} ${e.classname}`);
    });
    yt.Platform.load({
      ...yt.Platform.shim,
      eval: (data) => new Function(typeof data === "string" ? data : data.output)(),
    });
    return { yt, SabrStream: sabr.SabrStream, gvUtils, botguard, webpo, bgUtils };
  })().catch((err) => {
    libsPromise = null;
    throw err;
  }));
}

let dom = null;
let botguardQueue = Promise.resolve();
function withDom(task) {
  const run = async () => {
    if (!dom) {
      const { JSDOM } = require("jsdom");
      dom = new JSDOM("<!DOCTYPE html><html><body></body></html>").window;
    }
    const saved = { window: globalThis.window, document: globalThis.document };
    globalThis.window = dom;
    globalThis.document = dom.document;
    try {
      return await task();
    } finally {
      for (const key of ["window", "document"]) {
        if (saved[key] === undefined) delete globalThis[key];
        else globalThis[key] = saved[key];
      }
    }
  };
  const result = botguardQueue.then(run, run);
  botguardQueue = result.catch(() => {});
  return result;
}

async function createMinter() {
  const { botguard, webpo, bgUtils } = await libs();
  const challenge = await botguard.getChallenge({
    requestKey: BOTGUARD_REQUEST_KEY,
    fetchFunction: (url, init) => fetch(url, init),
  });
  const script = challenge?.interpreterJavascript?.privateDoNotAccessOrElseSafeScriptWrappedValue;
  if (!script) throw new Error("BotGuard challenge has no interpreter script");

  const webPoSignalOutput = [];
  const snapshot = await withDom(async () => {
    new Function(script)();
    const client = await botguard.BotGuardClient.create({
      program: challenge.program,
      globalName: challenge.globalName,
      globalObject: globalThis,
    });
    return client.snapshot({ webPoSignalOutput });
  });

  const res = await fetch(bgUtils.buildURL("GenerateIT"), {
    method: "POST",
    headers: bgUtils.getHeaders(),
    body: JSON.stringify([BOTGUARD_REQUEST_KEY, snapshot]),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`BotGuard GenerateIT HTTP ${res.status}`);
  const [integrityToken, estimatedTtlSecs, mintRefreshThreshold, websafeFallbackToken] = await res.json();
  if (!integrityToken) throw new Error("BotGuard returned no integrity token");

  const minter = await withDom(() =>
    webpo.WebPoMinter.create({ integrityToken, estimatedTtlSecs, mintRefreshThreshold, websafeFallbackToken }, webPoSignalOutput),
  );
  const ttl = Math.max(60, (estimatedTtlSecs || 0) - (mintRefreshThreshold || 0));
  return { minter, expiresAt: Date.now() + ttl * 1000 };
}

let minterEntry = null;
function currentMinter() {
  if (minterEntry && Date.now() < minterEntry.expiresAt) return minterEntry;
  const entry = { expiresAt: Infinity };
  entry.promise = createMinter().then(
    ({ minter, expiresAt }) => {
      entry.expiresAt = expiresAt;
      return minter;
    },
    (err) => {
      if (minterEntry === entry) minterEntry = null;
      throw new Error(`BotGuard setup failed: ${err.message}`);
    },
  );
  minterEntry = entry;
  return entry;
}

const decodedLength = (token) =>
  typeof token === "string" ? Buffer.from(token.replace(/-/g, "+").replace(/_/g, "/"), "base64").length : token.length;

async function mintPoToken(videoId, websafe = true) {
  let token;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt === 2) minterEntry = null;
    const entry = currentMinter();
    const minter = await entry.promise;
    try {
      token = await withDom(() => (websafe ? minter.mintAsWebsafeString(videoId) : minter.mint(videoId)));
    } catch (err) {
      if (minterEntry === entry) minterEntry = null;
      throw new Error(`PoToken mint failed: ${err.message}`);
    }
    if (decodedLength(token) === 91) break;
  }
  return token;
}

function parseProfiles(data) {
  const list = Array.isArray(data) ? data : data?.profiles;
  if (!Array.isArray(list)) return [];
  const profiles = [];
  for (const entry of list.slice(0, 10)) {
    const profile = {};
    for (const [field, pattern] of Object.entries(PROFILE_FIELDS)) {
      if (typeof entry?.[field] === "string" && pattern.test(entry[field])) profile[field] = entry[field];
    }
    if (profile.name && profile.clientVersion && profile.userAgent && !profiles.some((p) => p.name === profile.name)) {
      profiles.push(profile);
    }
  }
  return profiles;
}

let remoteProfiles = [];
let nextProfilesFetch = 0;
let profilesFetch = null;
let forcedProfiles = null;

function refreshProfiles(url) {
  profilesFetch ??= (async () => {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000), headers: { "Cache-Control": "no-cache" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    if (text.length > 64 * 1024) throw new Error("file too large");
    const profiles = parseProfiles(JSON.parse(text));
    if (!profiles.length) throw new Error("no valid profiles");
    remoteProfiles = profiles;
    nextProfilesFetch = Date.now() + 60 * 60 * 1000;
  })()
    .catch((err) => {
      nextProfilesFetch = Date.now() + 5 * 60 * 1000;
      console.error(`[youtube] could not load TV profiles: ${err.message}`);
    })
    .finally(() => {
      profilesFetch = null;
    });
  return profilesFetch;
}

// remote first, then built-ins not overridden by name. only the first call waits for the fetch
async function tvProfiles() {
  if (forcedProfiles) return forcedProfiles;
  const url = (process.env.YT_PROFILES_URL ?? PROFILES_URL).trim();
  if (url && Date.now() >= nextProfilesFetch) {
    const pending = refreshProfiles(url);
    if (nextProfilesFetch === 0) await pending;
  }
  return [...remoteProfiles, ...BUILTIN_PROFILES.filter((b) => !remoteProfiles.some((p) => p.name === b.name))];
}

const cookie = () => {
  const value = String(config.YT_COOKIE || "").trim();
  return value && value !== "false" ? value : undefined;
};

let cache = null;
const innertubes = new Map();
auth.onCredentialsChange(() => {
  for (const key of innertubes.keys()) if (key.startsWith("auth|")) innertubes.delete(key);
});

async function innertubeFor(clientKey, credentials = null, profile = null) {
  const { yt } = await libs();
  const key = credentials ? `auth|${JSON.stringify(profile)}` : `anon|${clientKey}|${cookie() || ""}`;
  const hit = innertubes.get(key);
  if (hit && Date.now() - hit.at < INNERTUBE_TTL_MS) return hit.promise;

  cache ??= new yt.UniversalCache(false);
  const promise = (async () => {
    const innertube = await yt.Innertube.create({
      cache,
      cookie: credentials ? undefined : cookie(),
      generate_session_locally: true,
      retrieve_player: true,
      client_type: yt.Constants.CLIENTS[clientKey].NAME,
      user_agent: profile?.userAgent,
    });
    if (profile) {
      const client = innertube.session.context.client;
      client.clientVersion = profile.clientVersion;
      client.userAgent = profile.userAgent;
      for (const field of DEVICE_FIELDS) {
        if (profile[field]) client[field] = profile[field];
        else delete client[field];
      }
    }
    if (credentials) {
      innertube.session.on("update-credentials", ({ credentials: fresh }) => {
        auth.saveCredentials(fresh).catch((err) => console.error("[youtube] saving refreshed login failed:", err.message));
      });
      await innertube.session.signIn(credentials);
    }
    return innertube;
  })();
  promise.catch(() => innertubes.delete(key));
  innertubes.set(key, { at: Date.now(), promise });
  return promise;
}

const isBotCheck = (err) => /LOGIN_REQUIRED|not a bot/i.test(err.message);
const isFinal = (err) => err.playability && !["LOGIN_REQUIRED", "UNPLAYABLE", "AGE_CHECK_REQUIRED"].includes(err.playability);

// plain HTTP 403 from the innertube API itself: google refuses this server's IP (seen on render),
// every client gets the same, login included
const isIpBlock = (err) => /youtubei\/v1\/\S* failed with status code 403/i.test(err.message);

let anonBlockedUntil = 0;
let ipBlockedUntil = 0;

function ipBlockedError(detail) {
  const error = new Error(detail || "YouTube refuses this server's IP (HTTP 403)");
  error.code = "YT_IP_BLOCKED";
  error.primary = error.message;
  return error;
}

async function withClients(fn) {
  // all clients 403'd recently: fail at once instead of redoing every slow attempt per request
  if (Date.now() < ipBlockedUntil) throw ipBlockedError();
  const credentials = await auth.getCredentials();
  const attempts = [];
  if (!credentials || Date.now() > anonBlockedUntil) {
    for (const client of ANON_CLIENTS) attempts.push({ label: client, client });
  }
  if (credentials) {
    for (const profile of await tvProfiles()) attempts.push({ label: `${profile.name} (login)`, client: "TV", credentials, profile });
  }

  const failures = [];
  // one 403 means the rest of that group (anonymous / login profiles) gets it too: try each group once
  const ipBlocked = { anon: false, login: false };
  const groupOf = (attempt) => (attempt.credentials ? "login" : "anon");
  for (const attempt of attempts) {
    if (ipBlocked[groupOf(attempt)]) continue;
    try {
      return await fn(attempt);
    } catch (err) {
      failures.push({ attempt, err });
      if (credentials && !attempt.credentials && isBotCheck(err)) anonBlockedUntil = Date.now() + ANON_BLOCK_MS;
      if (isIpBlock(err)) ipBlocked[groupOf(attempt)] = true;
      if (isFinal(err)) break;
    }
  }
  const detail = failures.map(({ attempt, err }) => `${attempt.label}: ${err.message}`).join("; ");
  if (failures.length && failures.every(({ err }) => isIpBlock(err))) {
    ipBlockedUntil = Date.now() + IP_BLOCK_MS;
    throw ipBlockedError(detail);
  }
  const error = new Error(detail);
  error.primary = failures.at(-1)?.err.message;
  if (!credentials && failures.some(({ err }) => isBotCheck(err))) error.code = "YT_LOGIN_REQUIRED";
  throw error;
}

async function playerResponse(innertube, videoId, withPoToken) {
  const info = await innertube.getBasicInfo(videoId, withPoToken ? { po_token: await mintPoToken(videoId) } : undefined);
  const page = Array.isArray(info.page) ? info.page[0] : info.page;
  const status = page?.playability_status;
  if (status?.status !== "OK") {
    const err = new Error(`${status?.status || "UNPLAYABLE"}${status?.reason ? ` (${status.reason})` : ""}`);
    err.playability = status?.status;
    throw err;
  }
  return { info, page };
}

const labelOf = (format) => {
  const height = /^(\d+)p/.exec(format.qualityLabel || "")?.[1];
  return height ? `${height}p` : undefined;
};

function nearest(wanted, available, order) {
  if (available.includes(wanted)) return wanted;
  const at = order.indexOf(wanted);
  if (at === -1) return available[0];
  return order.slice(at + 1).find((q) => available.includes(q)) || order.slice(0, at).reverse().find((q) => available.includes(q));
}

function codecRank(mime = "") {
  if (mime.includes("avc1")) return 0;
  if (mime.includes("vp9") || mime.includes("vp09")) return 1;
  if (mime.includes("av01")) return 2;
  return 3;
}

function pickVideo(formats, wanted = "360p") {
  const all = formats.filter((f) => f.hasVideo);
  const sdr = all.filter((f) => !f.isHdr);
  const pool = sdr.length ? sdr : all;
  const label = nearest(wanted, [...new Set(pool.map(labelOf).filter(Boolean))], VIDEO_QUALITIES);
  if (!label) return undefined;
  return pool
    .filter((f) => labelOf(f) === label)
    .sort((a, b) => codecRank(a.mimeType) - codecRank(b.mimeType) || (b.bitrate || 0) - (a.bitrate || 0))[0];
}

function pickAudio(formats, wanted = "AUDIO_QUALITY_MEDIUM") {
  const all = formats.filter((f) => f.hasAudio && !f.hasVideo);
  const original = all.filter((f) => f.isOriginal !== false && !f.isDrc);
  const pool = original.length ? original : all;
  const quality = nearest(wanted, [...new Set(pool.map((f) => f.audioQuality).filter(Boolean))], AUDIO_QUALITIES);
  if (!quality) return pool[0];
  const aac = (f) => Number(f.mimeType?.includes("mp4a"));
  return pool
    .filter((f) => f.audioQuality === quality)
    .sort((a, b) => aac(b) - aac(a) || (b.bitrate || 0) - (a.bitrate || 0))[0];
}

function pickBestAudio(formats) {
  const all = formats.filter((f) => f.hasAudio && !f.hasVideo);
  const original = all.filter((f) => f.isOriginal !== false && !f.isDrc);
  const pool = original.length ? original : all;
  const tier = (f) => (AUDIO_QUALITIES.includes(f.audioQuality) ? AUDIO_QUALITIES.indexOf(f.audioQuality) : AUDIO_QUALITIES.length);
  const opus = (f) => Number(/opus/i.test(f.mimeType || ""));
  return [...pool].sort((a, b) => tier(a) - tier(b) || opus(b) - opus(a) || (b.bitrate || 0) - (a.bitrate || 0))[0];
}

const extOf = (mime = "") => (mime.includes("webm") ? "webm" : mime.startsWith("audio/") ? "m4a" : "mp4");

function describe(info, page, videoId) {
  const basic = { ...page?.video_details, ...Object.fromEntries(Object.entries(info.basic_info || {}).filter(([, v]) => v != null)) };
  const thumbs = basic.thumbnail?.length ? basic.thumbnail : [];
  return {
    id: basic.id || videoId,
    title: basic.title || "Unknown",
    author: basic.author,
    duration: Number(basic.duration) || 0,
    views: Number(basic.view_count) || 0,
    isLive: !!basic.is_live,
    thumbnail:
      [...thumbs].sort((a, b) => (b.width || 0) - (a.width || 0))[0]?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    formats: (page?.streaming_data?.adaptive_formats || []).map((f) => ({
      hasVideo: !!f.has_video,
      hasAudio: !!f.has_audio,
      mimeType: f.mime_type,
      qualityLabel: f.quality_label,
      audioQuality: f.audio_quality,
      bitrate: f.bitrate,
      size: Number(f.content_length) || 0,
      isHdr: /hdr/i.test(f.quality_label || ""),
      isDrc: !!f.is_drc,
      isOriginal: f.audio_track ? !!f.audio_track.audio_is_default : true,
    })),
  };
}

async function fillMetadata(value) {
  if (value.title !== "Unknown" && value.author) return value;
  try {
    const watch = `https://www.youtube.com/watch?v=${value.id}`;
    const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watch)}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      const data = await res.json();
      if (value.title === "Unknown") value.title = data.title || value.title;
      value.author ||= data.author_name;
    }
  } catch (_) {}
  return value;
}

const infoCache = new Map();

async function getInfo(videoId) {
  const hit = infoCache.get(videoId);
  if (hit && Date.now() - hit.at < INFO_TTL_MS) return hit.value;
  const value = await withClients(async ({ client, credentials, profile }) => {
    const innertube = await innertubeFor(client, credentials, profile);
    const { info, page } = await playerResponse(innertube, videoId, !credentials);
    return describe(info, page, videoId);
  });
  await fillMetadata(value);
  infoCache.set(videoId, { at: Date.now(), value });
  if (infoCache.size > 100) infoCache.delete(infoCache.keys().next().value);
  return value;
}

async function sabrDownload({ client, credentials, profile }, videoId, kind, quality, { bestAudio = false } = {}) {
  const { yt, SabrStream, gvUtils } = await libs();
  const innertube = await innertubeFor(client, credentials, profile);
  const withPoToken = !credentials;

  const loadPlayer = async () => {
    const { info, page } = await playerResponse(innertube, videoId, withPoToken);
    const url = page.streaming_data?.server_abr_streaming_url;
    const ustreamer = page.player_config?.media_common_config?.media_ustreamer_request_config?.video_playback_ustreamer_config;
    if (!url || !ustreamer) throw new Error("no SABR stream in the player response");
    return {
      info,
      page,
      serverAbrStreamingUrl: await innertube.session.player.decipher(url),
      videoPlaybackUstreamerConfig: ustreamer,
    };
  };

  const player = await loadPlayer();
  const formats = player.page.streaming_data.adaptive_formats.map(gvUtils.buildSabrFormat);
  const audioFormat = bestAudio ? pickBestAudio(formats) : pickAudio(formats);
  const videoFormat = kind === "video" ? pickVideo(formats, quality) : undefined;
  if (!audioFormat) throw new Error("no audio format");
  if (kind === "video" && !videoFormat) throw new Error("no video format");

  const context = innertube.session.context.client;
  const stream = new SabrStream({
    videoId,
    formats,
    serverAbrStreamingUrl: player.serverAbrStreamingUrl,
    videoPlaybackUstreamerConfig: player.videoPlaybackUstreamerConfig,
    clientInfo: {
      clientName: parseInt(yt.Constants.CLIENT_NAME_IDS[context.clientName]),
      clientVersion: context.clientVersion,
      ...Object.fromEntries(DEVICE_FIELDS.filter((f) => context[f]).map((f) => [f, context[f]])),
    },
    poToken: withPoToken ? await mintPoToken(videoId) : undefined,
    fetchFunction: (url, init) => innertube.session.http.fetch(url, init),
    callbacks: {
      onMintPoToken: withPoToken ? () => mintPoToken(videoId, false) : undefined,
      onReloadPlayerResponse: async () => {
        const { serverAbrStreamingUrl, videoPlaybackUstreamerConfig } = await loadPlayer();
        return { serverAbrStreamingUrl, videoPlaybackUstreamerConfig };
      },
    },
  });

  let pending = 0;
  let stalled = null;
  stream.on("streamProtectionStatusUpdate", ({ status }) => {
    pending = status === 2 ? pending + 1 : 0;
    if (pending >= 5 && !stalled) {
      stalled = new Error("stream protection stayed pending");
      stream.abort().catch(() => {});
    }
  });

  const base = path.join(tempDir(), `${videoId}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`);
  const audioPath = `${base}_a.${extOf(audioFormat.mimeType)}`;
  const videoPath = videoFormat ? `${base}_v.${extOf(videoFormat.mimeType)}` : null;
  try {
    const { audioStream, videoStream } = await stream.start({
      audioFormat,
      videoFormat,
      enabledTrackTypes: videoFormat ? gvUtils.EnabledTrackTypes.VIDEO_AND_AUDIO : gvUtils.EnabledTrackTypes.AUDIO_ONLY,
    });
    await Promise.all([
      pipeline(Readable.fromWeb(audioStream), fs.createWriteStream(audioPath)),
      videoPath && pipeline(Readable.fromWeb(videoStream), fs.createWriteStream(videoPath)),
    ]);
    if (!fs.statSync(audioPath).size) throw new Error("downloaded stream is empty");
  } catch (err) {
    stream.abort().catch(() => {});
    await Promise.all([audioPath, videoPath].filter(Boolean).map((f) => fs.promises.unlink(f).catch(() => {})));
    throw stalled || err;
  }

  return {
    audioPath,
    audioMime: audioFormat.mimeType,
    videoPath,
    videoMime: videoFormat?.mimeType,
    quality: videoFormat ? labelOf(videoFormat) : null,
    info: await fillMetadata(describe(player.info, player.page, videoId)),
  };
}

function download(videoId, kind = "audio", quality = "360p", options = {}) {
  return withClients((attempt) => sabrDownload(attempt, videoId, kind, quality, options));
}

async function search(query, limit = 10) {
  const innertube = await innertubeFor("WEB");
  const res = await innertube.search(query, { type: "video" });
  return (res.videos || [])
    .filter((v) => v.type === "Video" && v.video_id)
    .slice(0, limit)
    .map((v) => ({
      id: v.video_id,
      title: String(v.title ?? ""),
      url: `https://www.youtube.com/watch?v=${v.video_id}`,
      duration: v.duration?.text || "N/A",
      thumbnail: v.thumbnails?.[0]?.url,
      views: parseInt(String(v.view_count ?? "").replace(/\D/g, ""), 10) || 0,
      uploadedAt: v.published ? String(v.published) : undefined,
      channel: { name: v.author?.name, url: v.author?.url },
    }));
}

module.exports = {
  getInfo,
  download,
  search,
  mintPoToken,
  login: auth.login,
  logout: auth.logout,
  isLoggedIn: async () => !!(await auth.getCredentials()),
  get TEMP_DIR() {
    return tempDir();
  },
  _internals: {
    pickVideo,
    pickAudio,
    pickBestAudio,
    labelOf,
    parseProfiles,
    tvProfiles,
    useProfiles: (list) => (forcedProfiles = list),
    BUILTIN_PROFILES,
  },
};
