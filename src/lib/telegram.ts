import fs from 'fs';
import path from 'path';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TELEGRAM_PROMO_GROUP_ID = process.env.TELEGRAM_PROMO_GROUP_ID;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://economizei.ftech-apps.com.br";

const CATEGORY_EMOJIS: Record<string, string> = {
  'Smartphones': '📱',
  'Smart TVs': '📺',
  'Fones de Ouvido': '🎧',
  'Caixas de Som': '🔊',
  'Smartwatches': '⌚',
  'Câmeras': '📷',
  'Tablets': '🗂️',
  'Notebooks': '💻',
  'PCs e Desktops': '🖥️',
  'Monitores': '🖱️',
  'Periféricos': '⌨️',
  'SSD, HDs e Memória': '💾',
  'Consoles e Games': '🎮',
  'Air Fryers': '🍟',
  'Cafeteiras': '☕',
  'Geladeiras e Freezers': '🧊',
  'Lavadoras': '🫧',
  'Micro-ondas': '📡',
  'Aspiradores': '🌀',
  'Ar Condicionado': '❄️',
  'Tênis e Calçados': '👟',
  'Roupas e Moda': '👕',
  'Bolsas e Acessórios': '👜',
  'Perfumes': '🌺',
  'Maquiagem e Pele': '💄',
  'Shampoo e Cabelo': '💆',
  'Whey e Suplementos': '💪',
  'Bicicletas e Esporte': '🚴',
  'Chocolates e Doces': '🍫',
  'Café e Bebidas': '☕',
  'Cervejas e Vinhos': '🍺',
  'Livros e eReaders': '📚',
  'Bebês e Crianças': '👶',
  'Pet': '🐾',
  'Ferramentas': '🔧',
  'Automotivo': '🚗',
  'Viagem': '✈️',
  'Diversos': '🔖',
};

const PLATFORMA_EMOJIS: Record<string, string> = {
  'amazon':      '🟠 Amazon',
  'mercadoLivre':'🟡 Mercado Livre',
  'shopee':      '🟠 Shopee',
  'aliexpress':  '🔴 AliExpress',
  'tiktok':      '⚫ TikTok Shop',
  'netshoes':    '🟣 Netshoes',
  'magalu':      '🔵 Magalu',
  'kabum':       '🔵 Kabum',
};

function formatBrCurrency(val: number | string | null | undefined): string {
  if (val == null) return '';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return String(val);
  return num.toFixed(2).replace('.', ',');
}

export async function sendTelegramMessage(chatId: string, text: string, imageUrl?: string) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('[Telegram] TELEGRAM_BOT_TOKEN não configurada!');
    return false;
  }

  const hasPhoto = imageUrl && !imageUrl.includes('placeholder');
  
  if (hasPhoto) {
    // Para fotos, a legenda (caption) tem limite de 1024 caracteres
    if (text.length <= 1024) {
      try {
        const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            photo: imageUrl,
            caption: text,
            parse_mode: 'HTML',
          }),
        });
        if (res.ok) return true;
        
        const errJson = await res.json().catch(() => ({}));
        console.warn(`[Telegram] Falha ao enviar foto (Status ${res.status}):`, errJson);
      } catch (err) {
        console.error('[Telegram] Erro ao enviar foto:', err);
      }
    }
  }

  // Fallback para texto puro (ou se a legenda passou de 1024 caracteres)
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
        disable_web_page_preview: false,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error('[Telegram] Erro ao enviar mensagem de texto:', err);
    return false;
  }
}

const INVALID_COUPON_CODES = new Set(['NORMAL', 'NONE', 'NULL', 'N/A', 'NA']);

function extractCouponFromDescription(description?: string | null): string | null {
  if (!description || !description.includes('🎟️ CUPOM:')) return null;
  const rawCode = description.split('🎟️ CUPOM:')[1].split('\n')[0].trim();
  if (rawCode && !INVALID_COUPON_CODES.has(rawCode.toUpperCase())) {
    return rawCode;
  }
  return null;
}

