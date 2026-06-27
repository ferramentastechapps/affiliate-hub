import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth-utils';
import webpush from 'web-push';
import { filterSubscribers } from '@/lib/notifications/filterSubscribers';
import { validateImageUrl } from '@/lib/notifications/urlValidator';

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

  const [totalSubscriptions, recentLogs, subscriptions] = await Promise.all([
    prisma.pushSubscription.count(),
    prisma.activityLog.findMany({
      where: { action: 'notification.send' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, details: true, createdAt: true },
    }),
    prisma.pushSubscription.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          }
        }
      }
    })
  ]);

  const recentSent = recentLogs.map((l) => ({
    ...l,
    details: l.details
      ? (() => { try { return JSON.parse(l.details!); } catch { return l.details; } })()
      : null,
  }));

  return NextResponse.json({ totalSubscriptions, recentSent, subscriptions });
}

export async function POST(request: NextRequest) {
  const payload = await getAdminPayload();
  if (!payload) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { title, body, url, icon, target, categories, imageUrl } = await request.json();

  if (!title || !body) {
    return NextResponse.json({ error: 'Título e mensagem são obrigatórios' }, { status: 400 });
  }

  // 1. Validação de imagem única no início do processamento (HEAD request de 2s)
  let validImageUrl: string | null = null;
  if (imageUrl) {
    const isValid = await validateImageUrl(imageUrl);
    if (isValid) {
      validImageUrl = imageUrl;
    }
  }

  // 2. Busca todos os assinantes
  const allSubscriptions = await prisma.pushSubscription.findMany();

  // 3. Filtra os assinantes conforme os filtros selecionados pelo admin
  const subscriptions = filterSubscribers(allSubscriptions, {
    categories: target === 'categories' && Array.isArray(categories) ? categories : undefined,
    productName: `${title} ${body}`,
    hasCoupon: target === 'coupons' ? true : undefined
  });

  if (subscriptions.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0, total: 0 });
  }

  const actions = [];
  actions.push({
    action: 'open_url',
    title: '🛒 Ver Oferta'
  });

  const pushPayload = JSON.stringify({
    title,
    body,
    icon: icon || '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    url: url || '/',
    image: validImageUrl || undefined,
    actions,
  });

  // 4. Envio em lotes (batching) de 50 para evitar sobrecarga de conexões
  const batchSize = 50;
  const results: PromiseSettledResult<{ success: boolean }>[] = [];

  for (let i = 0; i < subscriptions.length; i += batchSize) {
    const batch = subscriptions.slice(i, i + batchSize);

    const batchResults = await Promise.allSettled(
      batch.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            pushPayload
          );
          return { success: true };
        } catch (error: unknown) {
          const webPushError = error as { statusCode?: number };
          // Se a subscription expirou ou é inválida, remove do banco de dados
          if (webPushError.statusCode === 410 || webPushError.statusCode === 404) {
            await prisma.pushSubscription.delete({ where: { endpoint: sub.endpoint } }).catch(() => {});
          }
          throw error;
        }
      })
    );

    results.push(...batchResults);

    // Pequeno intervalo entre os lotes (150ms)
    if (i + batchSize < subscriptions.length) {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }

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
