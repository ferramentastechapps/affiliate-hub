import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Sua mensagem não pode estar vazia." }, { status: 400 });
    }

    // 1. Buscar produtos ativos recentes no banco (até 30 itens mais recentes)
    const activeProducts = await prisma.product.findMany({
      where: { status: "active" },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        shortId: true,
        name: true,
        category: true,
        price: true,
        originalPrice: true,
        storeName: true,
        coupons: {
          select: { code: true, discount: true },
          take: 1
        }
      }
    });

    // 2. Buscar cupons ativos no banco
    const activeCoupons = await prisma.coupon.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: {
        code: true,
        discount: true,
        platform: true,
        description: true
      }
    });

    // 3. Montar o contexto para a IA
    const catalogContext = activeProducts.map(p => {
      const discount = p.originalPrice && p.price ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100) : 0;
      const couponCode = p.coupons?.[0]?.code ? ` [Cupom: ${p.coupons[0].code}]` : '';
      return `- ID: ${p.id} | ShortID: ${p.shortId} | Nome: ${p.name} | Cat: ${p.category} | Preço: R$ ${p.price} (Original: R$ ${p.originalPrice || p.price}, ${discount}% OFF)${couponCode}`;
    }).join("\n");

    const couponsContext = activeCoupons.map(c => {
      return `- Cupom ${c.code} (${c.platform}): ${c.discount} - ${c.description}`;
    }).join("\n");

    const promptText = `Você é o "Assistente Economizei", o agente inteligente de ofertas e cupons da nossa plataforma.
Sua missão é responder à dúvida do usuário de forma super amigável, direta, prestativa e entusiasmada (com tom natural brasileiro).

Catálogo de Produtos Ativos no Nosso Banco de Dados:
${catalogContext || "Nenhum produto em estoque no momento."}

Cupons Disponíveis:
${couponsContext || "Nenhum cupom ativo no momento."}

Instruções Importantes:
1. Analise o pedido do usuário: "${query}"
2. Se o usuário estiver procurando um tipo específico de produto ou cupom, identifique até 3 produtos mais adequados do catálogo acima.
3. Responda em formato JSON com o seguinte esquema estrito:
{
  "replyText": "Sua resposta formatada amigável em Markdown com emojis. Seja direto e diga por que os produtos recomendados valem a pena.",
  "recommendedProductIds": ["id_ou_shortId_do_produto_1", "id_ou_shortId_do_produto_2"]
}

Observação: Inclua apenas IDs de produtos que REALMENTE estejam no catálogo fornecido acima. Se nenhum for relevante, retorne recommendedProductIds como [].`;

    // 4. Acionar Gemini via GEMINI_API_KEY
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json" }
      });

      const aiRes = await model.generateContent(promptText);
      const rawText = aiRes.response.text();
      try {
        const parsed = JSON.parse(rawText);
        return NextResponse.json(parsed);
      } catch (err) {
        console.warn("[AI Assistant] Resposta não-JSON do Gemini, tentando parse alternativo", rawText);
      }
    }

    // Fallback simples caso IA não esteja configurada ou falhe
    const lowerQuery = query.toLowerCase();
    const matches = activeProducts.filter(p => p.name.toLowerCase().includes(lowerQuery) || p.category.toLowerCase().includes(lowerQuery));
    const matchedIds = matches.slice(0, 3).map(p => String(p.shortId || p.id));

    return NextResponse.json({
      replyText: matches.length > 0 
        ? `Encontrei ${matches.length} oferta(s) incríveis relacionadas ao que você buscou! Confira abaixo os detalhes:`
        : `Não encontrei nenhuma oferta exatamente igual a "${query}" no momento, mas confira as nossas promoções em destaque na home!`,
      recommendedProductIds: matchedIds
    });

  } catch (error: any) {
    console.error("[AI Assistant API Error]", error);
    return NextResponse.json({ error: "Erro ao processar consulta com o assistente de ofertas." }, { status: 500 });
  }
}
