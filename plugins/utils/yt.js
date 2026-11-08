const fs = require("fs");
const path = require("path");
const os = require("os");
const { Readable } = require("stream");

let ffmpeg;
try {
  ffmpeg = require("fluent-ffmpeg");
} catch (_) {}

let youtube;
try {
  youtube = require("youtube-sr").default || require("youtube-sr");
} catch (_) {}

let getTempSubdir;
try {
  getTempSubdir = require("../../core/helpers").getTempSubdir;
} catch (_) {
  getTempSubdir = (sub) => {
    const dir = path.join(os.tmpdir(), sub || "yt");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  };
}

const priv = require("../../core/private");
const TEMP_DIR = getTempSubdir("yt");

/**
 * Checks if a video is subject to geo/IP restriction (e.g. licensed music videos).
 * @param {Object} info - Video info object
 * @returns {boolean}
 */
function isRestrictedVideo(info) {
  if (!info) return false;
  if (info.isRestricted) return true;

  const allFormats = [
    ...(info.formats || []),
    ...(info.audio || []),
    ...(info.video || []),
  ];

  return allFormats.some(
    (f) =>
      f.requiresExternalDownload ||
      (f.url && (f.url.includes("gcr=") || f.url.includes("ip=187.15.135.201")))
  );
}

/**
 * Fetches video details and formats from the API server.
 * @param {string} url - YouTube URL or Video ID
 * @returns {Promise<Object>}
 */
async function getVideoInfo(url) {
  const info = await priv.ytInfo(url);

  const isRestricted = Boolean(info.isRestricted || isRestrictedVideo(info));
  const formats = [];

  if (info.audio && Array.isArray(info.audio)) {
    info.audio.forEach((audio) => {
      formats.push({
        type: "audio",
        quality: audio.quality,
        url: audio.url,
        hasAudio: audio.hasAudio,
        size: audio.size,
        requiresExternalDownload: isRestricted || audio.requiresExternalDownload || false,
      });
    });
  }

  if (info.video && Array.isArray(info.video)) {
    info.video.forEach((video) => {
      formats.push({
        type: "video",
        quality: video.quality,
        url: video.url,
        hasAudio: video.hasAudio,
        size: video.size,
        requiresExternalDownload: isRestricted || !video.hasAudio || video.requiresExternalDownload || false,
      });
    });
  }

  if (
    (!formats || formats.length === 0) &&
    info.formats &&
    Array.isArray(info.formats)
  ) {
    return { ...info, isRestricted };
  }

  return {
    ...info,
    isRestricted,
    formats,
  };
}

/**
 * Downloads a file in parallel HTTP Range chunks.
 * Fails fast if the server returns HTTP errors (e.g. 403 Forbidden).
 * @param {string} url 
 * @param {string} filepath 
 * @param {number} chunks 
 */
async function downloadFileInChunks(url, filepath, chunks = 8) {
  try {
    const headRes = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(10000),
    });

    if (!headRes.ok) {
      throw new Error(`HEAD request failed with HTTP ${headRes.status}`);
    }

    const contentLength = parseInt(headRes.headers.get("content-length"));

    if (!contentLength || contentLength < 1024 * 1024) {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const writer = fs.createWriteStream(filepath);
      const nodeStream = Readable.fromWeb(res.body);
      await new Promise((resolve, reject) => {
        nodeStream.pipe(writer);
        nodeStream.on("error", reject);
        writer.on("finish", resolve);
        writer.on("error", reject);
      });
      return;
    }

    const chunkSize = Math.ceil(contentLength / chunks);
    const chunkPromises = [];

    for (let i = 0; i < chunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize - 1, contentLength - 1);
      const chunkPath = `${filepath}.part${i}`;

      const promise = (async () => {
        const res = await fetch(url, {
          headers: {
            Range: `bytes=${start}-${end}`,
          },
          signal: AbortSignal.timeout(30000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const writer = fs.createWriteStream(chunkPath);
        const nodeStream = Readable.fromWeb(res.body);
        return new Promise((resolve, reject) => {
          nodeStream.pipe(writer);
          nodeStream.on("error", reject);
          writer.on("finish", resolve);
          writer.on("error", reject);
        });
      })();

      chunkPromises.push(promise);
    }

    await Promise.all(chunkPromises);

    const writeStream = fs.createWriteStream(filepath);
    for (let i = 0; i < chunks; i++) {
      const chunkPath = `${filepath}.part${i}`;
      const readStream = fs.createReadStream(chunkPath);
      await new Promise((resolve, reject) => {
        readStream.pipe(writeStream, { end: false });
        readStream.on("end", () => {
          try {
            fs.unlinkSync(chunkPath);
          } catch (_) {}
          resolve();
        });
        readStream.on("error", reject);
      });
    }
    writeStream.end();
    await new Promise((resolve, reject) => {
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
    });
  } catch (error) {
    for (let i = 0; i < chunks; i++) {
      const chunkPath = `${filepath}.part${i}`;
      if (fs.existsSync(chunkPath)) {
        try {
          fs.unlinkSync(chunkPath);
        } catch (_) {}
      }
    }
    throw error;
  }
}

