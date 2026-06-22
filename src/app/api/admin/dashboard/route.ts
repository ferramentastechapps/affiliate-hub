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

    const [
      totalProducts,
      pendingProducts,
      approvedProducts,
      rejectedProducts,
      totalUsers,
      totalClicks
    ] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { status: 'pending' } }),
      prisma.product.count({ where: { status: 'active' } }),
      prisma.product.count({ where: { status: 'rejected' } }),
      prisma.user.count(),
      prisma.clickLog.count(),
    ]);

    const now = new Date();
    const startOfToday = new Date(now.setHours(0, 0, 0, 0));
    
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [clicksToday, clicksThisWeek, clicksThisMonth, newUsersThisWeek] = await Promise.all([
      prisma.clickLog.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.clickLog.count({ where: { createdAt: { gte: startOfWeek } } }),
      prisma.clickLog.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.user.count({ where: { createdAt: { gte: startOfWeek } } }),
    ]);

    const topProductsRaw = await prisma.product.findMany({
      orderBy: { clicks: 'desc' },
      take: 10,
      select: { id: true, name: true, category: true, clicks: true, status: true }
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const clicksLast30Days = await prisma.clickLog.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true }
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
      if (clicksByDayMap[date] !== undefined) {
        clicksByDayMap[date]++;
      }
    });

    const clicksByDay = Object.keys(clicksByDayMap)
      .sort()
      .map(date => ({ date, clicks: clicksByDayMap[date] }));

    return NextResponse.json({
      products: {
        total: totalProducts,
        pending: pendingProducts,
        approved: approvedProducts,
        rejected: rejectedProducts
      },
      clicks: {
        today: clicksToday,
        thisWeek: clicksThisWeek,
        thisMonth: clicksThisMonth,
        total: totalClicks
      },
      users: {
        total: totalUsers,
        newThisWeek: newUsersThisWeek
      },
      topProducts: topProductsRaw,
      clicksByDay
    });
  } catch (error) {
    console.error('Erro ao buscar dashboard:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
