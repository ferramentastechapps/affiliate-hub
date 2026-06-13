import { URL } from 'url';
import * as cheerio from 'cheerio';

/**
 * Interface para representar os detalhes extraídos de uma URL de produto
 */
interface UrlDetails {
  rawUrl: string;
  cleanUrl: string;
  hostname: string;
  path: string;
  asin?: string;
  productId?: string;
}

/**
 * Resolve encurtadores de links seguindo redirecionamentos HTTP
 * para obter a URL final real da loja.
 */
export async function resolveRedirect(url: string): Promise<string> {
  // Caso especial: página de oferta do Promobit (precisamos extrair o link de saída do HTML)
  if (url.toLowerCase().includes('promobit.com.br/oferta/')) {
    try {
      console.log(`[Affiliate] Raspando página da oferta do Promobit para obter o link real: ${url}`);
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      const html = await response.text();
      const $ = cheerio.load(html);
      
      const scriptText = $('#__NEXT_DATA__').text();
      if (scriptText) {
        const data = JSON.parse(scriptText);
        // O caminho dos dados pode variar, tentando algumas opções comuns no Promobit
        const serverOffer = data.props?.pageProps?.serverOffer || data.props?.pageProps?.offer || {};
        const outboundUrl = serverOffer.offerUrl;
        
        if (outboundUrl) {
          console.log(`[Affiliate] Link real extraído do Promobit: ${outboundUrl}`);
          // Resolve recursivamente o link real encontrado (que pode ser amzn.to ou redirecionar mais)
          return resolveRedirect(outboundUrl);
        }

        // Se não encontrou o link de saída, tenta extrair pelo endpoint de redirecionamento
        const offerId = serverOffer.offerId;
        if (offerId) {
          const redirectUrl = `https://www.promobit.com.br/Redirect/to/${offerId}/`;
          const redirectResponse = await fetch(redirectUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
          });
          const redirectHtml = await redirectResponse.text();
          // O Promobit redireciona por javascript com a variável l = 'url';
          const match = redirectHtml.match(/l\s*=\s*['"](https?:\/\/[^'"]+)['"]/);
          
          if (match && match[1]) {
            const resolvedOutboundUrl = match[1];
            console.log(`[Affiliate] Link real extraído do Promobit via endpoint: ${resolvedOutboundUrl}`);
            return resolveRedirect(resolvedOutboundUrl);
          }
        }
      }
    } catch (err) {
      console.warn(`[Affiliate] Falha ao extrair link real do Promobit:`, err instanceof Error ? err.message : err);
    }
  }

  // Caso especial: Mercado Livre Social Links (/social/)
  // Esses links não são redirecionamentos HTTP 301/302 para o produto diretamente,
  // mas sim páginas HTML (coleções/listas) que contêm o link do produto.
  if (url.toLowerCase().includes('mercadolivre.com.br/social/')) {
    try {
      console.log(`[Affiliate] Resolvendo link social do Mercado Livre: ${url}`);
      // As vezes o ML precisa do /lists no final para carregar a página HTML corretamente com os itens
      const listUrl = url.endsWith('/lists') ? url : url.replace(/\?.*/, '') + '/lists';
      const response = await fetch(listUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          'sec-ch-ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"Windows"',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1'
        }
      });
      const html = await response.text();
      // Procura pelo primeiro link de produto na página
      const match = html.match(/href="([^"]*produto\.mercadolivre\.com\.br\/MLB-[^"]+)"/i);
      
      if (match && match[1]) {
        // O link vem com entidades HTML, precisa limpar (ex: &amp; -> &)
        let productUrl = match[1].replace(/&amp;/g, '&');
        console.log(`[Affiliate] URL real extraída do ML Social: ${productUrl}`);
        
        try {
          const urlObj = new URL(productUrl);
          urlObj.searchParams.delete('matt_tracing_id');
          urlObj.searchParams.delete('matt_event_ts');
          urlObj.searchParams.delete('matt_d2id');
          urlObj.searchParams.delete('source');
          urlObj.searchParams.delete('type');
          urlObj.searchParams.delete('tracking_id');
          urlObj.hash = '';
          return urlObj.toString();
        } catch {
          return productUrl;
        }
      } else {
        console.warn(`[Affiliate] Falha: Não encontrou o link do produto no HTML do ML Social. O servidor do ML pode estar bloqueando a VPS (status ${response.status}). HTML len: ${html.length}`);
      }
    } catch (err) {
      console.warn(`[Affiliate] Erro fatal ao resolver link social do Mercado Livre:`, err instanceof Error ? err.message : err);
    }
  }

  // Caso especial: página de oferta do Pechinchou (precisamos extrair o link de saída do HTML)
  if (url.toLowerCase().includes('pechinchou.com.br/oferta/')) {
    try {
      console.log(`[Affiliate] Raspando página da oferta do Pechinchou para obter o link real: ${url}`);
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      const html = await response.text();
      const $ = cheerio.load(html);
      
      const scriptText = $('#__NEXT_DATA__').text();
      if (scriptText) {
        const data = JSON.parse(scriptText);
        const promo = data.props?.pageProps?.promo || {};
        const outboundUrl = promo.long_url || promo.short_url;
        
        if (outboundUrl) {
          console.log(`[Affiliate] Link real extraído do Pechinchou: ${outboundUrl}`);
          // Resolve recursivamente o link real encontrado
          return resolveRedirect(outboundUrl);
        }
      }
    } catch (err) {
      console.warn(`[Affiliate] Falha ao extrair link real do Pechinchou:`, err instanceof Error ? err.message : err);
    }
  }

  // Se não for link curto conhecido, não precisa gastar tempo fazendo requisição
  const isShortLink = [
    'amzn.to',
    'shope.ee',
    's.click.aliexpress.com',
    'a.aliexpress.com',
    'meli.la',
    'magalu.at',
    'tidd.ly',
    'bit.ly',
    'tinyurl.com',
    's.shopee.com.br', // adicionado Shopee shortener
  ].some(domain => url.toLowerCase().includes(domain));

  if (!isShortLink) {
    return url;
  }

  try {
    console.log(`[Affiliate] Resolvendo redirecionamento para URL curta: ${url}`);
    
    // Tenta primeiro usando HEAD (mais rápido)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (response.url && response.url !== url) {
      // Se for uma vitrine social do Mercado Livre, precisamos do GET para ler o HTML
      if (!response.url.includes('mercadolivre.com.br/social/')) {
        console.log(`[Affiliate] URL final resolvida (HEAD): ${response.url}`);
        return response.url;
      }
    }
    
    // Se falhar, não mudar, ou for vitrine (precisa ler HTML), tenta GET
    const getController = new AbortController();
    const getTimeoutId = setTimeout(() => getController.abort(), 8000);
    
    const getResponse = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: getController.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    clearTimeout(getTimeoutId);
    
    if (getResponse.url) {
      let finalUrl = getResponse.url;
      
      // DESTRUIDOR DE VITRINE PECHINCHOU/ML:
      // Se caiu em uma página "social" (coleção/vitrine), extrai o primeiro produto real
      if (finalUrl.includes('mercadolivre.com.br/social/')) {
        try {
          const html = await getResponse.text();
          // Procura por um link real de produto para evitar pegar IDs de rastreamento no HTML
          const mlbMatch = html.match(/produto\.mercadolivre\.com\.br\/(MLB-?\d+)/);
          if (mlbMatch && mlbMatch[1]) {
            let mlbId = mlbMatch[1];
            if (!mlbId.includes('-')) {
              mlbId = mlbId.replace('MLB', 'MLB-');
            }
            finalUrl = `https://produto.mercadolivre.com.br/${mlbId}`;
            console.log(`[Affiliate] 💥 Vitrine detectada! Produto real extraído: ${finalUrl}`);
            return finalUrl;
          }
        } catch (e) {
          console.warn(`[Affiliate] Erro ao extrair produto da vitrine:`, e);
        }
      }
      
      console.log(`[Affiliate] URL final resolvida (GET): ${finalUrl}`);
      return finalUrl;
    }
  } catch (err) {
    console.warn(`[Affiliate] Falha ao resolver redirecionamento de ${url}:`, err instanceof Error ? err.message : err);
  }

  return url;
}

