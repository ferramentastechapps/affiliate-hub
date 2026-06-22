import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const alert = await prisma.productAlert.findUnique({
      where: {
        productId_userId: {
          productId: id,
          userId: session.user.id
        }
      }
    });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const { telegramId } = await request.json();

    if (telegramId) {
      // Salva ou atualiza o telegramId do usuário
      await prisma.user.update({
        where: { id: session.user.id },
        data: { telegramId: telegramId.toString() }
      });
    }

    // Verifica se já existe alerta
    const existingAlert = await prisma.productAlert.findUnique({
      where: {
        productId_userId: {
          productId: id,
          userId: session.user.id
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
        userId: session.user.id,
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
