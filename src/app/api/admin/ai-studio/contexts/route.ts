import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth-utils';

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload || (payload.role !== 'admin' && payload.role !== 'moderator')) return null;
  return payload;
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const contexts = await prisma.aiContext.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(contexts);
}

export async function POST(request: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { title, description, isActive, startsAt, endsAt } = await request.json();
  if (!title?.trim() || !description?.trim()) {
    return NextResponse.json({ error: 'title e description são obrigatórios' }, { status: 400 });
  }

  const context = await prisma.aiContext.create({
    data: {
      title: title.trim(),
      description: description.trim(),
      isActive: isActive !== false,
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt: endsAt ? new Date(endsAt) : null,
    },
  });

  return NextResponse.json({ success: true, context });
}
