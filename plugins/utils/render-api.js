async function deployLatestCommit(serviceId, apiKey) {
  if (!serviceId) {
    console.error("Error: RENDER_SERVICE_ID is not set.");
    console.error("Please provide your Render Service ID.");
    return;
  }

  if (!apiKey) {
    console.error("Error: RENDER_API_KEY is not set.");
    console.error("Please provide your Render API Key.");
    return;
  }

  const apiUrl = `https://api.render.com/v1/services/${serviceId}/deploys`;

  const headers = {
    "Accept": "application/json",
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`
  };

  const payload = {
    "clearCache": "clear" 
  };

  console.log(`Attempting to deploy service: ${serviceId}...`);

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const deployInfo = await response.json();

    console.log("\nDeployment initiated successfully!");
    console.log(`Deploy ID: ${deployInfo.id}`);
    console.log(`Status: ${deployInfo.status}`);
    console.log(`Triggered by: ${deployInfo.trigger}`);
    if (deployInfo.commit) {
      console.log(`Commit SHA: ${deployInfo.commit.id}`);
      console.log(`Commit Message: ${deployInfo.commit.message}`);
    }
    console.log(`Render Dashboard Link: https://dashboard.render.com/web/${serviceId}/deploys/${deployInfo.id}`);

  } catch (error) {
    console.error(`An error occurred during deployment: ${error.message}`);

  }
}

module.exports = deployLatestCommit