import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { publishToGroup, publishToQueueTop } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

/**
 * WEBHOOK DE CUPONS NOVOS (ÚNICO / DISPARO)
 * 
 * Quando um cupom novo é cadastrado:
 * 1. Buscar produtos ativos da mesma plataforma
 * 2. Calcular score de cada produto
 * 3. Publicar os top 5 melhores produtos com o cupom
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, platform, discount, description, productId, expiresAt, minPurchaseValue, maxDiscountValue, applicableCategories } = body;

    if (!code || !platform) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: code, platform' },
        { status: 400 }
      );
    }

    const codeUpper = String(code).trim().toUpperCase();
    const platformLower = String(platform).trim().toLowerCase();

    // Salvar ou atualizar cupom no banco
    const existing = await prisma.coupon.findFirst({
      where: {
        code: codeUpper,
        platform: platformLower,
      },
    });

    if (existing) {
      await prisma.coupon.update({
        where: { id: existing.id },
        data: {
          description: description || existing.description,
          discount: discount || existing.discount,
          expiresAt: expiresAt ? new Date(expiresAt) : existing.expiresAt,
          minPurchaseValue: minPurchaseValue ? parseFloat(minPurchaseValue) : existing.minPurchaseValue,
          maxDiscountValue: maxDiscountValue ? parseFloat(maxDiscountValue) : existing.maxDiscountValue,
          applicableCategories: applicableCategories || existing.applicableCategories,
          isActive: true,
        },
      });
    } else {
      await prisma.coupon.create({
        data: {
          code: codeUpper,
          platform: platformLower,
          description: description || `Cupom ${platformLower.toUpperCase()}`,
          discount: discount || 'Desconto',
          productId: productId || null,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          minPurchaseValue: minPurchaseValue ? parseFloat(minPurchaseValue) : null,
          maxDiscountValue: maxDiscountValue ? parseFloat(maxDiscountValue) : null,
          applicableCategories: applicableCategories || null,
          isActive: true,
        },
      });
    }

    console.log(`[Cupom Webhook] Novo cupom cadastrado: ${codeUpper} para ${platformLower}${productId ? ` (produto específico: ${productId})` : ' (cupom genérico)'}`);

    // Se cupom é específico para um produto, buscar só aquele produto
    // Se cupom é genérico (sem productId), buscar produtos da plataforma
    const products = await prisma.product.findMany({
      where: productId ? {
        // Cupom específico: só o produto vinculado
        id: productId,
        status: { in: ['active', 'approved'] },
        price: { not: null }
      } : {
        // Cupom genérico: produtos da plataforma
        status: { in: ['active', 'approved'] },
        OR: [
          { platformType: platformLower },
          { source: platformLower }
        ],
        price: { not: null }
      },
      include: {
        productLinks: {
          where: { isActive: true },
          take: 1
        },
        priceHistory: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      },
      take: productId ? 1 : 100 // Se específico pega 1, senão pega 100 para ranquear
    });

    console.log(`[Cupom Webhook] Encontrados ${products.length} produtos compatíveis`);

    if (products.length === 0) {
      return NextResponse.json({
        success: true,
        message: productId 
          ? 'Cupom cadastrado mas produto não encontrado ou inativo'
          : 'Cupom cadastrado no site com sucesso'
      });
    }

    // Se cupom é específico, publicar só aquele produto (score não importa)
    // Se cupom é genérico, calcular score e pegar top 5
    const topProducts = productId ? products : (() => {
      // Calcular score de cada produto
      const productsWithScore = products.map(product => {
        let score = 0;

        // 1. Desconto base (0-40 pts)
        if (product.price && product.originalPrice) {
          const discountPercent = ((product.originalPrice - product.price) / product.originalPrice) * 100;
          if (discountPercent >= 50) score += 40;
          else if (discountPercent >= 30) score += 25;
          else if (discountPercent >= 15) score += 15;
        }

        // 2. AI Score (0-20 pts)
        if (product.aiScore) {
          score += (product.aiScore / 10) * 20;
        }

        // 3. Popularidade (0-20 pts)
        if (product.clicks) {
          if (product.clicks >= 100) score += 20;
          else if (product.clicks >= 50) score += 15;
          else if (product.clicks >= 20) score += 10;
          else if (product.clicks >= 10) score += 5;
        }

        // 4. Queda de preço recente (0-20 pts)
        if (product.priceHistory && product.priceHistory.length > 0 && product.price) {
          const recentPrices = product.priceHistory.slice(0, 5).map(h => h.price).filter(Boolean) as number[];
          if (recentPrices.length > 0) {
            const maxRecentPrice = Math.max(...recentPrices);
            if (product.price < maxRecentPrice) {
              const dropPercent = ((maxRecentPrice - product.price) / maxRecentPrice) * 100;
              if (dropPercent >= 10) score += 20;
              else if (dropPercent >= 5) score += 10;
            }
          }
        }

        return {
          ...product,
          score
        };
      });

      // Ordenar por score e pegar top 5
      return productsWithScore
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
    })();

    console.log(`[Cupom Webhook] ${productId ? 'Produto específico selecionado' : `Top ${topProducts.length} produtos selecionados`} para publicação`);

    // Publicar cada produto com o cupom
    let publishedCount = 0;
    for (const product of topProducts) {
      try {
        const productLink = product.productLinks?.[0];
        const affiliateLink = productLink?.generatedAffiliateUrl || productLink?.affiliateUrl || '';
        const platformName = productLink?.platform || product.platformType || platformLower;

        // Calcular preço com cupom (estimativa básica)
        let priceWithCoupon = product.price;
        if (product.price && discount) {
          const discountMatch = discount.match(/(\d+)%/);
          if (discountMatch) {
            const discountPercent = parseInt(discountMatch[1]);
            priceWithCoupon = product.price * (1 - discountPercent / 100);
          }
        }

        await publishToQueueTop(
          {
            ...product,
            coupons: [{ code: codeUpper, discount: discount || '' }],
            priceWithCoupon
          },
          platformName,
          affiliateLink
        );

        publishedCount++;
        const scoreInfo = 'score' in product ? ` (score: ${product.score})` : '';
        console.log(`[Cupom Webhook] ✅ Publicado: ${product.name}${scoreInfo}`);
        
        // Aguardar 2s entre publicações para não fazer spam
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`[Cupom Webhook] Erro ao publicar produto ${product.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cupom cadastrado e ${publishedCount} produto(s) publicado(s)`,
      publishedCount,
      totalCompatible: products.length
    });
  } catch (error) {
    console.error('[Cupom Webhook] Erro:', error);
    return NextResponse.json(
      {
        error: 'Erro ao processar cupom',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}

/**
 * WEBHOOK DE CUPONS EM LOTE (PUT)
 * Chamado pelos robôs / scrapers para sincronizar múltiplos cupons de uma vez
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const coupons = body.coupons || [];

    if (!Array.isArray(coupons) || coupons.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum cupom fornecido no array' },
        { status: 400 }
      );
    }

    let inserted = 0;
    let updated = 0;

    for (const c of coupons) {
      if (!c.code || !c.platform) continue;

      const codeUpper = String(c.code).trim().toUpperCase();
      const platformLower = String(c.platform).trim().toLowerCase();
      const description = c.description || c.title || `Cupom ${platformLower.toUpperCase()}`;
      const discount = c.discount || 'Desconto';
      const expiresAt = c.expiresAt ? new Date(c.expiresAt) : null;
      const minPurchaseValue = c.minPurchaseValue ? parseFloat(c.minPurchaseValue) : null;
      const maxDiscountValue = c.maxDiscountValue ? parseFloat(c.maxDiscountValue) : null;

      const existing = await prisma.coupon.findFirst({
        where: {
          code: codeUpper,
          platform: platformLower,
        },
      });

      if (existing) {
        await prisma.coupon.update({
          where: { id: existing.id },
          data: {
            description,
            discount,
            expiresAt,
            minPurchaseValue,
            maxDiscountValue,
            applicableCategories: c.applicableCategories || existing.applicableCategories,
            isActive: true,
          },
        });
        updated++;
      } else {
        await prisma.coupon.create({
          data: {
            code: codeUpper,
            platform: platformLower,
            description,
            discount,
            expiresAt,
            minPurchaseValue,
            maxDiscountValue,
            applicableCategories: c.applicableCategories || null,
            isActive: true,
          },
        });
        inserted++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `${inserted} cupons criados, ${updated} atualizados com sucesso.`,
      inserted,
      updated,
      total: coupons.length,
    });
  } catch (error) {
    console.error('[Coupons Batch Webhook] Erro:', error);
    return NextResponse.json(
      { error: 'Erro ao processar cupons em lote', message: error instanceof Error ? error.message : 'Erro' },
      { status: 500 }
    );
  }
}
