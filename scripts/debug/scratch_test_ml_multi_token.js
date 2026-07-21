const fs = require('fs');
const path = require('path');

async function main() {
  const tokenPath = path.join(process.cwd(), 'bot', 'ml_token.json');
  const tokenData = JSON.parse(fs.readFileSync(tokenPath, 'utf-8'));
  const accessToken = tokenData.access_token;
  
  try {
    const res = await fetch("https://api.mercadolibre.com/items?ids=MLB6722221764", {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
}
main();
