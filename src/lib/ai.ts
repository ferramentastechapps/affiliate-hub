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

/**
 * Extrai o tempo sugerido de retry de uma mensagem de erro do Gemini.
 * Se não for especificado, retorna um padrão de 10 segundos.
 */
function extractRetryDelay(errorMessage: string): number {
  const match = errorMessage.match(/retry\s+in\s+(\d+)\s*s/i) ||
                errorMessage.match(/retry\s+in\s+(\d+)\s*seconds/i) ||
                errorMessage.match(/retry\s+after\s+(\d+)\s*s/i) ||
                errorMessage.match(/retry\s+after\s+(\d+)\s*seconds/i) ||
                errorMessage.match(/after\s+(\d+)\s*s/i);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  return 10; // Padrão: 10 segundos
}

/**
 * Executa a chamada para o NVIDIA NIM com o modelo minimaxai/minimax-m3 como fallback.
 */
export async function processProductWithNvidia(
  promptText: string
): Promise<{
  titulo: string | null;
  subtitulo: string | null;
  score: number | null;
  rawJson: string | null;
} | null> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    console.warn('[AI-NVIDIA] NVIDIA_API_KEY não configurada no ambiente.');
    return null;
  }

  // Garante que o cabeçalho Authorization tenha o prefixo "Bearer " sem duplicar
  let authHeader = apiKey.trim();
  if (!authHeader.startsWith('Bearer ')) {
    authHeader = `Bearer ${authHeader}`;
  }

  try {
    console.log(`[AI-NVIDIA] Acionando fallback do NVIDIA NIM (minimaxai/minimax-m3)...`);
    
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'minimaxai/minimax-m3',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: promptText }
        ],
        max_tokens: 512,
        temperature: 0.7,
        top_p: 0.9,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AI-NVIDIA] NVIDIA NIM falhou com status ${response.status}: ${errorText}`);
      return null;
    }

    const data = await response.json();
    const responseText = data.choices?.[0]?.message?.content;
    if (!responseText) {
      console.warn('[AI-NVIDIA] Resposta vazia da NVIDIA NIM.');
      return null;
    }

    const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(cleanedText);

    return {
      titulo: parsedData.titulo || null,
      subtitulo: parsedData.subtitulo || null,
      score: parsedData.score !== undefined ? Number(parsedData.score) : null,
      rawJson: JSON.stringify(parsedData),
    };
  } catch (error: any) {
    console.error('[AI-NVIDIA] Erro durante o processamento do NVIDIA NIM:', error.message || error);
    return null;
  }
}

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

    let responseText = '';
    const maxAttempts = 2;
    let attempts = 0;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        console.log(`[AI] Chamando Gemini (tentativa ${attempts}/${maxAttempts}) para: "${productName}"`);
        const result = await model.generateContent(promptText);
        responseText = result.response.text();
        break; // Sucesso, sair do loop
      } catch (error: any) {
        const errorMsg = error.message || String(error);
        const isRateLimit = errorMsg.includes('429') || 
                            errorMsg.includes('ResourceExhausted') || 
                            error.status === 429 || 
                            error.statusCode === 429;

        if (isRateLimit && attempts < maxAttempts) {
          const delaySec = extractRetryDelay(errorMsg);
          console.warn(`[AI] Limite de cota atingido (429). Aguardando ${delaySec}s sugeridos antes de tentar novamente...`);
          await new Promise((resolve) => setTimeout(resolve, delaySec * 1000));
        } else {
          console.error(`[AI] Erro ao processar produto na tentativa ${attempts}/${maxAttempts}:`, errorMsg);
          if (attempts >= maxAttempts) {
            if (isRateLimit) {
              const nvidiaResult = await processProductWithNvidia(promptText);
              if (nvidiaResult) {
                return nvidiaResult;
              }
            }
            return { titulo: null, subtitulo: null, score: null, rawJson: null };
          }
        }
      }
    }
    
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


