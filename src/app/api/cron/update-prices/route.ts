import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { scrapeProductFromUrl } from '@/lib/scraper';
import { sendTelegramMessage } from '@/lib/telegram';

export const dynamic = 'force-dynamic';
// Timeout maior para esse cron — ele faz scraping de muitos produtos
export const maxDuration = 60;

/**
 * Cron de atualização automática de preços.
 *
 * Disparo recomendado: a cada 4-6h (ex: via cron job na VPS ou Vercel Cron)
 *
 * Endpoint: GET /api/cron/update-prices
 * Autenticação: Bearer {CRON_SECRET} ou key={API_SECRET_KEY}
 *
 * O que faz:
 * 1. Busca produtos ativos com links de afiliado
 * 2. Para cada produto, tenta raspar o preço atual da URL fonte
 * 3. Se o preço mudou, registra no PriceHistory
 * 4. Se é o menor preço histórico, marca e dispara alerta para usuários interessados
 */
export async function GET(request: Request) {
  try {
    // ── Autenticação ─────────────────────────────────────────────────────────
    const authHeader = request.headers.get('authorization');
    const isAuthorizedHeader = authHeader === `Bearer ${process.env.CRON_SECRET}` ||
                               authHeader === `Bearer ${process.env.API_SECRET_KEY}`;
    if (!isAuthorizedHeader) {
      const url = new URL(request.url);
      const key = url.searchParams.get('key');
      if (key !== process.env.API_SECRET_KEY && key !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
      }
    }

    const { searchParams } = new URL(request.url);
    const batchSize = parseInt(searchParams.get('batch') || '20', 10); // Default: 20 produtos por execução
    const dryRun = searchParams.get('dry') === '1';

    console.log(`[UpdatePrices] Iniciando | batch=${batchSize} | dryRun=${dryRun}`);

    // ── Busca produtos ativos com links para raspar ────────────────────────
    const products = await prisma.product.findMany({
      where: {
        status: { in: ['active', 'approved'] },
        OR: [
          { productLinks: { some: { isActive: true, sourceUrl: { not: null } } } },
          { links: { amazon: { not: null } } },
          { links: { mercadoLivre: { not: null } } },
          { links: { shopee: { not: null } } },
        ],
      },
      include: {
        links: true,
        productLinks: {
          where: { isActive: true, sourceUrl: { not: null } },
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
        priceHistory: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        alerts: {
          where: { isActive: true },
          include: {
            user: { select: { id: true, telegramId: true } }
          }
        },
      },
      // Prioriza produtos que não foram atualizados recentemente
      orderBy: { updatedAt: 'asc' },
      take: batchSize,
    });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://economizei.ftech-apps.com.br';

    let updated = 0;
    let skipped = 0;
    let errors = 0;
    const lowestPriceAlerts: string[] = [];

    for (const product of products) {
      try {
        // Determina a URL de origem para raspar o preço atual
        const sourceUrl =
          product.productLinks[0]?.sourceUrl ||
          product.links?.amazon ||
          product.links?.mercadoLivre ||
          product.links?.shopee ||
          null;

        if (!sourceUrl) {
          skipped++;
          continue;
        }

        // Raspa apenas o preço (com timeout curto de 8s por produto)
        let newPrice: number | undefined;
        try {
          const scraped = await scrapeProductFromUrl(sourceUrl, true);
          newPrice = scraped.price;
        } catch (scrapeErr: any) {
          console.warn(`[UpdatePrices] Falha ao raspar ${product.id}: ${scrapeErr.message}`);
          errors++;
          continue;
        }

        if (!newPrice || newPrice <= 0) {
          skipped++;
          continue;
        }

        const currentPrice = product.price ?? 0;
        const priceDiff = Math.abs(newPrice - currentPrice);
        const diffPercent = currentPrice > 0 ? (priceDiff / currentPrice) * 100 : 100;

        // Só registra se houver mudança relevante (> 0.5% de diferença)
        if (diffPercent < 0.5 && product.priceHistory.length > 0) {
          skipped++;
          continue;
        }

        if (dryRun) {
          console.log(`[UpdatePrices][DRY] ${product.name}: R$ ${currentPrice} → R$ ${newPrice} (${diffPercent.toFixed(1)}%)`);
          updated++;
          continue;
        }

        // ── Registra no histórico de preços ──────────────────────────────
        await prisma.priceHistory.create({
          data: {
            productId: product.id,
            price: newPrice,
            originalPrice: product.originalPrice,
          },
        });

        // Atualiza o preço atual no produto
        await prisma.product.update({
          where: { id: product.id },
          data: { price: newPrice },
        });

        // ── Verifica se é o menor preço histórico ─────────────────────────
        const allPrices = product.priceHistory.map(h => h.price);
        const historicalMin = allPrices.length > 0 ? Math.min(...allPrices) : currentPrice;

        if (newPrice <= historicalMin * 1.01 && product.alerts.length > 0) {
          // Notifica usuários com alerta ativo para este produto
          for (const alert of product.alerts) {
            if (!alert.user?.telegramId) continue;

            // Verifica targetPrice e lastNotifiedAt para evitar spam
            const shouldNotify =
              !alert.lastNotifiedAt ||
              (new Date().getTime() - new Date(alert.lastNotifiedAt).getTime()) > 23 * 60 * 60 * 1000;

            if (!shouldNotify) continue;

            const priceStr = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(newPrice);
            const message =
              `🏆 <b>MENOR PREÇO HISTÓRICO!</b>\n\n` +
              `📦 <b>${product.name}</b>\n\n` +
              `💵 Agora por apenas <b>${priceStr}</b> — nunca esteve tão barato!\n\n` +
              `👉 <a href="${siteUrl}/produto/${product.shortId || product.id}">Aproveitar agora</a>`;

            await sendTelegramMessage(alert.user.telegramId, message, product.imageUrl).catch(console.error);

            // Atualiza lastNotifiedAt para não spammar
            await prisma.productAlert.update({
              where: { id: alert.id },
              data: { lastNotifiedAt: new Date() },
            });

            lowestPriceAlerts.push(`${product.name} → ${alert.user.telegramId}`);
          }
        }

        console.log(`[UpdatePrices] ✅ ${product.name}: R$ ${currentPrice} → R$ ${newPrice}`);
        updated++;
      } catch (err: any) {
        console.error(`[UpdatePrices] ❌ Erro no produto ${product.id}:`, err.message);
        errors++;
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        processed: products.length,
        updated,
        skipped,
        errors,
        lowestPriceAlerts: lowestPriceAlerts.length,
      },
      dryRun,
    });
  } catch (error: any) {
    console.error('[UpdatePrices] Erro geral:', error.message || error);
    return NextResponse.json({ error: 'Erro ao atualizar preços' }, { status: 500 });
  }
}
