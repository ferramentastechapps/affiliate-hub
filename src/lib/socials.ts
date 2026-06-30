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
  if (coupon.platform === 'mercadolivre') platformName = 'Mercado Livre';
  else if (coupon.platform === 'magalu') platformName = 'Magazine Luiza';
  else if (coupon.platform === 'aliexpress') platformName = 'AliExpress';

  let limitsText = "";
  if (coupon.minPurchaseValue || coupon.maxDiscountValue || coupon.applicableCategories) {
    const limits = [];
    if (coupon.minPurchaseValue) limits.push(`Acima de R$ ${formatCurrency(coupon.minPurchaseValue)}`);
    if (coupon.maxDiscountValue) limits.push(`Limite de R$ ${formatCurrency(coupon.maxDiscountValue)} de desconto`);
    if (coupon.applicableCategories) limits.push(`Válido para: ${coupon.applicableCategories}`);
    
    limitsText = "\n⚠️ <b>Regras:</b>\n- " + limits.join("\n- ");
  }

  const message = `
🔥 <b>NOVO CUPOM ${platformName.toUpperCase()}!</b>

🎟️ <b>${coupon.discount}</b>
🏷️ Código: <code>${coupon.code}</code>
${coupon.description && coupon.description !== 'CUPOM' ? `\n📝 ${coupon.description}\n` : ''}${limitsText}

🔗 <b>Resgate aqui:</b> ${affiliateLink}
  `.trim();

  // Disparo para Telegram
  if (telegramGroupId) {
    try {
      await sendTelegramMessage(telegramGroupId, message);
      console.log(`[Socials] Cupom ${coupon.code} enviado para o Telegram`);
    } catch (err) {
      console.error(`[Socials] Erro ao enviar cupom para Telegram:`, err);
    }
  }

  // Disparo para WhatsApp
  if (whatsappUrl?.value && whatsappToken?.value) {
    try {
      const whatsappMsg = message
        .replace(/<b>(.*?)<\/b>/g, '*$1*') // Convert HTML bold to WhatsApp bold
        .replace(/<code>(.*?)<\/code>/g, '`$1`') // Convert HTML code to WhatsApp code
        .replace(/<i>(.*?)<\/i>/g, '_$1_'); // Convert HTML italic to WhatsApp italic

      await fetch(whatsappUrl.value, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: whatsappMsg,
          token: whatsappToken.value,
        }),
      });
      console.log(`[Socials] Cupom ${coupon.code} enviado para o WhatsApp`);
    } catch (err) {
      console.error(`[Socials] Erro ao enviar cupom para WhatsApp:`, err);
    }
  }
}
