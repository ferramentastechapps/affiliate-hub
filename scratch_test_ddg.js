async function searchDuckDuckGoImages(query) {
  try {
    // 1. Obter a página inicial para extrair o token vqd
    const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&t=h_&iax=images&ia=images`;
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!res.ok) {
      console.log("Failed to fetch DDG page:", res.status);
      return null;
    }

    const html = await res.text();
    // Regex para achar o token vqd
    const vqdMatch = html.match(/vqd=([^&'"]+)/) || html.match(/vqd\s*=\s*['"]([^'"]+)['"]/);
    if (!vqdMatch) {
      console.log("vqd token not found in HTML!");
      return null;
    }

    const vqd = vqdMatch[1];
    console.log("Found vqd token:", vqd);

    // 2. Chamar o endpoint JSON usando o token vqd (i.js para imagens)
    const jsonUrl = `https://duckduckgo.com/i.js?q=${encodeURIComponent(query)}&o=json&vqd=${vqd}&f=,,,`;
    const jsonRes = await fetch(jsonUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://duckduckgo.com/'
      }
    });

    if (!jsonRes.ok) {
      console.log("Failed to fetch DDG JSON:", jsonRes.status);
      return null;
    }

    const data = await jsonRes.json();
    return data.results || [];
  } catch (err) {
    console.error("Error in DDG search:", err);
    return null;
  }
}

async function main() {
  const query = "Ar Condicionado Split Agratto Inverter 9000 Btus";
  const results = await searchDuckDuckGoImages(query);
  if (results && results.length > 0) {
    console.log(`Found ${results.length} images!`);
    console.log("Keys of first result:", Object.keys(results[0]));
    console.log("First result detail:", JSON.stringify(results[0], null, 2));
  }
}

main();
