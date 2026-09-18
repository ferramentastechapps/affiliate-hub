import { prisma } from '@/lib/prisma';
import webpush from 'web-push';

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY!;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@123testando.com';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

interface CampaignRecord {
  id: string;
  title: string;
  message: string;
  channel: string;
  metadata?: string | null;
}

interface DispatchResult {
  totalTargets: number;
  totalSent: number;
  totalFailed: number;
}

async function dispatchPushCampaign(campaign: CampaignRecord): Promise<DispatchResult> {
  const subscriptions = await prisma.pushSubscription.findMany();
  const totalTargets = subscriptions.length;

  if (totalTargets === 0) {
    return { totalTargets: 0, totalSent: 0, totalFailed: 0 };
  }

  let metadata = { url: '/', icon: '/icons/icon-192x192.png' };
  if (campaign.metadata) {
    try {
      const parsed = JSON.parse(campaign.metadata);
      if (parsed.url) metadata.url = parsed.url;
      if (parsed.icon) metadata.icon = parsed.icon;
    } catch (e) {}
  }

  const pushPayload = JSON.stringify({
    title: campaign.title,
    body: campaign.message,
    icon: metadata.icon,
    badge: '/icons/icon-72x72.png',
    url: metadata.url,
  });

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          pushPayload
        );
        return true;
      } catch (error: any) {
        if (error.statusCode === 410 || error.statusCode === 404) {
          await prisma.pushSubscription.delete({ where: { endpoint: sub.endpoint } }).catch(() => {});
        }
        throw error;
      }
    })
  );

  const totalSent = results.filter((r) => r.status === 'fulfilled').length;
  const totalFailed = results.filter((r) => r.status === 'rejected').length;

  return { totalTargets, totalSent, totalFailed };
}

async function dispatchTelegramCampaign(campaign: CampaignRecord): Promise<DispatchResult> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  let channelId = process.env.TELEGRAM_CHANNEL_ID || process.env.TELEGRAM_PROMO_GROUP_ID;

  const sysConfig = await prisma.systemConfig.findUnique({ where: { key: 'telegram_channel_id' } });
  if (sysConfig?.value) channelId = sysConfig.value;

  if (!botToken || !channelId) {
    return { totalTargets: 1, totalSent: 0, totalFailed: 1 };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: channelId,
        text: `<b>${campaign.title}</b>\n\n${campaign.message}`,
        parse_mode: 'HTML',
        disable_web_page_preview: false,
      }),
    });

    return {
      totalTargets: 1,
      totalSent: res.ok ? 1 : 0,
      totalFailed: res.ok ? 0 : 1,
    };
  } catch {
    return { totalTargets: 1, totalSent: 0, totalFailed: 1 };
  }
}

async function dispatchWhatsappCampaign(campaign: CampaignRecord): Promise<DispatchResult> {
  const urlConfig = await prisma.systemConfig.findUnique({ where: { key: 'whatsapp_api_url' } });
  const tokenConfig = await prisma.systemConfig.findUnique({ where: { key: 'whatsapp_api_token' } });

  if (!urlConfig?.value || !tokenConfig?.value) {
    return { totalTargets: 1, totalSent: 0, totalFailed: 1 };
  }

  try {
    const res = await fetch(urlConfig.value, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `*${campaign.title}*\n\n${campaign.message}`,
        token: tokenConfig.value,
      }),
    });

    return {
      totalTargets: 1,
      totalSent: res.ok ? 1 : 0,
      totalFailed: res.ok ? 0 : 1,
    };
  } catch {
    return { totalTargets: 1, totalSent: 0, totalFailed: 1 };
  }
}

// Fire-and-forget implementation
// Processa a campanha em background para não travar a resposta HTTP
export async function processCampaign(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return;

  try {
    let result: DispatchResult;

    switch (campaign.channel) {
      case 'push':
        result = await dispatchPushCampaign(campaign);
        break;
      case 'telegram':
        result = await dispatchTelegramCampaign(campaign);
        break;
      case 'whatsapp':
        result = await dispatchWhatsappCampaign(campaign);
        break;
      default:
        result = { totalTargets: 0, totalSent: 0, totalFailed: 0 };
        break;
    }

    // Finaliza campanha
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'sent',
        sentAt: new Date(),
        totalTargets: result.totalTargets,
        totalSent: result.totalSent,
        totalFailed: result.totalFailed,
      }
    });
  } catch (err) {
    console.error('Erro no processamento da campanha:', err);
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'failed' }
    });
  }
}
