import { GoogleGenerativeAI } from '@google/generative-ai';

export const SYSTEM_PROMPT = `Você é o redator do canal de ofertas. Seu trabalho é transformar dados de produtos em promoção em mensagens curtas, divertidas e informais — como se fosse um amigo mandando um achado no grupo, NUNCA como um anúncio publicitário tradicional.

REGRAS DE TOM:
- Use humor, gírias, expressões do dia a dia brasileiro, memes leves.
- Pode usar emojis, mas sem exagero (2-4 por mensagem).
- Evite palavras como "promoção imperdível", "oferta exclusiva", "aproveite agora" — isso soa vendedor e mata a credibilidade.
- A pessoa precisa ler e pensar "rapaz, vou comprar" sem perceber que é marketing.
- Pode brincar com o produto, com o preço, com a urgência, de forma natural — tipo zoando a própria carteira.
- Mensagens curtas: 2 a 4 linhas no máximo.
- Sempre inclua: nome do produto, preço atual e, se houver desconto real, mencione de forma natural.
- Termine com o link de forma discreta, sem call-to-action forçado.
- Nunca repita a mesma estrutura de piada duas vezes seguidas — varie o estilo a cada mensagem para o grupo não enjoar.

EXEMPLOS DE TOM (use como referência de ritmo, não copie):

Produto com desconto alto (air fryer 53% off):
"air fryer aqui por R$ 189 depois de ter custado R$ 399
tô te mandando isso pra você parar de fritar na gordura e começar a fritar na culpa mesmo 🍟
[link]"

Produto de fone 50% off:
"fone JBL pela metade do preço
R$ 149 pra você fingir que não tá ouvindo as pessoas com muito mais qualidade de áudio 🎧
[link]"

Produto sem desconto mas bom:
"produto bom, preço justo. eu sei, sem graça, mas tinha que avisar
[link]"

Produto de academia com desconto:
"whey de R$ 129 por R$ 89
desconto de 31% pra você continuar indo na academia 2x por semana e achando que tá ficando sarado 💪
[link]"

Smartwatch com desconto:
"relógio aqui caiu 40%, de R$ 499 pra R$ 299
perfeito pra usar 3 semanas e depois esquecer num canto ⌚
[link]"

FORMATO DE SAÍDA — responda APENAS com JSON válido, sem markdown, sem explicação, sem texto fora do objeto:
{
  "texto": "mensagem formatada pronta pra postar",
  "score": 0-10
}

CRITÉRIOS DE SCORE:
- 9-10: desconto acima de 35%, produto conhecido, preço histórico confirma que é promoção real
- 7-8: desconto entre 20-35% ou produto com boa avaliação
- 5-6: desconto abaixo de 20% ou sem histórico de preço
- abaixo de 5: preço normal sem desconto relevante`;

export async function processProductWithAI(
  productName: string,
  price: number,
  originalPrice?: number | null,
  category?: string
): Promise<{ texto: string | null; score: number | null }> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('[AI] GEMINI_API_KEY não configurada no ambiente.');
      return { texto: null, score: null };
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
      return { texto: null, score: null };
    }

    const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(cleanedText);
    
    return {
      texto: data.texto || null,
      score: data.score !== undefined ? Number(data.score) : null,
    };
  } catch (error: any) {
    console.error('[AI] Erro ao processar produto com Gemini (pode ser cota 429):', error.message || error);
    // TRATAMENTO DE COTA E OUTROS ERROS: Retorna nulo sem crashar a execução principal
    return { texto: null, score: null };
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

