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

    const now = new Date();

    // ── Datas de referência ────────────────────────────────────────────
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

    const startOfDayBeforeYesterday = new Date(startOfYesterday);
    startOfDayBeforeYesterday.setDate(startOfDayBeforeYesterday.getDate() - 1);

    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const startOfThisWeek = new Date(now);
    startOfThisWeek.setDate(now.getDate() - now.getDay());
    startOfThisWeek.setHours(0, 0, 0, 0);

    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    // ── Queries em paralelo ────────────────────────────────────────────
    const [
      totalProducts,
      pendingProducts,
      approvedProducts,
      rejectedProducts,
      totalUsers,
      totalClicks,
      clicksToday,
      clicksYesterday,
      clicksDayBeforeYesterday,
      clicksThisMonth,
      clicksLastMonth,
      clicksThisWeek,
      newUsersThisWeek,
      newUsersLastWeek,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { status: 'pending' } }),
      prisma.product.count({ where: { status: 'active' } }),
      prisma.product.count({ where: { status: 'rejected' } }),
      prisma.user.count(),
      prisma.clickLog.count(),
      prisma.clickLog.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.clickLog.count({ where: { createdAt: { gte: startOfYesterday, lt: startOfToday } } }),
      prisma.clickLog.count({ where: { createdAt: { gte: startOfDayBeforeYesterday, lt: startOfYesterday } } }),
      prisma.clickLog.count({ where: { createdAt: { gte: startOfThisMonth } } }),
      prisma.clickLog.count({ where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
      prisma.clickLog.count({ where: { createdAt: { gte: startOfThisWeek } } }),
      prisma.user.count({ where: { createdAt: { gte: startOfThisWeek } } }),
      prisma.user.count({ where: { createdAt: { gte: startOfLastWeek, lt: startOfThisWeek } } }),
    ]);

    // ── Top produtos ───────────────────────────────────────────────────
    const topProductsRaw = await prisma.product.findMany({
      orderBy: { clicks: 'desc' },
      take: 10,
      select: { id: true, name: true, category: true, clicks: true, status: true },
    });

    // ── Produtos recentes ──────────────────────────────────────────────
    const recentProducts = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { id: true, shortId: true, name: true, category: true, status: true, createdAt: true, imageUrl: true },
    });

    // ── Cliques por dia (últimos 30 dias) ──────────────────────────────
    const clicksLast30Days = await prisma.clickLog.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
    });

    const clicksByDayMap: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      clicksByDayMap[dateStr] = 0;
    }
    clicksLast30Days.forEach(click => {
      const date = click.createdAt.toISOString().split('T')[0];
      if (clicksByDayMap[date] !== undefined) clicksByDayMap[date]++;
    });
    const clicksByDay = Object.keys(clicksByDayMap)
      .sort()
      .map(date => ({ date, clicks: clicksByDayMap[date] }));

    // ── Calcular tendências ────────────────────────────────────────────
    const calcTrend = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    return NextResponse.json({
      products: {
        total: totalProducts,
        pending: pendingProducts,
        approved: approvedProducts,
        rejected: rejectedProducts,
      },
      clicks: {
        today: clicksToday,
        todayTrend: calcTrend(clicksToday, clicksYesterday),
        thisWeek: clicksThisWeek,
        thisMonth: clicksThisMonth,
        monthTrend: calcTrend(clicksThisMonth, clicksLastMonth),
        total: totalClicks,
      },
      users: {
        total: totalUsers,
        newThisWeek: newUsersThisWeek,
        weekTrend: calcTrend(newUsersThisWeek, newUsersLastWeek),
      },
      topProducts: topProductsRaw,
      recentProducts,
      clicksByDay,
    });
  } catch (error) {
    console.error('Erro ao buscar dashboard:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
