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
  const limit = Math.min(100, parseInt(searchParams.get('limit') || '20'));
  const search = searchParams.get('search') || '';

  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { text: { contains: search, mode: 'insensitive' } },
      { user: { name: { contains: search, mode: 'insensitive' } } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
      { product: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [comments, total] = await Promise.all([
    prisma.comment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        text: true,
        createdAt: true,
        guestName: true,
        user: { select: { id: true, name: true, email: true } },
        product: { select: { id: true, name: true, shortId: true } },
      },
    }),
    prisma.comment.count({ where }),
  ]);

  return NextResponse.json({
    comments,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}

export async function DELETE(request: NextRequest) {
  const payload = await getAdminPayload();
  if (!payload) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });

  const comment = await prisma.comment.findUnique({
    where: { id },
    select: { id: true, text: true, productId: true },
  });

  if (!comment) return NextResponse.json({ error: 'Comentário não encontrado' }, { status: 404 });

  await prisma.comment.delete({ where: { id } });

  await prisma.activityLog.create({
    data: {
      userId: payload.id,
      action: 'comment.delete',
      entityType: 'comment',
      entityId: id,
      details: JSON.stringify({
        text: comment.text.substring(0, 100),
        productId: comment.productId,
      }),
    },
  });

  return NextResponse.json({ success: true });
}
