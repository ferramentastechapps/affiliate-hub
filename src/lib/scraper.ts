import * as cheerio from 'cheerio';

export type ScrapedProduct = {
  name: string;
  imageUrl: string;
  price?: number;
  description?: string;
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔍 SCRAPER ROBUSTO COM CHEERIO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function scrapeProductFromUrl(url: string): Promise<ScrapedProduct> {
  try {
    console.log('🔍 Iniciando scraping:', url);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0',
      },
      // Timeout de 10 segundos
      signal: AbortSignal.timeout(10000),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Detectar plataforma
    const platform = detectPlatform(url);
    console.log('🏪 Plataforma detectada:', platform);
    
    // Extrair dados usando seletores específicos por plataforma
    let name = '';
    let imageUrl = '';
    let price: number | undefined = undefined;
    let description = '';
    
    switch (platform) {
      case 'amazon':
        name = extractAmazonName($);
        imageUrl = extractAmazonImage($);
        price = extractAmazonPrice($);
        description = extractAmazonDescription($);
        break;
        
      case 'mercadolivre':
        name = extractMercadoLivreName($);
        imageUrl = extractMercadoLivreImage($);
        price = extractMercadoLivrePrice($);
        description = extractMercadoLivreDescription($);
        break;
        
      case 'shopee':
        name = extractShopeeName($);
        imageUrl = extractShopeeImage($);
        price = extractShopeePrice($);
        description = extractShopeeDescription($);
        break;
        
      case 'aliexpress':
        name = extractAliExpressName($);
        imageUrl = extractAliExpressImage($);
        price = extractAliExpressPrice($);
        description = extractAliExpressDescription($);
        break;
        
      default:
        // Fallback genérico
        name = extractGenericName($);
        imageUrl = extractGenericImage($);
        price = extractGenericPrice($);
        description = extractGenericDescription($);
    }
    
    console.log('✅ Dados extraídos:', { name, imageUrl, price, description: description?.substring(0, 50) });
    
    // Validar dados mínimos
    if (!name || name.length < 3) {
      throw new Error('Nome do produto não encontrado ou inválido');
    }
    
    if (!imageUrl || !imageUrl.startsWith('http')) {
      console.warn('⚠️ Imagem não encontrada, usando placeholder');
      imageUrl = 'https://via.placeholder.com/800x1000/18181b/71717a?text=Sem+Imagem';
    }
    
    return {
      name: cleanText(name),
      imageUrl: cleanUrl(imageUrl),
      price: price ?? undefined,
      description: description ? cleanText(description).substring(0, 500) : undefined,
    };
    
  } catch (error) {
    console.error('❌ Erro ao buscar produto:', error);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Timeout: O site demorou muito para responder');
      }
      throw new Error(`Erro ao buscar produto: ${error.message}`);
    }
    
    throw new Error('Não foi possível buscar os dados do produto');
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🏪 DETECTAR PLATAFORMA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function detectPlatform(url: string): string {
  const urlLower = url.toLowerCase();
  if (urlLower.includes('amazon.com')) return 'amazon';
  if (urlLower.includes('mercadolivre.com') || urlLower.includes('mercadolibre.com')) return 'mercadolivre';
  if (urlLower.includes('shopee.com')) return 'shopee';
  if (urlLower.includes('aliexpress.com')) return 'aliexpress';
  if (urlLower.includes('tiktok.com')) return 'tiktok';
  return 'generic';
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🛒 AMAZON
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function extractAmazonName($: cheerio.CheerioAPI): string {
  return $('#productTitle').text().trim() ||
         $('h1.product-title').text().trim() ||
         $('span[id*="productTitle"]').text().trim() ||
         '';
}

function extractAmazonImage($: cheerio.CheerioAPI): string {
  // Tentar várias fontes de imagem
  const imgSrc = $('#landingImage').attr('src') ||
                 $('#imgBlkFront').attr('src') ||
                 $('.a-dynamic-image').first().attr('src') ||
                 $('img[data-old-hires]').first().attr('data-old-hires') ||
                 '';
  return imgSrc;
}

function extractAmazonPrice($: cheerio.CheerioAPI): number | undefined {
  const priceText = $('.a-price-whole').first().text().trim() ||
                    $('#priceblock_ourprice').text().trim() ||
                    $('#priceblock_dealprice').text().trim() ||
                    '';
  return parsePrice(priceText);
}

function extractAmazonDescription($: cheerio.CheerioAPI): string {
  return $('#feature-bullets ul li').map((_, el) => $(el).text().trim()).get().join(' ') ||
         $('#productDescription p').first().text().trim() ||
         '';
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🛍️ MERCADO LIVRE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function extractMercadoLivreName($: cheerio.CheerioAPI): string {
  return $('.ui-pdp-title').first().text().trim() ||
         $('h1.ui-pdp-title').text().trim() ||
         $('h1[class*="title"]').first().text().trim() ||
         '';
}

function extractMercadoLivreImage($: cheerio.CheerioAPI): string {
  return $('.ui-pdp-image').first().attr('src') ||
         $('img.ui-pdp-image').first().attr('src') ||
         $('figure img').first().attr('src') ||
         '';
}

function extractMercadoLivrePrice($: cheerio.CheerioAPI): number | undefined {
  const priceText = $('.andes-money-amount__fraction').first().text().trim() ||
                    $('span[class*="price-tag-fraction"]').first().text().trim() ||
                    '';
  return parsePrice(priceText);
}

function extractMercadoLivreDescription($: cheerio.CheerioAPI): string {
  return $('.ui-pdp-description__content').first().text().trim() ||
         $('p.ui-pdp-description').first().text().trim() ||
         '';
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🛒 SHOPEE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function extractShopeeName($: cheerio.CheerioAPI): string {
  return $('span[class*="product-title"]').first().text().trim() ||
         $('.product-name').first().text().trim() ||
         $('h1').first().text().trim() ||
         '';
}

function extractShopeeImage($: cheerio.CheerioAPI): string {
  return $('.product-image img').first().attr('src') ||
         $('img[class*="product"]').first().attr('src') ||
         '';
}

function extractShopeePrice($: cheerio.CheerioAPI): number | undefined {
  const priceText = $('div[class*="price"]').first().text().trim() ||
                    $('span[class*="price"]').first().text().trim() ||
                    '';
  return parsePrice(priceText);
}

function extractShopeeDescription($: cheerio.CheerioAPI): string {
  return $('div[class*="description"]').first().text().trim() ||
         $('.product-detail').first().text().trim() ||
         '';
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎁 ALIEXPRESS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function extractAliExpressName($: cheerio.CheerioAPI): string {
  return $('h1[class*="title"]').first().text().trim() ||
         $('.product-title').first().text().trim() ||
         $('h1').first().text().trim() ||
         '';
}

function extractAliExpressImage($: cheerio.CheerioAPI): string {
  return $('.magnifier-image').first().attr('src') ||
         $('img[class*="product"]').first().attr('src') ||
         '';
}

function extractAliExpressPrice($: cheerio.CheerioAPI): number | undefined {
  const priceText = $('span[class*="price"]').first().text().trim() ||
                    $('.product-price-value').first().text().trim() ||
                    '';
  return parsePrice(priceText);
}

function extractAliExpressDescription($: cheerio.CheerioAPI): string {
  return $('.product-description').first().text().trim() ||
         $('div[class*="description"]').first().text().trim() ||
         '';
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌐 GENÉRICO (FALLBACK)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function extractGenericName($: cheerio.CheerioAPI): string {
  return $('h1').first().text().trim() ||
         $('title').text().trim() ||
         $('meta[property="og:title"]').attr('content') ||
         '';
}

function extractGenericImage($: cheerio.CheerioAPI): string {
  return $('meta[property="og:image"]').attr('content') ||
         $('img').first().attr('src') ||
         '';
}

function extractGenericPrice($: cheerio.CheerioAPI): number | undefined {
  const priceText = $('[class*="price"]').first().text().trim() ||
                    $('[id*="price"]').first().text().trim() ||
                    '';
  return parsePrice(priceText);
}

function extractGenericDescription($: cheerio.CheerioAPI): string {
  return $('meta[name="description"]').attr('content') ||
         $('meta[property="og:description"]').attr('content') ||
         $('p').first().text().trim() ||
         '';
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🧹 UTILITÁRIOS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function parsePrice(priceText: string): number | undefined {
  if (!priceText) return undefined;
  
  // Remove tudo exceto números, vírgulas e pontos
  const cleaned = priceText.replace(/[^\d.,]/g, '');
  
  // Tenta diferentes formatos
  // Formato BR: 1.234,56 -> 1234.56
  if (cleaned.includes(',')) {
    const normalized = cleaned.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? undefined : parsed;
  }
  
  // Formato US: 1,234.56 -> 1234.56
  const normalized = cleaned.replace(/,/g, '');
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? undefined : parsed;
}

function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, ' ')
    .trim();
}

function cleanUrl(url: string): string {
  try {
    // Remove parâmetros desnecessários mas mantém a URL válida
    const urlObj = new URL(url);
    return urlObj.href;
  } catch {
    return url;
  }
}
