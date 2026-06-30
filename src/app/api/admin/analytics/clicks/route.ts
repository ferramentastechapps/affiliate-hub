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

    // ── Buscando todos os cliques no período ───────────────────────────
    const allClicks = await prisma.clickLog.findMany({
      where: {
        createdAt: { gte: startDate },
        ...(channelFilter ? { channel: channelFilter } : {}),
      },
      select: {
        createdAt: true,
        channel: true,
        userAgent: true,
        productId: true,
      },
    });

    // ── 1. Cliques por dia ─────────────────────────────────────────────
    const byDayMap: Record<string, number> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      byDayMap[d.toISOString().split('T')[0]] = 0;
    }
    
    // ── 2. Cliques por canal ────────────────────────────────────────────
    const byChannelMap: Record<string, number> = {};
    
    allClicks.forEach(click => {
      // Por dia
      // Convert to local time string approximation or just use UTC date string
      const dateStr = new Date(click.createdAt.getTime() - (3 * 60 * 60 * 1000)).toISOString().split('T')[0];
      if (byDayMap[dateStr] !== undefined) {
        byDayMap[dateStr]++;
      } else {
        // Se cair fora por fuso, ignora ou soma no mais próximo
        const fallback = click.createdAt.toISOString().split('T')[0];
        if (byDayMap[fallback] !== undefined) byDayMap[fallback]++;
      }
      
      // Por canal
      const ch = click.channel || 'orgânico';
      byChannelMap[ch] = (byChannelMap[ch] || 0) + 1;
    });

    const byDay = Object.keys(byDayMap).sort().map(date => ({ date, clicks: byDayMap[date] }));
    
    const byChannel = Object.entries(byChannelMap)
      .map(([channel, clicks]) => ({ channel, clicks }))
      .sort((a, b) => b.clicks - a.clicks);

    // ── 3. Lista de canais disponíveis (para a UI) ──────────────────────
    const availableChannels = byChannel.map(r => r.channel).filter(Boolean);

    // ── 4. Cliques por dispositivo (via User-Agent em JS) ───────────────
    const byDeviceMap: Record<string, number> = { mobile: 0, desktop: 0, unknown: 0 };
    allClicks.forEach(click => {
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

    // ── 5. Top produtos via JS ────────────────────────────────
    const byProductCountMap: Record<string, number> = {};
    allClicks.forEach(click => {
      if (click.productId) {
        byProductCountMap[click.productId] = (byProductCountMap[click.productId] || 0) + 1;
      }
    });

    const byProductRaw = Object.entries(byProductCountMap)
      .map(([productId, count]) => ({ productId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

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
