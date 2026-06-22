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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = await getAdminPayload();
  if (!payload) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { id } = await params;
  const { tagId } = await request.json();

  if (!tagId) return NextResponse.json({ error: 'tagId é obrigatório' }, { status: 400 });

  const existing = await prisma.userTagAssignment.findUnique({
    where: { userId_tagId: { userId: id, tagId } },
  });

  if (existing) return NextResponse.json({ error: 'Tag já adicionada' }, { status: 409 });

  const assignment = await prisma.userTagAssignment.create({
    data: { userId: id, tagId },
    select: { tag: { select: { id: true, name: true, color: true } } },
  });

  await prisma.activityLog.create({
    data: {
      userId: payload.id,
      action: 'user.tag.add',
      entityType: 'user',
      entityId: id,
      details: JSON.stringify({ tagId }),
    },
  });

  return NextResponse.json({ tag: assignment.tag }, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = await getAdminPayload();
  if (!payload) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const tagId = searchParams.get('tagId');

  if (!tagId) return NextResponse.json({ error: 'tagId é obrigatório' }, { status: 400 });

  await prisma.userTagAssignment.deleteMany({
    where: { userId: id, tagId },
  });

  await prisma.activityLog.create({
    data: {
      userId: payload.id,
      action: 'user.tag.remove',
      entityType: 'user',
      entityId: id,
      details: JSON.stringify({ tagId }),
    },
  });

  return NextResponse.json({ success: true });
}
