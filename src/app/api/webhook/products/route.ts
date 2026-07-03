import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateApiKey, validateWebhookSignature } from '@/lib/auth';
import { generateAffiliateLink, resolveRedirect } from '@/lib/affiliate';
import { processProductWithAI } from '@/lib/ai';
import { saveEnhancedImage } from '@/lib/storage';
import { getSecondaryLifestyleImage, searchDuckDuckGoImages } from '@/lib/scraper';
import { publishToGroup, publishToQueueTop } from '@/lib/telegram';
import { verificarEDispararAlertas } from '@/lib/notifications';
import { fetchAndSaveMLReviews } from '@/lib/reviews';

async function processProductAffiliates(productData: { links?: Record<string, string | undefined>, status?: string }) {
  const links = productData.links || {};
  const generatedLinks: Record<string, string> = {};
  const resolvedUrls: Record<string, string> = {};
  const productLinksData: Array<{ platform: string, sourceUrl?: string, affiliateUrl?: string, generatedAffiliateUrl?: string, isActive: boolean }> = [];
  let hasAffiliate = false;
  let hasAggregatorFailure = false;

  const platforms = ['amazon', 'aliexpress', 'shopee', 'mercadoLivre', 'tiktok', 'netshoes', 'magalu', 'kabum'] as const;
  
  for (const platform of platforms) {
    const originalUrl = links[platform];
    if (originalUrl) {
      try {
        console.log(`[Webhook] Auto-gerando link de afiliado para ${platform}: ${originalUrl}`);
        const resolved = await resolveRedirect(originalUrl);
        
        // Verificar se é um código de erro do Promobit/agregador
        if (resolved && typeof resolved === 'string' && resolved.startsWith('PROMOBIT_')) {
          console.warn(`[Webhook] ❌ Falha ao resolver link do Promobit: ${resolved}`);
          hasAggregatorFailure = true;
          // NÃO salva o link - deixa pending para edição manual
          continue;
        }
        
        if (resolved && resolved !== 'VITRINE_INVALIDA') {
          resolvedUrls[platform] = resolved;
          console.log(`[Webhook] URL de ${platform} resolvida com sucesso: ${originalUrl} -> ${resolved}`);
        }

        const generated = await generateAffiliateLink(originalUrl, resolved);
        if (generated) {
          generatedLinks[platform] = generated;
          productLinksData.push({
            platform,
            sourceUrl: originalUrl,
            affiliateUrl: originalUrl,
            generatedAffiliateUrl: generated,
            isActive: true
          });
          hasAffiliate = true;
        } else {
          const isAggregator = originalUrl.includes('promobit.com.br') || originalUrl.includes('pechinchou.com.br');
          if (isAggregator) {
            console.log(`[Webhook] ⚠️ Link do agregador não resolvido: ${originalUrl}. Marcando produto como pending.`);
            hasAggregatorFailure = true;
            // NÃO salva o link - deixa pending
          } else {
            generatedLinks[platform] = originalUrl;
            productLinksData.push({
              platform,
              sourceUrl: originalUrl,
              affiliateUrl: originalUrl,
              isActive: true
            });
          }
        }
      } catch (e) {
        console.error(`Erro ao gerar link de afiliado para ${platform}:`, e);
        const isAggregator = originalUrl.includes('promobit.com.br') || originalUrl.includes('pechinchou.com.br');
        if (isAggregator) {
           console.log(`[Webhook] ⚠️ Erro ao processar agregador: ${originalUrl}. Marcando como pending.`);
           hasAggregatorFailure = true;
           // NÃO salva o link
        } else {
           generatedLinks[platform] = originalUrl;
           productLinksData.push({
             platform,
             sourceUrl: originalUrl,
             affiliateUrl: originalUrl,
             isActive: true
           });
        }
      }
    }
  }

  // Se teve falha de agregador, forçar status pending
  const finalStatus = hasAggregatorFailure ? 'pending' : (hasAffiliate ? 'active' : 'pending');
  
  if (hasAggregatorFailure) {
    console.log(`[Webhook] 🔴 Produto marcado como PENDING devido a falha em resolver link de agregador`);
  }

  return {
    links: Object.keys(generatedLinks).length > 0 ? generatedLinks : null,
    productLinksData,
    status: finalStatus,
    resolvedUrls
  };
}

function extractPlatformDetailsFromUrl(url: string, platform: string): { platformId: string | null; platformType: string | null } {
  const urlLower = url.toLowerCase();
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // VALIDAÇÃO CRÍTICA: Detectar URLs de agregadores (Promobit, Pechinchou)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Se a URL ainda é de agregador, NÃO extrair IDs pois não são IDs reais de loja
  // IMPORTANTE: Esta validação deve acontecer ANTES de qualquer tentativa de regex para extrair IDs
  if (urlLower.includes('promobit.com.br')) {
    console.log(`[Webhook] ⚠️ URL de agregador Promobit detectada. Não extraindo platformId: ${url}`);
    return { platformId: null, platformType: 'promobit' };
  }
  
  if (urlLower.includes('pechinchou.com.br')) {
    console.log(`[Webhook] ⚠️ URL de agregador Pechinchou detectada. Não extraindo platformId: ${url}`);
    return { platformId: null, platformType: 'pechinchou' };
  }
  
  // Outros agregadores conhecidos
  if (urlLower.includes('pelando.com.br') || urlLower.includes('hardmob.com.br')) {
    console.log(`[Webhook] ⚠️ URL de agregador detectada. Não extraindo platformId: ${url}`);
    return { platformId: null, platformType: 'agregador' };
  }
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Extração de IDs reais de lojas (só para URLs de varejistas)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  if (platform === 'amazon' || urlLower.includes('amazon') || urlLower.includes('amzn.to')) {
    const asinMatch = url.match(/(?:\/dp\/|\/gp\/product\/|\/gp\/aw\/d\/)([A-Z0-9]{10})/i);
    if (asinMatch) {
      return { platformId: asinMatch[1].toUpperCase(), platformType: 'amazon' };
    }
  }
  
  if (platform === 'mercadoLivre' || urlLower.includes('mercadolivre') || urlLower.includes('meli.la') || urlLower.includes('mercadolibre')) {
    // IDs MLB reais têm 10-13 dígitos (ex: MLB4214670787, MLB18522997)
    // Isso previne que IDs de agregadores (ex: 2887743) sejam tratados como MLB
    const mlbMatch = url.match(/(MLB-?\d{10,13})/i);
    if (mlbMatch) {
      return { platformId: mlbMatch[1].replace('-', '').toUpperCase(), platformType: 'mercadolivre' };
    }
  }
  
  if (platform === 'shopee' || urlLower.includes('shopee') || urlLower.includes('shope.ee')) {
    const shopeeMatch = url.match(/i\.(\d+)\.(\d+)/);
    if (shopeeMatch) {
      return { platformId: `${shopeeMatch[1]}_${shopeeMatch[2]}`, platformType: 'shopee' };
    }
  }
  
  if (platform === 'aliexpress' || urlLower.includes('aliexpress')) {
    const aliMatch = url.match(/\/item\/(\d+)\.html/);
    if (aliMatch) {
      return { platformId: aliMatch[1], platformType: 'aliexpress' };
    }
  }
  
  if (platform === 'magalu' || urlLower.includes('magalu') || urlLower.includes('magazineluiza')) {
    const magaluMatch = url.match(/\/p\/([a-z0-9]+)/i);
    if (magaluMatch) {
      return { platformId: magaluMatch[1], platformType: 'magalu' };
    }
  }
  
  if (platform === 'kabum' || urlLower.includes('kabum')) {
    const kabumMatch = url.match(/\/produto\/(\d+)/i);
    if (kabumMatch) {
      return { platformId: kabumMatch[1], platformType: 'kabum' };
    }
  }

  if (platform === 'netshoes' || urlLower.includes('netshoes')) {
    const netshoesMatch = url.match(/\/produto\/([a-z0-9-]+)/i);
    if (netshoesMatch) {
      return { platformId: netshoesMatch[1], platformType: 'netshoes' };
    }
  }
  
  return { platformId: null, platformType: null };
}

