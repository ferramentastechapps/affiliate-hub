import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth-utils';
import webpush from 'web-push';

async function getAdminPayload() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;
  if (!sessionToken) return null;
  const payload = verifyToken(sessionToken);
  if (!payload || payload.role !== 'admin') return null;
  return payload;
}

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY!;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@123testando.com';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

export async function GET(request: NextRequest) {
  const payload = await getAdminPayload();
  if (!payload) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const [totalSubscriptions, recentLogs] = await Promise.all([
    prisma.pushSubscription.count(),
    prisma.activityLog.findMany({
      where: { action: 'notification.send' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, details: true, createdAt: true },
    }),
  ]);

  const recentSent = recentLogs.map((l) => ({
    ...l,
    details: l.details
      ? (() => { try { return JSON.parse(l.details!); } catch { return l.details; } })()
      : null,
  }));

  return NextResponse.json({ totalSubscriptions, recentSent });
}

export async function POST(request: NextRequest) {
  const payload = await getAdminPayload();
  if (!payload) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { title, body, url, icon } = await request.json();

  if (!title || !body) {
    return NextResponse.json({ error: 'Título e mensagem são obrigatórios' }, { status: 400 });
  }

  const subscriptions = await prisma.pushSubscription.findMany();

  if (subscriptions.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0, total: 0 });
  }

  const pushPayload = JSON.stringify({
    title,
    body,
    icon: icon || '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    url: url || '/',
  });

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          pushPayload
        );
        return { success: true };
      } catch (error: unknown) {
        const webPushError = error as { statusCode?: number };
        if (webPushError.statusCode === 410 || webPushError.statusCode === 404) {
          await prisma.pushSubscription.delete({ where: { endpoint: sub.endpoint } });
        }
        throw error;
      }
    })
  );

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;

  await prisma.activityLog.create({
    data: {
      userId: payload.id,
      action: 'notification.send',
      entityType: 'notification',
      details: JSON.stringify({ title, body, sent, failed, total: subscriptions.length }),
    },
  });

  return NextResponse.json({ sent, failed, total: subscriptions.length });
}
