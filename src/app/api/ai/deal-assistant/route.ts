import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createRateLimiter, getClientIp, sanitizeInput } from "@/lib/rate-limit";

// Rate limit: 10 mensagens por minuto por IP (evita abuso de fatura da IA)
const aiRateLimiter = createRateLimiter('ai-assistant', {
  windowMs: 60 * 1000,
  max: 10,
  message: 'Muitas mensagens. Aguarde 1 minuto antes de enviar mais.',
});

const MAX_QUERY_LENGTH = 500;

export async function POST(req: NextRequest) {
  try {
    // --- Rate limiting ---
    const ip = getClientIp(req);
    const rl = aiRateLimiter(ip);
    if (!rl.success) {
      return NextResponse.json(
        { error: rl.message },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } }
      );
    }

    const { query: rawQuery } = await req.json();

    if (!rawQuery || typeof rawQuery !== "string") {
      return NextResponse.json({ error: "Sua mensagem não pode estar vazia." }, { status: 400 });
    }

    // --- Sanitiza e limita o input do usuário ---
    const query = sanitizeInput(rawQuery, MAX_QUERY_LENGTH);
    if (query.length === 0) {
      return NextResponse.json({ error: "Mensagem inválida." }, { status: 400 });
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

    const lowerQuery = query.toLowerCase();
    const cleanQuery = query.replace(/[^\w\s\dÁ-ÿ]/gi, " ").trim();
    const searchTerms = cleanQuery.toLowerCase().split(/\s+/).filter(t => t.length > 2);

    // 3. Filtro flexível por categoria e palavras-chave
    let matchedProducts = activeProducts.filter(p => {
      const text = `${p.name} ${p.category || ''} ${p.storeName || ''}`.toLowerCase();

      if (lowerQuery.includes("smart") || lowerQuery.includes("celular") || lowerQuery.includes("phone") || lowerQuery.includes("iphone") || lowerQuery.includes("samsung") || lowerQuery.includes("xiaomi") || lowerQuery.includes("motorola")) {
        return text.includes("celular") || text.includes("phone") || text.includes("iphone") || text.includes("samsung") || text.includes("xiaomi") || text.includes("motorola") || p.category?.toLowerCase().includes("eletrônicos") || text.includes("redmi") || text.includes("galaxy");
      }
      if (lowerQuery.includes("cupom") || lowerQuery.includes("desconto") || lowerQuery.includes("promoc") || lowerQuery.includes("hoje") || lowerQuery.includes("oferta")) {
        return true;
      }
      return searchTerms.some(term => text.includes(term));
    });

    let replyText = "";
    let aiProductIds: string[] = [];

    // 4. Chamada à IA Gemini (usando o modelo oficial gemini-1.5-flash)
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const catalogContext = activeProducts.map(p => {
          const discount = p.originalPrice && p.price ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100) : 0;
          return `- ID: ${p.id} | ShortID: ${p.shortId} | Nome: ${p.name} | Cat: ${p.category} | Preço: R$ ${p.price} (${discount}% OFF)`;
        }).join("\n");

        const couponsContext = activeCoupons.map(c => `- Cupom ${c.code} (${c.platform}): ${c.discount} - ${c.description}`).join("\n");

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: "gemini-1.5-flash",
          generationConfig: { responseMimeType: "application/json" }
        });

        const promptText = `Você é o "Assistente Economizei", agente de ofertas da nossa plataforma.
Responda ao usuário ("${query}") recomendando produtos e cupons do nosso banco.

Produtos no Banco:
${catalogContext || "Nenhum produto."}

Cupons no Banco:
${couponsContext || "Nenhum cupom."}

Responda ESTRITAMENTE em JSON:
{
  "replyText": "Texto curto amigável recomendando as ofertas.",
  "recommendedProductIds": ["id_1", "id_2"]
}`;

        const aiRes = await model.generateContent(promptText);
        const parsed = JSON.parse(aiRes.response.text());
        if (parsed.replyText) replyText = parsed.replyText;
        if (Array.isArray(parsed.recommendedProductIds)) {
          aiProductIds = parsed.recommendedProductIds.map(String);
        }
      } catch (err) {
        console.warn("[AI Assistant] Gemini fallback acionado", err);
      }
    }

    // Se a IA indicou produtos válidos
    if (aiProductIds.length > 0) {
      const aiSelectedProducts = activeProducts.filter(p => aiProductIds.includes(p.id) || aiProductIds.includes(String(p.shortId)));
      if (aiSelectedProducts.length > 0) {
        matchedProducts = aiSelectedProducts;
      }
    }

    // FALLBACK DE SEGURANÇA: Garantir que SEMPRE haja até 4 produtos retornados
    if (matchedProducts.length === 0) {
      matchedProducts = activeProducts.slice(0, 4);
    } else {
      matchedProducts = matchedProducts.slice(0, 4);
    }

    // Tratar respostas específicas de cupons
    if (lowerQuery.includes("cupom") && activeCoupons.length > 0) {
      const topCouponsText = activeCoupons.slice(0, 3).map(c => `🎫 **${c.code}** (${c.platform}): ${c.discount} - ${c.description}`).join("\n");
      replyText = `Aqui estão os principais cupons ativos no momento:\n\n${topCouponsText}\n\nE confira também estas ofertas em destaque:`;
    }

    if (!replyText) {
      replyText = matchedProducts.length > 0 
        ? `Separei as melhores ofertas para o seu pedido! Confira os destaques abaixo:`
        : `Confira as promoções em destaque disponíveis no momento:`;
    }

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
