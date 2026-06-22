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

  const tags = await prisma.userTag.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      color: true,
      _count: { select: { users: true } },
    },
  });

  return NextResponse.json({ tags });
}

export async function POST(request: NextRequest) {
  const payload = await getAdminPayload();
  if (!payload) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (payload.role !== 'admin') {
    return NextResponse.json({ error: 'Apenas admins podem criar tags' }, { status: 403 });
  }

  const { name, color } = await request.json();
  if (!name) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });

  const existing = await prisma.userTag.findUnique({ where: { name } });
  if (existing) return NextResponse.json({ error: 'Tag já existe' }, { status: 409 });

  const tag = await prisma.userTag.create({
    data: { name, color: color || '#6366f1' },
    select: { id: true, name: true, color: true },
  });

  return NextResponse.json({ tag }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const payload = await getAdminPayload();
  if (!payload) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (payload.role !== 'admin') {
    return NextResponse.json({ error: 'Apenas admins podem deletar tags' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });

  await prisma.userTag.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
