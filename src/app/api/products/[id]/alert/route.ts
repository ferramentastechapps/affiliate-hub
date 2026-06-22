import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth-utils';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
    const payload = verifyToken(sessionToken);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const alert = await prisma.productAlert.findUnique({
      where: {
        productId_userId: {
          productId: id,
          userId: payload.userId
        }
      }
    });

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { telegramId: true }
    });

    return NextResponse.json({
      hasAlert: !!alert?.isActive,
      telegramId: user?.telegramId || ''
    });
  } catch (error) {
    console.error('Erro ao buscar alerta:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
    const payload = verifyToken(sessionToken);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const { telegramId } = await request.json();

    if (telegramId) {
      // Salva ou atualiza o telegramId do usuário
      await prisma.user.update({
        where: { id: payload.userId },
        data: { telegramId: telegramId.toString() }
      });
    }

    // Verifica se já existe alerta
    const existingAlert = await prisma.productAlert.findUnique({
      where: {
        productId_userId: {
          productId: id,
          userId: payload.userId
        }
      }
    });

    if (existingAlert) {
      // Toggle
      const updated = await prisma.productAlert.update({
        where: { id: existingAlert.id },
        data: { isActive: !existingAlert.isActive }
      });
      return NextResponse.json({ success: true, isActive: updated.isActive });
    }

    // Cria novo alerta
    const newAlert = await prisma.productAlert.create({
      data: {
        productId: id,
        userId: payload.userId,
        isActive: true,
        channel: 'telegram'
      }
    });

    return NextResponse.json({ success: true, isActive: newAlert.isActive });
  } catch (error) {
    console.error('Erro ao gerenciar alerta:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