export async function POST(request: Request) {
  // Validar assinatura do Webhook
  if (!await validateWebhookSignature(request)) {
    return NextResponse.json(
      { error: 'Não autorizado. Assinatura do webhook inválida.' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    
    // Validar campos obrigatórios
    if (!body.name || !body.category || !body.imageUrl) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: name, category, imageUrl' },
        { status: 400 }
      );
    }

    const { name, externalId, source, platformId, platformType } = body;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🎟️ INTERCEPTADOR DE CUPONS AVULSOS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const isCouponCategory = body.category?.toLowerCase().includes('cupom');
    const isCouponName = body.name?.toLowerCase().includes('cupom');
    
    if (isCouponCategory || isCouponName) {
      console.log(`[Webhook] 🎟️ Interceptado como CUPOM avulso: ${body.name}`);
      
      let extractedCode = "CUPOM";
      let extractedDiscount = body.price ? `R$ ${body.price}` : "OFF";
      
      // Tentar extrair código e desconto
      if (body.description?.includes('🎟️ CUPOM:')) {
        extractedCode = body.description.split('🎟️ CUPOM:')[1].split('\n')[0].trim();
      }
      
      const discountMatch = body.name?.match(/(\d+%|R\$\s?\d+)/);
      if (discountMatch) {
        extractedDiscount = discountMatch[1] + (discountMatch[1].includes('%') ? " OFF" : "");
      }

      // Determinar plataforma
      let platform = 'outros';
      const bodyStr = JSON.stringify(body).toLowerCase();
      if (bodyStr.includes('amazon') || body.links?.amazon) platform = 'amazon';
      else if (bodyStr.includes('shopee') || body.links?.shopee) platform = 'shopee';
      else if (bodyStr.includes('mercadolivre') || body.links?.mercadoLivre) platform = 'mercadolivre';
      else if (bodyStr.includes('aliexpress') || body.links?.aliexpress) platform = 'aliexpress';
      else if (bodyStr.includes('magalu') || body.links?.magalu) platform = 'magalu';
      
      const coupon = await prisma.coupon.create({
        data: {
          code: extractedCode,
          description: body.name,
          discount: extractedDiscount,
          platform: platform,
          isActive: true
        }
      });
      
      // Se for Amazon, ML ou Shopee, disparar
      if (['amazon', 'mercadolivre', 'shopee'].includes(platform)) {
        let affiliateLink = "";
        let originalLink = "";
        
        if (body.links) {
          originalLink = body.links[platform] || body.links.amazon || body.links.shopee || body.links.mercadoLivre || Object.values(body.links)[0] as string;
        }

        if (originalLink) {
          const resolved = await resolveRedirect(originalLink);
          affiliateLink = await generateAffiliateLink(originalLink, resolved) || originalLink;
        }
        
        // Chamada assíncrona para disparo social (evita travar o webhook)
        import('@/lib/socials').then((m) => {
          m.publishCouponToSocials(coupon, affiliateLink || originalLink).catch(err => {
            console.error('[Webhook] Erro ao publicar cupom nas redes:', err);
          });
        }).catch(err => {
          console.error('[Webhook] Falha ao importar módulo de sociais:', err);
        });
      }
      
      return NextResponse.json({ success: true, message: 'Cupom interceptado e salvo', coupon }, { status: 201 });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // RESOLUÇÃO DE LINKS E PARSE DE PLATAFORMA (NOVA ORDEM)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const { links: processedLinks, productLinksData, status: processedStatus, resolvedUrls } = await processProductAffiliates(body);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // IMPORTANTE: SEMPRE extrair platformId/Type das URLs, IGNORANDO o que o scraper enviou
    // O scraper pode enviar IDs de agregadores (Promobit/Pechinchou) que não são IDs reais
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    let finalPlatformId = null;
    let finalPlatformType = null;

    const platforms = ['amazon', 'aliexpress', 'shopee', 'mercadoLivre', 'tiktok', 'netshoes', 'magalu', 'kabum'] as const;
    
    // 1. Tentar extrair das URLs resolvidas pelo webhook
    for (const p of platforms) {
      const urlToParse = resolvedUrls?.[p];
      if (urlToParse) {
        const extracted = extractPlatformDetailsFromUrl(urlToParse, p);
        if (extracted.platformId && extracted.platformType) {
          finalPlatformId = extracted.platformId;
          finalPlatformType = extracted.platformType;
          console.log(`[Webhook] [PLATFORM_RESOLVED] Mapeado platformId/Type da URL resolvida (${p}): ${urlToParse} -> ${finalPlatformId} (${finalPlatformType})`);
          break;
        }
        // Se detectou agregador mas não tem ID real, salvar o tipo mesmo sem ID
        if (extracted.platformType && !extracted.platformId) {
          finalPlatformType = extracted.platformType;
          console.log(`[Webhook] [AGGREGATOR_DETECTED] Agregador detectado (${p}): ${urlToParse} -> platformType: ${finalPlatformType}, platformId: null`);
          break;
        }
      }
    }

    // 2. Fallback: tentar extrair das URLs processadas ou originais
    if (!finalPlatformId && !finalPlatformType) {
      const targetLinks = processedLinks || body.links || {};
      for (const p of platforms) {
        const urlToParse = targetLinks[p];
        if (urlToParse) {
          const extracted = extractPlatformDetailsFromUrl(urlToParse, p);
          if (extracted.platformId && extracted.platformType) {
            finalPlatformId = extracted.platformId;
            finalPlatformType = extracted.platformType;
            console.log(`[Webhook] [PLATFORM_FALLBACK] Mapeado platformId/Type da URL (fallback): ${urlToParse} -> ${finalPlatformId} (${finalPlatformType})`);
            break;
          }
          // Se detectou agregador mas não tem ID real, salvar o tipo mesmo sem ID
          if (extracted.platformType && !extracted.platformId) {
            finalPlatformType = extracted.platformType;
            console.log(`[Webhook] [AGGREGATOR_DETECTED_FALLBACK] Agregador detectado (fallback): ${urlToParse} -> platformType: ${finalPlatformType}, platformId: null`);
            break;
          }
        }
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // FASE 1 — DEDUPLICAÇÃO POR PLATFORM ID (PRIORIDADE MÁXIMA)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    let existingProduct = null;

    // Estágio 1 — platformId + platformType (mais preciso - ID real da plataforma)
    if (finalPlatformId && finalPlatformType) {
      existingProduct = await prisma.product.findFirst({
        where: { 
          platformId: finalPlatformId,
          platformType: finalPlatformType
        },
        include: { 
          priceHistory: { orderBy: { createdAt: 'desc' }, take: 1 },
          links: true
        }
      });
      
      if (existingProduct) {
        console.log(`[Webhook] Produto encontrado por platformId+platformType: ${finalPlatformId} (${finalPlatformType})`);
        
        // Atualizar preço se mudou
        const priceChanged = body.price && body.price !== existingProduct.price;
        const originalPriceChanged = body.originalPrice && body.originalPrice !== existingProduct.originalPrice;
        
        if (priceChanged || originalPriceChanged) {
          console.log(`[Webhook] Preço mudou! Anterior: ${existingProduct.price} → Novo: ${body.price}`);
          
          // Atualizar produto
          await prisma.product.update({
            where: { id: existingProduct.id },
            data: {
              price: body.price || existingProduct.price,
              originalPrice: body.originalPrice || existingProduct.originalPrice,
              couponLink: body.couponLink || undefined,
              description: body.description || existingProduct.description,
              updatedAt: new Date()
            }
          });
          
          // Criar registro de histórico
          await prisma.priceHistory.create({
            data: {
              productId: existingProduct.id,
              price: body.price || existingProduct.price,
              originalPrice: body.originalPrice || existingProduct.originalPrice
            }
          });
          
          // NOVA LÓGICA — Calcular queda de preço e verificar cupons
          const lastHistory = existingProduct.priceHistory[0];
          let shouldPublish = false;
          let publishReason = '';
          let dropPercent = 0;
          
          if (lastHistory && body.price < lastHistory.price) {
            dropPercent = ((lastHistory.price - body.price) / lastHistory.price) * 100;
            console.log(`[Webhook] Queda de ${dropPercent.toFixed(1)}% no preço!`);
            
            // Buscar cupons ativos para este produto
            const activeCoupons = await prisma.coupon.findMany({
              where: {
                isActive: true,
                AND: [
                  {
                    OR: [
                      { productId: existingProduct.id },
                      { platform: existingProduct.platformType || existingProduct.source || '' }
                    ]
                  },
                  {
                    OR: [
                      { expiresAt: null },
                      { expiresAt: { gte: new Date() } }
                    ]
                  }
                ]
              }
            });
            
            // CONDIÇÃO 1: Queda ≥ 5% + tem cupom ativo
            if (dropPercent >= 5 && activeCoupons.length > 0) {
              shouldPublish = true;
              publishReason = `Queda de ${dropPercent.toFixed(1)}% + ${activeCoupons.length} cupom(ns) ativo(s)`;
            }
            // CONDIÇÃO 2: Queda ≥ 10% mesmo sem cupom
            else if (dropPercent >= 10) {
              shouldPublish = true;
              publishReason = `Queda significativa de ${dropPercent.toFixed(1)}%`;
            }
          }
          
          // Publicar se atender as condições
          if (shouldPublish && existingProduct.status === 'active') {
            console.log(`[Webhook] ⚡ Auto-publicando: ${publishReason}`);
            
            // Buscar link de afiliado principal para publicação
            const productLinks = await prisma.productLink.findFirst({
              where: { productId: existingProduct.id, isActive: true }
            });
            
            const affiliateLink = productLinks?.generatedAffiliateUrl || productLinks?.affiliateUrl || '';
            const platform = productLinks?.platform || existingProduct.platformType || 'amazon';
            
            // Buscar cupons para incluir na mensagem
            const coupons = await prisma.coupon.findMany({
              where: {
                isActive: true,
                AND: [
                  {
                    OR: [
                      { productId: existingProduct.id },
                      { platform: platform }
                    ]
                  },
                  {
                    OR: [
                      { expiresAt: null },
                      { expiresAt: { gte: new Date() } }
                    ]
                  }
                ]
              },
              take: 3
            });
            
            // Disparar publicação no Telegram (assíncrono, não aguarda)
            const pToPublish = {
              ...existingProduct,
              price: body.price,
              originalPrice: body.originalPrice || existingProduct.originalPrice,
              dropPercent: Math.round(dropPercent * 10) / 10,
              coupons: coupons.map(c => ({ code: c.code, discount: c.discount }))
            };
            
            const lifestyleImg1 = pToPublish.enhancedImageUrl;
            if (lifestyleImg1 && !lifestyleImg1.includes('placeholder') && lifestyleImg1.trim() !== '') {
              publishToQueueTop(pToPublish, platform, affiliateLink).catch(err => {
                console.error('[Webhook] Erro ao colocar produto na fila:', err);
              });
            } else {
              console.log(`[Webhook] Preço atualizado, mas sem foto lifestyle - Pulando Telegram: ${pToPublish.name}`);
            }
          }
          
          // Disparar alertas de preço
          await verificarEDispararAlertas(
            existingProduct.id,
            existingProduct.price || 0,
            body.price || 0
          );
        }
        
        return NextResponse.json({
          success: true,
          message: 'Preço atualizado',
          product: existingProduct,
          priceChanged,
          originalPriceChanged
        }, { status: 200 });
      }
    }

    // Estágio 2 — externalId + source (compatibilidade com sistema antigo)
    if (!existingProduct && externalId && source) {
      const byCompositeKey = await prisma.product.findFirst({
        where: { externalId, source }
      });
      if (byCompositeKey) {
        return NextResponse.json(
          { error: 'Duplicate: same externalId+source', id: byCompositeKey.id },
          { status: 409 }
        );
      }
    }

    // Estágio 3 — nome nos últimos 7 dias entre ativos/aprovados (previne duplicata de produto recente de fonte diferente):
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const byNameRecent = await prisma.product.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        status: { in: ['active', 'approved'] },
        createdAt: { gte: sevenDaysAgo }
      }
    });
    if (byNameRecent) {
      return NextResponse.json(
        { error: 'Duplicate: same name in last 7 days', id: byNameRecent.id },
        { status: 409 }
      );
    }

    // Estágio 4 — nome entre pendentes nas últimas 24h (mantém comportamento existente para pendentes):
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const byNamePending = await prisma.product.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        status: 'pending',
        createdAt: { gte: oneDayAgo }
      }
    });
    if (byNamePending) {
      return NextResponse.json(
        { error: 'Duplicate: pending with same name', id: byNamePending.id },
        { status: 409 }
      );
    }
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // VALIDAÇÃO CRÍTICA: Forçar pending se platformType for de agregador
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Agregadores (Promobit, Pechinchou) não têm platformId real de loja
    // Estes produtos devem ir para aprovação manual para verificação de link
    const isAggregatorPlatform = finalPlatformType === 'promobit' || finalPlatformType === 'pechinchou';

    let finalStatus = body.status || processedStatus;

    if (body.autoApprove === true) {
      finalStatus = 'pending'; // Inicia como pending, será aprovado no background se aiScore >= 6.5
    }
    
    // Se for agregador e não tem platformId real, forçar pending para revisão manual
    if (isAggregatorPlatform && !finalPlatformId) {
      console.log(`[Webhook] ⚠️ Produto de agregador sem platformId real. Forçando status=pending para aprovação manual: ${finalPlatformType}`);
      finalStatus = 'pending';
    }

    // Criar produto
    const imagesToCreate = [];
    if (Array.isArray(body.images) && body.images.length > 0) {
      body.images.forEach((url: string, index: number) => {
        imagesToCreate.push({ url, source: index === 0 ? 'scraper' : 'scraper_gallery', isPrimary: index === 0, order: index });
      });
    } else if (body.imageUrl) {
      imagesToCreate.push({ url: body.imageUrl, source: 'scraper', isPrimary: true, order: 0 });
    }
    
    const product = await prisma.product.create({
      data: {
        name: body.name,
        category: body.category,
        subcategory: body.subcategory || null,
        brand: body.brand || null,
        model: body.model || null,
        platformProductId: body.platformProductId || finalPlatformId || null,
        platformId: finalPlatformId || null,
        platformType: finalPlatformType || null,
        storeName: body.storeName || null,
        description: body.description || null,
        imageUrl: body.imageUrl,
        enhancedImageUrl: body.enhancedImageUrl || null,
        couponLink: body.couponLink || null,
        price: body.price ? parseFloat(body.price) : null,
        originalPrice: body.originalPrice ? parseFloat(body.originalPrice) : null,
        status: finalStatus,
        externalId: body.externalId || null,
        source: body.source || null,
        links: processedLinks ? {
          create: {
            amazon: processedLinks.amazon || null,
            mercadoLivre: processedLinks.mercadoLivre || null,
            shopee: processedLinks.shopee || null,
            aliexpress: processedLinks.aliexpress || null,
            tiktok: processedLinks.tiktok || null,
            netshoes: processedLinks.netshoes || null,
            magalu: processedLinks.magalu || null,
            kabum: processedLinks.kabum || null,
          }
        } : undefined,
        productLinks: productLinksData && productLinksData.length > 0 ? {
          create: productLinksData
        } : undefined,
        images: imagesToCreate.length > 0 ? {
          create: imagesToCreate
        } : undefined
      },
      include: {
        links: true
      }
    });

    // Criar o primeiro registro de histórico de preço
    if (product.price) {
      await prisma.priceHistory.create({
        data: {
          productId: product.id,
          price: product.price,
          originalPrice: product.originalPrice,
        }
      });
    }

    // Log para debug
    console.log('✅ Produto criado:', {
      id: product.id,
      name: product.name,
      hasId: !!product.id,
      allKeys: Object.keys(product)
    });

    // Se o produto já foi aprovado direto na criação (autoApprove: true), disparar notificação push
    if (finalStatus === 'active') {
      try {
        const discount = product.originalPrice && product.price && product.originalPrice > product.price 
          ? ((product.originalPrice - product.price) / product.originalPrice) * 100 
          : 0;
          
        const pushPayload = {
          title: product.name,
          body: `Preço: R$ ${product.price?.toFixed(2)}`,
          icon: product.imageUrl,
          url: `/produto/${product.id}`,
          productId: product.id
        };

        if (discount > 0) {
          pushPayload.body += ` (${discount.toFixed(0)}% OFF)`;
        }

        // Disparar push e aguardar
        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/push/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.API_SECRET_KEY || '',
          },
          body: JSON.stringify(pushPayload),
        }).catch(err => console.error('Erro push autoApprove POST:', err));
        console.log(`📱 Notificação push enviada para autoApprove (POST): ${product.id}`);
      } catch (pushErr) {
        console.error(`Erro ao enviar push notification autoApprove para produto ${product.id}:`, pushErr);
      }
    }

    const response = NextResponse.json({
      success: true,
      product: {
        id: product.id,
        shortId: product.shortId,  // ✅ ADICIONAR shortId
        name: product.name,
        category: product.category,
        description: product.description,
        imageUrl: product.imageUrl,
        enhancedImageUrl: product.enhancedImageUrl,
        price: product.price,
        originalPrice: product.originalPrice,
        couponLink: product.couponLink,
        status: product.status,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        links: product.links
      }
    }, { status: 201 });

    // Processar IA em background sem await
    // Busca sinais reais: menor preço histórico e cupom na descrição
    const [priceHistoryRecords] = await Promise.all([
      prisma.priceHistory.findMany({
        where: { productId: product.id },
        orderBy: { createdAt: 'asc' },
        select: { price: true }
      })
    ]);
    const hasCoupon = !!(body.description && body.description.includes('CUPOM'));
    const historicalPrices = priceHistoryRecords.map((r: { price: number }) => r.price);
    const isLowestPrice = historicalPrices.length <= 1 || 
      (product.price !== null && product.price <= Math.min(...historicalPrices));

    processProductWithAI(
      body.name, 
      body.price ? parseFloat(body.price) : 0, 
      null,
      body.category,
      product.id,
      'evaluate',
      hasCoupon,
      isLowestPrice
    ).then(async (aiResult) => {
      let newStatus = finalStatus;

      // Se autoApprove for true, forçar status como 'active' ignorando a nota da IA
      if (body.autoApprove === true) {
        // Verificar se algum link de afiliado permaneceu com o agregador (indicando falha na geração/resolução)
        const hasUnresolvedAggregator = Object.values(processedLinks || {}).some(
          (link: any) => link && (link.includes('promobit.com.br') || link.includes('pechinchou.com.br'))
        );

        if (hasUnresolvedAggregator) {
          newStatus = 'pending';
          console.log(`[Webhook] Forçando status como 'pending' porque contém link de agregador não resolvido: ${body.name}`);
        } else {
          newStatus = 'active';
          console.log(`[Webhook] Auto-aprovado pelo scraper (ignorando score da IA): ${body.name}`);
        }
      }

      // Processamento da imagem se aprovado (obtendo imagem de lifestyle/secundária do varejista)
      let finalEnhancedImageUrl: string | null = product.enhancedImageUrl;
      let finalImageUrl: string = product.imageUrl;
      
      // DEBUG: Log do enhancedImageUrl recebido do scraper
      if (product.enhancedImageUrl) {
        console.log(`[Webhook AI] enhancedImageUrl JÁ VINHA DO SCRAPER: ${product.enhancedImageUrl}`);
      } else {
        console.log(`[Webhook AI] enhancedImageUrl VAZIO - tentando buscar secundária...`);
      }
      
      // SEMPRE tentar buscar imagem de alta qualidade do varejista (Amazon, ML, etc.)
      // mesmo se já tiver uma de agregador (Promobit, Gatry)
      const isAggregatorImage = product.imageUrl.includes('promobit.com.br') || 
                                 product.imageUrl.includes('gatry.com') ||
                                 product.imageUrl.includes('pelando.com.br') ||
                                 product.imageUrl.includes('pechinchou.com.br') ||
                                 product.imageUrl.includes('assets.pechinchou.com.br');
      
      if ((!finalEnhancedImageUrl || isAggregatorImage) && newStatus !== 'pending' && aiResult.score && aiResult.score >= 8.0) {
        if (isAggregatorImage) {
          console.log(`[Webhook AI] Imagem do agregador detectada - buscando MELHOR do varejista...`);
        }
        // CRÍTICO: Usar resolvedUrls (links reais do varejista) ao invés de body.links (agregador)
        const rawEnhancedUrl = await getSecondaryLifestyleImage(resolvedUrls || body.links || {});
        if (rawEnhancedUrl) {
          const savedRetailImage = await saveEnhancedImage(rawEnhancedUrl, false);
          if (savedRetailImage) {
            // A imagem do varejista (fundo branco) vai para imageUrl (site).
            // A imagem original (lifestyle) vai para enhancedImageUrl (Telegram).
            finalImageUrl = savedRetailImage;
            if (!finalEnhancedImageUrl) {
              const isLifestyle = product.imageUrl && (
                product.imageUrl.includes('/products/social/') || 
                product.imageUrl.includes('/products/real/')
              );
              if (isLifestyle) {
                finalEnhancedImageUrl = product.imageUrl;
              }
            }
            console.log(`[Webhook AI] Encontrada imagem do varejista (fundo branco): ${savedRetailImage}. Swapeando original para enhancedImageUrl.`);
          }
        } else {
          console.warn(`[Webhook AI] ⚠️ Não conseguiu buscar imagem do varejista. Mantendo imagem original do agregador.`);
          
          if (product.imageUrl && (product.imageUrl.includes('pechinchou.com.br') || product.imageUrl.includes('assets.pechinchou.com.br'))) {
            console.log(`[Webhook AI] 🚫 Imagem do Pechinchou bloqueada. Tentando buscar substituta no DuckDuckGo...`);
            try {
              const ddgResults = await searchDuckDuckGoImages(product.name);
              if (ddgResults && ddgResults.length > 0) {
                const ddgUrl = ddgResults[0].image;
                const savedDdgImage = await saveEnhancedImage(ddgUrl, false);
                if (savedDdgImage) {
                  finalImageUrl = savedDdgImage;
                  console.log(`[Webhook AI] ✅ Imagem do Pechinchou substituída com sucesso pelo DDG: ${savedDdgImage}`);
                } else {
                  finalImageUrl = '';
                }
              } else {
                console.warn(`[Webhook AI] ❌ Falha ao encontrar imagem substituta no DDG. Imagem ficará vazia.`);
                finalImageUrl = '';
              }
            } catch (err) {
              console.error(`[Webhook AI] ❌ Erro ao buscar substituta no DDG:`, err);
              finalImageUrl = '';
            }
          }
        }
      } else if (finalEnhancedImageUrl) {
        console.log(`[Webhook AI] USANDO enhancedImageUrl do scraper (PRIORIDADE): ${finalEnhancedImageUrl}`);
      }

          await prisma.product.update({
            where: { id: product.id },
            data: {
              aiScore: aiResult.score,
              aiAnalysis: aiResult.rawJson,
              imageUrl: finalImageUrl,
              enhancedImageUrl: finalEnhancedImageUrl || undefined,
              status: newStatus,
              aiProcessed: true,
              aiProcessedAt: new Date()
            }
          });
          console.log(`🤖 IA finalizou processamento do produto ${product.id}`);

          if (body.links?.mercadoLivre) {
            await fetchAndSaveMLReviews(product.id, body.links.mercadoLivre);
          }

      // Se a IA aprovou o produto, disparar notificação push e publicar no Telegram!
      if (finalStatus === 'pending' && newStatus === 'active') {
        try {
          const discount = product.originalPrice && product.price && product.originalPrice > product.price 
            ? ((product.originalPrice - product.price) / product.originalPrice) * 100 
            : 0;
            
          const pushPayload = {
            title: product.name,
            body: `Preço: R$ ${product.price?.toFixed(2)}`,
            icon: finalEnhancedImageUrl || product.imageUrl,
            url: `/produto/${product.id}`,
            productId: product.id
          };

          if (discount > 0) {
            pushPayload.body += ` (${discount.toFixed(0)}% OFF)`;
          }

          // Disparar push de forma assíncrona, mas aguardando para não cancelar
          await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/push/send`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': process.env.API_SECRET_KEY || '',
            },
            body: JSON.stringify(pushPayload),
          });
          console.log(`📱 Notificação push enviada para produto aprovado pela IA: ${product.id}`);
        } catch (pushErr) {
          console.error(`Erro ao enviar push notification para produto ${product.id}:`, pushErr);
        }

        // Publicar no Telegram de forma assíncrona apenas se NÃO for auto-aprovado automaticamente pelo robô
        if (body.autoApprove !== true) {
          try {
            const existingLinks: any = product.links || {};
            let publishLink = '';
            const platforms = ['amazon', 'aliexpress', 'shopee', 'mercadoLivre', 'tiktok', 'netshoes', 'magalu', 'kabum'] as const;
            let activePlatform = 'amazon';
            for (const plat of platforms) {
              if (existingLinks[plat]) {
                publishLink = existingLinks[plat];
                activePlatform = plat;
                break;
              }
            }

            if (publishLink) {
              const tempProduct = {
                ...product,
                imageUrl: finalImageUrl,
                enhancedImageUrl: finalEnhancedImageUrl || undefined,
                status: newStatus,
                aiScore: aiResult.score,
                aiAnalysis: aiResult.rawJson
              };
              
              const lifestyleImg2 = tempProduct.enhancedImageUrl;
              if (lifestyleImg2 && !lifestyleImg2.includes('placeholder') && lifestyleImg2.trim() !== '') {
                if (activePlatform && publishLink) {
                  publishToQueueTop(tempProduct, activePlatform, publishLink).then((success) => {
                    if (success) {
                      console.log(`🚀 [Telegram Auto-Aprovar] Oferta publicada no grupo: ${product.name}`);
                    }
                  }).catch(e => {
                    console.error(`Falha ao publicar automaticamente no Telegram para o produto ${product.id}:`, e);
                  });
                }
              } else {
                console.log(`[Telegram Auto-Aprovar] Produto sem foto lifestyle - Pulando publicação no grupo: ${product.name}`);
              }
            }
          } catch (tgErr) {
            console.error('[Webhook] Falha ao extrair links para publicação no Telegram:', tgErr);
          }
        } else {
          console.log(`ℹ️ [Webhook] Auto-aprovado com autoApprove=true. Ignorando publicação automática no Telegram (o robô gerencia a publicação).`);
        }
      }

    }).catch(error => {
      console.error(`Erro no processamento de IA em background para ${product.id}:`, error);
    });

    return response;

  } catch (error) {
    console.error('Erro ao criar produto via webhook:', error);
    return NextResponse.json(
      { error: 'Erro ao criar produto' },
      { status: 500 }
    );
  }
}

// Endpoint para criar múltiplos produtos de uma vez
export async function PUT(request: Request) {
  // Validar assinatura do Webhook
  if (!await validateWebhookSignature(request)) {
    return NextResponse.json(
      { error: 'Não autorizado. Assinatura do webhook inválida.' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    
    if (!Array.isArray(body.products)) {
      return NextResponse.json(
        { error: 'Esperado um array de produtos' },
        { status: 400 }
      );
    }

    const results = [];
    const errors = [];

    for (const productData of body.products) {
      try {
        let existingProduct: any = null;

        if (productData.id) {
          existingProduct = await prisma.product.findUnique({
            where: { id: productData.id },
            include: { links: true }
          });
        }

        if (!existingProduct && productData.externalId) {
          existingProduct = await prisma.product.findFirst({
            where: productData.source 
              ? { externalId: productData.externalId, source: productData.source }
              : { externalId: productData.externalId },
            include: { links: true }
          });
        }

        if (!existingProduct) {
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          existingProduct = await prisma.product.findFirst({
            where: {
              name: { equals: productData.name, mode: 'insensitive' },
              status: { in: ['active', 'approved'] },
              createdAt: { gte: sevenDaysAgo }
            },
            include: { links: true }
          });
        }

        if (existingProduct) {
          // Registrar no histórico de preços se houver preço
          if (productData.price) {
            await prisma.priceHistory.create({
              data: {
                productId: existingProduct.id,
                price: parseFloat(productData.price),
                originalPrice: productData.originalPrice ? parseFloat(productData.originalPrice) : null,
              }
            });
            // Verificar se podemos atualizar a imagem do produto existente
            // Apenas se a atual for do Promobit/Pechinchou ou placeholder/nula, e a nova for uma imagem de varejista real
            let imageUpdateData = {};
            const isOldImagePlaceholderOrAggregator = 
              !existingProduct.imageUrl || 
              existingProduct.imageUrl === '/placeholder.webp' || 
              existingProduct.imageUrl.includes('promobit.com.br') || 
              existingProduct.imageUrl.includes('pechinchou.com.br');
            
            const isNewImageBetter = 
              productData.imageUrl && 
              productData.imageUrl !== '/placeholder.webp' && 
              !productData.imageUrl.includes('promobit.com.br') && 
              !productData.imageUrl.includes('pechinchou.com.br');

            if (isOldImagePlaceholderOrAggregator && isNewImageBetter && !existingProduct.isFixed) {
              imageUpdateData = {
                imageUrl: productData.imageUrl,
                enhancedImageUrl: productData.imageUrl
              };
            }


            const skipProcessing = existingProduct.aiProcessed && existingProduct.affiliateProcessed;
            let linksData = undefined;
            let productLinksDataUpdate: any[] = [];
            let resolvedUrls: Record<string, string> | undefined = undefined;
            
            if (!skipProcessing) {
              const { links: processedLinks, productLinksData, resolvedUrls: resUrls } = await processProductAffiliates(productData);
              resolvedUrls = resUrls;
              productLinksDataUpdate = productLinksData;
              const linksUpdate: Record<string, string> = {};
              if (processedLinks) {
                const platforms = ['amazon', 'aliexpress', 'shopee', 'mercadoLivre', 'tiktok', 'netshoes', 'magalu', 'kabum'] as const;
                for (const platform of platforms) {
                  const newLink = processedLinks[platform];
                  const oldLink = existingProduct.links?.[platform as keyof typeof existingProduct.links];
                  if (newLink) {
                    const isOldAggregator = !oldLink || (typeof oldLink === 'string' && (oldLink.includes('promobit.com.br') || oldLink.includes('pechinchou.com.br')));
                    const isNewDirect = !newLink.includes('promobit.com.br') && !newLink.includes('pechinchou.com.br');
                    if (isOldAggregator && isNewDirect) {
                      linksUpdate[platform] = newLink;
                    }
                  }
                }
              }
              if (Object.keys(linksUpdate).length > 0 && !existingProduct.isFixed) {
                linksData = existingProduct.links ? { update: linksUpdate } : { create: linksUpdate };
              }
            }

            let finalPlatformId = existingProduct.platformId;
            let finalPlatformType = existingProduct.platformType;

            if (!finalPlatformId || !finalPlatformType) {
              const platforms = ['amazon', 'aliexpress', 'shopee', 'mercadoLivre', 'tiktok', 'netshoes', 'magalu', 'kabum'] as const;
              
              // 1. Tentar das URLs resolvidas pelo webhook
              if (resolvedUrls) {
                for (const p of platforms) {
                  const urlToParse = resolvedUrls[p];
                  if (urlToParse) {
                    const extracted = extractPlatformDetailsFromUrl(urlToParse, p);
                    if (extracted.platformId && extracted.platformType) {
                      finalPlatformId = extracted.platformId;
                      finalPlatformType = extracted.platformType;
                      break;
                    }
                  }
                }
              }

              // 2. Fallback: tentar das URLs originais/fornecidas
              if (!finalPlatformId || !finalPlatformType) {
                const targetLinks = productData.links || {};
                for (const p of platforms) {
                  const urlToParse = targetLinks[p];
                  if (urlToParse) {
                    const extracted = extractPlatformDetailsFromUrl(urlToParse, p);
                    if (extracted.platformId && extracted.platformType) {
                      finalPlatformId = extracted.platformId;
                      finalPlatformType = extracted.platformType;
                      break;
                    }
                  }
                }
              }
            }

            const precoAnterior = existingProduct.price;
            const precoNovo = parseFloat(productData.price);

            // Atualizar preço atual no produto
            const updatedProduct = await prisma.product.update({
              where: { id: existingProduct.id },
              data: { 
                price: parseFloat(productData.price),
                originalPrice: productData.originalPrice ? parseFloat(productData.originalPrice) : existingProduct.originalPrice,
                subcategory: productData.subcategory || existingProduct.subcategory,
                brand: productData.brand || existingProduct.brand,
                description: productData.description || existingProduct.description,
                model: productData.model || existingProduct.model,
                platformProductId: productData.platformProductId || finalPlatformId || existingProduct.platformProductId,
                platformId: finalPlatformId || existingProduct.platformId,
                platformType: finalPlatformType || existingProduct.platformType,
                storeName: productData.storeName || existingProduct.storeName,
                couponLink: productData.couponLink || existingProduct.couponLink,
                ...imageUpdateData,
                links: linksData
              },
              include: {
                links: true
              }
            });
            existingProduct = updatedProduct;
            
            for (const pl of productLinksDataUpdate) {
              await prisma.productLink.upsert({
                where: { productId_platform: { productId: existingProduct.id, platform: pl.platform } },
                create: { ...pl, productId: existingProduct.id },
                update: { sourceUrl: pl.sourceUrl, affiliateUrl: pl.affiliateUrl, generatedAffiliateUrl: pl.generatedAffiliateUrl }
              });
            }

            if (precoAnterior && precoNovo < precoAnterior) {
              verificarEDispararAlertas(existingProduct?.id || updatedProduct.id, precoAnterior, precoNovo).catch(err => {
                console.error('[Webhook Batch] Erro ao verificar alertas para produto:', existingProduct?.id || updatedProduct.id, err);
              });
            }// Repostagem no Telegram se o produto estiver 'isFixed' e ativo
            if (updatedProduct.isFixed && updatedProduct.status === 'active') {
              const existingLinks: any = updatedProduct.links || {};
              let publishLink = '';
              const platforms = ['amazon', 'aliexpress', 'shopee', 'mercadoLivre', 'tiktok', 'netshoes', 'magalu', 'kabum'] as const;
              let activePlatform = 'amazon';
              for (const plat of platforms) {
                if (existingLinks[plat]) {
                  publishLink = existingLinks[plat];
                  activePlatform = plat;
                  break;
                }
              }

              if (activePlatform && publishLink) {
                const lifestyleImg3 = updatedProduct?.enhancedImageUrl;
                if (lifestyleImg3 && !lifestyleImg3.includes('placeholder') && lifestyleImg3.trim() !== '') {
                  publishToQueueTop(updatedProduct, activePlatform, publishLink).then((success) => {
                    if (success) {
                       console.log(`🚀 [Repost Telegram Lote] Oferta repostada via Webhook (isFixed=true): ${updatedProduct?.name}`);
                    }
                  }).catch(e => {
                     console.error(`Falha ao repostar no Telegram para o produto ${updatedProduct?.id}:`, e);
                  });
                } else {
                  console.log(`[Repost Telegram Lote] Produto sem foto lifestyle - Pulando repost: ${updatedProduct?.name}`);
                }
              }
            }
          }
          results.push(existingProduct);
          continue;
        }

        const { links: processedLinks, productLinksData, status: processedStatus, resolvedUrls } = await processProductAffiliates(productData);
        
        // isAggregatorFailed removido - mantemos links originais
        let finalStatus = productData.status || processedStatus;

        if (productData.autoApprove === true) {
          finalStatus = 'pending'; // Inicia como pending, será aprovado no background se aiScore >= 6.5
          console.log(`[Webhook Batch] Iniciando como pending para avaliação por score: ${productData.name}`);
        }

        let finalPlatformId = productData.platformId;
        let finalPlatformType = productData.platformType;

        if (!finalPlatformId || !finalPlatformType) {
          const platforms = ['amazon', 'aliexpress', 'shopee', 'mercadoLivre', 'tiktok', 'netshoes', 'magalu', 'kabum'] as const;
          
          // 1. Tentar extrair das URLs resolvidas pelo webhook
          for (const p of platforms) {
            const urlToParse = resolvedUrls?.[p];
            if (urlToParse) {
              const extracted = extractPlatformDetailsFromUrl(urlToParse, p);
              if (extracted.platformId && extracted.platformType) {
                finalPlatformId = extracted.platformId;
                finalPlatformType = extracted.platformType;
                console.log(`[Webhook Batch] [PLATFORM_RESOLVED] Mapeado platformId/Type da URL resolvida (${p}): ${urlToParse} -> ${finalPlatformId} (${finalPlatformType})`);
                break;
              }
            }
          }

          // 2. Fallback: tentar extrair das URLs processadas ou originais
          if (!finalPlatformId || !finalPlatformType) {
            const targetLinks = processedLinks || productData.links || {};
            for (const p of platforms) {
              const urlToParse = targetLinks[p];
              if (urlToParse) {
                const extracted = extractPlatformDetailsFromUrl(urlToParse, p);
                if (extracted.platformId && extracted.platformType) {
                  finalPlatformId = extracted.platformId;
                  finalPlatformType = extracted.platformType;
                  console.log(`[Webhook Batch] [PLATFORM_FALLBACK] Mapeado platformId/Type da URL (fallback): ${urlToParse} -> ${finalPlatformId} (${finalPlatformType})`);
                  break;
                }
              }
            }
          }
        }

        const imagesToCreate = [];
        if (Array.isArray(productData.images) && productData.images.length > 0) {
          productData.images.forEach((url: string, index: number) => {
            imagesToCreate.push({ url, source: index === 0 ? 'scraper' : 'scraper_gallery', isPrimary: index === 0, order: index });
          });
        } else if (productData.imageUrl) {
          imagesToCreate.push({ url: productData.imageUrl, source: 'scraper', isPrimary: true, order: 0 });
        }
        
        const product = await prisma.product.create({
          data: {
            name: productData.name,
            category: productData.category,
            subcategory: productData.subcategory || null,
            brand: productData.brand || null,
            model: productData.model || null,
            platformProductId: productData.platformProductId || finalPlatformId || null,
            storeName: productData.storeName || null,
            description: productData.description || null,
            imageUrl: productData.imageUrl,
            enhancedImageUrl: productData.enhancedImageUrl || null,
            couponLink: productData.couponLink || null,
            price: productData.price ? parseFloat(productData.price) : null,
            originalPrice: productData.originalPrice ? parseFloat(productData.originalPrice) : null,
            status: finalStatus,
            externalId: productData.externalId || null,
            source: productData.source || null,
            platformId: finalPlatformId || null,
            platformType: finalPlatformType || null,
            links: processedLinks ? {
              create: {
                amazon: processedLinks.amazon || null,
                mercadoLivre: processedLinks.mercadoLivre || null,
                shopee: processedLinks.shopee || null,
                aliexpress: processedLinks.aliexpress || null,
                tiktok: processedLinks.tiktok || null,
                netshoes: processedLinks.netshoes || null,
                magalu: processedLinks.magalu || null,
                kabum: processedLinks.kabum || null,
              }
            } : undefined,
            productLinks: productLinksData && productLinksData.length > 0 ? {
              create: productLinksData
            } : undefined,
            images: imagesToCreate.length > 0 ? {
              create: imagesToCreate
            } : undefined
          },
          include: {
            links: true
          }
        });

        // Criar o primeiro registro de histórico de preço
        if (product.price) {
          await prisma.priceHistory.create({
            data: {
              productId: product.id,
              price: product.price,
              originalPrice: product.originalPrice,
            }
          });
        }

        // Se o produto já foi aprovado direto na criação (autoApprove: true), disparar notificação push
        if (finalStatus === 'active') {
          try {
            const discount = product.originalPrice && product.price && product.originalPrice > product.price 
              ? ((product.originalPrice - product.price) / product.originalPrice) * 100 
              : 0;
              
            const pushPayload = {
              title: product.name,
              body: `Preço: R$ ${product.price?.toFixed(2)}`,
              icon: product.imageUrl,
              url: `/produto/${product.id}`,
              productId: product.id
            };

            if (discount > 0) {
              pushPayload.body += ` (${discount.toFixed(0)}% OFF)`;
            }

            await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/push/send`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.API_SECRET_KEY || '',
              },
              body: JSON.stringify(pushPayload),
            }).catch(err => console.error('Erro push autoApprove PUT:', err));
            console.log(`📱 Notificação push enviada para autoApprove (PUT): ${product.id}`);
          } catch (pushErr) {
            console.error(`Erro ao enviar push notification autoApprove para produto ${product.id}:`, pushErr);
          }
        }

        results.push(product);

        // Processar IA em background sem await
        // Busca sinais reais: menor preço histórico e cupom na descrição
        const batchPriceHistory = await prisma.priceHistory.findMany({
          where: { productId: product.id },
          orderBy: { createdAt: 'asc' },
          select: { price: true }
        });
        const batchHasCoupon = !!(productData.description && productData.description.includes('CUPOM'));
        const batchHistoricalPrices = batchPriceHistory.map((r: { price: number }) => r.price);
        const batchIsLowestPrice = batchHistoricalPrices.length <= 1 ||
          (product.price !== null && product.price <= Math.min(...batchHistoricalPrices));

        processProductWithAI(
          productData.name, 
          productData.price ? parseFloat(productData.price) : 0, 
          null,
          productData.category,
          product.id,
          'evaluate',
          batchHasCoupon,
          batchIsLowestPrice
        ).then(async (aiResult) => {
          let newStatus = finalStatus;

          // Se autoApprove for true, forçar status como 'active' ignorando a nota da IA
          if (productData.autoApprove === true) {
            newStatus = 'active';
            console.log(`[Webhook Batch] Auto-aprovado pelo scraper (ignorando score da IA): ${productData.name}`);
          }

          let finalEnhancedImageUrl: string | null = product.enhancedImageUrl;
          let finalImageUrl: string = product.imageUrl;
          
          // DEBUG: Log do enhancedImageUrl recebido do scraper
          if (product.enhancedImageUrl) {
            console.log(`[Webhook Batch AI] enhancedImageUrl JÁ VINHA DO SCRAPER: ${product.enhancedImageUrl}`);
          } else {
            console.log(`[Webhook Batch AI] enhancedImageUrl VAZIO - tentando buscar secundária...`);
          }
          
          // SEMPRE tentar buscar imagem de alta qualidade do varejista (Amazon, ML, etc.)
          // mesmo se já tiver uma de agregador (Promobit, Gatry)
          const isAggregatorImage = product.imageUrl.includes('promobit.com.br') || 
                                     product.imageUrl.includes('gatry.com') ||
                                     product.imageUrl.includes('pelando.com.br') ||
                                     product.imageUrl.includes('pechinchou.com.br/media/img/products/D_NQ');
          
          if ((!finalEnhancedImageUrl || isAggregatorImage) && newStatus !== 'pending' && aiResult.score && aiResult.score >= 8.0) {
            if (isAggregatorImage) {
              console.log(`[Webhook Batch AI] Imagem do agregador detectada - buscando MELHOR do varejista...`);
            }
            const rawEnhancedUrl = await getSecondaryLifestyleImage(productData.links || {});
            if (rawEnhancedUrl) {
              const savedRetailImage = await saveEnhancedImage(rawEnhancedUrl, false);
              if (savedRetailImage) {
                // A imagem do varejista (fundo branco) vai para imageUrl (site).
                // A imagem original (lifestyle) vai para enhancedImageUrl (Telegram).
                 finalImageUrl = savedRetailImage;
                 if (!finalEnhancedImageUrl) {
                   const isLifestyle = product.imageUrl && (
                     product.imageUrl.includes('/products/social/') || 
                     product.imageUrl.includes('/products/real/')
                   );
                   if (isLifestyle) {
                     finalEnhancedImageUrl = product.imageUrl;
                   }
                 }
                 console.log(`[Webhook Batch AI] Encontrada imagem do varejista (fundo branco): ${savedRetailImage}. Swapeando original para enhancedImageUrl.`);
               }
             } else {
               if (product.imageUrl && (product.imageUrl.includes('pechinchou.com.br') || product.imageUrl.includes('assets.pechinchou.com.br'))) {
                 console.log(`[Webhook Batch AI] 🚫 Imagem do Pechinchou bloqueada. Tentando buscar substituta no DuckDuckGo...`);
                 try {
                   const ddgResults = await searchDuckDuckGoImages(product.name);
                   if (ddgResults && ddgResults.length > 0) {
                     const ddgUrl = ddgResults[0].image;
                     const savedDdgImage = await saveEnhancedImage(ddgUrl, false);
                     if (savedDdgImage) {
                       finalImageUrl = savedDdgImage;
                       console.log(`[Webhook Batch AI] ✅ Imagem do Pechinchou substituída com sucesso pelo DDG: ${savedDdgImage}`);
                     } else {
                       finalImageUrl = '';
                     }
                   } else {
                     finalImageUrl = '';
                   }
                 } catch (err) {
                   console.error(`[Webhook Batch AI] ❌ Erro ao buscar substituta no DDG:`, err);
                   finalImageUrl = '';
                 }
               }
             }
           } else if (finalEnhancedImageUrl) {
            console.log(`[Webhook Batch AI] USANDO enhancedImageUrl do scraper (PRIORIDADE): ${finalEnhancedImageUrl}`);
          }

          await prisma.product.update({
            where: { id: product.id },
            data: {
              aiScore: aiResult.score,
              aiAnalysis: aiResult.rawJson,
              imageUrl: finalImageUrl,
              enhancedImageUrl: finalEnhancedImageUrl || undefined,
              status: newStatus,
              aiProcessed: true,
              aiProcessedAt: new Date()
            }
          });
          console.log(`🤖 IA finalizou processamento do produto ${product.id}`);

          if (productData.links?.mercadoLivre) {
            await fetchAndSaveMLReviews(product.id, productData.links.mercadoLivre);
          }

          // Se a IA aprovou o produto, disparar notificação push e publicar no Telegram!
          if (finalStatus === 'pending' && newStatus === 'active') {
            try {
              const discount = product.originalPrice && product.price && product.originalPrice > product.price 
                ? ((product.originalPrice - product.price) / product.originalPrice) * 100 
                : 0;
                
              const pushPayload = {
                title: product.name,
                body: `Preço: R$ ${product.price?.toFixed(2)}`,
                icon: finalEnhancedImageUrl || product.imageUrl,
                url: `/produto/${product.id}`,
                productId: product.id
              };

              if (discount > 0) {
                pushPayload.body += ` (${discount.toFixed(0)}% OFF)`;
              }

              // Disparar push de forma assíncrona, mas aguardando
              await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/push/send`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-api-key': process.env.API_SECRET_KEY || '',
                },
                body: JSON.stringify(pushPayload),
              });
              console.log(`📱 Notificação push enviada para produto aprovado pela IA: ${product.id}`);
            } catch (pushErr) {
              console.error(`Erro ao enviar push notification para produto ${product.id}:`, pushErr);
            }

            // Publicar no Telegram de forma assíncrona apenas se NÃO for auto-aprovado automaticamente pelo robô
            if (productData.autoApprove !== true) {
              try {
                const existingLinks: any = product.links || {};
                let publishLink = '';
                const platforms = ['amazon', 'aliexpress', 'shopee', 'mercadoLivre', 'tiktok', 'netshoes', 'magalu', 'kabum'] as const;
                let activePlatform = 'amazon';
                for (const plat of platforms) {
                  if (existingLinks[plat]) {
                    publishLink = existingLinks[plat];
                    activePlatform = plat;
                    break;
                  }
                }

                if (activePlatform && publishLink) {
                  const tempProduct = {
                    ...product,
                    imageUrl: finalImageUrl,
                    enhancedImageUrl: finalEnhancedImageUrl || undefined,
                    status: newStatus,
                    aiScore: aiResult.score,
                    aiAnalysis: aiResult.rawJson
                  };
                  
                  const lifestyleImg4 = tempProduct.enhancedImageUrl;
                  if (lifestyleImg4 && !lifestyleImg4.includes('placeholder') && lifestyleImg4.trim() !== '') {
                    publishToQueueTop(tempProduct, activePlatform, publishLink).then((success) => {
                      if (success) {
                        console.log(`🚀 [Telegram Auto-Aprovar Lote] Oferta publicada no grupo: ${product.name}`);
                      }
                    }).catch(e => {
                      console.error(`Falha ao publicar automaticamente no Telegram em lote para o produto ${product.id}:`, e);
                    });
                  } else {
                    console.log(`[Telegram Auto-Aprovar Lote] Produto sem foto lifestyle - Pulando publicação: ${product.name}`);
                  }
                }
              } catch (tgErr) {
                console.error('[Webhook Batch] Falha ao extrair links para publicação no Telegram:', tgErr);
              }
            } else {
              console.log(`ℹ️ [Webhook Batch] Auto-aprovado com autoApprove=true. Ignorando publicação automática no Telegram (o robô gerencia a publicação).`);
            }
          }

        }).catch(error => {
          console.error(`Erro no processamento de IA em background para ${product.id}:`, error);
        });
      } catch {
        errors.push({
          product: productData.name,
          error: 'Erro ao criar produto'
        });
      }
    }

    return NextResponse.json({
      success: true,
      created: results.length,
      errorsCount: errors.length,
      results,
      errors
    }, { status: 201 });

  } catch (error) {
    console.error('Erro ao criar produtos em lote:', error);
    return NextResponse.json(
      { error: 'Erro ao processar produtos' },
      { status: 500 }
    );
  }
}

// Endpoint para atualizar LINKS de um produto específico (Usado pelo Robô Telegram)
export async function PATCH(request: Request) {
  if (!await validateWebhookSignature(request)) {
    return NextResponse.json(
      { error: 'Não autorizado. Assinatura do webhook inválida.' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { productId, platform, link } = body;

    if (!productId || !platform || !link) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: productId, platform, link' },
        { status: 400 }
      );
    }

    // O Prisma espera a chave correta no update
    const validPlatforms = ['amazon', 'aliexpress', 'shopee', 'mercadoLivre', 'tiktok', 'netshoes', 'magalu', 'kabum'];
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json(
        { error: `Plataforma inválida. Use uma de: ${validPlatforms.join(', ')}` },
        { status: 400 }
      );
    }

    // Primeiro certificamos que o produto existe
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { links: true }
    });

    if (!product) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    // Atualiza ou cria a entidade Link associada a este produto
    let updatedLinks;
    if (product.links) {
      updatedLinks = await prisma.link.update({
        where: { productId: productId },
        data: {
          [platform]: link
        }
      });
    } else {
      updatedLinks = await prisma.link.create({
        data: {
          productId: productId,
          [platform]: link
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: `Link da ${platform} atualizado com sucesso!`,
      links: updatedLinks
    }, { status: 200 });

  } catch (error) {
    console.error('Erro ao atualizar link de produto:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar link do produto' },
      { status: 500 }
    );
  }
}