/**
 * Detecta a plataforma de compras correspondente a uma URL
 */
export function detectPlatform(url: string): string | null {
  const urlLower = url.toLowerCase();
  
  if (urlLower.includes('amazon') || urlLower.includes('amzn.to')) return 'amazon';
  if (urlLower.includes('shopee') || urlLower.includes('shope.ee')) return 'shopee';
  if (urlLower.includes('aliexpress') || urlLower.includes('s.click.aliexpress') || urlLower.includes('a.aliexpress')) return 'aliexpress';
  if (urlLower.includes('mercadolivre') || urlLower.includes('mercadofree') || urlLower.includes('meli.la')) return 'mercadoLivre';
  if (urlLower.includes('tiktok.com')) return 'tiktok';
  if (urlLower.includes('netshoes')) return 'netshoes';
  if (urlLower.includes('magazineluiza') || urlLower.includes('magalu') || urlLower.includes('magazinevoce')) return 'magalu';
  if (urlLower.includes('kabum')) return 'kabum';
  
  return null;
}

/**
 * Extrai detalhes relevantes de uma URL de produto
 */
export function extractUrlDetails(urlStr: string): UrlDetails {
  try {
    const parsed = new URL(urlStr);
    const hostname = parsed.hostname;
    const path = parsed.pathname;
    
    // Limpar parâmetros de busca para obter a cleanUrl
    const cleanUrl = `${parsed.protocol}//${parsed.hostname}${parsed.pathname}`;
    
    const details: UrlDetails = {
      rawUrl: urlStr,
      cleanUrl,
      hostname,
      path,
    };
    
    const urlLower = urlStr.toLowerCase();
    
    // 1. Extrair ASIN (Amazon)
    if (urlLower.includes('amazon')) {
      const asinMatch = urlStr.match(/(?:\/dp\/|\/gp\/product\/|\/gp\/aw\/d\/)([A-Z0-9]{10})/i);
      if (asinMatch) {
        details.asin = asinMatch[1].toUpperCase();
      }
    }
    
    // 2. Extrair Product ID (Mercado Livre)
    if (urlLower.includes('mercadolivre')) {
      // Ex: /p/MLB2837380 ou MLB-12345
      const mlbMatch = urlStr.match(/(MLB-?\d+)/i);
      if (mlbMatch) {
        details.productId = mlbMatch[1].replace('-', '').toUpperCase();
      }
    }
    
    // 3. Extrair ID para outras plataformas
    if (urlLower.includes('shopee')) {
      // Shopee IDs podem ser extraídos do final do link: i.SHOP_ID.PRODUCT_ID
      const shopeeMatch = urlStr.match(/i\.(\d+)\.(\d+)/);
      if (shopeeMatch) {
        details.productId = `${shopeeMatch[1]}_${shopeeMatch[2]}`;
      }
    }

    if (urlLower.includes('magazineluiza') || urlLower.includes('magalu')) {
      // Magalu IDs costumam ser a primeira parte depois de /p/
      const magaluMatch = urlStr.match(/\/p\/([a-z0-9]+)/i);
      if (magaluMatch) {
        details.productId = magaluMatch[1];
      }
    }
    
    return details;
  } catch {
    // Fallback se a URL for malformada
    return {
      rawUrl: urlStr,
      cleanUrl: urlStr,
      hostname: '',
      path: '',
    };
  }
}

