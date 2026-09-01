import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import webpush from 'web-push';

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY!;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@123testando.com';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

export async function POST(request: NextRequest) {
  try {
    const { endpoint } = await request.json();

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint não fornecido' }, { status: 400 });
    }

    const sub = await prisma.pushSubscription.findUnique({
      where: { endpoint },
    });

    if (!sub) {
      return NextResponse.json({ error: 'Inscrição não encontrada no servidor' }, { status: 404 });
    }

    const payload = JSON.stringify({
      title: '🔔 Notificações Ativas!',
      body: 'Seu aparelho está configurado e pronto para receber os melhores alertas do Economizei.',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      url: '/',
    });

    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      },
      payload
    );

    return NextResponse.json({ success: true, message: 'Notificação de teste enviada com sucesso!' });
  } catch (error: any) {
    console.error('Erro ao enviar push de teste:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro ao enviar notificação de teste' },
      { status: 500 }
    );
  }
}
