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
  // Caso especial: Mercado Livre Social Links (/social/)
  // Promobit/Pechinchou usam isso. O conteúdo é renderizado por JS, mas o ML
  // tem um endpoint interno (/api/social-profile) que retorna os itens em JSON.
  if (url.toLowerCase().includes('mercadolivre.com.br/social/')) {
    try {
      console.log(`[Affiliate] Resolvendo link social do ML: ${url}`);

      // Extrair o nome do perfil da URL (ex: "promobit" de /social/promobit)
      const profileMatch = url.match(/mercadolivre\.com\.br\/social\/([^/?&]+)/i);
      const profileName = profileMatch?.[1];

      // Extrair o ref da URL — identifica o ITEM ESPECÍFICO da vitrine
      const refMatch = url.match(/[?&]ref=([^&]+)/i);
      const refId = refMatch?.[1];

      // Estratégia 1: API interna do ML com o ref do item específico
      if (profileName) {
        try {
          // Se temos o ref, buscamos o item exato; senão, fallback para o mais recente
          const apiUrl = refId
            ? `https://www.mercadolivre.com.br/social-profile/profile/${profileName}/items/${encodeURIComponent(refId)}`
            : `https://www.mercadolivre.com.br/social-profile/profile/${profileName}/items?limit=1`;

          console.log(`[Affiliate] API ML: ${apiUrl}`);
          const apiResp = await fetch(apiUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
              'Accept': 'application/json, text/plain, */*',
              'Referer': `https://www.mercadolivre.com.br/social/${profileName}`,
              'x-requested-with': 'XMLHttpRequest',
            }
          });
          if (apiResp.ok) {
            const json = await apiResp.json();
            // Quando chamado com ref, o ML retorna o item direto; senão vem dentro de items[]/results[]
            const item = refId
              ? json
              : (json?.items?.[0] || json?.results?.[0] || json?.[0]);
            const permalink = item?.permalink || item?.url || item?.item_url;
            if (permalink) {
              const cleanPermalink = permalink.split('?')[0];
              console.log(`[Affiliate] 💥 Vitrine destruída via API ML (ref=${refId ?? 'n/a'})! Produto: ${cleanPermalink}`);
              return cleanPermalink;
            }
          } else {
            console.warn(`[Affiliate] API ML retornou HTTP ${apiResp.status} para ref=${refId}`);
          }
        } catch (apiErr) {
          console.warn(`[Affiliate] API ML social falhou:`, apiErr instanceof Error ? apiErr.message : apiErr);
        }
      }

      // Estratégia 2: Buscar o HTML e tentar extrair do JSON embutido (__PRELOADED_STATE__ ou similar)
      const htmlResp = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9',
        }
      });
      const html = await htmlResp.text();

      // Tentar extrair permalink de JSON embutido na página
      const jsonMatches = [
        html.match(/"permalink"\s*:\s*"(https?:\/\/(?:produto|www)\.mercadolivre\.com\.br\/[^"]+)"/i),
        html.match(/"item_url"\s*:\s*"(https?:\/\/(?:produto|www)\.mercadolivre\.com\.br\/[^"]+)"/i),
        html.match(/"url"\s*:\s*"(https?:\/\/produto\.mercadolivre\.com\.br\/[^"]+)"/i),
      ];

      for (const jsonMatch of jsonMatches) {
        if (jsonMatch?.[1]) {
          const productUrl = jsonMatch[1].replace(/\\/g, '').split('?')[0];
          console.log(`[Affiliate] 💥 Vitrine destruída via JSON embutido! Produto: ${productUrl}`);
          return productUrl;
        }
      }

      // Estratégia 3: regex direto no HTML (funciona se o ML não bloquear)
      const regexMatch = html.match(/(https?:\/\/(?:produto|www)\.mercadolivre\.com\.br\/(?:p\/MLB-?\d+|MLB-?\d+)[^"'\s\\<>]*)/i);
      if (regexMatch?.[1]) {
        const productUrl = regexMatch[1].replace(/&amp;/g, '&').split('?')[0];
        console.log(`[Affiliate] 💥 Vitrine destruída via regex! Produto: ${productUrl}`);
        return productUrl;
      }

      console.warn(`[Affiliate] Todas as estratégias falharam para a vitrine ML. HTML length: ${html.length}. Retornando URL original.`);
    } catch (err) {
      console.warn(`[Affiliate] Erro ao extrair produto do ML Social:`, err instanceof Error ? err.message : err);
    }
  }

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
    'mercadolivre.com/sec',
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
      console.log(`[Affiliate] URL final resolvida (HEAD): ${response.url}`);
      if (response.url.toLowerCase().includes('mercadolivre.com.br/social/')) {
        return resolveRedirect(response.url);
      }
      return response.url;
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
      
      if (finalUrl.toLowerCase().includes('mercadolivre.com.br/social/')) {
        return resolveRedirect(finalUrl);
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
        const mlUrl = new URL(details.cleanUrl);
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
