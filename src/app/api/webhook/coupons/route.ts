import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { publishToGroup } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

/**
 * WEBHOOK DE CUPONS NOVOS
 * 
 * Quando um cupom novo é cadastrado:
 * 1. Buscar produtos ativos da mesma plataforma
 * 2. Calcular score de cada produto
 * 3. Publicar os top 5 melhores produtos com o cupom
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, platform, discount, description } = body;

    if (!code || !platform) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: code, platform' },
        { status: 400 }
      );
    }

    console.log(`[Cupom Webhook] Novo cupom cadastrado: ${code} para ${platform}`);

    // Buscar produtos ativos da mesma plataforma
    const products = await prisma.product.findMany({
      where: {
        status: { in: ['active', 'approved'] },
        OR: [
          { platformType: platform },
          { source: platform }
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
      take: 100 // Pegar mais produtos para ranquear
    });

    console.log(`[Cupom Webhook] Encontrados ${products.length} produtos compatíveis`);

    if (products.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Cupom cadastrado mas nenhum produto compatível encontrado'
      });
    }

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
    const topProducts = productsWithScore
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    console.log(`[Cupom Webhook] Top 5 produtos selecionados para publicação`);

    // Publicar cada produto com o cupom
    let publishedCount = 0;
    for (const product of topProducts) {
      try {
        const productLink = product.productLinks?.[0];
        const affiliateLink = productLink?.generatedAffiliateUrl || productLink?.affiliateUrl || '';
        const platformName = productLink?.platform || product.platformType || platform;

        // Calcular preço com cupom (estimativa básica)
        let priceWithCoupon = product.price;
        if (product.price && discount) {
          const discountMatch = discount.match(/(\d+)%/);
          if (discountMatch) {
            const discountPercent = parseInt(discountMatch[1]);
            priceWithCoupon = product.price * (1 - discountPercent / 100);
          }
        }

        await publishToGroup(
          {
            ...product,
            coupons: [{ code, discount: discount || '' }],
            priceWithCoupon
          },
          platformName,
          affiliateLink
        );

        publishedCount++;
        console.log(`[Cupom Webhook] ✅ Publicado: ${product.name} (score: ${product.score})`);
        
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
