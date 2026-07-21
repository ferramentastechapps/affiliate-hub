async function main() {
  const url = "https://www.mercadolivre.com.br/tenis-adidas-masculino-ih9526/up/MLBU3938273469?pdp_filters=item_id%3AMLB6722221764";
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    console.log("Status:", res.status);
    const html = await res.text();
    console.log("HTML length:", html.length);
    console.log("Snippet:", html.substring(0, 1000));
  } catch (err) {
    console.error(err);
  }
}
main();
