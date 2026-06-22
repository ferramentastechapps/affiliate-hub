import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth-utils';
import { hashPassword } from '@/lib/auth-utils';

async function getAdminPayload(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;
  if (!sessionToken) return null;
  const payload = verifyToken(sessionToken);
  if (!payload || (payload.role !== 'admin' && payload.role !== 'moderator')) return null;
  return payload;
}

export async function GET(request: NextRequest) {
  const payload = await getAdminPayload(request);
  if (!payload) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, parseInt(searchParams.get('limit') || '20'));
  const search = searchParams.get('search') || '';
  const role = searchParams.get('role') || '';
  const tag = searchParams.get('tag') || '';
  const sort = searchParams.get('sort') || 'createdAt';

  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (role) where.role = role;

  if (tag) {
    where.tags = {
      some: {
        tag: { name: { contains: tag, mode: 'insensitive' } },
      },
    };
  }

  const orderBy: Record<string, string> = {};
  if (sort === 'engagementScore') orderBy.engagementScore = 'desc';
  else if (sort === 'lastLoginAt') orderBy.lastLoginAt = 'desc';
  else orderBy.createdAt = 'desc';

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        engagementScore: true,
        lastLoginAt: true,
        createdAt: true,
        tags: {
          select: {
            tag: { select: { id: true, name: true, color: true } },
          },
        },
        _count: {
          select: { comments: true, votes: true, alerts: true },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  // Role counts
  const [adminCount, moderatorCount, userCount] = await Promise.all([
    prisma.user.count({ where: { role: 'admin' } }),
    prisma.user.count({ where: { role: 'moderator' } }),
    prisma.user.count({ where: { role: 'user' } }),
  ]);

  return NextResponse.json({
    users: users.map((u) => ({
      ...u,
      tags: u.tags.map((t) => t.tag),
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    roleCounts: { admin: adminCount, moderator: moderatorCount, user: userCount },
  });
}

export async function POST(request: NextRequest) {
  const payload = await getAdminPayload(request);
  if (!payload) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (payload.role !== 'admin') {
    return NextResponse.json({ error: 'Apenas admins podem criar usuários' }, { status: 403 });
  }

  const body = await request.json();
  const { name, email, role = 'user' } = body;

  if (!name || !email) {
    return NextResponse.json({ error: 'Nome e email são obrigatórios' }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: 'Email já cadastrado' }, { status: 409 });
  }

  // Senha temporária aleatória (admin-created users sem senha real)
  const tempPassword = Math.random().toString(36).slice(-10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      role,
      password: hashPassword(tempPassword),
      isActive: true,
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  await prisma.activityLog.create({
    data: {
      userId: payload.id,
      action: 'user.create',
      entityType: 'user',
      entityId: user.id,
      details: JSON.stringify({ name, email, role }),
    },
  });

  return NextResponse.json({ user }, { status: 201 });
}
