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

    // 1. Buscar os produtos ativos mais recentes para servir de contexto (RAG simples)
    const activeProducts = await prisma.product.findMany({
      where: { status: { in: ['active', 'approved'] } },
      select: {
        shortId: true,
        name: true,
        price: true,
        category: true,
        description: true,
        brand: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 120, // Suficiente para caber no context window de forma leve
    });

    const productsContext = activeProducts
      .map(
        (p) =>
          `- ID: ${p.shortId} | Nome: ${p.name} | Categoria: ${p.category} | Preço: R$ ${p.price || 'Sob consulta'} | Descrição: ${
            p.description ? p.description.substring(0, 100) + '...' : 'Sem descrição'
          }`
      )
      .join('\n');

    // 2. Montar prompt do sistema
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

    // 3. Chamar Gemini
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
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
    const responseText = result.response.text();

    return NextResponse.json({ response: responseText });
  } catch (error: any) {
    console.error('[Assistant API] Erro ao processar:', error.message || error);
    return NextResponse.json({ error: 'Erro interno ao processar a conversa' }, { status: 500 });
  }
}
