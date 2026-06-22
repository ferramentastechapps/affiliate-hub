import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth-utils';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    if (!sessionToken) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const payload = verifyToken(sessionToken);
    if (!payload || (payload.role !== 'admin' && payload.role !== 'moderator')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search');
    const platform = searchParams.get('platform');
    const isActive = searchParams.get('isActive');

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { trackingCode: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (platform && platform !== 'all') where.platform = platform;
    if (isActive && isActive !== 'all') where.isActive = isActive === 'true';

    const [partners, total, activeCount, revenueAgg] = await Promise.all([
      prisma.partner.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.partner.count({ where }),
      prisma.partner.count({ where: { isActive: true } }),
      prisma.partner.aggregate({ _sum: { totalRevenue: true } }),
    ]);

    return NextResponse.json({
      partners,
      total,
      totalPages: Math.ceil(total / limit),
      page,
      stats: {
        active: activeCount,
        totalRevenue: revenueAgg._sum.totalRevenue || 0
      }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    if (!sessionToken) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const payload = verifyToken(sessionToken);
    if (!payload || (payload.role !== 'admin' && payload.role !== 'moderator')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { name, email, platform, channelName, trackingCode, commissionRate, notes } = await request.json();

    if (!name || !platform || !trackingCode) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 });
    }

    // Valida código único
    const existing = await prisma.partner.findUnique({ where: { trackingCode } });
    if (existing) {
      return NextResponse.json({ error: 'Este código de rastreio já está em uso.' }, { status: 400 });
    }

    const partner = await prisma.partner.create({
      data: {
        name,
        email,
        platform,
        channelName,
        trackingCode,
        commissionRate: parseFloat(commissionRate) || 0,
        notes,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: payload.id,
        action: 'partner.create',
        entityType: 'partner',
        entityId: partner.id,
        details: JSON.stringify({ name, trackingCode }),
      },
    });

    return NextResponse.json({ partner });
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
