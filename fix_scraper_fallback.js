const fs = require('fs');
let content = fs.readFileSync('local_scraper.ts', 'utf8');

// replace search function
content = content.replace(/export async function searchDuckDuckGoImages([\s\S]*?)function getRandomUserAgent/m, `export async function searchBingImages(query: string): Promise<any[]> {
  try {
    const searchUrl = \`https://www.bing.com/images/search?q=\${encodeURIComponent(query)}\`;
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': getRandomUserAgent(),
      },
      signal: AbortSignal.timeout(10000),
    });

    const text = await res.text();
    // Using string manipulation instead of Cheerio to avoid dependency overhead here?
    // Actually we have cheerio available at the top of the file!
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🛠️ AUXILIARES DE RASPAGEM E REDIRECIONAMENTO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0',
];

function getRandomUserAgent`);

// replace callsite
content = content.replace("console.warn('⚠️ Imagem não encontrada, tentando buscar no DuckDuckGo para:', name);", "console.warn('⚠️ Imagem não encontrada, tentando buscar no Bing para:', name);");
content = content.replace("const ddgResults = await searchDuckDuckGoImages(name);", "const ddgResults = await searchBingImages(name);");
content = content.replace("console.log('✅ Imagem encontrada no DuckDuckGo:', imageUrl);", "console.log('✅ Imagem encontrada no Bing:', imageUrl);");
content = content.replace("console.error('❌ Erro ao buscar imagem no DuckDuckGo:', ddgErr);", "console.error('❌ Erro ao buscar imagem no Bing:', ddgErr);");

fs.writeFileSync('local_scraper.ts', content);
