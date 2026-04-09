export type ScrapedProduct = {
  name: string;
  imageUrl: string;
  price?: number;
  description?: string;
};

export async function scrapeProductFromUrl(url: string): Promise<ScrapedProduct> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    
    // Detectar plataforma
    const platform = detectPlatform(url);
    
    console.log('Platform detected:', platform);
    console.log('HTML length:', html.length);
    
    // Extrair dados básicos usando regex simples
    const name = extractName(html, platform);
    const imageUrl = extractImage(html, platform);
    const price = extractPrice(html, platform);
    const description = extractDescription(html, platform);
    
    console.log('Extracted data:', { name, imageUrl, price, description });
    
    return {
      name: name || 'Produto sem nome',
      imageUrl: imageUrl || 'https://via.placeholder.com/800x1000',
      price: price ?? undefined,
      description: description ?? undefined
    };
  } catch (error) {
    console.error('Erro ao buscar produto:', error);
    throw new Error('Não foi possível buscar os dados do produto');
  }
}

function detectPlatform(url: string): string {
  if (url.includes('amazon')) return 'amazon';
  if (url.includes('mercadolivre') || url.includes('mercadolibre')) return 'mercadolivre';
  if (url.includes('shopee')) return 'shopee';
  if (url.includes('aliexpress')) return 'aliexpress';
  if (url.includes('tiktok')) return 'tiktok';
  return 'unknown';
}

function extractName(html: string, platform: string): string | null {
  const patterns: Record<string, RegExp> = {
    amazon: /<span id="productTitle"[^>]*>([^<]+)<\/span>/i,
    mercadolivre: /<h1[^>]*class="[^"]*ui-pdp-title[^"]*"[^>]*>([^<]+)<\/h1>/i,
    shopee: /"name":"([^"]+)"/i,
    aliexpress: /"title":"([^"]+)"/i,
  };
  
  const pattern = patterns[platform];
  if (!pattern) return null;
  
  const match = html.match(pattern);
  return match ? match[1].trim() : null;
}

function extractImage(html: string, platform: string): string | null {
  const patterns: Record<string, RegExp> = {
    amazon: /"hiRes":"([^"]+)"/i,
    mercadolivre: /<img[^>]*class="[^"]*ui-pdp-image[^"]*"[^>]*src="([^"]+)"/i,
    shopee: /"image":"([^"]+)"/i,
    aliexpress: /"imageUrl":"([^"]+)"/i,
  };
  
  const pattern = patterns[platform];
  if (!pattern) return null;
  
  const match = html.match(pattern);
  return match ? match[1] : null;
}

function extractPrice(html: string, platform: string): number | null {
  const patterns: Record<string, RegExp> = {
    amazon: /<span class="a-price-whole">([0-9.,]+)<\/span>/i,
    mercadolivre: /<span class="[^"]*price-tag-fraction[^"]*">([0-9.,]+)<\/span>/i,
    shopee: /"price":([0-9]+)/i,
    aliexpress: /"price":"([0-9.,]+)"/i,
  };
  
  const pattern = patterns[platform];
  if (!pattern) return null;
  
  const match = html.match(pattern);
  if (!match) return null;
  
  const priceStr = match[1].replace(/[.,]/g, '');
  return parseFloat(priceStr) / 100;
}

function extractDescription(html: string, platform: string): string | null {
  const patterns: Record<string, RegExp> = {
    amazon: /<div id="feature-bullets"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i,
    mercadolivre: /<p class="[^"]*ui-pdp-description[^"]*">([^<]+)<\/p>/i,
  };
  
  const pattern = patterns[platform];
  if (!pattern) return null;
  
  const match = html.match(pattern);
  return match ? match[1].trim().substring(0, 200) : null;
}
