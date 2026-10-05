import * as cheerio from 'cheerio';

export async function searchBingImages(query: string): Promise<any[]> {
  try {
    const searchUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}`;
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(10000),
    });

    const text = await res.text();
    const $ = cheerio.load(text);
    
    const images: any[] = [];
    $('a.iusc').each((i, el) => {
      const m = $(el).attr('m');
      if (m) {
        try {
          const data = JSON.parse(m);
          images.push({
             image: data.murl,
             thumbnail: data.turl,
             title: data.t || query
          });
        } catch (e) {}
      }
    });

    if (images.length === 0) {
      console.warn('[Bing-Search] Nenhuma imagem encontrada');
    }
    return images;
    
  } catch (err: any) {
    console.error('[Bing-Search] Erro ao buscar imagens no Bing:', err.message || err);
    return [];
  }
}

async function main() {
    // 1. Generic term without context will return weird stuff
    let term = "Apple Iphone 13 128 Gb Meia Noite";
    console.log(`\n\n--- Testing Search: "${term}" ---`);
    let results = await searchBingImages(term);
    results.slice(0, 3).forEach((r, i) => console.log(`${i+1}. ${r.image}`));
    
    term = "3zTbqN2"; // Real generic affiliate code fallback!
    console.log(`\n\n--- Testing Search: "${term}" ---`);
    results = await searchBingImages(term);
    results.slice(0, 3).forEach((r, i) => console.log(`${i+1}. ${r.image}`));
    
    term = "Aliexpress"; // Fallback from AliExpress link
    console.log(`\n\n--- Testing Search: "${term}" ---`);
    results = await searchBingImages(term);
    results.slice(0, 3).forEach((r, i) => console.log(`${i+1}. ${r.image}`));
}
main();
