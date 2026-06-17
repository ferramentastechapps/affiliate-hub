async function main() {
  const url = "https://www.mercadolivre.com.br/tenis-adidas-masculino-ih9526/up/MLBU3938273469?pdp_filters=item_id%3AMLB6722221764&matt_event_ts=1781654222907&matt_d2id=db03be3c-7841-4bd1-a29d-a2a769bcae62";
  
  // Extrair ID do Mercado Livre (MLB seguido de números)
  const match = url.match(/(MLB-?\d{8,15})/i);
  if (!match) {
    console.log("No match found!");
    return;
  }
  
  const itemId = match[1].replace('-', '');
  console.log("Extracted Item ID:", itemId);
  
  try {
    const res = await fetch(`https://api.mercadolibre.com/items/${itemId}`);
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
