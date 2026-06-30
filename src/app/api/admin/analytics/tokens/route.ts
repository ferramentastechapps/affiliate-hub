import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
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

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'hoje';

    const where: any = {};
    const now = new Date();
    
    if (period === 'hoje') {
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      where.createdAt = { gte: startOfToday };
    } else if (period === 'ontem') {
      const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
      where.createdAt = { gte: startOfYesterday, lte: endOfYesterday };
    } else {
      let dateFilter = new Date();
      if (period === '7d') dateFilter.setDate(dateFilter.getDate() - 7);
      else if (period === '30d') dateFilter.setDate(dateFilter.getDate() - 30);
      else if (period === '90d') dateFilter.setDate(dateFilter.getDate() - 90);
      where.createdAt = { gte: dateFilter };
    }

    // Agrupar por função
    const groupByFunction = await prisma.aiTokenLog.groupBy({
      by: ['functionName'],
      where,
      _sum: {
        inputTokens: true,
        outputTokens: true,
        totalTokens: true,
        costUSD: true
      },
      _count: {
        _all: true
      }
    });

    // Agrupar por modelo
    const groupByModel = await prisma.aiTokenLog.groupBy({
      by: ['modelUsed'],
      where,
      _sum: {
        inputTokens: true,
        outputTokens: true,
        totalTokens: true,
        costUSD: true
      },
      _count: {
        _all: true
      }
    });

    // Totais globais
    const globalAgg = await prisma.aiTokenLog.aggregate({
      where,
      _sum: {
        inputTokens: true,
        outputTokens: true,
        totalTokens: true,
        costUSD: true
      },
      _count: { _all: true }
    });

    // Obter usos recentes (limitado a 100)
    const recentLogs = await prisma.aiTokenLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({
      success: true,
      data: {
        totalCalls: globalAgg._count._all || 0,
        totalTokens: globalAgg._sum.totalTokens || 0,
        totalCostUSD: globalAgg._sum.costUSD || 0,
        groupByFunction,
        groupByModel,
        recentLogs
      }
    });
  } catch (error) {
    console.error('Erro ao buscar analytics de tokens:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
