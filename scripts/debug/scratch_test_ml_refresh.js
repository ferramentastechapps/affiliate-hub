const fs = require('fs');
const path = require('path');

async function refreshMLToken(tokenData, tokenPath) {
  console.log("Refreshing ML Token...");
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: tokenData.client_id,
    client_secret: tokenData.client_secret,
    refresh_token: tokenData.refresh_token
  });

  const res = await fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  if (!res.ok) {
    throw new Error(`Failed to refresh token: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const updatedData = {
    ...tokenData,
    access_token: data.access_token,
    refresh_token: data.refresh_token
  };

  fs.writeFileSync(tokenPath, JSON.stringify(updatedData, null, 2));
  console.log("Token refreshed and saved successfully!");
  return data.access_token;
}

async function getMLProduct(itemId) {
  const tokenPath = path.join(process.cwd(), 'bot', 'ml_token.json');
  const tokenData = JSON.parse(fs.readFileSync(tokenPath, 'utf-8'));
  let accessToken = tokenData.access_token;

  let res = await fetch(`https://api.mercadolibre.com/items/${itemId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json'
    }
  });

  if (res.status === 401 || res.status === 403) {
    console.log("Token expired, refreshing...");
    try {
      accessToken = await refreshMLToken(tokenData, tokenPath);
      res = await fetch(`https://api.mercadolibre.com/items/${itemId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });
    } catch (err) {
      console.error("Failed to refresh token:", err.message);
      return null;
    }
  }

  if (!res.ok) {
    console.log("API Error:", res.status, await res.text());
    return null;
  }

  return await res.json();
}

async function main() {
  const itemId = "MLB6722221764";
  const data = await getMLProduct(itemId);
  if (data) {
    console.log("SUCCESS! Title:", data.title);
    console.log("Pictures count:", data.pictures?.length);
    if (data.pictures && data.pictures.length > 1) {
      console.log("Secondary image URL:", data.pictures[1].secure_url);
    }
  }
}

main();