/**
 * Downloads a video or audio stream directly through the API server's streaming proxy.
 * @param {string} youtubeUrl 
 * @param {string} type - 'video' | 'audio'
 * @param {string} quality - e.g. '360p', '720p'
 * @returns {Promise<string>} Path to the downloaded file
 */
async function downloadFromAPI(youtubeUrl, type, quality) {
  const res = await priv.ytStream(youtubeUrl, type, quality);

  const ext = type === "audio" ? "m4a" : "mp4";
  const filepath = path.join(TEMP_DIR, `${Date.now()}.${ext}`);
  const writer = fs.createWriteStream(filepath);
  const nodeStream = Readable.fromWeb(res.body);

  return new Promise((resolve, reject) => {
    nodeStream.pipe(writer);
    writer.on("finish", () => resolve(filepath));
    writer.on("error", reject);
    nodeStream.on("error", reject);
  });
}

/**
 * Requests an audio-merged or geo-unblocked direct download from the external downloader endpoint.
 * Bypasses 403 Forbidden on geo/IP-restricted videos and provides ready-to-use MP4/M4A files.
 * 
 * @param {string} youtubeUrl 
 * @param {string} quality - e.g. '360p', '720p', '1080p', 'audio'
 * @returns {Promise<string>} Path to the downloaded file
 */
async function downloadFromExternalAPI(youtubeUrl, quality = "360p") {
  const isAudio = quality === "audio" || quality === "mp3" || quality === "m4a";
  const targetQuality = isAudio ? "audio" : quality;

  const downloadUrl = await priv.ytExternalDownloadUrl(youtubeUrl, targetQuality);

  const ext = isAudio ? "m4a" : "mp4";
  const filepath = path.join(TEMP_DIR, `${Date.now()}_ext.${ext}`);

  await downloadFileInChunks(downloadUrl, filepath, 5);
  return filepath;
}

/**
 * Downloads a YouTube video at the requested quality.
 * Seamlessly differentiates between:
 *  - Geo/IP-restricted videos (routes through external cloud renderer)
 *  - Formats with integrated audio (e.g. 360p, directly streams without redundant ffmpeg muxing)
 *  - High-res formats without audio (downloads tracks and muxes locally, with cloud fallback)
 * 
 * @param {string} url - YouTube URL or Video ID
 * @param {string} quality - Target resolution (default '360p')
 * @returns {Promise<{ path: string, title: string }>}
 */
