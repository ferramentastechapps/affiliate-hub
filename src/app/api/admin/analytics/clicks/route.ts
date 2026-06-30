import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth-utils';
import { Prisma } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const payload = verifyToken(sessionToken);
    if (!payload || (payload.role !== 'admin' && payload.role !== 'moderator')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d';
    const channelFilter = searchParams.get('channel') || null;

    let days = 30;
    if (period === '7d') days = 7;
    else if (period === '90d') days = 90;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // ── Condição de canal reutilizável ─────────────────────────────────
    const channelCondition = channelFilter
      ? Prisma.sql`AND channel = ${channelFilter}`
      : Prisma.empty;

    // ── 1. Cliques por dia via SQL GROUP BY (performático) ─────────────
    type DayRow = { day: string; count: bigint };
    const byDayRaw = await prisma.$queryRaw<DayRow[]>(Prisma.sql`
      SELECT
        TO_CHAR("createdAt" AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD') as day,
        COUNT(*) as count
      FROM "ClickLog"
      WHERE "createdAt" >= ${startDate}
      ${channelCondition}
      GROUP BY day
      ORDER BY day ASC
    `);

    // Preencher dias sem cliques com 0
    const byDayMap: Record<string, number> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      byDayMap[d.toISOString().split('T')[0]] = 0;
    }
    byDayRaw.forEach(row => {
      if (byDayMap[row.day] !== undefined) byDayMap[row.day] = Number(row.count);
    });
    const byDay = Object.keys(byDayMap).sort().map(date => ({ date, clicks: byDayMap[date] }));

    // ── 2. Cliques por canal ────────────────────────────────────────────
    type ChannelRow = { channel: string | null; count: bigint };
    const byChannelRaw = await prisma.$queryRaw<ChannelRow[]>(Prisma.sql`
      SELECT COALESCE(channel, 'orgânico') as channel, COUNT(*) as count
      FROM "ClickLog"
      WHERE "createdAt" >= ${startDate}
      GROUP BY COALESCE(channel, 'orgânico')
      ORDER BY count DESC
    `);
    const byChannel = byChannelRaw.map(r => ({
      channel: r.channel ?? 'orgânico',
      clicks: Number(r.count),
    }));

    // ── 3. Lista de canais disponíveis (para a UI) ──────────────────────
    const availableChannels = byChannel.map(r => r.channel).filter(Boolean);

    // ── 4. Cliques por dispositivo (via User-Agent em JS) ───────────────
    const clicksForDevice = await prisma.clickLog.findMany({
      where: {
        createdAt: { gte: startDate },
        ...(channelFilter ? { channel: channelFilter } : {}),
      },
      select: { userAgent: true },
    });
    const byDeviceMap: Record<string, number> = { mobile: 0, desktop: 0, unknown: 0 };
    clicksForDevice.forEach(click => {
      const ua = click.userAgent?.toLowerCase() || '';
      if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone') || ua.includes('ipad')) {
        byDeviceMap.mobile++;
      } else if (ua && ua !== 'unknown') {
        byDeviceMap.desktop++;
      } else {
        byDeviceMap.unknown++;
      }
    });
    const byDevice = Object.entries(byDeviceMap)
      .map(([device, clicks]) => ({ device, clicks }))
      .filter(d => d.clicks > 0);

    // ── 5. Top produtos via SQL GROUP BY ────────────────────────────────
    type ProductRow = { productId: string; count: bigint };
    const byProductRaw = await prisma.$queryRaw<ProductRow[]>(Prisma.sql`
      SELECT "productId", COUNT(*) as count
      FROM "ClickLog"
      WHERE "createdAt" >= ${startDate}
      ${channelCondition}
      GROUP BY "productId"
      ORDER BY count DESC
      LIMIT 20
    `);

    const productIds = byProductRaw.map(r => r.productId);
    const productDetails = productIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, name: true, category: true },
        })
      : [];

    const productMap = Object.fromEntries(productDetails.map(p => [p.id, p]));
    const byProduct = byProductRaw
      .map(r => ({
        productId: r.productId,
        name: productMap[r.productId]?.name ?? '',
        category: productMap[r.productId]?.category ?? '',
        clicks: Number(r.count),
      }))
      .filter(p => p.name !== '');

    // ── 6. Métricas de resumo ────────────────────────────────────────────
    const totalClicks = byDay.reduce((sum, d) => sum + d.clicks, 0);
    const avgPerDay = days > 0 ? Math.round(totalClicks / days) : 0;
    const peakDay = byDay.reduce(
      (best, d) => (d.clicks > best.clicks ? d : best),
      { date: '', clicks: 0 }
    );
    const topChannel = byChannel[0]?.channel ?? '—';

    return NextResponse.json({
      byDay,
      byChannel,
      byDevice,
      byProduct,
      availableChannels,
      summary: {
        total: totalClicks,
        avgPerDay,
        peakDay: peakDay.date,
        peakClicks: peakDay.clicks,
        topChannel,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar analytics:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
