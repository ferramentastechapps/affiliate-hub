import { GoogleGenerativeAI } from '@google/generative-ai';
import sharp from 'sharp';
import { prisma } from '@/lib/prisma';

// ─── SYSTEM_PROMPT BASE (estático) ────────────────────────────────────────────
// Este é o prompt base. Ele é ENRIQUECIDO dinamicamente em buildDynamicSystemPrompt()
// com: exemplos aprovados, palavras bloqueadas, contextos/eventos ativos.
// ─── SYSTEM_PROMPT BASE (estático para Legendas) ──────────────────────────────
export const BASE_SYSTEM_PROMPT = `Você é um copywriter brasileiro especialista em marketing de afiliados com tom de zoeira autêntica.

Seu trabalho é criar UMA frase de legenda para produtos de afiliado no Telegram.

REGRAS OBRIGATÓRIAS:
- A frase deve estar em CAIXA ALTA
- Máximo de 8 palavras
- Tom de zoeira direta, como um amigo falando no grupo
- A frase NÃO descreve o produto — ela provoca, faz piada ou observação indireta sobre quem vai usar
- Use gírias brasileiras naturais quando fizer sentido
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

FORMATO DE SAÍDA — responda APENAS com JSON válido:
{
  "titulo": "A FRASE GERADA EM CAIXA ALTA"
}

Varie as piadas, não repita os mesmos exemplos. Seja criativo no deboche!`;

// ─── SYSTEM_PROMPT AVALIAÇÃO (Rápido/Barato) ──────────────────────────────────
export const EVALUATION_SYSTEM_PROMPT = `Você é um analista de ofertas do Brasil especializado em identificar boas oportunidades reais para o consumidor.
Seu trabalho é avaliar a qualidade de uma oferta com base nos sinais abaixo. IGNORE qualquer % de desconto informado na página da loja — esses valores costumam ser inflados artificialmente e NÃO devem ser usados como critério.

SINAIS QUE IMPORTAM (use para calcular o score):
1. CUPOM DE DESCONTO ATIVO (+2 pontos extras): Se o campo "Tem cupom" for "sim", a oferta tem desconto real aplicável.
2. MENOR PREÇO HISTÓRICO (+2 pontos extras): Se o campo "Menor preço histórico" for "sim", o preço atual é o mais baixo já registrado para este produto no sistema — isso é um forte indicador de boa oferta.
3. CATEGORIA E PRODUTO: Eletrônicos, games, eletrodomésticos e itens de alto valor percebido pontuam melhor na mesma faixa de preço.
4. PREÇO ABSOLUTO: Produtos abaixo de R$ 100 são mais fáceis de vender; produtos acima de R$ 200 precisam de mais contexto favorável para pontuação alta.

ESCALA:
- 9-10: Cupom ativo E menor preço histórico juntos, ou produto muito relevante com grande apelo.
- 7-8: Menor preço histórico OU cupom ativo, produto de boa categoria.
- 5-6: Produto ok, preço razoável, mas sem diferencial claro.
- abaixo de 5: Sem cupom, sem menor preço, sem apelo especial.

Responda APENAS com JSON válido:
{
  "score": numero_de_0_a_10,
  "analise": "motivo super curto em 1 frase"
}`;


// Mantém compatibilidade com código legado que usa SYSTEM_PROMPT
export const SYSTEM_PROMPT = BASE_SYSTEM_PROMPT;

// ─── FUNÇÕES DINÂMICAS DE PROMPT ──────────────────────────────────────────────

// ─── CACHE DO PROMPT DINÂMICO (evita recarregar do banco a cada produto) ──────
// O prompt dinâmico pode ter >2KB de exemplos. Sem cache, cada produto
// envia esses tokens extras desnecessariamente (custo alto!).
let _dynamicPromptCache: { prompt: string; expiresAt: number } | null = null;
const PROMPT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

/**
 * Constrói o SYSTEM_PROMPT de forma dinâmica, injetando do banco:
 *  - Exemplos de legendas marcadas como usedAsExample=true (top 12)
 *  - Palavras bloqueadas
 *  - Contextos/eventos ativos no período atual
 *
 * Resultado fica em cache por 5 minutos para reduzir chamadas ao banco
 * e principalmente para não reenviar os mesmos tokens em toda chamada.
 */
