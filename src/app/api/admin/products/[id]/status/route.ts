import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth-utils';

/**
 * PATCH /api/admin/products/[id]/status
 * Muda apenas o status do produto (silent approve).
 * NÃO dispara Telegram, push ou nenhuma notificação.
 * O envio ao Telegram é responsabilidade da fila do bot.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    const allowedStatuses = ['active', 'pending', 'rejected'];
    if (!status || !allowedStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Status inválido. Use: ${allowedStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    const product = await prisma.product.update({
      where: { id },
      data: { status },
      select: { id: true, name: true, status: true, updatedAt: true }
    });

    // Log de atividade (sem bloquear resposta)
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get('session')?.value;
      if (token) {
        const payload = verifyToken(token);
        if (payload?.userId) {
          await prisma.activityLog.create({
            data: {
              userId: payload.userId,
              action: status === 'active' ? 'product.approve' : 'product.update_status',
              entityType: 'product',
              entityId: id,
              details: JSON.stringify({ oldStatus: existing.status, newStatus: status }),
            }
          });
        }
      }
    } catch (_) { /* silencia falha no log */ }

    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error('❌ Erro ao atualizar status do produto:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar status', message: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}
