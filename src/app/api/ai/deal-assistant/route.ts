import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createRateLimiter, getClientIp, sanitizeInput } from "@/lib/rate-limit";

// Rate limit: 20 mensagens por minuto por IP
const aiRateLimiter = createRateLimiter('ai-assistant', {
  windowMs: 60 * 1000,
  max: 20,
  message: 'Muitas mensagens. Aguarde alguns segundos antes de enviar mais.',
});

const MAX_QUERY_LENGTH = 500;

function parseBudget(text: string): number | null {
  const match = text.match(/(?:at[eé]|max|m[aá]ximo|abaixo de|menos de|at[eé] r\$)\s*(\d+(?:[.,]\d+)?)/i);
  if (match) {
    const val = parseFloat(match[1].replace(',', '.'));
    if (!isNaN(val) && val > 0) return val;
  }
  return null;
}

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

    const body = await req.json().catch(() => ({}));
    const rawQuery = body.query;

    if (!rawQuery || typeof rawQuery !== "string") {
      return NextResponse.json({ error: "Sua mensagem não pode estar vazia." }, { status: 400 });
    }

    // --- Sanitiza e limita o input do usuário ---
    const query = sanitizeInput(rawQuery, MAX_QUERY_LENGTH);
    if (query.length === 0) {
      return NextResponse.json({ error: "Mensagem inválida." }, { status: 400 });
    }

    const lowerQuery = query.toLowerCase();
    const maxBudget = parseBudget(lowerQuery);

    // 1. Buscar produtos ativos e aprovados recentes no banco
    const activeProducts = await prisma.product.findMany({
      where: {
        status: { in: ["active", "approved"] },
      },
      orderBy: { createdAt: "desc" },
      take: 60,
      select: {
        id: true,
        shortId: true,
        name: true,
        category: true,
        price: true,
        originalPrice: true,
        imageUrl: true,
        storeName: true,
        description: true,
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

    const cleanQuery = query.replace(/[^\w\s\dÁ-ÿ]/gi, " ").trim();
    const searchTerms = cleanQuery.toLowerCase().split(/\s+/).filter(t => t.length > 1 && !['ate', 'até', 'para', 'com', 'sem', 'por', 'que', 'dos', 'das', 'uma', 'uns'].includes(t));

    // 3. Algoritmo inteligente de pontuação local (garante resultado mesmo sem IA)
    type ScoredProduct = typeof activeProducts[0] & { score: number };
    const scoredProducts: ScoredProduct[] = [];

    for (const p of activeProducts) {
      let score = 0;
      const pName = (p.name || '').toLowerCase();
      const pCat = (p.category || '').toLowerCase();
      const pStore = (p.storeName || '').toLowerCase();
      const pDesc = (p.description || '').toLowerCase();
      const pText = `${pName} ${pCat} ${pStore} ${pDesc}`;

      // Verificação de orçamento
      if (maxBudget !== null && p.price) {
        if (p.price <= maxBudget) {
          score += 15;
        } else {
          score -= 20; // Penaliza produtos acima do orçamento
        }
      }

      // Pontuação por termos pesquisados
      for (const term of searchTerms) {
        if (pName.includes(term)) score += 10;
        if (pCat.includes(term)) score += 6;
        if (pDesc.includes(term)) score += 3;
        if (pStore.includes(term)) score += 2;
      }

      // Desconto expressivo soma pontos
      if (p.originalPrice && p.price && p.originalPrice > p.price) {
        const disc = ((p.originalPrice - p.price) / p.originalPrice) * 100;
        score += Math.min(disc / 10, 5);
      }

      if (score > 0 || searchTerms.length === 0) {
        scoredProducts.push({ ...p, score });
      }
    }

    // Ordena pelo maior score
    scoredProducts.sort((a, b) => b.score - a.score);

    let matchedProducts = scoredProducts.length > 0 ? scoredProducts : activeProducts;

    let replyText = "";
    let aiProductIds: string[] = [];

    // 4. Chamada à IA (OpenRouter ou Gemini com timeout seguro)
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (openRouterKey || geminiKey) {
      try {
        const topCatalog = activeProducts.slice(0, 25).map(p => {
          const discount = p.originalPrice && p.price ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100) : 0;
          return `- ID: ${p.id} | ShortID: ${p.shortId} | Nome: ${p.name} | Cat: ${p.category} | Preço: R$ ${p.price || 0} (${discount}% OFF)`;
        }).join("\n");

        const couponsContext = activeCoupons.map(c => `- Cupom ${c.code} (${c.platform}): ${c.discount} - ${c.description}`).join("\n");

        const promptText = `Você é o "Assistente Economizei", consultor especialista em compras e promoções.
O usuário perguntou: "${query}".

Produtos no Catálogo:
${topCatalog || "Nenhum produto."}

Cupons Disponíveis:
${couponsContext || "Nenhum cupom."}

Responda ESTRITAMENTE em formato JSON com:
{
  "replyText": "Uma resposta amigável, direta e entusiasmada em português (máx 2 frases) recomendando as melhores opções.",
  "recommendedProductIds": ["id_1", "id_2"]
}`;

        if (openRouterKey) {
          const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${openRouterKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: process.env.OPENROUTER_CAPTION_MODEL || "google/gemini-2.5-flash",
              messages: [{ role: "user", content: promptText }],
              response_format: { type: "json_object" }
            }),
            signal: AbortSignal.timeout(5000)
          });

          if (response.ok) {
            const aiData = await response.json();
            const rawContent = aiData.choices?.[0]?.message?.content || "";
            const parsed = JSON.parse(rawContent);
            if (parsed.replyText) replyText = parsed.replyText;
            if (Array.isArray(parsed.recommendedProductIds)) {
              aiProductIds = parsed.recommendedProductIds.map(String);
            }
          }
        } else if (geminiKey) {
          const genAI = new GoogleGenerativeAI(geminiKey);
          const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: { responseMimeType: "application/json" }
          });
          const aiRes = await model.generateContent(promptText);
          const parsed = JSON.parse(aiRes.response.text());
          if (parsed.replyText) replyText = parsed.replyText;
          if (Array.isArray(parsed.recommendedProductIds)) {
            aiProductIds = parsed.recommendedProductIds.map(String);
          }
        }
      } catch (err) {
        console.warn("[AI Assistant] Fallback local ativado:", err);
      }
    }

    // Se a IA indicou produtos válidos
    if (aiProductIds.length > 0) {
      const aiSelected = activeProducts.filter(p => aiProductIds.includes(p.id) || aiProductIds.includes(String(p.shortId)));
      if (aiSelected.length > 0) {
        matchedProducts = aiSelected as ScoredProduct[];
      }
    }

    // Limita aos top 4 produtos
    const finalProducts = matchedProducts.slice(0, 4);

    // Tratar respostas de cupons se o usuário pediu cupons
    if (lowerQuery.includes("cupom") && activeCoupons.length > 0) {
      const topCouponsText = activeCoupons.slice(0, 3).map(c => `🎫 **${c.code}** (${c.platform}): ${c.discount} - ${c.description}`).join("\n");
      replyText = `Aqui estão os melhores cupons ativos no momento:\n\n${topCouponsText}\n\nE confira também estas ofertas em destaque:`;
    }

    if (!replyText) {
      if (maxBudget !== null) {
        replyText = finalProducts.length > 0
          ? `Encontrei ótimas opções dentro do valor de até R$ ${maxBudget.toFixed(2)}:`
          : `Não encontrei produtos exatamente abaixo de R$ ${maxBudget.toFixed(2)}, mas aqui estão as melhores promoções da categoria:`;
      } else {
        replyText = finalProducts.length > 0
          ? `Separei as melhores ofertas para "${query}":`
          : `Confira os destaques mais vantajosos disponíveis hoje:`;
      }
    }

    const recommendedProducts = finalProducts.map(p => ({
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

