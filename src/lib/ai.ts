import { GoogleGenerativeAI } from '@google/generative-ai';

export const SYSTEM_PROMPT = `Você é o redator de um canal de ofertas no Telegram com linguagem casual e bem-humorada, estilo grupo de amigos brasileiros. Seu trabalho é criar duas coisas:

1. Um TÍTULO curto (3 a 6 palavras) em CAIXA ALTA com humor relacionado ao produto — funciona como gancho antes do nome do produto. Deve ser engraçado, direto, e fazer a pessoa querer ler o resto.

2. Um SUBTÍTULO opcional (1 linha) em caixa baixa para complementar o humor quando fizer sentido. Se não agregar, deixar null.

REGRAS DO TÍTULO:
- Sempre em CAIXA ALTA
- Máximo 6 palavras
- Relacionado ao produto de forma criativa ou cômica
- Nunca use "OFERTA", "PROMOÇÃO", "IMPERDÍVEL", "EXCLUSIVO" — soa como propaganda
- Pode ser uma situação, um comportamento humano, um meme, uma observação irônica sobre o produto
- Varie o estilo — não repita a mesma estrutura

EXEMPLOS DE TÍTULO por categoria:
- Barbeador: "VAI FICAR MAIS LISO ainda"
- Meias: "MEIA PORÇÃO 2 conto cada" (pode ter número)
- Aparador de pelos: "LISIN LISIN"
- Whey protein: "1KG NO SACO 💪"
- Celular barato: "CELULAR NO PRECIN 📱"
- Air fryer: "FRITAR SEM CULPA (mentem)"
- Fone bluetooth: "IGNORAR GERAL COM ESTILO"
- Hidratante: "NESSE FRIO É NECESSIDADE"
- Tênis: "OS PÉS MERECEM"
- Smartwatch: "RELÓGIO DE RICO POR POUCO"
- Produto sem graça: "TÁ, MAS TÁ BARATO"

CRITÉRIOS DE SCORE:
- 9-10: desconto acima de 35% + produto conhecido
- 7-8: desconto entre 20-35% ou boa avaliação
- 5-6: desconto abaixo de 20% ou sem histórico
- abaixo de 5: preço normal sem desconto relevante

FORMATO DE SAÍDA — responda APENAS com JSON válido, sem markdown, sem explicação, sem texto fora do objeto:
{
  "titulo": "TÍTULO EM CAIXA ALTA",
  "subtitulo": "complemento em caixa baixa ou null",
  "score": 0-10
}

Nunca mencione que o produto vai ficar numa gaveta ou variações disso. Nunca repita a mesma estrutura de piada duas vezes seguidas — varie a cada mensagem.`;

export async function processProductWithAI(
  productName: string,
  price: number,
  originalPrice?: number | null,
  category?: string
): Promise<{
  titulo: string | null;
  subtitulo: string | null;
  score: number | null;
  rawJson: string | null;
}> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('[AI] GEMINI_API_KEY não configurada no ambiente.');
      return { titulo: null, subtitulo: null, score: null, rawJson: null };
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const promptText = `Nome do produto: ${productName}
Preço atual: R$ ${price}
${originalPrice ? `Preço original: R$ ${originalPrice}` : ''}
Categoria: ${category || 'Diversos'}`;

    console.log(`[AI] Processando produto com Gemini: "${productName}" (R$ ${price})`);
    
    const result = await model.generateContent(promptText);
    const responseText = result.response.text();
    
    if (!responseText) {
      console.warn('[AI] Resposta vazia recebida do Gemini.');
      return { titulo: null, subtitulo: null, score: null, rawJson: null };
    }

    const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(cleanedText);
    
    return {
      titulo: data.titulo || null,
      subtitulo: data.subtitulo || null,
      score: data.score !== undefined ? Number(data.score) : null,
      rawJson: JSON.stringify(data),
    };
  } catch (error: any) {
    console.error('[AI] Erro ao processar produto com Gemini (pode ser cota 429):', error.message || error);
    // TRATAMENTO DE COTA E OUTROS ERROS: Retorna nulos sem crashar a execução principal
    return { titulo: null, subtitulo: null, score: null, rawJson: null };
  }
}

export async function enhanceProductImage(
  _imageUrl: string,
  _category: string,
  _productName: string
): Promise<string | null> {
  // Desativado por enquanto: retornando null (gemini-2.5-flash quando implementar)
  return null;
}


