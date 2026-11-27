const axios = require("axios");

async function deployLatestCommit(serviceId, apiKey) {
  if (!serviceId) throw new Error("RENDER_SERVICE_ID is not set.");
  if (!apiKey) throw new Error("RENDER_API_KEY is not set.");

  const serviceUrl = `https://api.render.com/v1/services/${serviceId}`;
  const options = {
    timeout: 30000,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
  };

  // a failure here must not block the deploy
  try {
    const disableRes = await axios.delete(`${serviceUrl}/autoscaling`, options);
    console.log("Autoscaling disabled:", disableRes.data || "No content");
  } catch (err) {
    console.error(
      "Error disabling autoscaling:",
      err.response?.data || err.message
    );
  }

  let deployInfo;
  try {
    const response = await axios.post(
      `${serviceUrl}/deploys`,
      { clearCache: "clear" },
      options
    );
    deployInfo = response.data;
  } catch (err) {
    console.error(
      "Error during deployment:",
      err.response?.data || err.message
    );
    throw new Error(err.response ? `HTTP ${err.response.status}` : err.message);
  }

  console.log("\nDeployment initiated successfully!");
  console.log(`Deploy ID: ${deployInfo.id}`);
  console.log(`Status: ${deployInfo.status}`);
  console.log(`Triggered by: ${deployInfo.trigger}`);
  if (deployInfo.commit) {
    console.log(`Commit SHA: ${deployInfo.commit.id}`);
    console.log(`Commit Message: ${deployInfo.commit.message}`);
  }
  console.log(
    `Render Dashboard Link: https://dashboard.render.com/web/${serviceId}/deploys/${deployInfo.id}`
  );
}

module.exports = deployLatestCommit;
