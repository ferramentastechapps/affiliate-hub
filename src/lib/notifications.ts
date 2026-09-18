import { prisma } from './prisma';
import { sendTelegramMessage } from './telegram';
import webpush from 'web-push';

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY!;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@123testando.com';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

export async function verificarEDispararAlertas(
  productId: string,
  precoAnterior: number,
  precoNovo: number
) {
  // Calcular percentual de queda
  const quedaPercent = ((precoAnterior - precoNovo) / precoAnterior) * 100;
  
  if (quedaPercent <= 0) return; // preço não caiu
  
  // Buscar alertas ativos para este produto
  const alertas = await prisma.productAlert.findMany({
    where: {
      productId,
      isActive: true,
      // Só notificar se queda >= threshold do usuário (default 0% se null)
      OR: [
        { threshold: null },
        { threshold: { lte: quedaPercent } }
      ]
    },
    include: { 
      user: true, 
      product: true 
    }
  });
  
  const now = new Date(); // Objeto de data com fuso horário do servidor
  
  for (const alerta of alertas) {
    // Evitar spam — não notificar 2x no mesmo dia (cooldown de 24h baseado no fuso horário do servidor consistente em UTC)
    if (alerta.lastNotifiedAt) {
      const msDiff = now.getTime() - alerta.lastNotifiedAt.getTime();
      const horasDesdeUltima = msDiff / 3600000;
      if (horasDesdeUltima < 24) {
        console.log(`[Alerts] Cooldown ativo para alerta ${alerta.id} de usuário ${alerta.userId}. Horas passadas: ${horasDesdeUltima.toFixed(1)}h`);
        continue;
      }
    }
    
    try {
      await dispararNotificacao(alerta, precoAnterior, precoNovo, quedaPercent);
      
      await prisma.productAlert.update({
        where: { id: alerta.id },
        data: { lastNotifiedAt: now }
      });
    } catch (err: any) {
      console.error(`[Alerts] Erro ao disparar alerta ${alerta.id}:`, err.message);
    }
  }
}

export interface AlertWithRelations {
  id: string;
  userId: string;
  productId: string;
  channel: string;
  threshold?: number | null;
  lastNotifiedAt?: Date | null;
  user: {
    id: string;
    name?: string | null;
    telegramId?: string | null;
  };
  product: {
    id: string;
    shortId?: number | string | null;
    name: string;
    imageUrl?: string | null;
  };
}

const PUSH_ALERT_TITLES = [
  "Seu produto baixou de preço! 🔥",
  "Um item da sua lista caiu de preço! 📉",
  "Alerta de Desconto! 🚨",
  "Aquele produto que você queria está mais barato! 🛍️"
] as const;

const PUSH_ALERT_BODIES_TEMPLATES = [
  (name: string) => `${name} acabou de receber um desconto especial para você.`,
  (name: string) => `Corra antes que acabe! ${name} entrou em promoção.`,
  (name: string) => `Aproveite! Desconto aplicado em ${name}.`,
  (name: string) => `${name} está mais barato agora. Corre pra ver!`
] as const;

function getRandomPushAlertContent(productName: string): { title: string; body: string } {
  const title = PUSH_ALERT_TITLES[Math.floor(Math.random() * PUSH_ALERT_TITLES.length)];
  const bodyFn = PUSH_ALERT_BODIES_TEMPLATES[Math.floor(Math.random() * PUSH_ALERT_BODIES_TEMPLATES.length)];
  return { title, body: bodyFn(productName) };
}

async function dispatchTelegramAlert(alerta: AlertWithRelations, message: string): Promise<void> {
  if (alerta.user.telegramId) {
    console.log(`[Alerts] Enviando alerta via Telegram para o usuário ${alerta.user.name || alerta.user.id} (${alerta.user.telegramId})`);
    await sendTelegramMessage(alerta.user.telegramId, message, alerta.product.imageUrl || undefined);
  } else {
    console.warn(`[Alerts] Usuário ${alerta.user.id} selecionou Telegram, mas não possui telegramId cadastrado.`);
  }
}

async function dispatchPushAlert(alerta: AlertWithRelations): Promise<void> {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: alerta.user.id }
  });

  if (subscriptions.length === 0) {
    console.log(`[Alerts] Usuário ${alerta.user.id} selecionou Push, mas não possui inscrições de Web Push ativas.`);
    return;
  }

  console.log(`[Alerts] Enviando alerta via Web Push para o usuário ${alerta.user.name || alerta.user.id} (${subscriptions.length} subs)`);
  const { title, body } = getRandomPushAlertContent(alerta.product.name);

  const pushPayload = JSON.stringify({
    title,
    body,
    icon: alerta.product.imageUrl || '/icons/icon-192x192.png',
    url: `/produto/${alerta.product.shortId || alerta.product.id}`,
  });

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          pushPayload
        );
      } catch (error: any) {
        if (error.statusCode === 410 || error.statusCode === 404) {
          await prisma.pushSubscription.delete({ where: { endpoint: sub.endpoint } }).catch(() => {});
        }
      }
    })
  );
}

export async function dispararNotificacao(
  alerta: AlertWithRelations,
  precoAnterior: number,
  precoNovo: number,
  quedaPercent: number
) {
  const mensagem = formatarMensagemAlerta(alerta.product, precoAnterior, precoNovo, quedaPercent);

  if (alerta.channel === 'telegram' || alerta.channel === 'both') {
    await dispatchTelegramAlert(alerta, mensagem);
  }

  if (alerta.channel === 'push' || alerta.channel === 'both') {
    await dispatchPushAlert(alerta);
  }
}

function formatarMensagemAlerta(
  product: AlertWithRelations['product'],
  precoAnterior: number,
  precoNovo: number,
  quedaPercent: number
): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://economizei.ftech-apps.com.br";
  const linkProduto = `${siteUrl.replace(/\/$/, '')}/produto/${product.shortId || product.id}`;
  
  return `
🔔 <b>ALERTA DE QUEDA DE PREÇO!</b>

📦 <b>${product.name}</b>
💰 Preço anterior: R$ <s>${precoAnterior.toFixed(2).replace('.', ',')}</s>
🟢 <b>Preço atual: R$ ${precoNovo.toFixed(2).replace('.', ',')}</b>
📉 Desconto de <b>${quedaPercent.toFixed(1)}%</b>

🛒 Acesse e garanta a sua oferta:
🔗 <a href="${linkProduto}">${linkProduto}</a>
  `.trim();
}