function resolvePlatformBadge(platform?: string | null, storeName?: string | null): string {
  if (platform && PLATFORMA_EMOJIS[platform]) {
    return PLATFORMA_EMOJIS[platform];
  }
  if (!storeName) return '';
  const storeLower = storeName.toLowerCase();
  if (storeLower.includes('amazon')) return '🟠 Amazon';
  if (storeLower.includes('mercado')) return '🟡 Mercado Livre';
  if (storeLower.includes('shopee')) return '🟠 Shopee';
  if (storeLower.includes('aliexpress')) return '🔴 AliExpress';
  if (storeLower.includes('tiktok')) return '⚫ TikTok Shop';
  if (storeLower.includes('netshoes')) return '🟣 Netshoes';
  if (storeLower.includes('magalu') || storeLower.includes('magazine')) return '🔵 Magalu';
  if (storeLower.includes('kabum')) return '🔵 Kabum';
  return storeName;
}

function cleanPromotionDescription(description?: string | null): string {
  if (!description) return '';
  const descSemCupom = description.split('🎟️ CUPOM:')[0].trim();
  const descLimpa = descSemCupom
    .split('\n')
    .filter((line: string) => !/^Oferta (na|no) /i.test(line.trim()))
    .join('\n')
    .trim();
  return descLimpa && descLimpa !== 'Oferta encaminhada de grupos' ? `↪️ <i>${descLimpa}</i>` : '';
}

function buildCouponMessage(product: any): string {
  const coupons = product.coupons || [];
  if (coupons.length > 0 && product.price) {
    const coupon = coupons[0];
    let msg = `🎟️ <code>${coupon.code}</code>`;
    if (product.priceWithCoupon) {
      const basePrice = product.originalPrice || product.price;
      const totalSavingsPercent = ((basePrice - product.priceWithCoupon) / basePrice) * 100;
      msg += ` → R$ <b>${formatBrCurrency(product.priceWithCoupon)}</b> (economia total ${totalSavingsPercent.toFixed(0)}%)`;
    } else if (coupon.discount) {
      msg += ` → ${coupon.discount}`;
    }
    return msg;
  }

  const codeFromDesc = extractCouponFromDescription(product.description);
  return codeFromDesc ? `🎟️ <code>${codeFromDesc}</code>` : '';
}

function formatAiHeadline(aiAnalysisRaw: any): string {
  if (!aiAnalysisRaw) return "<b>🔥 ACHADINHO IMPERDÍVEL!</b>";
  try {
    const data = typeof aiAnalysisRaw === 'string' ? JSON.parse(aiAnalysisRaw) : aiAnalysisRaw;
    if (data && typeof data === 'object') {
      const titulo = data.titulo;
      const subtitulo = data.subtitulo;
      if (titulo) {
        let headline = `<b>${titulo.toUpperCase()}</b>`;
        if (subtitulo) {
          headline += `\n<i>${subtitulo.toLowerCase()}</i>`;
        }
        return headline;
      }
    }
  } catch {}
  return "<b>🔥 ACHADINHO IMPERDÍVEL!</b>";
}

/**
 * Envia um produto para aprovação do administrador (moderador) no Telegram.
 */
export async function sendToModeration(product: any): Promise<boolean> {
  if (!TELEGRAM_CHAT_ID) {
    console.warn('[Telegram] TELEGRAM_CHAT_ID não configurada para moderação!');
    return false;
  }

  const precoStr = product.price ? `💰 <b>R$ ${formatBrCurrency(product.price)}</b>` : "";
  const links = product.links || {};
  let plataformaNome = "Desconhecida";
  let primeiroLink = "";

  for (const [chave, label] of Object.entries(PLATFORMA_EMOJIS)) {
    if (links[chave]) {
      primeiroLink = links[chave];
      plataformaNome = label;
      break;
    }
  }

  if (plataformaNome === "Desconhecida" && product.storeName) {
    plataformaNome = `🛒 ${product.storeName}`;
  }

  let linkOriginal = "";
  if (primeiroLink) {
    if (primeiroLink.includes('promobit.com.br')) {
      linkOriginal = `🔗 <a href='${primeiroLink}'>👆 Ver oferta no Promobit</a>`;
    } else {
      linkOriginal = `🔗 <a href='${primeiroLink}'>Ver promoção original</a>`;
    }
  }

  const cupomExtraido = extractCouponFromDescription(product.description);
  const cupomMsg = cupomExtraido ? `\n🎟️ <code>${cupomExtraido}</code>` : "";
  const aprovarMsg = `<code>/aprovar ${product.id}</code>\n💡 <i>(Link de afiliado será gerado automaticamente!)</i>`;

  const text = `
🔥 <b>NOVO PRODUTO ENCONTRADO!</b>
⚠️ <b>AGUARDANDO APROVAÇÃO (PAINEL ADMIN)</b>

📦 <b>${product.name}</b>
🏷️ ${product.category}
🏪 Plataforma: <b>${plataformaNome}</b>
${precoStr}${cupomMsg}

${linkOriginal}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
<b>📋 PARA APROVAR, envie:</b>

${aprovarMsg}

<b>🚫 Para rejeitar:</b>
<code>/rejeitar ${product.id}</code>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🆔 <b>ID do Produto:</b>
<code>${product.id}</code>
  `.trim();

  const imageUrl = product.imageUrl || product.enhancedImageUrl;
  return sendTelegramMessage(TELEGRAM_CHAT_ID, text, imageUrl);
}

