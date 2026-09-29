async function searchDDGImages(query: string) {
  try {
    const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&t=h_&iax=images&ia=images`;
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.warn('[DDG-Search] Falha ao acessar página inicial:', res.status);
      return [];
    }

    const html = await res.text();
    const vqdMatch = html.match(/vqd=([^&'"]+)/) || html.match(/vqd\s*=\s*['"]([^'"]+)['"]/);
    if (!vqdMatch) {
      console.warn('[DDG-Search] Token vqd não encontrado no HTML.');
      return [];
    }
    const vqd = vqdMatch[1];
    console.log("Got VQD:", vqd);
    
    const apiUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,,,&p=1`;
    const apiRes = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://duckduckgo.com/',
      },
      signal: AbortSignal.timeout(10000),
    });
    
    if (!apiRes.ok) {
      console.log("Image API failed:", apiRes.status);
      return;
    }
    
    const json = await apiRes.json();
    console.log("Found:", json.results?.length);
    console.log(json.results?.slice(0, 2).map((r: any) => r.image));
  } catch(e: any) {
    console.error("Error", e.message);
  }
}
searchDDGImages("iphone 15 pro max");
