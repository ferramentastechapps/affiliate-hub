import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth-utils';

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
    
    let days = 30;
    if (period === '7d') days = 7;
    else if (period === '90d') days = 90;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const clicks = await prisma.clickLog.findMany({
      where: { createdAt: { gte: startDate } },
      include: {
        product: { select: { id: true, name: true } }
      }
    });

    const byDayMap: Record<string, number> = {};
    const byChannelMap: Record<string, number> = {};
    const byDeviceMap: Record<string, number> = { mobile: 0, desktop: 0, unknown: 0 };
    const byProductMap: Record<string, { name: string, clicks: number }> = {};

    // Initialize days
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      byDayMap[dateStr] = 0;
    }

    clicks.forEach(click => {
      const date = click.createdAt.toISOString().split('T')[0];
      if (byDayMap[date] !== undefined) byDayMap[date]++;

      const channel = click.channel || 'orgânico';
      byChannelMap[channel] = (byChannelMap[channel] || 0) + 1;

      const ua = click.userAgent?.toLowerCase() || '';
      let device = 'unknown';
      if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
        device = 'mobile';
      } else if (ua) {
        device = 'desktop';
      }
      byDeviceMap[device]++;

      const pId = click.productId;
      if (!byProductMap[pId] && click.product) {
        byProductMap[pId] = { name: click.product.name, clicks: 0 };
      }
      if (byProductMap[pId]) {
        byProductMap[pId].clicks++;
      }
    });

    const byDay = Object.keys(byDayMap).sort().map(date => ({ date, clicks: byDayMap[date] }));
    const byChannel = Object.keys(byChannelMap).map(channel => ({ channel, clicks: byChannelMap[channel] })).sort((a, b) => b.clicks - a.clicks);
    const byDevice = Object.keys(byDeviceMap).map(device => ({ device, clicks: byDeviceMap[device] }));
    const byProduct = Object.keys(byProductMap)
      .map(productId => ({ productId, name: byProductMap[productId].name, clicks: byProductMap[productId].clicks }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 20);

    return NextResponse.json({
      byDay,
      byChannel,
      byDevice,
      byProduct
    });
  } catch (error) {
    console.error('Erro ao buscar analytics:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
