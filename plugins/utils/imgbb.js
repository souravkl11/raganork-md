const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

const IMGBB_BASE_URL = "https://imgbb.com/";
const IMGBB_UPLOAD_URL = "https://imgbb.com/json";
const MAX_FILE_SIZE = 33554432;

async function fetchAuthToken() {
  try {
    const response = await axios.get(IMGBB_BASE_URL);
    const authTokenMatch = response.data.match(/PF\.obj\.config\.auth_token="([a-f0-9]{40})"/);

    if (authTokenMatch && authTokenMatch[1]) {
      return authTokenMatch[1];
    }
    throw new Error("Auth token not found.");
  } catch (error) {
    console.error("Error fetching auth token:", error.message);
    throw error;
  }
}

module.exports = async (imagePath) => {
  try {
    const fileStats = fs.statSync(imagePath);

    if (fileStats.size > MAX_FILE_SIZE) {
      return { url : "_File size exceeds 32MB limit._" };
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
    });

    if (response.data) {
      return  response.data.image;
    } else {
      return { error: "Upload failed, no response data." };
    }
  } catch (error) {
    console.error("Error uploading file:", error.message);
    return { error: error.message };
  }
}