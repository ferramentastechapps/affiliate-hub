import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth-utils';

async function getAdminPayload() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;
  if (!sessionToken) return null;
  const payload = verifyToken(sessionToken);
  if (!payload || payload.role !== 'admin') return null;
  return payload;
}

// PATCH: Atualiza preferências de um assinante específico
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getAdminPayload();
    if (!payload) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const { preferences } = await request.json();

    if (!preferences) {
      return NextResponse.json({ error: 'Preferências ausentes' }, { status: 400 });
    }

    const subscription = await prisma.pushSubscription.update({
      where: { id },
      data: { preferences }
    });

    return NextResponse.json({ success: true, preferences: subscription.preferences });
  } catch (error) {
    console.error('[Admin Subscriptions PATCH] Erro:', error);
    return NextResponse.json({ error: 'Erro ao atualizar preferências' }, { status: 500 });
  }
}

// DELETE: Remove uma assinatura do banco de dados (cancelamento manual)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getAdminPayload();
    if (!payload) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;

    await prisma.pushSubscription.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Assinatura removida com sucesso' });
  } catch (error) {
    console.error('[Admin Subscriptions DELETE] Erro:', error);
    return NextResponse.json({ error: 'Erro ao remover assinatura' }, { status: 500 });
  }
}
