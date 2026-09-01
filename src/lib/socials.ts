import { prisma } from './prisma';
import { sendTelegramMessage } from './telegram';

function formatCurrency(val: number | string | null | undefined): string {
  if (val == null) return '';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return String(val);
  return num.toFixed(2).replace('.', ',');
}

export async function publishCouponToSocials(coupon: any, affiliateLink: string) {
  const telegramGroupId = process.env.TELEGRAM_PROMO_GROUP_ID;
  const whatsappUrl = await prisma.systemConfig.findUnique({ where: { key: 'whatsapp_api_url' } });
  const whatsappToken = await prisma.systemConfig.findUnique({ where: { key: 'whatsapp_api_token' } });
  
  let platformName = coupon.platform.charAt(0).toUpperCase() + coupon.platform.slice(1);
  const pLower = coupon.platform.toLowerCase();
  if (pLower === 'mercadolivre' || pLower === 'mercado_livre') platformName = 'Mercado Livre';
  else if (pLower === 'magalu' || pLower === 'magazineluiza') platformName = 'Magazine Luiza';
  else if (pLower === 'aliexpress') platformName = 'AliExpress';

  const discountText = coupon.discount ? String(coupon.discount).trim() : 'Desconto Especial';
  const cleanDiscount = (discountText.toUpperCase().includes('OFF') || discountText.toUpperCase().includes('DESCONTO') || discountText.toUpperCase().includes('GRÁTIS') || discountText.toUpperCase().includes('GRATIS'))
    ? discountText
    : `${discountText} OFF`;

  let conditionTelegram = "";
  let conditionWhatsApp = "";

  if (coupon.minPurchaseValue && Number(coupon.minPurchaseValue) > 0) {
    conditionTelegram = `\n📌 <b>Condição:</b> Acima de R$ ${formatCurrency(coupon.minPurchaseValue)}`;
    conditionWhatsApp = `\n📌 *Condição:* Acima de R$ ${formatCurrency(coupon.minPurchaseValue)}`;
  } else if (coupon.applicableCategories && coupon.applicableCategories.trim()) {
    conditionTelegram = `\n📌 <b>Regra:</b> ${coupon.applicableCategories.trim()}`;
    conditionWhatsApp = `\n📌 *Regra:* ${coupon.applicableCategories.trim()}`;
  }

  // Telegram HTML Message
  const telegramMessage = `
🔥 <b>NOVO CUPOM ${platformName.toUpperCase()}!</b>

🏷️ <b>Cupom:</b> <code>${coupon.code}</code> <i>(toque para copiar)</i>
💰 <b>Desconto:</b> <b>${cleanDiscount}</b>${conditionTelegram}

👇 <i>Acesse o link e adicione o cupom na sua carteira:</i>
🔗 <b>Resgate aqui:</b> ${affiliateLink}
  `.trim();

  // WhatsApp Message
  const whatsappMessage = `
🔥 *NOVO CUPOM ${platformName.toUpperCase()}!*

🏷️ *Cupom:* \`${coupon.code}\` _(toque para copiar)_
💰 *Desconto:* *${cleanDiscount}*${conditionWhatsApp}

👇 _Acesse o link e adicione o cupom na sua carteira:_
🔗 *Resgate aqui:* ${affiliateLink}
  `.trim();

  // Disparo para Telegram
  if (telegramGroupId) {
    try {
      await sendTelegramMessage(telegramGroupId, telegramMessage);
      console.log(`[Socials] Cupom ${coupon.code} enviado para o Telegram`);
    } catch (err) {
      console.error(`[Socials] Erro ao enviar cupom para Telegram:`, err);
    }
  }

  // Disparo para WhatsApp
  if (whatsappUrl?.value && whatsappToken?.value) {
    try {
      await fetch(whatsappUrl.value, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: whatsappMessage,
          token: whatsappToken.value,
        }),
      });
      console.log(`[Socials] Cupom ${coupon.code} enviado para o WhatsApp`);
    } catch (err) {
      console.error(`[Socials] Erro ao enviar cupom para WhatsApp:`, err);
    }
  }
}

