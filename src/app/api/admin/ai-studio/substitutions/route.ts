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

  const subs = await prisma.aiWordSubstitution.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(subs);
}

export async function POST(request: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { fromWord, toWord } = await request.json();
  if (!fromWord?.trim() || !toWord?.trim()) {
    return NextResponse.json({ error: 'fromWord e toWord são obrigatórios' }, { status: 400 });
  }

  try {
    const sub = await prisma.aiWordSubstitution.create({
      data: { fromWord: fromWord.trim().toLowerCase(), toWord: toWord.trim() },
    });
    return NextResponse.json({ success: true, sub });
  } catch {
    return NextResponse.json({ error: 'Já existe uma substituição para esta palavra' }, { status: 409 });
  }
}
