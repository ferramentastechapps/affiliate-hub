import { URL } from 'url';
import * as cheerio from 'cheerio';
import crypto from 'crypto';

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
  // 0. Verificar se a URL contém outra URL embutida em parâmetros de redirecionamento/afiliados comuns (ex: ued= para Awin)
  try {
    const parsed = new URL(url);
    const params = ['ued', 'url', 'dest', 'destination', 'u', 'dl_target_url'];
    for (const p of params) {
      const val = parsed.searchParams.get(p);
      if (val && (val.startsWith('http://') || val.startsWith('https://'))) {
        console.log(`[Affiliate] URL aninhada extraída de parâmetro '${p}': ${val}`);
        return resolveRedirect(val); // Resolve recursivamente a URL interna
      }
    }
  } catch {}

  // Caso especial: Mercado Livre Social Links (/social/)
  // Promobit/Pechinchou usam isso. O conteúdo é renderizado por JS, mas o ML
  // tem um endpoint interno (/api/social-profile) que retorna os itens em JSON.
  if (url.toLowerCase().includes('mercadolivre.com.br/social/')) {
    try {
      console.log(`[Affiliate] Resolvendo link social do ML: ${url}`);

      // Extrair o nome do perfil da URL (ex: "promobit" de /social/promobit)
      const profileMatch = url.match(/mercadolivre\.com\.br\/social\/([^/?&]+)/i);
      const profileName = profileMatch?.[1];

      // Extrair o ref da URL usando URLSearchParams para evitar double encoding
      let refId: string | undefined;
      try {
        const parsedUrl = new URL(url);
        refId = parsedUrl.searchParams.get('ref') || undefined;
      } catch {
        const refMatch = url.match(/[?&]ref=([^&]+)/i);
        if (refMatch?.[1]) {
            try { refId = decodeURIComponent(refMatch[1]); } catch { refId = refMatch[1]; }
        }
      }

      // Estratégia 0: Decodificar o ref= como base64/JWT para extrair URL de produto diretamente
      // O ML codifica o permalink ou MLB no token ref= para identificar o item
      if (refId) {
        try {
          // Tentar decodificar: o ref pode ser base64url (RFC 4648)
          const decoded = Buffer.from(
            refId.replace(/-/g, '+').replace(/_/g, '/'),
            'base64'
          ).toString('utf8');

          // Verificar se o decode contém uma URL de produto ML ou um ID MLB
          const mlProductMatch = decoded.match(
            /(https?:\/\/(?:produto|www)\.mercadolivre\.com\.br\/[^\s"'<>]+)/i
          ) || decoded.match(/(MLB-?\d+)/i);

          if (mlProductMatch?.[1]) {
            const extracted = mlProductMatch[1];
            if (extracted.startsWith('http')) {
              const cleanExtracted = extracted.split('?')[0];
              console.log(`[Affiliate] 🔓 ref= decodificado → URL direta: ${cleanExtracted}`);
              return cleanExtracted;
            } else {
              // É um MLB ID, montar URL canônica
              const mlbId = extracted.replace('-', '');
              const productUrl = `https://produto.mercadolivre.com.br/${mlbId}`;
              console.log(`[Affiliate] 🔓 ref= decodificado → MLB ID: ${productUrl}`);
              return productUrl;
            }
          }

          // Tentar também como JSON (JWT payload)
          try {
            // JWT tem 3 partes separadas por '.'; decodificar o payload (parte do meio)
            const parts = refId.split('.');
            if (parts.length >= 2) {
              const payload = Buffer.from(
                parts[1].replace(/-/g, '+').replace(/_/g, '/'),
                'base64'
              ).toString('utf8');
              const jwtData = JSON.parse(payload);
              const jwtUrl = jwtData?.permalink || jwtData?.url || jwtData?.item_url || jwtData?.product_url;
              if (jwtUrl && (jwtUrl.includes('mercadolivre') || jwtUrl.includes('MLB'))) {
                const cleanJwtUrl = jwtUrl.split('?')[0];
                console.log(`[Affiliate] 🔓 JWT ref= decodificado → URL: ${cleanJwtUrl}`);
                return cleanJwtUrl;
              }
            }
          } catch { /* não é JWT, continuar */ }
        } catch { /* não é base64 válido, continuar */ }
      }

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
            const permalink = item?.permalink || item?.url || item?.item_url || item?.product_url || item?.link;
            if (permalink && (permalink.includes('mercadolivre') || permalink.includes('MLB'))) {
              const cleanPermalink = permalink.split('?')[0];
              console.log(`[Affiliate] 💥 Vitrine destruída via API ML (ref=${refId ?? 'n/a'})! Produto: ${cleanPermalink}`);
              return cleanPermalink;
            }
            // Verificar se a resposta tem uma lista mesmo com ref (alguns endpoints retornam array)
            if (Array.isArray(json) && json.length > 0) {
              const firstItem = json[0];
              const firstPermalink = firstItem?.permalink || firstItem?.url || firstItem?.item_url;
              if (firstPermalink) {
                const cleanFirst = firstPermalink.split('?')[0];
                console.log(`[Affiliate] 💥 Vitrine destruída via API ML (array, ref=${refId ?? 'n/a'})! Produto: ${cleanFirst}`);
                return cleanFirst;
              }
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

      console.warn(`[Affiliate] Todas as estratégias falharam para a vitrine ML. HTML length: ${html.length}. Descartando link de vitrine.`);
      return 'VITRINE_INVALIDA'; // Sinal especial para descartar este link
    } catch (err) {
      console.warn(`[Affiliate] Erro ao extrair produto do ML Social:`, err instanceof Error ? err.message : err);
    }
    // Se chegou até aqui, todas as tentativas falharam — descartar
    return 'VITRINE_INVALIDA';
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
    'magalu.me',
    'mgl.li',
    'maga.lu',
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
  if (
    urlLower.includes('magazineluiza') || 
    urlLower.includes('magalu') || 
    urlLower.includes('magazinevoce') || 
    urlLower.includes('influenciadormagalu') ||
    urlLower.includes('mgl.li') ||
    urlLower.includes('maga.lu')
  ) return 'magalu';
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

    if (
      urlLower.includes('magazineluiza') || 
      urlLower.includes('magalu') || 
      urlLower.includes('magazinevoce') || 
      urlLower.includes('influenciadormagalu') ||
      urlLower.includes('mgl.li') ||
      urlLower.includes('maga.lu')
    ) {
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
 * Limpa parâmetros de rastreamento e de afiliados conhecidos de uma URL
 */
export function cleanTrackingParams(urlStr: string): string {
  try {
    const parsed = new URL(urlStr);
    const paramsToRemove = [
      // Amazon
      'tag',
      // Mercado Livre
      'ref',
      'forceInApp',
      'matt_tool',
      'matt_word',
      'matt_tracing_id',
      'matt_source',
      'matt_campaign',
      'matt_ad_group',
      'matt_match_type',
      'matt_network',
      'matt_device',
      'matt_creative',
      'matt_keyword',
      'matt_ad_position',
      'matt_ad_type',
      'matt_merchant_id',
      'matt_product_id',
      'matt_product_partition_id',
      'matt_target_id',
      // General tracking / UTMs
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'utm_id',
      'fbclid',
      'gclid',
      'msclkid',
      'aff_id',
      'aff_sub',
      'aff_sub2',
      'aff_sub3',
      'aff_sub4',
      'aff_sub5',
      'aff_platform',
      'aff_trace_key',
      'spm',
      'scm',
      'ref_',
    ];

    // Coleciona parâmetros que devem ser deletados
    const toDelete = new Set<string>(paramsToRemove);

    // Remove qualquer parâmetro cujo nome ou valor contenha "parceiropechi"
    parsed.searchParams.forEach((value, key) => {
      if (
        key.toLowerCase().includes('parceiropechi') ||
        value.toLowerCase().includes('parceiropechi')
      ) {
        toDelete.add(key);
      }
    });

    toDelete.forEach((param) => {
      parsed.searchParams.delete(param);
    });

    let cleaned = parsed.toString();
    if (cleaned.endsWith('?')) {
      cleaned = cleaned.slice(0, -1);
    }
    return cleaned;
  } catch {
    return urlStr;
  }
}

/**
 * Gera um link de afiliado oficial da Shopee usando a API GraphQL
 */
export async function generateShopeeApiLink(originUrl: string, appId: string, appSecret: string): Promise<string | null> {
  const endpoint = 'https://open-api.affiliate.shopee.com.br/graphql';
  const timestamp = Math.floor(Date.now() / 1000);
  
  // O payload GraphQL precisa ser exatamente o mesmo na assinatura e no corpo
  const payload = JSON.stringify({
    query: `mutation {
  generateShortLink(input: {
    originUrl: "${originUrl}",
    subIds: ["telegram"]
  }) {
    shortLink
  }
}`.trim()
  });

  // Assinatura: SHA256(AppId + Timestamp + Payload + Secret)
  const baseString = appId + timestamp + payload + appSecret;
  const signature = crypto.createHash('sha256').update(baseString).digest('hex');

  const authorizationHeader = `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${signature}`;

  try {
    console.log(`[Shopee API] Enviando requisição GraphQL para o link: ${originUrl}`);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authorizationHeader
      },
      body: payload
    });

    if (!response.ok) {
      console.error(`[Shopee API] HTTP erro! Status: ${response.status}`);
      const text = await response.text();
      console.error(`[Shopee API] Detalhes do erro HTTP: ${text}`);
      return null;
    }

    const result = await response.json();
    if (result.errors) {
      console.error('[Shopee API] Erros no GraphQL:', result.errors);
      return null;
    }

    const shortLink = result.data?.generateShortLink?.shortLink;
    if (shortLink) {
      console.log(`[Shopee API] Link curto gerado com sucesso: ${shortLink}`);
      return shortLink;
    } else {
      console.error('[Shopee API] Resposta inesperada ou vazia do GraphQL:', JSON.stringify(result));
    }
  } catch (error) {
    console.error('[Shopee API] Falha na comunicação com a API da Shopee:', error);
  }

  return null;
}

/**
 * Gera um link de afiliado para uma URL original com base no arquivo .env
 */
export async function generateAffiliateLink(originalUrl: string): Promise<string | null> {
  if (!originalUrl) return null;

  // 1. Resolver redirecionamentos de URLs curtas
  const resolvedUrl = await resolveRedirect(originalUrl);
  
  // Se o link levou a uma vitrine de ML que não pôde ser resolvida, descartar
  if (resolvedUrl === 'VITRINE_INVALIDA') {
    console.warn(`[Affiliate] Link descartado pois leva a uma vitrine ML sem produto identificável: ${originalUrl}`);
    return null;
  }
  
  // Limpar parâmetros de rastreamento antes de processar
  const cleanedUrl = cleanTrackingParams(resolvedUrl);
  
  // 2. Detectar plataforma
  const platform = detectPlatform(cleanedUrl);
  if (!platform) {
    console.log(`[Affiliate] Plataforma não suportada para autogeração de links: ${cleanedUrl}`);
    return null;
  }
  
  // 3. Extrair detalhes da URL
  const details = extractUrlDetails(cleanedUrl);
  
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
      // 1. Se a URL contém 'divulgador' no path (links de parceiro/oferta de divulgador)
      // Extrair o ID do produto (SKU) se for uma oferta (/divulgador/oferta/ID) para evitar erro 404
      if (details.path.includes('/divulgador/')) {
        const ofertaMatch = details.path.match(/\/divulgador\/oferta\/([a-z0-9]+)/i);
        if (ofertaMatch) {
          const sku = ofertaMatch[1];
          console.log(`[Affiliate] Magalu: convertido link de divulgador para produto canônico → /p/${sku}/`);
          return `https://www.magazinevoce.com.br/${magaluShop}/p/${sku}/`;
        }

        const pathParts = details.path.split('/').filter(Boolean);
        const divulgadorIndex = pathParts.findIndex(p => p.toLowerCase() === 'divulgador');
        if (divulgadorIndex !== -1) {
          // Manter apenas do 'divulgador' em diante, e prependar o nosso shop (fallback)
          const cleanParts = pathParts.slice(divulgadorIndex);
          const newPath = `/${magaluShop}/${cleanParts.join('/')}`;
          console.log(`[Affiliate] Magalu: formatado link de divulgador (fallback) → ${newPath}`);
          return `https://www.magazinevoce.com.br${newPath}`;
        }
      }

      // 2. Se a URL já é magazinevoce.com.br ou influenciadormagalu.com.br (ex: link de afiliado do Promobit com outro shop),
      // substituir o primeiro segmento do path pelo nosso shop em vez de prependar.
      // Exemplo errado: magazinevoce.com.br/shopPromobit/p/123 → não virar /nossoshop/shopPromobit/p/123
      if (details.hostname.includes('magazinevoce') || details.hostname.includes('influenciadormagalu')) {
        // Path: /shopAntigo/p/produto → /nossoshop/p/produto
        const pathParts = details.path.split('/').filter(Boolean); // remove segmentos vazios
        if (pathParts.length > 0) {
          // Verificar se o primeiro segmento parece ser um nome de loja (não começa com 'p', 'produto', etc.)
          const firstSeg = pathParts[0].toLowerCase();
          const isShopSeg = !['p', 'produto', 'busca', 'categoria', 'oferta', 'divulgador'].includes(firstSeg);
          if (isShopSeg) {
            // Substituir o shop antigo pelo nosso
            pathParts[0] = magaluShop;
            const newPath = '/' + pathParts.join('/');
            console.log(`[Affiliate] Magalu: shop substituído no path → ${newPath}`);
            return `https://www.magazinevoce.com.br${newPath}`;
          }
        }
        // Se não conseguiu identificar o shop seg, apenas prependar
        const pathClean = details.path.startsWith('/') ? details.path : `/${details.path}`;
        return `https://www.magazinevoce.com.br/${magaluShop}${pathClean}`;
      }

      // 3. URL é magazineluiza.com.br ou magalu.com.br: construir link de afiliado normalmente
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

  // --- SHOPEE ---
  if (platform === 'shopee') {
    const shopeeAppId = process.env.SHOPEE_APP_ID;
    const shopeeAppSecret = process.env.SHOPEE_APP_SECRET;
    
    if (shopeeAppId && shopeeAppSecret) {
      try {
        const apiLink = await generateShopeeApiLink(cleanedUrl, shopeeAppId, shopeeAppSecret);
        if (apiLink) {
          return apiLink;
        }
      } catch (err) {
        console.error('[Affiliate] Falha na geração do link de afiliado da Shopee via API:', err);
      }
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
