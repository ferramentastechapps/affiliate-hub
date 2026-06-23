import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import webpush from 'web-push';

// Configura as chaves VAPID
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY!;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@123testando.com';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

export async function POST(request: NextRequest) {
  try {
    // Verifica a chave de API
    const apiKey = request.headers.get('x-api-key');
    if (apiKey !== process.env.API_SECRET_KEY) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { title, body, icon, url, productId } = await request.json();

    if (!title || !body) {
      return NextResponse.json(
        { error: 'Título e corpo são obrigatórios' },
        { status: 400 }
      );
    }

    let productCategory: string | null = null;
    let hasCoupon = false;

    if (productId) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { 
          category: true,
          coupons: {
            where: { isActive: true }
          }
        }
      });
      if (product) {
        productCategory = product.category;
        hasCoupon = product.coupons.length > 0;
      }
    }

    // Detecção adicional por palavra-chave no texto (caso o admin faça push com cupons sem vincular produto)
    const textToCheck = `${title} ${body}`.toLowerCase();
    if (textToCheck.includes('cupom') || textToCheck.includes('🎟️')) {
      hasCoupon = true;
    }

    // Busca todas as subscriptions ativas
    const allSubscriptions = await prisma.pushSubscription.findMany();

    // Filtra as subscriptions com base nas preferências
    const subscriptions = allSubscriptions.filter(sub => {
      // Sem preferências (legado) -> recebe sempre
      if (!sub.preferences) return true;
      
      const prefs = sub.preferences as { all?: boolean; couponsOnly?: boolean; categories?: string[] };
      
      // Filtro para quem quer somente cupons
      if (prefs.couponsOnly) {
        return hasCoupon;
      }

      if (prefs.all) return true;

      // Se all = false e temos a categoria do produto, checar se a categoria está no array
      if (productCategory && prefs.categories && Array.isArray(prefs.categories)) {
        return prefs.categories.includes(productCategory);
      }

      // Se all = false e não sabemos a categoria do produto (push genérico),
      // a regra pode ser não enviar, a menos que seja um alerta geral.
      // Neste caso, se for push sem produto associado (ex: mensagem manual do admin), podemos assumir que é importante e enviar.
      return !productId; 
    });

    if (subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhuma subscription encontrada para este filtro',
        sent: 0,
      });
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: icon || '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      url: url || '/',
      data: { productId },
    });

    // Envia notificação para todos os inscritos
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
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
          return { success: true, endpoint: sub.endpoint };
        } catch (error: any) {
          // Se a subscription expirou ou é inválida, remove do banco
          if (error.statusCode === 410 || error.statusCode === 404) {
            await prisma.pushSubscription.delete({
              where: { endpoint: sub.endpoint },
            });
          }
          throw error;
        }
      })
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return NextResponse.json({
      success: true,
      sent: successful,
      failed,
      total: subscriptions.length,
    });
  } catch (error) {
    console.error('Erro ao enviar notificações:', error);
    return NextResponse.json(
      { error: 'Erro ao enviar notificações' },
      { status: 500 }
    );
  }
}
