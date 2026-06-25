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

  const desc = product.description || '';
  let cupomMsg = "";
  if (desc.includes('🎟️ CUPOM:')) {
    const cupomExtraido = desc.split('🎟️ CUPOM:')[1].split('\n')[0].trim();
    if (cupomExtraido && !['NORMAL', 'NONE', 'NULL', 'N/A', 'NA'].includes(cupomExtraido.toUpperCase())) {
      cupomMsg = `\n🎟️ Cupom: <code>${cupomExtraido}</code>`;
    }
  }

  const aprovarMsg = `<code>/aprovar ${product.id}</code>\n💡 <i>(Link de afiliado será gerado automaticamente!)</i>`;

  const text = `
🔥 <b>NOVO PRODUTO ENCONTRADO!</b>
⚠️ <b>AGUARDANDO APROVAÇÃO (PAINEL ADMIN)</b>

📦 <b>${product.name}</b>
🏷️ ${product.category}
🏪 Plataforma: <b>{plataformaNome}</b>
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
  `.replace('{plataformaNome}', plataformaNome).trim();

  const imageUrl = product.imageUrl || product.enhancedImageUrl;
  return sendTelegramMessage(TELEGRAM_CHAT_ID, text, imageUrl);
}

/**
 * Publica a oferta final e aprovada no grupo público de promoções.
 */
export async function publishToGroup(product: any, platform: string, affiliateLink: string): Promise<boolean> {
  if (!TELEGRAM_PROMO_GROUP_ID) {
    console.warn('[Telegram] TELEGRAM_PROMO_GROUP_ID não configurada!');
    return false;
  }

  const emoji = CATEGORY_EMOJIS[product.category] || '🔖';
  
  // Buscar cupons do produto (podem vir do webhook ou do banco)
  const coupons = product.coupons || [];
  const hasCoupons = coupons.length > 0;
  
  // Formatação de preços com cupom
  let precoTxt = "";
  let cupomMsg = "";
  
  if (product.originalPrice && product.price && Number(product.originalPrice) > Number(product.price)) {
    const discountPercent = ((product.originalPrice - product.price) / product.originalPrice) * 100;
    precoTxt = `~~De R$ ${formatBrCurrency(product.originalPrice)}~~\nPor R$ <b>${formatBrCurrency(product.price)}</b> (-${discountPercent.toFixed(0)}%)`;
  } else if (product.price) {
    precoTxt = `🔥 POR R$ <b>${formatBrCurrency(product.price)}</b>`;
  }
  
  // Se tem cupom, calcular preço final
  if (hasCoupons && product.price) {
    const coupon = coupons[0];
    cupomMsg = `🎟️ CUPOM: <code>${coupon.code}</code>`;
    
    // Tentar calcular preço com cupom (estimativa)
    if (product.priceWithCoupon) {
      const totalSavings = product.originalPrice ? product.originalPrice - product.priceWithCoupon : product.price - product.priceWithCoupon;
      const totalSavingsPercent = product.originalPrice 
        ? ((product.originalPrice - product.priceWithCoupon) / product.originalPrice) * 100
        : ((product.price - product.priceWithCoupon) / product.price) * 100;
      
      cupomMsg += ` → R$ <b>${formatBrCurrency(product.priceWithCoupon)}</b> (economia total ${totalSavingsPercent.toFixed(0)}%)`;
    } else if (coupon.discount) {
      cupomMsg += ` → ${coupon.discount}`;
    }
  } else {
    // Fallback: buscar cupom na descrição (compatibilidade com sistema antigo)
    const desc = product.description || '';
    if (desc.includes('🎟️ CUPOM:')) {
      const cupomExtraido = desc.split('🎟️ CUPOM:')[1].split('\n')[0].trim();
      if (cupomExtraido && !['NORMAL', 'NONE', 'NULL', 'N/A', 'NA'].includes(cupomExtraido.toUpperCase())) {
        cupomMsg = `🎟️ CUPOM: <code>${cupomExtraido}</code>`;
      }
    }
  }
  
  // Badge de queda de preço
  let dropBadge = "";
  if (product.dropPercent && product.dropPercent > 0) {
    dropBadge = `⚡ PREÇO CAIU ${product.dropPercent}%!`;
  }

  // Legenda da IA
  let legendaTop = "";
  const aiAnalysisRaw = product.aiAnalysis;
  if (aiAnalysisRaw) {
    try {
      const data = JSON.parse(aiAnalysisRaw);
      if (data && typeof data === 'object') {
        const titulo = data.titulo;
        const subtitulo = data.subtitulo;
        const analise = data.analise || data.critique;
        
        if (titulo) {
          legendaTop = `<b>${titulo.toUpperCase()}</b>`;
          if (subtitulo) {
            legendaTop += `\n<i>${subtitulo.toLowerCase()}</i>`;
          }
        } else if (analise) {
          legendaTop = `<b>🔥 AVALIAÇÃO DA IA:</b>\n<i>${analise}</i>`;
        } else {
          legendaTop = `<b>${aiAnalysisRaw.trim()}</b>`;
        }
      } else {
        legendaTop = `<b>${aiAnalysisRaw.trim()}</b>`;
      }
    } catch {
      legendaTop = `<b>${aiAnalysisRaw.trim()}</b>`;
    }
  } else {
    legendaTop = "<b>🔥 ACHADINHO IMPERDÍVEL!</b>";
  }

  const lines = [];
  if (legendaTop) {
    lines.push(legendaTop);
    lines.push("");
  }
  
  if (dropBadge) {
    lines.push(dropBadge);
    lines.push("");
  }
  
  lines.push(`${emoji} ${product.name}`);
  lines.push("");
  
  if (precoTxt) {
    lines.push(precoTxt);
  }
  if (cupomMsg) {
    lines.push(cupomMsg);
  }
  
  lines.push("");
  
  const shortId = product.shortId;
  if (shortId) {
    const linkProduto = `${SITE_URL.replace(/\/$/, '')}/produto/${shortId}`;
    lines.push(`🔗 ${linkProduto}`);
  } else if (product.id) {
    const linkProduto = `${SITE_URL.replace(/\/$/, '')}/produto/${product.id}`;
    lines.push(`🔗 ${linkProduto}`);
  } else {
    lines.push(`🔗 ${affiliateLink}`);
  }

  const text = lines.join('\n');
  const imageUrl = product.enhancedImageUrl || product.imageUrl;

  return sendTelegramMessage(TELEGRAM_PROMO_GROUP_ID, text, imageUrl);
}