async function downloadVideo(url, quality = "360p") {
  const info = await getVideoInfo(url);
  const restricted = isRestrictedVideo(info);

  // If the video is geo-locked or IP-bound (e.g. licensed music videos),
  // Google CDN returns 403 on direct access. Route directly to external cloud downloader!
  if (restricted) {
    const externalFile = await downloadFromExternalAPI(url, quality);
    return { path: externalFile, title: info.title };
  }

  const normQuality = quality.toLowerCase().trim();
  const targetQ = normQuality.endsWith("p") ? normQuality : `${normQuality}p`;

  const videoFormat =
    info.formats.find((f) => f.type === "video" && f.quality.toLowerCase() === targetQ) ||
    info.formats.find((f) => f.type === "video");
  const audioFormat = info.formats.find((f) => f.type === "audio");

  if (!videoFormat) {
    throw new Error(`Requested video format ${quality} not available`);
  }

  // If the format already includes audio (e.g. standard 360p), download directly!
  if (videoFormat.hasAudio) {
    const timestamp = Date.now();
    const outputPath = path.join(TEMP_DIR, `output_${timestamp}.mp4`);
    try {
      await downloadFileInChunks(videoFormat.url, outputPath, 5);
      return { path: outputPath, title: info.title };
    } catch (_) {
      try {
        const tempVideo = await downloadFromAPI(url, "video", quality);
        return { path: tempVideo, title: info.title };
      } catch (__) {
        const extVideo = await downloadFromExternalAPI(url, quality);
        return { path: extVideo, title: info.title };
      }
    }
  }

  // Format lacks audio (e.g. 720p, 1080p).
  // If ffmpeg is not available, delegate directly to external cloud merger:
  if (!ffmpeg) {
    const extVideo = await downloadFromExternalAPI(url, quality);
    return { path: extVideo, title: info.title };
  }

  // Download video and audio tracks, then mux with ffmpeg:
  const timestamp = Date.now();
  const videoPath = path.join(TEMP_DIR, `video_${timestamp}.mp4`);
  const audioPath = path.join(TEMP_DIR, `audio_${timestamp}.m4a`);
  const outputPath = path.join(TEMP_DIR, `output_${timestamp}.mp4`);

  try {
    // 1. Download Video Track
    try {
      await downloadFileInChunks(videoFormat.url, videoPath, 5);
    } catch (_) {
      try {
        const tempVideo = await downloadFromAPI(url, "video", quality);
        fs.renameSync(tempVideo, videoPath);
      } catch (apiError) {
        // Fallback directly to external cloud merger
        const extVideo = await downloadFromExternalAPI(url, quality);
        return { path: extVideo, title: info.title };
      }
    }

    if (!audioFormat) {
      return { path: videoPath, title: info.title };
    }

    // 2. Download Audio Track
    try {
      await downloadFileInChunks(audioFormat.url, audioPath, 8);
    } catch (_) {
      try {
        const tempAudio = await downloadFromAPI(url, "audio");
        fs.renameSync(tempAudio, audioPath);
      } catch (apiError) {
        if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
        const extVideo = await downloadFromExternalAPI(url, quality);
        return { path: extVideo, title: info.title };
      }
    }

    // 3. Mux Video + Audio
    return await new Promise((resolve, reject) => {
      let ffmpegProcess = ffmpeg()
        .input(videoPath)
        .input(audioPath)
        .outputOptions([
          "-c copy",
          "-map 0:v:0",
          "-map 1:a:0",
          "-movflags",
          "+faststart",
        ])
        .output(outputPath)
        .on("end", () => {
          ffmpegProcess = null;
          if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
          if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
          resolve({ path: outputPath, title: info.title });
        })
        .on("error", async (err) => {
          ffmpegProcess = null;
          if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
          if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
          if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

          // If local ffmpeg fails, fallback to cloud merger
          try {
            const extVideo = await downloadFromExternalAPI(url, quality);
            resolve({ path: extVideo, title: info.title });
          } catch (extErr) {
            reject(err);
          }
        });

      ffmpegProcess.run();
    });
  } catch (err) {
    try {
      const extVideo = await downloadFromExternalAPI(url, quality);
      return { path: extVideo, title: info.title };
    } catch (_) {
      throw err;
    }
  }
}

/**
 * Downloads audio track for a YouTube video.
 * Routes through external downloader for geo/IP-restricted music videos.
 * 
 * @param {string} url 
 * @returns {Promise<{ path: string, title: string, info: Object }>}
 */
async function downloadAudio(url) {
  const info = await getVideoInfo(url);
  const restricted = isRestrictedVideo(info);

  if (restricted) {
    const audioPath = await downloadFromExternalAPI(url, "audio");
    return { path: audioPath, title: info.title, info };
  }

  const audioFormat = info.formats.find((f) => f.type === "audio");
  if (!audioFormat) {
    throw new Error("Audio format not available");
  }

  const timestamp = Date.now();
  const audioPath = path.join(TEMP_DIR, `audio_${timestamp}.m4a`);

  try {
    await downloadFileInChunks(audioFormat.url, audioPath, 8);
  } catch (error) {
    try {
      const tempAudio = await downloadFromAPI(url, "audio");
      fs.renameSync(tempAudio, audioPath);
    } catch (apiError) {
      try {
        const extAudio = await downloadFromExternalAPI(url, "audio");
        return { path: extAudio, title: info.title, info };
      } catch (_) {
        throw error;
      }
    }
  }

  return { path: audioPath, title: info.title, info };
}

