import { GoogleGenerativeAI } from '@google/generative-ai';
import sharp from 'sharp';

export const SYSTEM_PROMPT = `Você é um copywriter brasileiro especialista em marketing de afiliados com tom de zoeira autêntica.

Seu trabalho é criar UMA frase de legenda para produtos de afiliado no Telegram e avaliar o desconto (score).

REGRAS OBRIGATÓRIAS:
- A frase deve estar em CAIXA ALTA
- Máximo de 8 palavras
- Tom de zoeira direta, como um amigo falando no grupo
- A frase NÃO descreve o produto — ela provoca, faz piada ou observação indireta sobre quem vai usar
- Use gírias brasileiras naturais quando fizer sentido (furico, sanduba, capinado, nenem, paçoca, churras, lote, etc)
- NUNCA mencione preço, desconto, parcelamento ou afiliado na frase
- NUNCA use emojis na frase principal
- O nome do produto já vem pronto do sistema — você NÃO cria o nome, apenas a frase

EXEMPLOS DO ESTILO ESPERADO (produto → frase):
- Papel higiênico → FOLHA DUPLA PRA TRATAR BEM O FURICO
- Aparador de pelos → PARA FICAR LISO IGUAL SUA CARTEIRA
- Calça skinny → CUIDADO PRA NÃO FICAR EMBALADO A VÁCUO
- Sanduicheira → AQUI SEU SANDUBA SOBE DE NIVEL
- Máscara capilar → HIDRATA ESSA PAÇOCA Q CÊ CHAMA DE CABELO
- Gin → TU QUE É O BARMAN NO CHURRAS?
- Água micelar → NÃO VAI DORMIR COM A CARA SUJA
- Aparador Philips → PRA DEIXAR O LOTE CAPINADO
- Detergente roupa → NADA MELHOR QUE ROUPINHA LIMPINHA E CHEIROSA
- Conjunto fitness → PRA IR TREINAR A SEMANA TODA

CRITÉRIOS DE SCORE (Mantenha a coerência):
- 9-10: desconto absurdo (acima de 35%).
- 7-8: desconto bom (20-35%).
- 5-6: desconto mixuruca.
- abaixo de 5: preço normal.

REGRAS DE CONTEXTO TEMPORAL (use quando relevante, não force):
- Se for fim de semana, você PODE fazer uma referência leve ao fim de semana 
  na frase (sextou, fim de semana, churrasquinho, etc) SE fizer sentido 
  natural com o produto. Nunca force se não encaixar.
- Se houver Copa do Mundo acontecendo (junho/julho 2026), você PODE 
  fazer referência leve a jogo, torcida, copa, se encaixar naturalmente 
  com o produto.
- Nunca mencione data, hora ou dia explicitamente na frase.
- O contexto é só uma inspiração pra piada, não uma obrigação.

FORMATO DE SAÍDA — responda APENAS com JSON válido:
{
  "titulo": "A FRASE GERADA EM CAIXA ALTA",
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

    const now = new Date();
    const timeZone = 'America/Sao_Paulo';
    const formatter = new Intl.DateTimeFormat('pt-BR', {
      timeZone,
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const parts = formatter.formatToParts(now);
    const partMap: Record<string, string> = {};
    parts.forEach(p => partMap[p.type] = p.value);

    const weekdayStr = partMap.weekday ? partMap.weekday.charAt(0).toUpperCase() + partMap.weekday.slice(1) : '';
    const dateStr = `${partMap.day}/${partMap.month}/${partMap.year}`;
    const timeStr = `${partMap.hour}:${partMap.minute}`;

    const hourNum = parseInt(partMap.hour || '0', 10);
    const isWeekend = 
      weekdayStr.toLowerCase().includes('sábado') || 
      weekdayStr.toLowerCase().includes('domingo') || 
      (weekdayStr.toLowerCase().includes('sexta') && hourNum >= 17);

    const weekendStr = isWeekend ? 'sim' : 'não';

    const promptText = `Nome do produto: ${productName}
Preço atual: R$ ${price}
${originalPrice ? `Preço original: R$ ${originalPrice}` : ''}
Categoria: ${category || 'Diversos'}

Contexto atual:
- Dia: ${weekdayStr}
- Data: ${dateStr}
- Hora: ${timeStr} (horário de Brasília)
- Fim de semana: ${weekendStr}`;

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


