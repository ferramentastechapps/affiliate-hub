import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    if (!sessionToken) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const payload = verifyToken(sessionToken);
    if (!payload || (payload.role !== 'admin' && payload.role !== 'moderator')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 1. Resumo de Campanhas
    const [allCampaigns, totalCampaigns, recentClicks] = await Promise.all([
      prisma.campaign.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.campaign.count(),
      prisma.clickLog.findMany({
        where: { createdAt: { gte: last24h } },
        select: { createdAt: true, channel: true, referrer: true },
      }),
    ]);

    const totalSent = allCampaigns.reduce((acc, c) => acc + (c.totalSent || 0), 0);
    const totalTargets = allCampaigns.reduce((acc, c) => acc + (c.totalTargets || 0), 0);
    const totalFailed = allCampaigns.reduce((acc, c) => acc + (c.totalFailed || 0), 0);

    // 2. Cliques por canal nos últimos 7 dias
    const channelClicks = await prisma.clickLog.groupBy({
      by: ['channel'],
      where: { createdAt: { gte: last7d } },
      _count: { _all: true },
    });

    const channelStats: Record<string, number> = {
      push: 0,
      telegram: 0,
      whatsapp: 0,
      website: 0,
      outros: 0,
    };

    let totalTrackedClicks7d = 0;
    for (const item of channelClicks) {
      const ch = (item.channel || '').toLowerCase();
      const count = item._count._all;
      totalTrackedClicks7d += count;
      if (ch in channelStats) {
        channelStats[ch] += count;
      } else {
        channelStats.outros += count;
      }
    }

    // 3. Distribuição de cliques por hora nas últimas 24h para o gráfico
    const hourlyDataMap: Record<string, { hour: string; clicks: number; push: number; telegram: number; whatsapp: number }> = {};

    for (let i = 23; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourStr = `${d.getHours().toString().padStart(2, '0')}:00`;
      hourlyDataMap[hourStr] = { hour: hourStr, clicks: 0, push: 0, telegram: 0, whatsapp: 0 };
    }

    for (const click of recentClicks) {
      const clickHour = `${new Date(click.createdAt).getHours().toString().padStart(2, '0')}:00`;
      if (hourlyDataMap[clickHour]) {
        hourlyDataMap[clickHour].clicks += 1;
        const ch = (click.channel || '').toLowerCase();
        if (ch === 'push') hourlyDataMap[clickHour].push += 1;
        else if (ch === 'telegram') hourlyDataMap[clickHour].telegram += 1;
        else if (ch === 'whatsapp') hourlyDataMap[clickHour].whatsapp += 1;
      }
    }

    const hourlyChartData = Object.values(hourlyDataMap);

    // 4. Desempenho por Campanha
    const campaignPerformances = allCampaigns.slice(0, 15).map((camp) => {
      // Estima cliques no canal da campanha
      const channelClicksCount = channelStats[camp.channel.toLowerCase()] || 0;
      const sent = camp.totalSent || 0;
      const ctr = sent > 0 ? Math.min(100, Math.round((channelClicksCount / sent) * 1000) / 10) : 0;

      return {
        id: camp.id,
        title: camp.title,
        channel: camp.channel,
        status: camp.status,
        sentAt: camp.sentAt,
        createdAt: camp.createdAt,
        totalTargets: camp.totalTargets,
        totalSent: camp.totalSent,
        totalFailed: camp.totalFailed,
        estimatedClicks: channelClicksCount,
        ctr,
      };
    });

    // Média de CTR geral estimada
    const overallCtr = totalSent > 0 ? Math.round((totalTrackedClicks7d / totalSent) * 1000) / 10 : 0;

    return NextResponse.json({
      summary: {
        totalCampaigns,
        totalSent,
        totalTargets,
        totalFailed,
        totalClicks24h: recentClicks.length,
        totalClicks7d: totalTrackedClicks7d,
        overallCtr,
        deliveryRate: totalTargets > 0 ? Math.round((totalSent / totalTargets) * 1000) / 10 : 100,
      },
      channelStats,
      hourlyChartData,
      campaignPerformances,
    });
  } catch (error: any) {
    console.error('Erro ao calcular analytics de campanhas:', error);
    return NextResponse.json({ error: 'Erro ao gerar relatório' }, { status: 500 });
  }
}
