import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth-utils';

async function getAdminPayload() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;
  if (!sessionToken) return null;
  const payload = verifyToken(sessionToken);
  if (!payload || (payload.role !== 'admin' && payload.role !== 'moderator')) return null;
  return payload;
}

export async function GET(request: NextRequest) {
  const payload = await getAdminPayload();
  if (!payload) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(50, parseInt(searchParams.get('limit') || '50'));
  const action = searchParams.get('action') || '';
  const entityType = searchParams.get('entityType') || '';
  const userId = searchParams.get('userId') || '';
  const dateFrom = searchParams.get('dateFrom') || '';
  const dateTo = searchParams.get('dateTo') || '';

  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (action) where.action = { contains: action, mode: 'insensitive' };
  if (entityType) where.entityType = entityType;
  if (userId) where.userId = userId;
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) (where.createdAt as Record<string, unknown>).gte = new Date(dateFrom);
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      (where.createdAt as Record<string, unknown>).lte = to;
    }
  }

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        details: true,
        ipAddress: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.activityLog.count({ where }),
  ]);

  // Distinct admins for filter dropdown
  const adminIds = await prisma.activityLog.groupBy({
    by: ['userId'],
    where: { userId: { not: null } },
  });
  const adminIdsFiltered = adminIds.map((a) => a.userId).filter(Boolean) as string[];
  const admins = await prisma.user.findMany({
    where: { id: { in: adminIdsFiltered } },
    select: { id: true, name: true, email: true },
  });

  // Distinct actions for filter dropdown
  const distinctActions = await prisma.activityLog.groupBy({ by: ['action'] });

  return NextResponse.json({
    logs: logs.map((l) => ({
      ...l,
      details: l.details ? (() => { try { return JSON.parse(l.details!); } catch { return l.details; } })() : null,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    admins,
    distinctActions: distinctActions.map((a) => a.action).sort(),
  });
}