/**
 * Gera um link de afiliado para uma URL original com base no arquivo .env
 */
export async function generateAffiliateLink(originalUrl: string): Promise<string | null> {
  if (!originalUrl) return null;

  // 1. Resolver redirecionamentos de URLs curtas
  const resolvedUrl = await resolveRedirect(originalUrl);
  
  // 2. Detectar plataforma
  const platform = detectPlatform(resolvedUrl);
  if (!platform) {
    console.log(`[Affiliate] Plataforma não suportada para autogeração de links: ${resolvedUrl}`);
    return null;
  }
  
  // 3. Extrair detalhes da URL
  const details = extractUrlDetails(resolvedUrl);
  
  // 4. Mapear variáveis de ambiente por plataforma
  const envPrefix = platform === 'mercadoLivre' ? 'MERCADOLIVRE' : platform.toUpperCase();
  const templateEnv = process.env[`${envPrefix}_TEMPLATE`];
  
  // 5. Verificar regras especiais ou fallbacks
  
  // --- AMAZON ---
  if (platform === 'amazon') {
    const amazonTag = process.env.AMAZON_TAG;
    if (templateEnv) {
      return applyTemplate(templateEnv, details, amazonTag);
    }
    if (amazonTag && details.asin) {
      return `https://www.amazon.com.br/dp/${details.asin}?tag=${amazonTag}`;
    }
    if (amazonTag) {
      // Sem ASIN mas com tag, tenta anexar na URL limpa
      return details.cleanUrl.includes('?') 
        ? `${details.cleanUrl}&tag=${amazonTag}`
        : `${details.cleanUrl}?tag=${amazonTag}`;
    }
  }
  
  // --- MAGALU ---
  if (platform === 'magalu') {
    const magaluShop = process.env.MAGALU_SHOP;
    if (templateEnv) {
      return applyTemplate(templateEnv, details, undefined, magaluShop);
    }
    if (magaluShop) {
      // Converte magazineluiza.com.br/p/123/ para magazinevoce.com.br/shopname/p/123/
      // Remove barra inicial se houver no path
      const pathClean = details.path.startsWith('/') ? details.path : `/${details.path}`;
      return `https://www.magazinevoce.com.br/${magaluShop}${pathClean}`;
    }
  }
  
  // --- MERCADO LIVRE ---
  if (platform === 'mercadoLivre') {
    const mlTag = process.env.MERCADOLIVRE_TAG;
    const mlWord = process.env.MERCADOLIVRE_WORD || mlTag || '';
    
    if (mlTag) {
      // O Mercado Livre usa a tag 'matt_tool' para rastreamento de afiliados e 'matt_word'
      // Precisamos substituir qualquer 'matt_tool' existente ou adicionar à URL limpa
      try {
        const mlUrl = new URL(details.rawUrl);
        mlUrl.searchParams.set('matt_tool', mlTag);
        mlUrl.searchParams.set('matt_word', mlWord);
        return mlUrl.toString();
      } catch {
        return details.cleanUrl.includes('?') 
          ? `${details.cleanUrl}&matt_tool=${mlTag}&matt_word=${mlWord}`
          : `${details.cleanUrl}?matt_tool=${mlTag}&matt_word=${mlWord}`;
      }
    } else if (templateEnv) {
      return applyTemplate(templateEnv, details, mlTag);
    }
  }

  // --- OUTRAS PLATAFORMAS (Usa template genérico) ---
  if (templateEnv) {
    const defaultTag = process.env[`${envPrefix}_TAG`];
    return applyTemplate(templateEnv, details, defaultTag);
  }
  
  console.log(`[Affiliate] Nenhuma configuração de autogeração encontrada no .env para a plataforma ${platform}`);
  return null;
}

/**
 * Substitui os placeholders de um modelo de URL pelos valores correspondentes
 */
function applyTemplate(template: string, details: UrlDetails, tag?: string, shop?: string): string {
  let result = template;
  
  result = result.replace(/{url}/g, details.rawUrl);
  result = result.replace(/{urlEncoded}/g, encodeURIComponent(details.rawUrl));
  result = result.replace(/{cleanUrl}/g, details.cleanUrl);
  result = result.replace(/{cleanUrlEncoded}/g, encodeURIComponent(details.cleanUrl));
  result = result.replace(/{path}/g, details.path);
  result = result.replace(/{hostname}/g, details.hostname);
  
  if (details.asin) {
    result = result.replace(/{asin}/g, details.asin);
  }
  
  if (details.productId) {
    result = result.replace(/{productId}/g, details.productId);
  }
  
  if (tag) {
    result = result.replace(/{tag}/g, tag);
  }
  
  if (shop) {
    result = result.replace(/{shop}/g, shop);
  }
  
  return result;
}
