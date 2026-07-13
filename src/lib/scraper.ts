import * as cheerio from 'cheerio';

export type ScrapedProduct = {
  name: string;
  imageUrl: string;
  price?: number;
  description?: string;
  category?: string;
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔍 SCRAPER ROBUSTO COM CHEERIO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function scrapeProductFromUrl(url: string, disableDdgFallback: boolean = false): Promise<ScrapedProduct> {
  try {
    console.log('🔍 Iniciando scraping:', url);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': getRandomUserAgent(),
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
    let category = '';
    
    switch (platform) {
      case 'amazon':
        name = extractAmazonName($);
        imageUrl = extractAmazonImage($);
        price = extractAmazonPrice($);
        description = extractAmazonDescription($);
        category = extractAmazonCategory($);
        break;
        
      case 'mercadolivre':
        name = extractMercadoLivreName($);
        imageUrl = extractMercadoLivreImage($);
        price = extractMercadoLivrePrice($);
        description = extractMercadoLivreDescription($);
        category = extractMercadoLivreCategory($);
        break;
        
      case 'shopee':
        name = extractShopeeName($);
        imageUrl = extractShopeeImage($);
        price = extractShopeePrice($);
        description = extractShopeeDescription($);
        category = extractShopeeCategory($);
        break;
        
      case 'aliexpress':
        name = extractAliExpressName($);
        imageUrl = extractAliExpressImage($);
        price = extractAliExpressPrice($);
        description = extractAliExpressDescription($);
        category = extractAliExpressCategory($);
        break;
        
      default:
        // Fallback genérico
        name = extractGenericName($);
        imageUrl = extractGenericImage($);
        price = extractGenericPrice($);
        description = extractGenericDescription($);
        category = extractGenericCategory($);
    }
    
    console.log('✅ Dados extraídos:', { name, imageUrl, price, category, description: description?.substring(0, 50) });
    
    // Validar dados mínimos
    if (!name || name.length < 3 || name === 'Robot Check' || name.toLowerCase().includes('captcha')) {
      console.warn('⚠️ Nome não extraído do HTML, tentando extrair do URL slug...');
      const slugName = extractNameFromUrl(url);
      if (slugName) {
        name = slugName;
        console.log('✅ Nome extraído do URL slug:', name);
      } else {
        throw new Error('Nome do produto não encontrado ou inválido');
      }
    }
    
    if (!disableDdgFallback && (!imageUrl || (!imageUrl.startsWith('http') && imageUrl !== '/placeholder.webp') || imageUrl.includes('placeholder'))) {
      console.warn('⚠️ Imagem não encontrada, tentando buscar no DuckDuckGo para:', name);
      try {
        const ddgResults = await searchDuckDuckGoImages(name);
        if (ddgResults && ddgResults.length > 0 && ddgResults[0].image) {
          imageUrl = ddgResults[0].image;
          console.log('✅ Imagem encontrada no DuckDuckGo:', imageUrl);
        }
      } catch (ddgErr) {
        console.error('❌ Erro ao buscar imagem no DuckDuckGo:', ddgErr);
      }
    }

    if (!imageUrl || (!imageUrl.startsWith('http') && imageUrl !== '/placeholder.webp')) {
      console.warn('⚠️ Imagem ainda não encontrada, usando placeholder');
      imageUrl = '/placeholder.webp';
    }
    
    return {
      name: cleanText(name),
      imageUrl: cleanUrl(imageUrl),
      price: price ?? undefined,
      description: description ? cleanText(description).substring(0, 500) : undefined,
      category: category ? mapToInternalCategory(cleanText(category)) : undefined,
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
  // 1. Tentar encontrar as imagens alternativas no bloco de script (lifestyle/detalhes)
  try {
    const scripts = $('script').map((_, el) => $(el).html() || '').get();
    for (const script of scripts) {
      if (script && (script.includes('colorImages') || script.includes('ImageBlockATF'))) {
        // Regex para capturar o array de imagens inicial
        const match = script.match(/'colorImages':\s*\{\s*'initial':\s*(\[.*?\])/) ||
                      script.match(/"colorImages":\s*\{\s*"initial":\s*(\[.*?\])/) ||
                      script.match(/'initial':\s*(\[.*?\])/) ||
                      script.match(/"initial":\s*(\[.*?\])/);
        if (match && match[1]) {
          const cleanJson = match[1].replace(/'/g, '"').replace(/(\w+):/g, '"$1":'); // Normalizar chaves para JSON
          try {
            const images = JSON.parse(cleanJson);
            // Pegar a segunda imagem (index 1) se existir, senão a primeira
            if (images.length > 1) {
              const secImg = images[1].hiRes || images[1].large || images[1].variant || images[1].thumb;
              if (secImg) return secImg;
            }
          } catch (jsonErr) {
            // Se falhar o parse do JSON, tenta capturar URLs diretamente por regex
            const urls = match[1].match(/https:\/\/[^"]+\.jpg/g) || match[1].match(/https:\/\/[^']+\.jpg/g);
            if (urls && urls.length > 1) {
              return urls[1];
            }
          }
        }
      }
    }
  } catch (e) {
    console.error('Erro ao extrair imagens secundárias da Amazon:', e);
  }

  // Fallback para a principal (primeira com fundo branco)
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

function extractAmazonCategory($: cheerio.CheerioAPI): string {
  // Breadcrumb da Amazon
  const breadcrumb = $('#wayfinding-breadcrumbs_feature_div a').map((_, el) => $(el).text().trim()).get().join(' > ') ||
                     $('.a-breadcrumb a').map((_, el) => $(el).text().trim()).get().join(' > ');
  
  if (breadcrumb) return breadcrumb;
  
  // Department meta tag
  const dept = $('meta[name="keywords"]').attr('content') || '';
  if (dept) return dept.split(',')[0].trim();
  
  return '';
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
  try {
    const images: string[] = [];
    $('img.ui-pdp-image').each((_, el) => {
      const src = $(el).attr('data-zoom') || $(el).attr('src');
      if (src && !src.includes('placeholder')) {
        images.push(src);
      }
    });
    // Sempre priorizar a primeira imagem (índice 0) como a imagem principal do produto (capa)
    if (images.length > 0) {
      return images[0];
    }
  } catch (e) {
    console.error('Erro ao extrair imagem do Mercado Livre:', e);
  }

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

function extractMercadoLivreCategory($: cheerio.CheerioAPI): string {
  // Breadcrumb do Mercado Livre
  const breadcrumb = $('.andes-breadcrumb__item a').map((_, el) => $(el).text().trim()).get().filter(Boolean).join(' > ') ||
                     $('.ui-breadcrumb a').map((_, el) => $(el).text().trim()).get().filter(Boolean).join(' > ');
  
  if (breadcrumb) return breadcrumb;
  
  // Tentar pelo script JSON-LD
  const scripts = $('script[type="application/ld+json"]').map((_, el) => $(el).html()).get();
  for (const script of scripts) {
    try {
      const data = JSON.parse(script || '{}');
      if (data.category) return data.category;
      if (data['@type'] === 'Product' && data.category) return data.category;
    } catch {}
  }
  
  return '';
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

function extractShopeeCategory($: cheerio.CheerioAPI): string {
  // Breadcrumb da Shopee
  const breadcrumb = $('.breadcrumb a').map((_, el) => $(el).text().trim()).get().filter(Boolean).join(' > ') ||
                     $('a[data-sqe="link"]').map((_, el) => $(el).text().trim()).get().filter(Boolean).join(' > ');
  
  return breadcrumb;
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

function extractAliExpressCategory($: cheerio.CheerioAPI): string {
  // Breadcrumb do AliExpress
  const breadcrumb = $('.breadcrumb a').map((_, el) => $(el).text().trim()).get().filter(Boolean).join(' > ') ||
                     $('[class*="breadcrumb"] a').map((_, el) => $(el).text().trim()).get().filter(Boolean).join(' > ');
  
  return breadcrumb;
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

function extractGenericCategory($: cheerio.CheerioAPI): string {
  // Tentar breadcrumb genérico
  const breadcrumb = $('.breadcrumb a, [class*="breadcrumb"] a, nav a').map((_, el) => $(el).text().trim()).get().filter(Boolean).join(' > ');
  
  if (breadcrumb) return breadcrumb;
  
  // Tentar categoria de meta tags
  const category = $('meta[property="product:category"]').attr('content') ||
                   $('meta[name="category"]').attr('content') ||
                   '';
  
  return category;
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

export async function getSecondaryLifestyleImage(links: Record<string, string | undefined>): Promise<string | null> {
  const platformsToScrape = ['amazon', 'mercadoLivre', 'shopee', 'aliexpress', 'magalu', 'kabum'];
  let targetUrl = '';
  for (const platform of platformsToScrape) {
    if (links[platform]) {
      targetUrl = links[platform] as string;
      break;
    }
  }

  if (!targetUrl) {
    return null;
  }

  try {
    console.log(`[Scraper-Imagem] Tentando extrair imagem secundária de: ${targetUrl}`);
    const scraped = await scrapeProductFromUrl(targetUrl, true);
    if (scraped.imageUrl && !scraped.imageUrl.includes('placeholder')) {
      console.log(`[Scraper-Imagem] Imagem secundária encontrada: ${scraped.imageUrl}`);
      return scraped.imageUrl;
    }
  } catch (e: any) {
    console.error('[Scraper-Imagem] Falha ao raspar imagem secundária do varejista:', e.message || e);
  }

  return null;
}

export async function scrapeRetailerData(links: Record<string, string | undefined>): Promise<{ imageUrl: string | null; price: number | null }> {
  const platformsToScrape = ['amazon', 'mercadoLivre', 'shopee', 'aliexpress', 'magalu', 'kabum'];
  let targetUrl = '';
  for (const platform of platformsToScrape) {
    if (links[platform]) {
      targetUrl = links[platform] as string;
      break;
    }
  }

  if (!targetUrl) {
    return { imageUrl: null, price: null };
  }

  try {
    console.log(`[Scraper-Varejista] Tentando extrair dados de: ${targetUrl}`);
    const scraped = await scrapeProductFromUrl(targetUrl, true);
    return {
      imageUrl: scraped.imageUrl && !scraped.imageUrl.includes('placeholder') ? scraped.imageUrl : null,
      price: scraped.price || null
    };
  } catch (e: any) {
    console.error('[Scraper-Varejista] Falha ao raspar dados do varejista:', e.message || e);
  }

  return { imageUrl: null, price: null };
}

export async function searchDuckDuckGoImages(query: string): Promise<any[]> {
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
    const jsonUrl = `https://duckduckgo.com/i.js?q=${encodeURIComponent(query)}&o=json&vqd=${vqd}&f=,,,`;
    const jsonRes = await fetch(jsonUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://duckduckgo.com/',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!jsonRes.ok) {
      console.warn('[DDG-Search] Falha ao obter JSON de imagens:', jsonRes.status);
      return [];
    }

    const data = await jsonRes.json();
    return data.results || [];
  } catch (err: any) {
    console.error('[DDG-Search] Erro ao buscar imagens no DuckDuckGo:', err.message || err);
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

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function extractNameFromUrl(urlStr: string): string | null {
  try {
    const parsed = new URL(urlStr);
    const pathname = parsed.pathname;
    if (!pathname || pathname === '/') return null;
    
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length === 0) return null;
    
    const dpIndex = parts.indexOf('dp');
    if (dpIndex > 0) {
      return cleanSlug(parts[dpIndex - 1]);
    }
    
    const pIndex = parts.indexOf('p');
    if (pIndex > 0) {
      return cleanSlug(parts[pIndex - 1]);
    }
    
    let bestSlug = '';
    for (const part of parts) {
      if (part.includes('-') && part.length > bestSlug.length && !['dp', 'p', 's'].includes(part)) {
        bestSlug = part;
      }
    }
    
    if (bestSlug) {
      return cleanSlug(bestSlug);
    }
    
    if (parts[0] && parts[0].length > 4 && !['dp', 'p', 's'].includes(parts[0])) {
      return cleanSlug(parts[0]);
    }
  } catch (err) {
    console.error('Erro ao extrair nome do URL:', err);
  }
  return null;
}

function cleanSlug(slug: string): string {
  let clean = decodeURIComponent(slug.replace(/[-_]/g, ' '));
  clean = clean.replace(/\.(html|php|htm)$/i, '');
  return clean.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ').trim();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🗺️ MAPEAMENTO DE CATEGORIAS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function mapToInternalCategory(rawCategory: string): string {
  if (!rawCategory) return 'Diversos';
  
  const normalized = rawCategory.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Smartphones e eletrônicos
  if (/(celular|smartphone|iphone|galaxy|xiaomi|telefone|mobile|android)/i.test(normalized)) return 'Smartphones';
  if (/(smart tv|televisao|televisor|tv |led tv|oled|qled)/i.test(normalized)) return 'Smart TVs';
  if (/(fone|headphone|earphone|earbud|airpod|headset|auricular)/i.test(normalized)) return 'Fones de Ouvido';
  if (/(caixa de som|speaker|alto-falante|soundbar|home theater)/i.test(normalized)) return 'Caixas de Som';
  if (/(smartwatch|relogio inteligente|apple watch|galaxy watch)/i.test(normalized)) return 'Smartwatches';
  if (/(camera|filmadora|gopro|webcam)/i.test(normalized)) return 'Câmeras';
  if (/(tablet|ipad)/i.test(normalized)) return 'Tablets';
  
  // Informática
  if (/(notebook|laptop|macbook|ultrabook)/i.test(normalized)) return 'Notebooks';
  if (/(computador|desktop|pc gamer|gabinete)/i.test(normalized)) return 'PCs e Desktops';
  if (/(monitor|display)/i.test(normalized)) return 'Monitores';
  if (/(teclado|mouse|mousepad|webcam|microfone|periferico)/i.test(normalized)) return 'Periféricos';
  if (/(ssd|hd|memoria|ram|pendrive)/i.test(normalized)) return 'SSD, HDs e Memória';
  if (/(console|playstation|xbox|nintendo|game|jogo|ps4|ps5)/i.test(normalized)) return 'Consoles e Games';
  
  // Casa
  if (/(air fryer|fritadeira|airfryer)/i.test(normalized)) return 'Air Fryers';
  if (/(cafeteira|nespresso|expresso)/i.test(normalized)) return 'Cafeteiras';
  if (/(geladeira|refrigerador|freezer)/i.test(normalized)) return 'Geladeiras e Freezers';
  if (/(lavadora|lava e seca|maquina de lavar)/i.test(normalized)) return 'Lavadoras';
  if (/(micro-ondas|microondas)/i.test(normalized)) return 'Micro-ondas';
  if (/(aspirador|roomba|vassoura)/i.test(normalized)) return 'Aspiradores';
  if (/(ar condicionado|ar-condicionado|split|climatizador)/i.test(normalized)) return 'Ar Condicionado';
  
  // Moda
  if (/(tenis|sapato|calcado|bota|sandalia|chinelo|sapatenis)/i.test(normalized)) return 'Tênis e Calçados';
  if (/(roupa|camiseta|camisa|calca|shorts|vestido|blusa|moda)/i.test(normalized)) return 'Roupas e Moda';
  if (/(bolsa|mochila|carteira|acessorio)/i.test(normalized)) return 'Bolsas e Acessórios';
  
  // Beleza
  if (/(perfume|fragancia|colonia)/i.test(normalized)) return 'Perfumes';
  if (/(maquiagem|batom|base|rimel|cosmetico)/i.test(normalized)) return 'Maquiagem e Pele';
  if (/(shampoo|condicionador|mascara capilar|cabelo)/i.test(normalized)) return 'Shampoo e Cabelo';
  
  // Esporte
  if (/(whey|protein|creatina|suplemento|bcaa)/i.test(normalized)) return 'Whey e Suplementos';
  if (/(bicicleta|bike|ciclismo|esporte|fitness|academia)/i.test(normalized)) return 'Bicicletas e Esporte';
  
  // Alimentos
  if (/(chocolate|doce|bombom|trufa)/i.test(normalized)) return 'Chocolates e Doces';
  if (/(cafe|cha|bebida)/i.test(normalized)) return 'Café e Bebidas';
  if (/(cerveja|vinho|whisky|vodka|alcool)/i.test(normalized)) return 'Cervejas e Vinhos';
  
  // Outros
  if (/(livro|ebook|kindle|e-reader)/i.test(normalized)) return 'Livros e eReaders';
  if (/(bebe|infantil|crianca|fralda|brinquedo)/i.test(normalized)) return 'Bebês e Crianças';
  if (/(pet|racao|animal|cachorro|gato)/i.test(normalized)) return 'Pet';
  if (/(ferramenta|furadeira|parafusadeira|martelo)/i.test(normalized)) return 'Ferramentas';
  if (/(automotivo|carro|moto|pneu)/i.test(normalized)) return 'Automotivo';
  if (/(viagem|mala|bagagem|hotel)/i.test(normalized)) return 'Viagem';
  
  return 'Diversos';
}
