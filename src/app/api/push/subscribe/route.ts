import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
  try {
    const subscription = await request.json();

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: 'Subscription inválida' },
        { status: 400 }
      );
    }

    // Tenta obter o userId da sessão (opcional)
    let userId: string | null = null;
    try {
      const cookieStore = await cookies();
      const sessionToken = cookieStore.get('session')?.value;
      if (sessionToken) {
        const decoded = verifyToken(sessionToken);
        if (decoded && decoded.userId) {
          userId = decoded.userId;
        }
      }
    } catch (e) {
      console.warn('[Push Subscribe] Falha ao decodificar session token:', e);
    }

    // Salva ou atualiza a subscription no banco
    await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userId: userId || undefined,
      },
      create: {
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userId: userId || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao salvar subscription:', error);
    return NextResponse.json(
      { error: 'Erro ao salvar subscription' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { endpoint } = await request.json();

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint não fornecido' },
        { status: 400 }
      );
    }

    await prisma.pushSubscription.delete({
      where: { endpoint },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao remover subscription:', error);
    return NextResponse.json(
      { error: 'Erro ao remover subscription' },
      { status: 500 }
    );
  }
}
