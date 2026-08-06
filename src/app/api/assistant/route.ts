import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Histórico de mensagens inválido' }, { status: 400 });
    }

    const lastUserMsg = messages.filter((m: any) => m.role === 'user').pop()?.content || '';

    // Palavras irrelevantes para ignorar na busca direta
    const STOP_WORDS = new Set([
      'tem', 'qual', 'quais', 'voce', 'você', 'para', 'com', 'mais', 'bom', 'boa',
      'esse', 'essa', 'este', 'esta', 'sobre', 'onde', 'como', 'quero', 'busca',
      'procura', 'algum', 'alguma', 'link', 'desconto', 'oferta', 'promoção', 'site',
      'preço', 'valor', 'barato', 'barata', 'indica', 'indicação', 'me'
    ]);

    const userWords = lastUserMsg
      .replace(/[^\w\sà-úÀ-Ú]/gi, ' ')
      .toLowerCase()
      .split(/\s+/)
      .filter((w: string) => w.length >= 3 && !STOP_WORDS.has(w));

    // 1. Busca DIRETA no banco de dados pelas palavras enviadas pelo usuário
    let searchedProducts: any[] = [];
    if (userWords.length > 0) {
      searchedProducts = await prisma.product.findMany({
        where: {
          status: { not: 'rejected' },
          OR: userWords.flatMap((word: string) => [
            { name: { contains: word, mode: 'insensitive' as const } },
            { category: { contains: word, mode: 'insensitive' as const } },
            { subcategory: { contains: word, mode: 'insensitive' as const } },
            { brand: { contains: word, mode: 'insensitive' as const } },
            { description: { contains: word, mode: 'insensitive' as const } },
          ]),
        },
        select: {
          shortId: true,
          name: true,
          price: true,
          category: true,
          description: true,
          brand: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
    }

    // 2. Buscar ofertas recentes para complementar o contexto
    const recentProducts = await prisma.product.findMany({
      where: { status: { not: 'rejected' } },
      select: {
        shortId: true,
        name: true,
        price: true,
        category: true,
        description: true,
        brand: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 80,
    });

    // Mesclar sem duplicados (dando prioridade aos produtos encontrados na busca por palavra-chave)
    const activeProductsMap = new Map();
    [...searchedProducts, ...recentProducts].forEach((p) => {
      if (!activeProductsMap.has(p.shortId)) {
        activeProductsMap.set(p.shortId, p);
      }
    });
    const activeProducts = Array.from(activeProductsMap.values());

    const productsContext = activeProducts
      .map(
        (p) =>
          `- ID: ${p.shortId} | Nome: ${p.name} | Categoria: ${p.category} | Preço: R$ ${p.price || 'Sob consulta'} | Descrição: ${
            p.description ? p.description.substring(0, 100) + '...' : 'Sem descrição'
          }`
      )
      .join('\n');

    // 3. Montar prompt do sistema
    const systemInstruction = `Você é o "Jota", o assistente de compras inteligente oficial do Economizei.
Seu objetivo é ajudar os usuários a encontrarem as melhores ofertas de tecnologia, informática, games, casa e outros produtos no site.

INSTRUÇÕES IMPORTANTES:
1. Responda em Português do Brasil com um tom prestativo, moderno, descontraído e amigável.
2. Com base nas ofertas ativas disponíveis abaixo, recomende os produtos que mais se aproximam do que o usuário deseja.
3. Se um produto recomendado estiver na lista abaixo, você DEVE fornecer um link para ele no seguinte formato exato de markdown:
   [Nome do Produto](/produto/ID_DO_PRODUTO).
   Substitua ID_DO_PRODUTO pelo "ID" numérico exato do produto fornecido na lista (ex: [Mouse Gamer Logitech](/produto/123)).
4. Não invente links para produtos que não estão na lista abaixo. Se o produto desejado não estiver na lista, explique educadamente que não temos essa oferta ativa no momento, mas sugira alternativas próximas que estão na lista.
5. Seja direto e objetivo, sem textos excessivamente longos.

OFERTAS ATIVAS DO SITE ECONOMIZEI:
${productsContext || 'Nenhuma oferta ativa no momento.'}
`;

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY;

    let responseText = '';

    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: 'gemini-1.5-flash',
          systemInstruction: systemInstruction,
        });

        // Formatar histórico para o Gemini (roles suportados: user, model)
        const geminiHistory = messages.map((m: any) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));

        // Remove a última mensagem para enviar como o prompt atual
        const currentMessage = geminiHistory.pop();
        const chat = model.startChat({
          history: geminiHistory,
        });

        const result = await chat.sendMessage(currentMessage?.parts[0]?.text || 'Olá!');
        responseText = result.response.text();
      } catch (geminiError: any) {
        console.warn('[Assistant API] Gemini offline ou erro na API, usando busca nativa:', geminiError.message);
      }
    }

    // Fallback inteligente caso Gemini não responda ou chave não esteja configurada
    if (!responseText) {
      const matchedProducts = searchedProducts.length > 0 ? searchedProducts : activeProducts.filter((p) => {
        const nameLower = p.name.toLowerCase();
        const catLower = (p.category || '').toLowerCase();
        const descLower = (p.description || '').toLowerCase();
        return userWords.some((word: string) => nameLower.includes(word) || catLower.includes(word) || descLower.includes(word));
      }).slice(0, 4);

      if (matchedProducts.length > 0) {
        responseText = `Sim! Encontrei as seguintes opções no Economizei:\n\n` +
          matchedProducts.map((p: any) => `• [${p.name}](/produto/${p.shortId}) por R$ ${p.price ? p.price.toFixed(2).replace('.', ',') : 'Ver preço'}`).join('\n\n') +
          `\n\nClique no produto acima para ver todos os detalhes e o cupom!`;
      } else {
        const topProducts = activeProducts.slice(0, 3);
        responseText = `Não encontrei esse produto no momento, mas confira as melhores ofertas ativas do site:\n\n` +
          topProducts.map((p: any) => `• [${p.name}](/produto/${p.shortId}) por R$ ${p.price ? p.price.toFixed(2).replace('.', ',') : 'Ver preço'}`).join('\n\n');
      }
    }

    return NextResponse.json({ response: responseText });
  } catch (error: any) {
    console.error('[Assistant API] Erro ao processar:', error.message || error);
    return NextResponse.json({ error: 'Erro interno ao processar a conversa' }, { status: 500 });
  }
}
