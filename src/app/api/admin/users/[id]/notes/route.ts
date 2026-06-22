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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = await getAdminPayload();
  if (!payload) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { id } = await params;

  const notes = await prisma.userNote.findMany({
    where: { userId: id },
    orderBy: { createdAt: 'desc' },
    select: { id: true, text: true, authorId: true, createdAt: true },
  });

  // Enrich with author names
  const authorIds = [...new Set(notes.map((n) => n.authorId).filter(Boolean) as string[])];
  const authors = await prisma.user.findMany({
    where: { id: { in: authorIds } },
    select: { id: true, name: true },
  });
  const authorMap = Object.fromEntries(authors.map((a) => [a.id, a.name]));

  return NextResponse.json({
    notes: notes.map((n) => ({
      ...n,
      authorName: n.authorId ? (authorMap[n.authorId] || 'Admin') : 'Sistema',
    })),
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = await getAdminPayload();
  if (!payload) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { id } = await params;
  const { text } = await request.json();

  if (!text || !text.trim()) {
    return NextResponse.json({ error: 'Texto da nota é obrigatório' }, { status: 400 });
  }

  const note = await prisma.userNote.create({
    data: {
      userId: id,
      authorId: payload.id,
      text: text.trim(),
    },
    select: { id: true, text: true, authorId: true, createdAt: true },
  });

  await prisma.activityLog.create({
    data: {
      userId: payload.id,
      action: 'user.note.add',
      entityType: 'user',
      entityId: id,
      details: JSON.stringify({ noteId: note.id }),
    },
  });

  return NextResponse.json({
    note: { ...note, authorName: payload.name || 'Admin' },
  }, { status: 201 });
}
