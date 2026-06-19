import { GoogleGenerativeAI } from '@google/generative-ai';
import sharp from 'sharp';

export const SYSTEM_PROMPT = `Você é o redator de um canal de ofertas no Telegram. Seu público é um grupo de amigos e a linguagem deve ser PURA ZOEIRA, muito sarcástica e cínica. O objetivo é tirar sarro da pessoa que vai comprar ou da inutilidade/utilidade do produto.

Seu trabalho é criar UM TÍTULO curto (3 a 6 palavras) em CAIXA ALTA que sirva de gancho antes do nome do produto.

REGRAS DO TÍTULO:
- Sempre em CAIXA ALTA.
- Máximo de 6 palavras.
- Tem que ser sarcástico, irônico ou zoar quem compra.
- Use gírias da internet brasileira (ex: "LOSS", "GAIN", "MÃO DE VACA", "PRA CHORAR NO BANHO", "COMPRA LOGO POBRE", "VAI FICAR NA GAVETA", "PARECE GOLPE").
- NUNCA use palavras de vendedor ("OFERTA", "PROMOÇÃO", "IMPERDÍVEL").
- Não seja "engraçadinho" de forma infantil, seja debochado, igual um amigo sacaneando o outro.

EXEMPLOS DE TÍTULO:
- Produto caro com desconto: "PRA DIVIDIR EM 24X" ou "O BANCO QUE LUTE"
- Coisas de casa/limpeza: "PRA FINGIR QUE LIMPA" ou "A MÃE VAI SURTAR"
- Fones/Eletrônicos: "PRA IGNORAR A CHEFIA" ou "SURDEZ VINDO AÍ"
- Celular: "XIAOMI DE POBRE" ou "VAI QUEBRAR EM 1 MÊS"
- Roupas/Tênis: "PRA FINGIR QUE MALHA" ou "PRA ESCONDER A BARRIGA"
- Coisas fúteis/baratas: "COMPRA E DEIXA NA GAVETA" ou "O PURO SUCO DO LOSS"
- Itens de beleza: "PRA SALVAR ESSA CARA" ou "MILAGRE NÃO FAZ"
- TV/Games: "ADEUS VIDA SOCIAL" ou "PRA JOGAR NO ESCURO"

CRITÉRIOS DE SCORE (Mantenha a coerência):
- 9-10: desconto absurdo (acima de 35%).
- 7-8: desconto bom (20-35%).
- 5-6: desconto mixuruca.
- abaixo de 5: preço normal, puro suco do loss.

FORMATO DE SAÍDA — responda APENAS com JSON válido:
{
  "titulo": "TÍTULO EM CAIXA ALTA",
  "score": 0-10
}

Varie as piadas, não repita os mesmos exemplos. Seja criativo no deboche!`;

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
      subtitulo: null,
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
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.warn('[AI] OPENROUTER_API_KEY não configurada no ambiente.');
      return { titulo: null, subtitulo: null, score: null, rawJson: null };
    }

    const promptText = `Nome do produto: ${productName}
Preço atual: R$ ${price}
${originalPrice ? `Preço original: R$ ${originalPrice}` : ''}
Categoria: ${category || 'Diversos'}`;

    // Lista de modelos em ordem de preferência (fallback automático)
    const MODELS = [
      'google/gemini-2.5-pro',
      'google/gemini-2.5-flash',
      'google/gemini-2.0-flash-001',
      'meta-llama/llama-3.1-8b-instruct:free'
    ];

    for (const model of MODELS) {
      console.log(`[AI] Chamando OpenRouter (${model}) para analisar: "${productName}"`);
      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: promptText }
            ],
            response_format: { type: "json_object" }
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.warn(`[AI] Modelo ${model} falhou (${response.status}) — tentando próximo. Erro: ${errorText.slice(0, 200)}`);
          continue; // tenta próximo modelo
        }

        const data = await response.json();
        const responseText = data?.choices?.[0]?.message?.content;

        if (!responseText) {
          console.warn(`[AI] Resposta vazia do modelo ${model} — tentando próximo.`);
          continue;
        }

        const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsedData = JSON.parse(cleanedText);
        console.log(`[AI] Sucesso com modelo ${model}.`);

        return {
          titulo: parsedData.titulo || null,
          subtitulo: null,
          score: parsedData.score !== undefined ? Number(parsedData.score) : null,
          rawJson: JSON.stringify(parsedData),
        };
      } catch (modelError: any) {
        console.warn(`[AI] Erro no modelo ${model}: ${modelError.message || modelError}`);
        continue;
      }
    }

    console.error('[AI] Todos os modelos OpenRouter falharam.');
    return { titulo: null, subtitulo: null, score: null, rawJson: null };
  } catch (error: any) {
    console.error('[AI] Erro ao processar produto com OpenRouter:', error.message || error);
    return { titulo: null, subtitulo: null, score: null, rawJson: null };
  }
}

export async function enhanceProductImage(
  _imageUrl: string,
  _category: string,
  _productName: string
): Promise<string | null> {
  // Desativado a pedido do usuário (geração de imagem da IA desabilitada)
  return null;
}


