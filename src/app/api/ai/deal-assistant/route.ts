import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Sua mensagem não pode estar vazia." }, { status: 400 });
    }

    // 1. Buscar produtos ativos recentes no banco (até 30 itens)
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
        imageUrl: true,
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

    // 3. Montar contexto para a IA
    const catalogContext = activeProducts.map(p => {
      const discount = p.originalPrice && p.price ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100) : 0;
      const couponCode = p.coupons?.[0]?.code ? ` [Cupom: ${p.coupons[0].code}]` : '';
      return `- ID: ${p.id} | ShortID: ${p.shortId} | Nome: ${p.name} | Cat: ${p.category} | Preço: R$ ${p.price} (Original: R$ ${p.originalPrice || p.price}, ${discount}% OFF)${couponCode}`;
    }).join("\n");

    const couponsContext = activeCoupons.map(c => {
      return `- Cupom ${c.code} (${c.platform}): ${c.discount} - ${c.description}`;
    }).join("\n");

    const promptText = `Você é o "Assistente Economizei", o agente inteligente de ofertas e cupons da nossa plataforma.
Sua missão é responder à dúvida do usuário de forma amigável, direta e empolgada.

Catálogo de Produtos Ativos no Nosso Banco:
${catalogContext || "Nenhum produto em estoque no momento."}

Cupons Disponíveis:
${couponsContext || "Nenhum cupom ativo no momento."}

Instruções:
1. Analise a mensagem do usuário: "${query}"
2. Se o usuário busca ofertas ou cupons, escolha até 3 produtos mais relevantes do catálogo acima.
3. Responda estritamente em JSON com o formato:
{
  "replyText": "Resposta curta e amigável em Markdown recomendando as ofertas.",
  "recommendedProductIds": ["id_ou_shortId_1", "id_ou_shortId_2"]
}`;

    let replyText = "";
    let recommendedIds: string[] = [];

    // 4. Chamada ao Gemini com fallback inteligente
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: "gemini-2.5-flash",
          generationConfig: { responseMimeType: "application/json" }
        });

        const aiRes = await model.generateContent(promptText);
        const parsed = JSON.parse(aiRes.response.text());
        replyText = parsed.replyText || "";
        recommendedIds = Array.isArray(parsed.recommendedProductIds) ? parsed.recommendedProductIds.map(String) : [];
      } catch (err) {
        console.warn("[AI Assistant] Gemini fallback acionado", err);
      }
    }

    // 5. Filtro de produtos recomendados direto no Backend
    const lowerQuery = query.toLowerCase();
    let matchedProducts = activeProducts.filter(p => 
      recommendedIds.includes(p.id) || 
      recommendedIds.includes(String(p.shortId))
    );

    // Se a IA não retornou IDs válidos, fazer busca por palavra-chave no catálogo
    if (matchedProducts.length === 0) {
      const terms = lowerQuery.split(/\s+/).filter(t => t.length > 2);
      matchedProducts = activeProducts.filter(p => {
        if (lowerQuery.includes("promoc") || lowerQuery.includes("oferta") || lowerQuery.includes("hoje")) return true;
        const text = `${p.name} ${p.category} ${p.storeName || ''}`.toLowerCase();
        return terms.some(term => text.includes(term));
      }).slice(0, 3);
    }

    if (!replyText) {
      replyText = matchedProducts.length > 0 
        ? `Separei as melhores ofertas para o seu pedido! Confira os destaques abaixo:`
        : `Confira as promoções em destaque disponíveis no momento:`;
    }

    // Formatar produtos para o frontend com todos os campos visuais necessários
    const recommendedProducts = matchedProducts.map(p => ({
      id: p.id,
      shortId: p.shortId,
      name: p.name,
      category: p.category,
      price: p.price,
      originalPrice: p.originalPrice,
      imageUrl: p.imageUrl,
      storeName: p.storeName
    }));

    return NextResponse.json({
      replyText,
      recommendedProducts
    });

  } catch (error: any) {
    console.error("[AI Assistant API Error]", error);
    return NextResponse.json({ error: "Erro ao processar mensagem do assistente." }, { status: 500 });
  }
}
