import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import webpush from 'web-push';
import { filterSubscribers } from '@/lib/notifications/filterSubscribers';
import { validateImageUrl } from '@/lib/notifications/urlValidator';

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
    let couponCode: string | null = null;
    let imageUrl: string | null = null;

    if (productId) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { 
          category: true,
          imageUrl: true,
          coupons: {
            where: { isActive: true },
            take: 1
          }
        }
      });
      if (product) {
        productCategory = product.category;
        hasCoupon = product.coupons.length > 0;
        imageUrl = product.imageUrl;
        if (hasCoupon) {
          couponCode = product.coupons[0].code;
        }
      }
    }

    // Detecção adicional por palavra-chave no texto (caso o admin faça push com cupons sem vincular produto)
    const textToCheck = `${title} ${body}`.toLowerCase();
    if (textToCheck.includes('cupom') || textToCheck.includes('🎟️')) {
      hasCoupon = true;
    }

    // Valida a URL da imagem de forma assíncrona uma única vez no início do fluxo (timeout de 2 segundos)
    let validImageUrl: string | null = null;
    if (imageUrl) {
      const isValid = await validateImageUrl(imageUrl);
      if (isValid) {
        validImageUrl = imageUrl;
      }
    }

    // Busca todas as subscriptions ativas
    const allSubscriptions = await prisma.pushSubscription.findMany();

    // Filtra utilizando a lógica centralizada
    const subscriptions = filterSubscribers(allSubscriptions, {
      category: productCategory || undefined,
      hasCoupon
    });

    if (subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhuma subscription encontrada para este filtro',
        sent: 0,
      });
    }

    // Configura botões de ação para a notificação
    const actions = [];
    if (hasCoupon && couponCode) {
      actions.push({
        action: 'copy_coupon',
        title: `🎟️ Copiar Cupom (${couponCode})`
      });
    }
    actions.push({
      action: 'open_url',
      title: '🛒 Ver Oferta'
    });

    const payload = JSON.stringify({
      title,
      body,
      icon: icon || '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      url: url || '/',
      image: validImageUrl || undefined, // Imagem validada via urlValidator
      actions,
      couponCode, // Código do cupom para clique em 'copy_coupon'
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
          // Se a subscription expirou ou é inválida (410 Gone ou 404 Not Found), remove do banco
          if (error.statusCode === 410 || error.statusCode === 404) {
            await prisma.pushSubscription.delete({
              where: { endpoint: sub.endpoint },
            }).catch(() => {});
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
