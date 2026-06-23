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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { id } = await params;
  const { rating } = await request.json();

  if (!rating || rating < 1 || rating > 10) {
    return NextResponse.json({ error: 'Rating deve ser entre 1 e 10' }, { status: 400 });
  }

  const caption = await prisma.captionHistory.update({
    where: { id },
    data: { rating, ratedAt: new Date() },
  });

  return NextResponse.json({ success: true, caption });
}