/**
 * Adds metadata tags and optional thumbnail artwork to an audio file.
 * @param {string} m4aPath 
 * @param {Object|null} meta 
 * @returns {Promise<string>} Path to tagged audio file
 */
async function convertM4aToMp3(m4aPath, meta = null) {
  if (!ffmpeg) {
    return m4aPath;
  }

  const timestamp = Date.now();
  const taggedM4a = path.join(TEMP_DIR, `audio_${timestamp}.m4a`);

  return new Promise((resolve, reject) => {
    let ffmpegProcess = ffmpeg(m4aPath).outputOptions(["-c copy", "-map 0:a"]);

    if (meta?.title)
      ffmpegProcess.outputOption("-metadata", `title=${meta.title}`);
    if (meta?.artist)
      ffmpegProcess.outputOption("-metadata", `artist=${meta.artist}`);
    if (meta?.album)
      ffmpegProcess.outputOption("-metadata", `album=${meta.album}`);

    ffmpegProcess
      .output(taggedM4a)
      .on("end", async () => {
        ffmpegProcess = null;
        if (fs.existsSync(m4aPath)) fs.unlinkSync(m4aPath);

        if (meta?.thumbnail) {
          try {
            const response = await fetch(meta.thumbnail);
            if (response.ok) {
              const coverBuffer = await response.arrayBuffer();
              const coverPath = path.join(TEMP_DIR, `cover_${timestamp}.jpg`);
              fs.writeFileSync(coverPath, Buffer.from(coverBuffer));

              const finalM4a = path.join(
                TEMP_DIR,
                `audio_final_${timestamp}.m4a`,
              );

              await new Promise((innerResolve) => {
                let proc = ffmpeg(taggedM4a)
                  .input(coverPath)
                  .outputOptions([
                    "-c copy",
                    "-map 0",
                    "-map 1",
                    "-disposition:v:0",
                    "attached_pic",
                  ])
                  .output(finalM4a)
                  .on("end", () => {
                    proc = null;
                    if (fs.existsSync(taggedM4a)) fs.unlinkSync(taggedM4a);
                    if (fs.existsSync(coverPath)) fs.unlinkSync(coverPath);
                    innerResolve(finalM4a);
                  })
                  .on("error", (err) => {
                    proc = null;
                    console.error(
                      "Failed to add M4A cover, using metadata-only:",
                      err.message,
                    );
                    if (fs.existsSync(finalM4a)) fs.unlinkSync(finalM4a);
                    if (fs.existsSync(coverPath)) fs.unlinkSync(coverPath);
                    innerResolve(taggedM4a);
                  });
                proc.run();
              });

              resolve(finalM4a);
            } else {
              resolve(taggedM4a);
            }
          } catch (e) {
            console.error("Failed to add M4A artwork:", e);
            resolve(taggedM4a);
          }
        } else {
          resolve(taggedM4a);
        }
      })
      .on("error", (err) => {
        ffmpegProcess = null;
        if (fs.existsSync(taggedM4a)) fs.unlinkSync(taggedM4a);
        console.error(
          "Failed to add metadata, using original audio:",
          err.message,
        );
        resolve(m4aPath);
      })
      .run();
  });
}

/**
 * Searches YouTube for video query.
 * @param {string} query 
 * @param {number} limit 
 * @returns {Promise<Array>}
 */
async function searchYoutube(query, limit = 10) {
  if (!youtube) {
    throw new Error("youtube-sr is not installed");
  }
  const results = await youtube.search(query, {
    limit,
    type: "video",
  });
  return results.map((video) => ({
    title: video.title,
    url: video.url,
    duration: video.durationFormatted,
    thumbnail: video.thumbnail?.url,
    views: video.views,
    uploadedAt: video.uploadedAt,
    channel: {
      name: video.channel?.name,
      url: video.channel?.url,
    },
  }));
}

module.exports = {
  downloadVideo,
  downloadAudio,
  downloadFromExternalAPI,
  downloadFromAPI,
  isRestrictedVideo,
  searchYoutube,
  getVideoInfo,
  convertM4aToMp3,
};
