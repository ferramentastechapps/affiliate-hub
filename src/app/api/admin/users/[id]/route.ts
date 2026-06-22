import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth-utils';
import { recalculateEngagementScore } from '@/lib/engagement';

async function getAdminPayload() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;
  if (!sessionToken) return null;
  const payload = verifyToken(sessionToken);
  if (!payload || (payload.role !== 'admin' && payload.role !== 'moderator')) return null;
  return payload;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = await getAdminPayload();
  if (!payload) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      engagementScore: true,
      lastLoginAt: true,
      createdAt: true,
      tags: { select: { tag: { select: { id: true, name: true, color: true } } } },
      notes: {
        orderBy: { createdAt: 'desc' },
        select: { id: true, text: true, authorId: true, createdAt: true },
      },
      _count: { select: { comments: true, votes: true, alerts: true } },
    },
  });

  if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });

  // Recent activity
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [recentComments, recentVotes, recentAlerts, activityLogs] = await Promise.all([
    prisma.comment.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        text: true,
        createdAt: true,
        product: { select: { id: true, name: true } },
      },
    }),
    prisma.productVote.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        type: true,
        createdAt: true,
        product: { select: { id: true, name: true } },
      },
    }),
    prisma.productAlert.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        createdAt: true,
        product: { select: { id: true, name: true } },
      },
    }),
    prisma.activityLog.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, action: true, entityType: true, entityId: true, createdAt: true },
    }),
  ]);

  // Build timeline
  const timeline = [
    ...recentComments.map((c) => ({
      type: 'comment',
      label: `Comentou em "${c.product.name}"`,
      detail: c.text.substring(0, 60),
      createdAt: c.createdAt,
    })),
    ...recentVotes.map((v) => ({
      type: 'vote',
      label: `${v.type === 'LIKE' ? 'Curtiu' : 'Não curtiu'} "${v.product.name}"`,
      detail: null,
      createdAt: v.createdAt,
    })),
    ...recentAlerts.map((a) => ({
      type: 'alert',
      label: `Criou alerta para "${a.product.name}"`,
      detail: null,
      createdAt: a.createdAt,
    })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 15);

  // Categories most clicked (via comments)
  const commentsByCategory = await prisma.comment.groupBy({
    by: ['productId'],
    where: { userId: id },
    _count: { productId: true },
  });

  const productIds = commentsByCategory.map((c) => c.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, category: true },
  });

  const categoryMap: Record<string, number> = {};
  commentsByCategory.forEach((c) => {
    const product = products.find((p) => p.id === c.productId);
    if (product) {
      categoryMap[product.category] = (categoryMap[product.category] || 0) + c._count.productId;
    }
  });

  const mostClickedCategories = Object.entries(categoryMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([category, count]) => ({ category, count }));

  return NextResponse.json({
    user: { ...user, tags: user.tags.map((t) => t.tag) },
    stats: {
      totalComments: user._count.comments,
      totalVotes: user._count.votes,
      totalAlerts: user._count.alerts,
      mostClickedCategories,
    },
    recentActivity: timeline,
    activityLogs,
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = await getAdminPayload();
  if (!payload) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { name, email, role, isActive } = body;

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (email !== undefined) updateData.email = email;
  if (role !== undefined) updateData.role = role;
  if (isActive !== undefined) updateData.isActive = isActive;

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, name: true, email: true, role: true, isActive: true, engagementScore: true },
  });

  const newScore = await recalculateEngagementScore(id);

  await prisma.activityLog.create({
    data: {
      userId: payload.id,
      action: 'user.update',
      entityType: 'user',
      entityId: id,
      details: JSON.stringify({ ...updateData, engagementScore: newScore }),
    },
  });

  return NextResponse.json({ user: { ...user, engagementScore: newScore } });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = await getAdminPayload();
  if (!payload) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (payload.role !== 'admin') {
    return NextResponse.json({ error: 'Apenas admins podem desativar usuários' }, { status: 403 });
  }

  const { id } = await params;

  await prisma.user.update({
    where: { id },
    data: { isActive: false },
  });

  await prisma.activityLog.create({
    data: {
      userId: payload.id,
      action: 'user.deactivate',
      entityType: 'user',
      entityId: id,
      details: JSON.stringify({ reason: 'Admin deactivated' }),
    },
  });

  return NextResponse.json({ success: true });
}