/**
 * Publica a oferta final e aprovada no grupo público de promoções.
 */
export async function publishToGroup(product: any, platform: string, affiliateLink: string): Promise<boolean> {
  const lifestyleImage = product.enhancedImageUrl;
  if (!lifestyleImage || lifestyleImage.includes('placeholder') || lifestyleImage.trim() === '') {
    console.warn(`[Telegram] ⛔ Produto sem foto lifestyle — publicação bloqueada: ${product.name}`);
    return false;
  }

  if (!TELEGRAM_PROMO_GROUP_ID) {
    console.warn('[Telegram] TELEGRAM_PROMO_GROUP_ID não configurada!');
    return false;
  }

  const emoji = CATEGORY_EMOJIS[product.category] || '🔖';
  const cupomMsg = buildCouponMessage(product);
  const condicoesMsg = cleanPromotionDescription(product.description);
  const dropBadge = product.dropPercent && product.dropPercent > 0 ? `⚡ PREÇO CAIU ${product.dropPercent}%!` : "";
  const legendaTop = formatAiHeadline(product.aiAnalysis);

  let precoTxt = "";
  if (product.originalPrice && product.price && Number(product.originalPrice) > Number(product.price)) {
    precoTxt = `🔥 DE R$ <s>${formatBrCurrency(product.originalPrice)}</s> | POR R$ <b>${formatBrCurrency(product.price)}</b>`;
  } else if (product.price) {
    precoTxt = `🔥 POR R$ <b>${formatBrCurrency(product.price)}</b>`;
  }

  const lines: string[] = [];
  if (legendaTop) {
    lines.push(legendaTop, "");
  }
  if (dropBadge) {
    lines.push(dropBadge, "");
  }

  lines.push(`${emoji} ${product.name}`, "");

  const lojaDetectada = resolvePlatformBadge(platform, product.storeName);
  if (lojaDetectada) {
    lines.push(`<b>${lojaDetectada}</b>`, "");
  }

  if (precoTxt) lines.push(precoTxt);
  if (condicoesMsg) lines.push(condicoesMsg);
  if (cupomMsg) lines.push(cupomMsg);

  lines.push("");

  const shortId = product.shortId;
  const linkProduto = shortId 
    ? `${SITE_URL.replace(/\/$/, '')}/produto/${shortId}`
    : product.id 
      ? `${SITE_URL.replace(/\/$/, '')}/produto/${product.id}`
      : "";

  const couponLink = product.couponLink;
  if (couponLink) {
    if (linkProduto) {
      lines.push(`🔗 Ver no site: ${linkProduto}`, "");
    }
    lines.push(`🎟️ Resgate o cupom antes: ${couponLink}`);
    lines.push(`🛒 Depois acesse o produto: ${affiliateLink}`);
  } else {
    lines.push(linkProduto ? `🔗 ${linkProduto}` : `🔗 ${affiliateLink}`);
  }

  const text = lines.join('\n');
  return sendTelegramMessage(TELEGRAM_PROMO_GROUP_ID, text, lifestyleImage);
}

export async function publishToQueueTop(product: any, platform: string, affiliateLink: string) {
  try {
    const candidato = {
      produto: product,
      platform,
      affiliate_link: affiliateLink,
      score: 1000, // Score altíssimo para ser escolhido primeiro
      added_at: (Date.now() / 1000) + 3600 // +1 hora no futuro para ficar no topo absoluto
    };
    
    const queuePath = path.join(process.cwd(), 'bot', 'fila_manual_pendente.json');
    fs.appendFileSync(queuePath, JSON.stringify(candidato) + '\n');
    console.log(`[Fila] Produto adicionado ao topo da fila manual: ${product.name}`);
    return true;
  } catch (err) {
    console.error('Erro ao adicionar à fila manual pendente:', err);
    return false;
  }
}
