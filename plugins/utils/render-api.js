const axios = require("axios");

async function deployLatestCommit(serviceId, apiKey) {
  if (!serviceId) {
    console.error("Error: RENDER_SERVICE_ID is not set.");
    return;
  }

  if (!apiKey) {
    console.error("Error: RENDER_API_KEY is not set.");
    return;
  }

  const autoScalingUrl = `https://api.render.com/v1/services/${serviceId}/autoscaling`;

  try {
    const disableRes = await axios.delete(autoScalingUrl, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    });
    console.log("Autoscaling disabled:", disableRes.data || "No content");
  } catch (err) {
    console.error(
      "Error disabling autoscaling:",
      err.response?.data || err.message
    );
    return;
  }

  const deployUrl = `https://api.render.com/v1/services/${serviceId}/deploys`;

  try {
    const response = await axios.post(
      deployUrl,
      {
        clearCache: "clear",
      },
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    const deployInfo = response.data;

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
  } catch (err) {
    console.error(
      "Error during deployment:",
      err.response?.data || err.message
    );
  }
}

module.exports = deployLatestCommit;
