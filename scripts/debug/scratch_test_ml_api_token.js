const fs = require('fs');
const path = require('path');

async function main() {
  const url = "https://www.mercadolivre.com.br/tenis-adidas-masculino-ih9526/up/MLBU3938273469?pdp_filters=item_id%3AMLB6722221764";
  
  // Extrair ID do Mercado Livre (MLB seguido de números)
  const match = url.match(/(MLB-?\d{8,15})/i);
  if (!match) {
    console.log("No match found!");
    return;
  }
  
  const itemId = match[1].replace('-', '');
  console.log("Extracted Item ID:", itemId);
  
  // Ler o token do ml_token.json
  let tokenData;
  try {
    const tokenPath = path.join(process.cwd(), 'bot', 'ml_token.json');
    const content = fs.readFileSync(tokenPath, 'utf-8');
    tokenData = JSON.parse(content);
  } catch (err) {
    console.error("Error reading token file:", err.message);
    return;
  }
  
  const accessToken = tokenData.access_token;
  console.log("Access Token starts with:", accessToken.substring(0, 15));
  
  try {
    const res = await fetch(`https://api.mercadolibre.com/items/${itemId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });
    if (!res.ok) {
      console.log("API Error:", res.status, await res.text());
      return;
    }
    
    const data = await res.json();
    console.log("Title:", data.title);
    console.log("Pictures count:", data.pictures?.length);
    if (data.pictures && data.pictures.length > 1) {
      console.log("Secondary image URL:", data.pictures[1].secure_url);
    }
  } catch (err) {
    console.error(err);
  }
}
main();
