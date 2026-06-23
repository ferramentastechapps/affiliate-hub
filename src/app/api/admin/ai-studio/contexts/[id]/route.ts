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
  const { title, description, isActive, startsAt, endsAt } = await request.json();

  const data: any = {};
  if (title !== undefined) data.title = title.trim();
  if (description !== undefined) data.description = description.trim();
  if (isActive !== undefined) data.isActive = Boolean(isActive);
  if (startsAt !== undefined) data.startsAt = startsAt ? new Date(startsAt) : null;
  if (endsAt !== undefined) data.endsAt = endsAt ? new Date(endsAt) : null;

  const context = await prisma.aiContext.update({ where: { id }, data });
  return NextResponse.json({ success: true, context });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { id } = await params;
  await prisma.aiContext.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
