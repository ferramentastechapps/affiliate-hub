async function main() {
  const targetUrl = "https://www.mercadolivre.com.br/tenis-adidas-masculino-ih9526/up/MLBU3938273469?pdp_filters=item_id%3AMLB6722221764";
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
  
  try {
    const res = await fetch(proxyUrl);
    console.log("Status:", res.status);
    const html = await res.text();
    console.log("HTML length:", html.length);
    console.log("Snippet:", html.substring(0, 1000));
    console.log("Is suspicious traffic:", html.includes("suspicious-traffic"));
  } catch (err) {
    console.error(err);
  }
}
main();
