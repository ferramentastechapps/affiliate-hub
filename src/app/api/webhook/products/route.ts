import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateApiKey, validateWebhookSignature } from '@/lib/auth';
import { generateAffiliateLink } from '@/lib/affiliate';
import { processProductWithAI } from '@/lib/ai';
import { saveEnhancedImage } from '@/lib/storage';
import { getSecondaryLifestyleImage } from '@/lib/scraper';
import { publishToGroup } from '@/lib/telegram';
import { verificarEDispararAlertas } from '@/lib/notifications';
import { fetchAndSaveMLReviews } from '@/lib/reviews';

async function processProductAffiliates(productData: { links?: Record<string, string | undefined>, status?: string }) {
  const links = productData.links || {};
  const generatedLinks: Record<string, string> = {};
  const productLinksData: Array<{ platform: string, sourceUrl?: string, affiliateUrl?: string, generatedAffiliateUrl?: string, isActive: boolean }> = [];
  let hasAffiliate = false;
  let isAggregatorFailed = false;

  const platforms = ['amazon', 'aliexpress', 'shopee', 'mercadoLivre', 'tiktok', 'netshoes', 'magalu', 'kabum'] as const;
  
  for (const platform of platforms) {
    const originalUrl = links[platform];
    if (originalUrl) {
      try {
        console.log(`[Webhook] Auto-gerando link de afiliado para ${platform}: ${originalUrl}`);
        const generated = await generateAffiliateLink(originalUrl);
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
            console.log(`[Webhook] Falha ao resolver link do agregador ${originalUrl}. Salvando original para edição manual.`);
            isAggregatorFailed = true;
            // SALVA o link mesmo sendo agregador!
            generatedLinks[platform] = originalUrl;
            productLinksData.push({
              platform,
              sourceUrl: originalUrl,
              affiliateUrl: originalUrl,
              isActive: true
            });
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
           isAggregatorFailed = true;
           // SALVA O LINK
           generatedLinks[platform] = originalUrl;
           productLinksData.push({
             platform,
             sourceUrl: originalUrl,
             affiliateUrl: originalUrl,
             isActive: true
           });
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

  return {
    links: Object.keys(generatedLinks).length > 0 ? generatedLinks : null,
    productLinksData,
    status: hasAffiliate ? 'active' : 'pending'
  };
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
    // FASE 1 — DEDUPLICAÇÃO POR PLATFORM ID (PRIORIDADE MÁXIMA)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    let existingProduct = null;

    // Estágio 1 — platformId + platformType (mais preciso - ID real da plataforma)
    if (platformId && platformType) {
      existingProduct = await prisma.product.findFirst({
        where: { 
          platformId,
          platformType
        },
        include: { priceHistory: { orderBy: { createdAt: 'desc' }, take: 1 } }
      });
      
      if (existingProduct) {
        console.log(`[Webhook] Produto encontrado por platformId+platformType: ${platformId} (${platformType})`);
        
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
                OR: [
                  { productId: existingProduct.id },
                  { platform: existingProduct.platformType || existingProduct.source || '' }
                ],
                OR: [
                  { expiresAt: null },
                  { expiresAt: { gte: new Date() } }
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
                OR: [
                  { productId: existingProduct.id },
                  { platform: platform }
                ],
                OR: [
                  { expiresAt: null },
                  { expiresAt: { gte: new Date() } }
                ]
              },
              take: 3
            });
            
            // Disparar publicação no Telegram (assíncrono, não aguarda)
            publishToGroup({
              ...existingProduct,
              price: body.price,
              originalPrice: body.originalPrice || existingProduct.originalPrice,
              dropPercent: Math.round(dropPercent * 10) / 10,
              coupons: coupons.map(c => ({ code: c.code, discount: c.discount }))
            }, platform, affiliateLink).catch(err => {
              console.error('[Webhook] Erro ao publicar produto:', err);
            });
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

    const { links: processedLinks, productLinksData, status: processedStatus } = await processProductAffiliates(body);
    
    // isAggregatorFailed removido - agora mantemos o link original para aprovação manual

    let finalStatus = body.status || processedStatus;

    if (body.autoApprove === true) {
      finalStatus = 'active';
      console.log(`[Webhook] Auto-aprovado por fonte confiável: ${body.name}`);
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
        platformProductId: body.platformProductId || null,
        platformId: body.platformId || null,
        platformType: body.platformType || null,
        storeName: body.storeName || null,
        description: body.description || null,
        imageUrl: body.imageUrl,
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
          title: `Nova Oferta: ${product.name}`,
          body: `Preço: R$ ${product.price?.toFixed(2)}`,
          icon: product.imageUrl,
          url: `/produto/${product.id}`
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
        status: product.status,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        links: product.links
      }
    }, { status: 201 });

    // Processar IA em background sem await
    processProductWithAI(
      body.name, 
      body.price ? parseFloat(body.price) : 0, 
      body.originalPrice ? parseFloat(body.originalPrice) : null,
      body.category,
      product.id,
      'evaluate'
    ).then(async (aiResult) => {
      let newStatus = finalStatus;

      // Processamento da imagem se aprovado (obtendo imagem de lifestyle/secundária do varejista)
      let finalEnhancedImageUrl: string | null = null;
      if (newStatus !== 'pending' && aiResult.score && aiResult.score >= 8.0) {
        const rawEnhancedUrl = await getSecondaryLifestyleImage(body.links || {});
        if (rawEnhancedUrl) {
          finalEnhancedImageUrl = await saveEnhancedImage(rawEnhancedUrl, false);
        }
      }

          await prisma.product.update({
            where: { id: product.id },
            data: {
              aiScore: aiResult.score,
              aiAnalysis: aiResult.rawJson,
              enhancedImageUrl: finalEnhancedImageUrl,
              status: newStatus,
              aiProcessed: true,
              aiProcessedAt: new Date()
            }
          });
          console.log(`🤖 IA finalizou processamento do produto ${product.id}`);

          if (body.links?.mercadoLivre) {
            await fetchAndSaveMLReviews(product.id, body.links.mercadoLivre);
          }

      // Se a IA aprovou o produto, disparar notificação push!
      if (finalStatus === 'pending' && newStatus === 'active') {
        try {
          const discount = product.originalPrice && product.price && product.originalPrice > product.price 
            ? ((product.originalPrice - product.price) / product.originalPrice) * 100 
            : 0;
            
          const pushPayload = {
            title: `Novo Produto Aprovado: ${product.name}`,
            body: `Preço: R$ ${product.price?.toFixed(2)}`,
            icon: finalEnhancedImageUrl || product.imageUrl,
            url: `/produto/${product.id}`
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
            
            if (!skipProcessing) {
              const { links: processedLinks, productLinksData } = await processProductAffiliates(productData);
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
                model: productData.model || existingProduct.model,
                platformProductId: productData.platformProductId || existingProduct.platformProductId,
                storeName: productData.storeName || existingProduct.storeName,
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

              if (publishLink) {
                publishToGroup(updatedProduct, activePlatform, publishLink).then((success) => {
                  if(success) {
                     console.log(`🚀 [Repost Telegram Lote] Oferta repostada via Webhook (isFixed=true): ${updatedProduct?.name}`);
                  }
                }).catch(e => {
                   console.error(`Falha ao repostar no Telegram para o produto ${updatedProduct?.id}:`, e);
                });
              }
            }
          }
          results.push(existingProduct);
          continue;
        }

        const { links: processedLinks, productLinksData, status: processedStatus } = await processProductAffiliates(productData);
        
        // isAggregatorFailed removido - mantemos links originais
        let finalStatus = productData.status || processedStatus;

        if (productData.autoApprove === true) {
          finalStatus = 'active';
          console.log(`[Webhook Batch] Auto-aprovado por fonte confiável: ${productData.name}`);
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
            platformProductId: productData.platformProductId || null,
            storeName: productData.storeName || null,
            description: productData.description || null,
            imageUrl: productData.imageUrl,
            price: productData.price ? parseFloat(productData.price) : null,
            originalPrice: productData.originalPrice ? parseFloat(productData.originalPrice) : null,
            status: finalStatus,
            externalId: productData.externalId || null,
            source: productData.source || null,
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
              title: `Nova Oferta: ${product.name}`,
              body: `Preço: R$ ${product.price?.toFixed(2)}`,
              icon: product.imageUrl,
              url: `/produto/${product.id}`
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
        processProductWithAI(
          productData.name, 
          productData.price ? parseFloat(productData.price) : 0, 
          productData.originalPrice ? parseFloat(productData.originalPrice) : null,
          productData.category,
          product.id,
          'evaluate'
        ).then(async (aiResult) => {
            let newStatus = finalStatus;

          let finalEnhancedImageUrl: string | null = null;
          if (newStatus !== 'pending' && aiResult.score && aiResult.score >= 8.0) {
            const rawEnhancedUrl = await getSecondaryLifestyleImage(productData.links || {});
            if (rawEnhancedUrl) {
              finalEnhancedImageUrl = await saveEnhancedImage(rawEnhancedUrl, false);
            }
          }

          await prisma.product.update({
            where: { id: product.id },
            data: {
              aiScore: aiResult.score,
              aiAnalysis: aiResult.rawJson,
              enhancedImageUrl: finalEnhancedImageUrl,
              status: newStatus,
              aiProcessed: true,
              aiProcessedAt: new Date()
            }
          });
          console.log(`🤖 IA finalizou processamento do produto ${product.id}`);

          if (body.links?.mercadoLivre) {
            await fetchAndSaveMLReviews(product.id, body.links.mercadoLivre);
          }

          // Se a IA aprovou o produto, disparar notificação push!
          if (finalStatus === 'pending' && newStatus === 'active') {
            try {
              const discount = product.originalPrice && product.price && product.originalPrice > product.price 
                ? ((product.originalPrice - product.price) / product.originalPrice) * 100 
                : 0;
                
              const pushPayload = {
                title: `Novo Produto Aprovado: ${product.name}`,
                body: `Preço: R$ ${product.price?.toFixed(2)}`,
                icon: finalEnhancedImageUrl || product.imageUrl,
                url: `/produto/${product.id}`
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

