const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const { Transform, pipeline } = require("stream");
const { isPublicHttpUrl } = require("./guards");

const IMGBB_BASE_URL = "https://imgbb.com/";
const IMGBB_UPLOAD_URL = "https://imgbb.com/json";
const IMGBB_LIMIT = 33554432;
const CATBOX_LIMIT = 209715200;
const TIMEOUT_MS = 30000;

const uploadToCatbox = async (filePath) => {
  const fileStats = fs.statSync(filePath);
  if (fileStats.size > CATBOX_LIMIT) {
    throw new Error("File size exceeds 200MB limit.");
  }
  const form = new FormData();
  form.append("reqtype", "fileupload");
  form.append("fileToUpload", fs.createReadStream(filePath));
  try {
    const response = await axios.post("https://catbox.moe/user/api.php", form, {
      headers: form.getHeaders(),
      timeout: TIMEOUT_MS,
    });
    const url = String(response.data).trim();
    if (!/^https?:\/\//.test(url)) throw new Error(url || "empty response");
    return { url };
  } catch (error) {
    console.error("Error uploading file to Catbox:", error.message);
    throw new Error(`Catbox upload failed: ${error.message}`);
  }
};

const fetchAuthToken = async () => {
  try {
    const response = await axios.get(IMGBB_BASE_URL, { timeout: TIMEOUT_MS });
    const authTokenMatch = response.data.match(
      /PF\.obj\.config\.auth_token="([a-f0-9]{40})"/
    );

    if (authTokenMatch && authTokenMatch[1]) {
      return authTokenMatch[1];
    }
    throw new Error("Auth token not found.");
  } catch (error) {
    console.error("Error fetching auth token:", error.message);
    throw error;
  }
};

const uploadToImgbb = async (imagePath) => {
  try {
    const fileStats = fs.statSync(imagePath);

    if (fileStats.size > IMGBB_LIMIT) {
      return { error: "File size exceeds 32MB limit." };
    }

    const authToken = await fetchAuthToken();
    const formData = new FormData();

    formData.append("source", fs.createReadStream(imagePath));
    formData.append("type", "file");
    formData.append("action", "upload");
    formData.append("timestamp", Date.now());
    formData.append("auth_token", authToken);

    const response = await axios.post(IMGBB_UPLOAD_URL, formData, {
      headers: { ...formData.getHeaders() },
      timeout: TIMEOUT_MS,
    });

    if (response.data) {
      return response.data.image;
    } else {
      return { error: "Upload failed, no response data." };
    }
  } catch (error) {
    console.error("Error uploading file:", error.message);
    return { error: error.message };
  }
};

// fetches a user-supplied URL: every hop must be a public http(s) host, and the body is capped
async function fetchPublic(url, { maxBytes, timeout = 60000, maxRedirects = 5 } = {}) {
  let current = url;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    if (!(await isPublicHttpUrl(current))) throw new Error("URL is not a public http(s) address");
    const response = await axios.get(current, {
      responseType: "stream",
      timeout,
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400,
    });
    if (response.status >= 300) {
      response.data.destroy();
      if (!response.headers.location) throw new Error("Redirect without a location");
      current = new URL(response.headers.location, current).toString();
      continue;
    }
    const length = parseInt(response.headers["content-length"], 10);
    if (maxBytes && length > maxBytes) {
      response.data.destroy();
      throw new Error("File is too large");
    }
    let total = 0;
    const counter = new Transform({
      transform(chunk, _enc, cb) {
        total += chunk.length;
        if (maxBytes && total > maxBytes) return cb(new Error("File is too large"));
        cb(null, chunk);
      },
    });
    pipeline(response.data, counter, () => {});
    return { stream: counter, headers: response.headers, url: current };
  }
  throw new Error("Too many redirects");
}

async function fetchPublicBuffer(url, options) {
  const { stream } = await fetchPublic(url, options);
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

module.exports = {
  uploadToImgbb,
  uploadToCatbox,
  fetchPublic,
  fetchPublicBuffer,
};
