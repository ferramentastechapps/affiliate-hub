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

  const words = await prisma.aiBannedWord.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(words);
}

export async function POST(request: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { word, reason } = await request.json();
  if (!word?.trim()) return NextResponse.json({ error: 'Palavra obrigatória' }, { status: 400 });

  try {
    const banned = await prisma.aiBannedWord.create({
      data: { word: word.trim().toLowerCase(), reason: reason?.trim() || null },
    });
    return NextResponse.json({ success: true, banned });
  } catch {
    return NextResponse.json({ error: 'Palavra já cadastrada' }, { status: 409 });
  }
}
