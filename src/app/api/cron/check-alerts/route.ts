import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.API_SECRET_KEY}` && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      const url = new URL(request.url);
      const key = url.searchParams.get("key");
      if (key !== process.env.API_SECRET_KEY) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
      }
    }

    // Buscar alertas de produtos que estão ativos com usuário associado
    const alerts = await prisma.productAlert.findMany({
      where: {
        isActive: true,
        user: {
          telegramId: { not: null }
        }
      },
      include: {
        product: {
          select: {
            id: true,
            shortId: true,
            name: true,
            price: true,
            originalPrice: true,
            imageUrl: true,
            category: true,
            status: true
          }
        },
        user: {
          select: {
            id: true,
            telegramId: true
          }
        }
      }
    });

    let notificadosCount = 0;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://economizei.ftech-apps.com.br";

    for (const alert of alerts) {
      const p = alert.product;
      const u = alert.user;

      if (!p || p.status !== "active" || !u.telegramId || !p.price) continue;

      const targetPrice = alert.targetPrice || p.originalPrice || 0;
      
      // Se o preço atual for menor que o preço alvo ou houve redução
      if (p.price < targetPrice || !alert.targetPrice) {
        const precoAtualStr = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(p.price);
        const precoAntigoStr = p.originalPrice ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(p.originalPrice) : null;
        
        const message = `🔔 <b>ALERTA DE QUEDA DE PREÇO!</b>\n\n` +
          `📦 <b>${p.name}</b>\n\n` +
          `💵 Preço atual: <b>${precoAtualStr}</b>` +
          (precoAntigoStr ? ` <s>(${precoAntigoStr})</s>` : "") + `\n\n` +
          `👉 <a href="${siteUrl}/produto/${p.shortId || p.id}">Clique aqui para aproveitar a oferta</a>`;

        const sent = await sendTelegramMessage(u.telegramId, message, p.imageUrl);
        if (sent) {
          notificadosCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      alertasVerificados: alerts.length,
      notificacoesEnviadas: notificadosCount
    });
  } catch (error: any) {
    console.error("Erro ao verificar alertas de preço:", error);
    return NextResponse.json({ error: "Erro ao processar verificação de alertas" }, { status: 500 });
  }
}