export async function buildDynamicSystemPrompt(): Promise<string> {
  // Retorna do cache se ainda válido
  if (_dynamicPromptCache && Date.now() < _dynamicPromptCache.expiresAt) {
    return _dynamicPromptCache.prompt;
  }

  try {
    const now = new Date();

    // Carrega em paralelo
    const [examples, bannedWords, contexts] = await Promise.all([
      prisma.captionHistory.findMany({
        where: { usedAsExample: true },
        orderBy: { rating: 'desc' },
        take: 12,
        select: { productName: true, caption: true },
      }),
      prisma.aiBannedWord.findMany({
        select: { word: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.aiContext.findMany({
        where: {
          isActive: true,
          OR: [
            { startsAt: null },
            { startsAt: { lte: now } },
          ],
          AND: [
            {
              OR: [
                { endsAt: null },
                { endsAt: { gte: now } },
              ],
            },
          ],
        },
        orderBy: { createdAt: 'desc' },
        select: { title: true, description: true },
      }),
    ]);

    let prompt = BASE_SYSTEM_PROMPT;

    // Injeta exemplos aprendidos (se existirem)
    if (examples.length > 0) {
      const examplesBlock = examples
        .map(e => `- ${e.productName} → ${e.caption}`)
        .join('\n');

      const insertAfterMarker = 'Varie as piadas, não repita os mesmos exemplos. Seja criativo no deboche!';
      if (prompt.includes(insertAfterMarker)) {
        prompt = prompt.replace(
          insertAfterMarker,
          `${insertAfterMarker}\n\n// ─── EXEMPLOS APROVADOS PELO ADMIN (produto → legenda JÁ ENVIADA) ────────────\n⚠️ ATENÇÃO MÁXIMA: As legendas abaixo JÁ FORAM PUBLICADAS E ENVIADAS. É PROIBIDO repetir qualquer uma delas. Use APENAS como referência de estilo, tom e criatividade. Crie sempre algo 100% DIFERENTE e ORIGINAL.\n\n${examplesBlock}\n\n📌 REGRA CRÍTICA: Gere uma legenda COMPLETAMENTE NOVA que o público ainda não viu.`
        );
      }
    }

    // Injeta palavras bloqueadas (se existirem)
    if (bannedWords.length > 0) {
      const banned = bannedWords.map(w => w.word).join(', ');
      prompt += `\n\nPALAVRAS PROIBIDAS — NUNCA use estas palavras em nenhuma circunstância:\n${banned}`;
    }

    // Injeta contextos/eventos ativos (se existirem)
    if (contexts.length > 0) {
      const contextBlock = contexts
        .map(c => `- ${c.title}: ${c.description}`)
        .join('\n');
      prompt += `\n\nCONTEXTOS / EVENTOS ATIVOS AGORA:\n${contextBlock}\n\n⚠️ IMPORTANTE: Os contextos acima são APENAS UMA OPÇÃO. NÃO force o uso do contexto em todas as legendas! Se o produto não tiver nenhuma relação natural ou engraçada com o evento, IGNORE o evento e faça a piada focada apenas no produto. A prioridade é a legenda fazer sentido com o item.`;
    }

    // Salva no cache
    _dynamicPromptCache = { prompt, expiresAt: Date.now() + PROMPT_CACHE_TTL_MS };
    console.log(`[AI] Prompt dinâmico construído e cacheado (${prompt.length} chars, ~${Math.round(prompt.length / 4)} tokens).`);

    return prompt;
  } catch (error) {
    console.error('[AI] Erro ao construir prompt dinâmico, usando base:', error);
    return BASE_SYSTEM_PROMPT;
  }
}

/**
 * Aplica substituições de palavras ao texto gerado pela IA (pós-processamento).
 * Exemplo: "nenem" → "bebê"
 */
export function applyWordSubstitutions(
  text: string,
  subs: { fromWord: string; toWord: string }[]
): string {
  if (!text || subs.length === 0) return text;
  let result = text;
  for (const { fromWord, toWord } of subs) {
    // Substitui palavra inteira, case-insensitive
    const regex = new RegExp(`\\b${fromWord}\\b`, 'gi');
    result = result.replace(regex, (match) => {
      // Mantém caixa alta se original estava em caixa alta
      if (match === match.toUpperCase()) return toWord.toUpperCase();
      return toWord;
    });
  }
  return result;
}

/**
 * Constrói o prompt de avaliação dinamicamente, injetando as preferências de produtos
 * avaliados pelo usuário no admin para que a IA aprenda a pontuar melhor.
 */
export async function buildDynamicEvaluationPrompt(): Promise<string> {
  try {
    const [highlyRated, poorlyRated] = await Promise.all([
      prisma.product.findMany({
        where: { userRating: { gte: 7 } },
        orderBy: { ratedAt: 'desc' },
        take: 15,
        select: { name: true, category: true, userRating: true }
      }),
      prisma.product.findMany({
        where: { userRating: { lte: 4, not: null } },
        orderBy: { ratedAt: 'desc' },
        take: 15,
        select: { name: true, category: true, userRating: true }
      })
    ]);

    let preferencesText = '';
    if (highlyRated.length > 0) {
      preferencesText += '\n\nEXEMPLOS DE PRODUTOS QUE O USUÁRIO GOSTOU E AVALIOU POSITIVAMENTE (Dê notas altas 8-10 para produtos semelhantes em relevância, desconto ou apelo):\n';
      highlyRated.forEach(p => {
        preferencesText += `- ${p.name} (Categoria: ${p.category}) -> Nota do usuário: ${p.userRating}/10\n`;
      });
    }
    if (poorlyRated.length > 0) {
      preferencesText += '\n\nEXEMPLOS DE PRODUTOS QUE O USUÁRIO NÃO GOSTOU OU AVALIOU NEGATIVAMENTE (Dê notas baixas abaixo de 5 para produtos semelhantes, sem utilidade ou com desconto ruim):\n';
      poorlyRated.forEach(p => {
        preferencesText += `- ${p.name} (Categoria: ${p.category}) -> Nota do usuário: ${p.userRating}/10\n`;
      });
    }

    return EVALUATION_SYSTEM_PROMPT + preferencesText;
  } catch (e) {
    console.error('Erro ao construir prompt de avaliação dinâmico:', e);
    return EVALUATION_SYSTEM_PROMPT;
  }
}

/**
 * Salva a legenda gerada no histórico para posterior avaliação no admin.
 */
export async function saveCaptionHistory(
  productId: string,
  productName: string,
  caption: string,
  score: number | null
): Promise<void> {
  try {
    await prisma.captionHistory.create({
      data: {
        productId,
        productName,
        caption,
        score: score ?? undefined,
      },
    });
  } catch (error) {
    // Não deve quebrar o fluxo principal
    console.error('[AI] Erro ao salvar CaptionHistory:', error);
  }
}

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

  let authHeader = apiKey.trim();
  if (!authHeader.startsWith('Bearer ')) {
    authHeader = `Bearer ${authHeader}`;
  }

  try {
    console.log(`[AI-NVIDIA] Acionando fallback do NVIDIA NIM (minimaxai/minimax-m3)...`);

    const dynamicPrompt = await buildDynamicSystemPrompt();

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
          { role: 'system', content: dynamicPrompt },
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

/**
 * Executa a chamada para o OpenRouter (google/gemini-2.5-flash) como 3º fallback.
 */
export async function processProductWithOpenRouter(
  promptText: string,
  mode: 'evaluate' | 'caption' = 'evaluate'
): Promise<{
  titulo: string | null;
  subtitulo: string | null;
  score: number | null;
  rawJson: string | null;
} | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.warn('[AI-OpenRouter] OPENROUTER_API_KEY não configurada no ambiente.');
    return null;
  }

  let authHeader = apiKey.trim();
  if (!authHeader.startsWith('Bearer ')) {
    authHeader = `Bearer ${authHeader}`;
  }

  try {
    console.log(`[AI-OpenRouter] Acionando fallback do OpenRouter (google/gemini-2.5-flash)...`);

    // Carrega prompt adequado ao modo
    let systemPrompt = '';
    if (mode === 'evaluate') {
      systemPrompt = await buildDynamicEvaluationPrompt();
    } else {
      systemPrompt = await buildDynamicSystemPrompt();
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://economizei.ftech-apps.com.br',
        'X-Title': 'Affiliate Hub Bot'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: promptText }
        ],
        temperature: mode === 'caption' ? 1.1 : 0.3,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AI-OpenRouter] OpenRouter falhou com status ${response.status}: ${errorText}`);
      return null;
    }

    const data = await response.json();
    const responseText = data.choices?.[0]?.message?.content;
    if (!responseText) {
      console.warn('[AI-OpenRouter] Resposta vazia do OpenRouter.');
      return null;
    }

    const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(cleanedText);

    return {
      titulo: parsedData.titulo || null,
      subtitulo: parsedData.analise || null,
      score: parsedData.score !== undefined ? Number(parsedData.score) : null,
      rawJson: JSON.stringify(parsedData),
    };
  } catch (error: any) {
    console.error('[AI-OpenRouter] Erro durante o processamento do OpenRouter:', error.message || error);
    return null;
  }
}


export async function processProductWithAI(
  productName: string,
  price: number,
  originalPrice?: number | null,
  category?: string,
  productId?: string,
  mode: 'evaluate' | 'caption' = 'evaluate',
  hasCoupon: boolean = false,
  isLowestPrice: boolean = false
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
Categoria: ${category || 'Diversos'}
Tem cupom: ${hasCoupon ? 'sim' : 'não'}
Menor preço histórico: ${isLowestPrice ? 'sim' : 'não'}

Contexto atual:
- Dia: ${weekdayStr}
- Data: ${dateStr}
- Hora: ${timeStr} (horário de Brasília)
- Fim de semana: ${weekendStr}`;

    // Carrega prompt adequado ao modo
    let systemPrompt = '';
    let substitutions: { fromWord: string, toWord: string }[] = [];

    if (mode === 'evaluate') {
      systemPrompt = await buildDynamicEvaluationPrompt();
    } else {
      [systemPrompt, substitutions] = await Promise.all([
        buildDynamicSystemPrompt(),
        prisma.aiWordSubstitution.findMany(),
      ]);
    }

    // Lista de modelos Gemini para tentar (fallback automático)
    // Nota: gemini-2.0-flash foi descontinuado e removido pela Google (HTTP 404)
    const MODELS = [
      'gemini-2.5-flash',
      'gemini-1.5-flash'
    ];

    const genAI = new GoogleGenerativeAI(apiKey);

    for (const modelName of MODELS) {
      console.log(`[AI] Chamando Gemini (${modelName}) diretamente para analisar: "${productName}"`);
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: mode === 'caption' ? 1.1 : 0.3,
            topP: 0.95
          },
          systemInstruction: systemPrompt
        });

        const result = await model.generateContent(promptText);
        const responseText = result.response.text();

        if (!responseText) {
          console.warn(`[AI] Resposta vazia do modelo ${modelName} — tentando próximo.`);
          continue;
        }

        const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsedData = JSON.parse(cleanedText);
        console.log(`[AI] Sucesso com modelo ${modelName} no modo ${mode}.`);

        let finalTitulo = parsedData.titulo || null;
        let finalScore = parsedData.score !== undefined ? Number(parsedData.score) : null;

        if (mode === 'caption') {
          // Aplica substituições de palavras pós-geração
          if (finalTitulo && substitutions.length > 0) {
            finalTitulo = applyWordSubstitutions(finalTitulo, substitutions);
          }
          // Salva no histórico para avaliação posterior apenas se estiver gerando legenda
          if (finalTitulo && productId) {
            await saveCaptionHistory(productId, productName, finalTitulo, finalScore);
          }
        }

        return {
          titulo: finalTitulo,
          subtitulo: parsedData.analise || null, // Reaproveitando subtitulo para retornar a análise no modo evaluate
          score: finalScore,
          rawJson: JSON.stringify(parsedData),
        };
      } catch (modelError: any) {
        console.warn(`[AI] Erro no modelo ${modelName}: ${modelError.message || modelError}`);
        continue;
      }
    }

    // Se Gemini direto falhar → tenta OpenRouter (mesmo modelo, menor custo por token)
    console.warn('[AI] Modelos Gemini direto falharam. Tentando OpenRouter...');
    const openRouterResult = await processProductWithOpenRouter(promptText, mode);
    if (openRouterResult) {
      return openRouterResult;
    }

    // Último recurso: NVIDIA NIM
    console.warn('[AI] OpenRouter falhou. Tentando NVIDIA NIM como último recurso...');
    const nvidiaResult = await processProductWithNvidia(promptText);
    if (nvidiaResult) {
      return nvidiaResult;
    }

    console.error('[AI] Todos os modelos de IA falharam.');
    return { titulo: null, subtitulo: null, score: null, rawJson: null };
  } catch (error: any) {
    console.error('[AI] Erro geral ao processar produto:', error.message || error);
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
