import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * FASE 4 — Endpoint para produtos ranqueados por score composto
 * 
 * SCORE COMPOSTO (0-100):
 * 1. discountScore (0-40 pts): % de desconto real
 * 2. priceDropScore (0-30 pts): queda recente de preço
 * 3. aiScore (0-20 pts): score da IA normalizado
 * 4. freshnessScore (0-10 pts): tempo desde último post
 */
export async function GET() {
  try {
    // Buscar apenas produtos ativos com preço
    const products = await prisma.product.findMany({
      where: {
        status: { in: ['active', 'approved'] },
        price: { not: null },
      },
      include: {
        links: true,
        productLinks: true,
        images: true,
        priceHistory: {
          orderBy: { createdAt: 'desc' },
          take: 50 // Últimos 50 registros para análise
        },
        clickLogs: {
          select: {
            createdAt: true,
            channel: true
          }
        },
        _count: {
          select: {
            comments: true
          }
        }
      },
      take: 500 // Buscar mais produtos para ranquear
    });

    const now = new Date();
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Calcular score para cada produto
    const productsWithScore = products.map(product => {
      let totalScore = 0;
      const breakdown = {
        discountScore: 0,
        priceDropScore: 0,
        aiScore: 0,
        freshnessScore: 0
      };

      // 1. DISCOUNT SCORE (0-40 pts)
      if (product.price && product.originalPrice) {
        const discountPercent = ((product.originalPrice - product.price) / product.originalPrice) * 100;
        
        if (discountPercent < 15) {
          breakdown.discountScore = 0;
        } else if (discountPercent >= 15 && discountPercent < 30) {
          breakdown.discountScore = 15;
        } else if (discountPercent >= 30 && discountPercent < 50) {
          breakdown.discountScore = 25;
        } else if (discountPercent >= 50) {
          breakdown.discountScore = 40;
        }
      }

      // 2. PRICE DROP SCORE (0-30 pts)
      if (product.priceHistory && product.priceHistory.length > 0 && product.price) {
        // Verificar se houve queda nas últimas 6h
        const recentHistory = product.priceHistory.filter(h => h.createdAt >= sixHoursAgo);
        const last24hHistory = product.priceHistory.filter(h => h.createdAt >= twentyFourHoursAgo);
        
        if (recentHistory.length > 0) {
          const recentPrices = recentHistory.map(h => h.price).filter(Boolean) as number[];
          const maxRecentPrice = Math.max(...recentPrices);
          
          if (product.price < maxRecentPrice) {
            breakdown.priceDropScore = 30; // Caiu nas últimas 6h
          }
        } else if (last24hHistory.length > 0) {
          const last24hPrices = last24hHistory.map(h => h.price).filter(Boolean) as number[];
          const max24hPrice = Math.max(...last24hPrices);
          
          if (product.price < max24hPrice) {
            breakdown.priceDropScore = 20; // Caiu nas últimas 24h
          }
        }
      }

      // 3. AI SCORE (0-20 pts)
      if (product.aiScore) {
        breakdown.aiScore = (product.aiScore / 10) * 20; // Normaliza de 0-10 para 0-20
      }

      // 4. FRESHNESS SCORE (0-10 pts)
      // Verificar quando foi postado pela última vez no Telegram
      const telegramPosts = product.clickLogs?.filter(log => log.channel === 'telegram' || log.channel === 'tg') || [];
      
      if (telegramPosts.length === 0) {
        breakdown.freshnessScore = 10; // Nunca postado
      } else {
        const lastPost = telegramPosts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
        const daysSinceLastPost = (now.getTime() - lastPost.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSinceLastPost > 7) {
          breakdown.freshnessScore = 5; // Postado há mais de 7 dias
        } else if (daysSinceLastPost < 7) {
          breakdown.freshnessScore = 0; // Postado recentemente
        }
      }

      // TOTAL
      totalScore = breakdown.discountScore + breakdown.priceDropScore + breakdown.aiScore + breakdown.freshnessScore;

      // Indicadores úteis
      const neverPosted = telegramPosts.length === 0;
      const lastPostDate = telegramPosts.length > 0 
        ? telegramPosts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0].createdAt
        : null;

      return {
        ...product,
        totalScore: Math.round(totalScore * 10) / 10, // 1 casa decimal
        scoreBreakdown: breakdown,
        neverPosted,
        lastPostDate,
        daysSinceLastPost: lastPostDate 
          ? Math.floor((now.getTime() - lastPostDate.getTime()) / (1000 * 60 * 60 * 24))
          : null
      };
    });

    // Ordenar por score total (maior primeiro) e pegar top 20
    const topProducts = productsWithScore
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 20);

    return NextResponse.json(topProducts);
  } catch (error) {
    console.error('❌ Erro ao calcular best-to-post:', error);
    return NextResponse.json(
      { 
        error: 'Erro ao calcular produtos recomendados',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      }, 
      { status: 500 }
    );
  }
}
