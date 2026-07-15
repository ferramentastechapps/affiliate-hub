import { GoogleGenerativeAI } from '@google/generative-ai';
import sharp from 'sharp';
import { prisma } from '@/lib/prisma';
import { sendTelegramMessage } from '@/lib/telegram';

// Cache para alerta de custos diários
let dailyCostCache = 0;
let lastResetDate = new Date().getDate();
let alertSentToday = false;

// ─── HELPER PARA REGISTRAR USO DE TOKENS E CUSTOS ───────────────────────────
async function logAiUsage(functionName: string, modelUsed: string, provider: string, inputTokens: number, outputTokens: number) {
  try {
    const totalTokens = inputTokens + outputTokens;
    // Custos estimados baseados no Gemini Flash (aprox $0.075 / 1M input, $0.30 / 1M output)
    const inputCost = (inputTokens / 1_000_000) * 0.075;
    const outputCost = (outputTokens / 1_000_000) * 0.30;
    const costUSD = inputCost + outputCost;

    // Lógica do Alerta Diário ($ 1.00)
    const today = new Date().getDate();
    if (today !== lastResetDate) {
      dailyCostCache = 0;
      lastResetDate = today;
      alertSentToday = false;
    }
    dailyCostCache += costUSD;

    if (dailyCostCache > 1.00 && !alertSentToday) {
      alertSentToday = true;
      const adminChatId = process.env.TELEGRAM_CHAT_ID;
      if (adminChatId) {
        sendTelegramMessage(
          adminChatId, 
          `⚠️ <b>ALERTA DE CUSTO IA</b>\n\nO sistema já gastou mais de <b>$ 1.00</b> em tokens Gemini hoje.\nPara evitar custos excessivos, verifique se não há nenhum erro nos webhooks ou robôs enviando requisições em loop.`
        ).catch(console.error);
      }
    }

    await prisma.aiTokenLog.create({
      data: {
        functionName,
        modelUsed,
        provider,
        inputTokens,
        outputTokens,
        totalTokens,
        costUSD
      }
    });
  } catch (error) {
    console.error('[AI] Erro ao registrar uso de tokens:', error);
  }
}

/**
 * Limpa e converte a resposta em texto do modelo de IA para JSON de forma robusta.
 * Lida com blocos de pensamento/raciocínio (<think>...</think>), marcações markdown e texto puro.
 */
export function cleanAndParseJson(text: string): any {
  if (!text) return null;
  
  // 1. Remove tags de pensamento/raciocínio se presentes (comum em modelos de reasoning como Nemotron/DeepSeek)
  let cleanText = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  
  // 2. Remove blocos de código markdown (```json ... ``` ou ``` ... ```)
  cleanText = cleanText.replace(/```json/gi, '').replace(/```/gi, '').trim();
  
  try {
    return JSON.parse(cleanText);
  } catch (e) {
    // 3. Tenta extrair a primeira estrutura JSON válida {...} usando expressão regular
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (innerError) {
        console.warn('[AI] Falha ao parsear JSON extraído com regex:', innerError);
      }
    }
    
    // 4. Se todo parse falhar e for um texto não vazio que não parece JSON, trata-o como o título
    // (comum em modo legenda quando o modelo responde apenas a frase)
    if (cleanText.length > 0 && !cleanText.startsWith('{')) {
      console.log('[AI] Resposta não-JSON recebida, tratando texto limpo diretamente como título.');
      return { titulo: cleanText };
    }
    
    throw e;
  }
}

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

{EXAMPLES_PLACEHOLDER}

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

    // Injeta exemplos aprendidos (se existirem) ou usa fallbacks
    if (examples.length > 0) {
      const examplesBlock = examples
        .map(e => `- ${e.productName} → ${e.caption}`)
        .join('\n');

      const examplesSection = `EXEMPLOS DO ESTILO ESPERADO (produto → frase):\n${examplesBlock}\n\n⚠️ ATENÇÃO: Os exemplos acima servem apenas como guia de estilo. Não repita os mesmos exemplos na saída. Gere sempre legendas novas e originais.`;
      prompt = prompt.replace('{EXAMPLES_PLACEHOLDER}', examplesSection);
    } else {
      const fallbackExamples = [
        "- Fritadeira Elétrica → COMA TUDO SEM CULPA NESSA AÍ",
        "- Smartphone → CELULAR NOVO PRA DAR UNS STALK NO EX",
        "- Secador De Cabelos → DEIXA ESSA JUBINHA NO TALENTO"
      ].join('\n');
      const examplesSection = `EXEMPLOS DO ESTILO ESPERADO (produto → frase):\n${fallbackExamples}`;
      prompt = prompt.replace('{EXAMPLES_PLACEHOLDER}', examplesSection);
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

    const parsedData = cleanAndParseJson(responseText);

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
 * Executa a chamada para o OpenRouter.
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

  const model = mode === 'caption'
    ? (process.env.OPENROUTER_CAPTION_MODEL || 'google/gemini-2.5-flash')
    : (process.env.OPENROUTER_EVALUATE_MODEL || 'tencent/hy3:free');

  try {
    console.log(`[AI-OpenRouter] Chamando OpenRouter com o modelo ${model} no modo ${mode}...`);

    // Carrega prompt adequado ao modo
    let systemPrompt = '';
    if (mode === 'evaluate') {
      systemPrompt = await buildDynamicEvaluationPrompt();
    } else {
      systemPrompt = await buildDynamicSystemPrompt();
    }

    // Schema json_schema para cada modo (compatível com hy3, hermes e outros modelos livres)
    // NOTA: strict:false e sem additionalProperties para máxima compatibilidade com modelos grátis
    const captionSchema = {
      type: 'json_schema',
      json_schema: {
        name: 'caption_response',
        schema: {
          type: 'object',
          properties: { titulo: { type: 'string' } },
          required: ['titulo']
        }
      }
    };
    const evaluateSchema = {
      type: 'json_schema',
      json_schema: {
        name: 'evaluate_response',
        schema: {
          type: 'object',
          properties: {
            score: { type: 'number' },
            analise: { type: 'string' }
          },
          required: ['score', 'analise']
        }
      }
    };

    const fetchCompletion = async (useJsonFormat: boolean) => {
      const bodyPayload: any = {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: promptText }
        ],
        temperature: mode === 'caption' ? 1.1 : 0.3,
        max_tokens: 1000
      };

      if (useJsonFormat) {
        // Usa json_schema (compatível com hy3, hermes, etc) ao invés de json_object
        bodyPayload.response_format = mode === 'caption' ? captionSchema : evaluateSchema;
      }

      return fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://economizei.ftech-apps.com.br',
          'X-Title': 'Affiliate Hub Bot'
        },
        body: JSON.stringify(bodyPayload)
      });
    };

    let response = await fetchCompletion(true);

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`[AI-OpenRouter] Chamada com response_format falhou com status ${response.status}: ${errorText}. Tentando sem response_format...`);
      // Retry without JSON format constraint (e.g. for models that do not support it natively)
      response = await fetchCompletion(false);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AI-OpenRouter] OpenRouter falhou definitivamente com status ${response.status}: ${errorText}`);
      return null;
    }

    const data = await response.json();
    
    if (data.usage) {
      logAiUsage(
        mode === 'caption' ? 'generateCaption' : 'evaluateProduct',
        model,
        'openrouter',
        data.usage.prompt_tokens || 0,
        data.usage.completion_tokens || 0
      ).catch(console.error);
    }

    const responseText = data.choices?.[0]?.message?.content;
    if (!responseText) {
      console.warn('[AI-OpenRouter] Resposta vazia do OpenRouter.');
      return null;
    }

    const parsedData = cleanAndParseJson(responseText);

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
    const now = new Date();
    const timeZone = 'America/Sao_Paulo';

    // Verifica se está no horário de bloqueio (01:00 às 06:59)
    const brazilHour = parseInt(new Intl.DateTimeFormat('pt-BR', { hour: 'numeric', hour12: false, timeZone }).format(now), 10);
    if (brazilHour >= 1 && brazilHour < 7) {
      console.log(`[AI] Avaliação bloqueada: fora do horário de funcionamento (01:00 às 07:00). Hora atual: ${brazilHour}h.`);
      return { titulo: null, subtitulo: null, score: null, rawJson: null };
    }

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

    // SE O MODO FOR AVALIAÇÃO (EVALUATE), CHAMA DIRETAMENTE O OPENROUTER
    if (mode === 'evaluate') {
      console.log(`[AI] Modo 'evaluate' acionado. Chamando OpenRouter diretamente para avaliar: "${productName}"`);
      const openRouterResult = await processProductWithOpenRouter(promptText, 'evaluate');
      if (openRouterResult) {
        return openRouterResult;
      }
      
      // Fallback para NVIDIA NIM caso o OpenRouter falhe na avaliação
      console.warn('[AI] OpenRouter falhou no modo evaluate. Tentando NVIDIA NIM...');
      const nvidiaResult = await processProductWithNvidia(promptText);
      if (nvidiaResult) {
        return nvidiaResult;
      }
      
      console.error('[AI] Todos os modelos de avaliação falharam.');
      return { titulo: null, subtitulo: null, score: null, rawJson: null };
    }

    // A partir daqui, é o modo 'caption' (legenda)
    const captionProvider = process.env.AI_CAPTION_PROVIDER || 'gemini';
    console.log(`[AI] Provedor de legenda configurado como prioridade: "${captionProvider}"`);

    // Carrega prompt adequado ao modo caption e substituições
    const [systemPrompt, substitutions] = await Promise.all([
      buildDynamicSystemPrompt(),
      prisma.aiWordSubstitution.findMany(),
    ]);

    let result: {
      titulo: string | null;
      subtitulo: string | null;
      score: number | null;
      rawJson: string | null;
    } | null = null;

    // Helper: Tentativa via Gemini direta
    const tryGemini = async () => {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.warn('[AI] GEMINI_API_KEY não configurada. Pulando Gemini direto.');
        return null;
      }

      const MODELS = ['gemini-2.5-flash', 'gemini-1.5-flash'];
      const genAI = new GoogleGenerativeAI(apiKey);

      for (const modelName of MODELS) {
        console.log(`[AI] Chamando Gemini (${modelName}) diretamente para criar legenda para: "${productName}"`);
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 1.1,
              topP: 0.95
            },
            systemInstruction: systemPrompt
          });

          const res = await model.generateContent(promptText);
          const responseText = res.response.text();

          if (res.response.usageMetadata) {
            const { promptTokenCount, candidatesTokenCount } = res.response.usageMetadata;
            logAiUsage(
              'generateCaption',
              modelName,
              'google',
              promptTokenCount || 0,
              candidatesTokenCount || 0
            ).catch(console.error);
          }

          if (!responseText) {
            console.warn(`[AI] Resposta vazia do modelo ${modelName} — tentando próximo.`);
            continue;
          }

          const parsedData = cleanAndParseJson(responseText);
          console.log(`[AI] Sucesso com modelo ${modelName} no modo caption.`);

          return {
            titulo: parsedData.titulo || null,
            subtitulo: parsedData.analise || null,
            score: parsedData.score !== undefined ? Number(parsedData.score) : null,
            rawJson: JSON.stringify(parsedData)
          };
        } catch (modelError: any) {
          console.warn(`[AI] Erro no modelo ${modelName}: ${modelError.message || modelError}`);
          continue;
        }
      }
      return null;
    };

    // Helper: Tentativa via OpenRouter
    const tryOpenRouter = async () => {
      if (!process.env.OPENROUTER_API_KEY) {
        console.warn('[AI] OPENROUTER_API_KEY não configurada. Pulando OpenRouter.');
        return null;
      }
      console.log(`[AI] Tentando criar legenda via OpenRouter para: "${productName}"`);
      return processProductWithOpenRouter(promptText, 'caption');
    };

    // Helper: Tentativa via NVIDIA NIM
    const tryNvidia = async () => {
      if (!process.env.NVIDIA_API_KEY) {
        console.warn('[AI] NVIDIA_API_KEY não configurada. Pulando NVIDIA.');
        return null;
      }
      console.log(`[AI] Tentando criar legenda via NVIDIA NIM para: "${productName}"`);
      return processProductWithNvidia(promptText);
    };

    // Define a ordem de prioridades
    const order: (() => Promise<any>)[] = [];
    if (captionProvider === 'openrouter') {
      order.push(tryOpenRouter, tryGemini, tryNvidia);
    } else if (captionProvider === 'nvidia') {
      order.push(tryNvidia, tryGemini, tryOpenRouter);
    } else {
      order.push(tryGemini, tryOpenRouter, tryNvidia);
    }

    // Executa na ordem até obter sucesso
    for (const fn of order) {
      try {
        result = await fn();
        if (result && result.titulo) {
          break;
        }
      } catch (err: any) {
        console.warn(`[AI] Falha na execução da função do pipeline de legenda:`, err.message || err);
      }
    }

    // Aplica o pós-processamento de substituição e salva no histórico para o provedor vencedor
    if (result && result.titulo) {
      let finalTitulo = result.titulo;
      if (substitutions.length > 0) {
        finalTitulo = applyWordSubstitutions(finalTitulo, substitutions);
      }
      if (productId) {
        await saveCaptionHistory(productId, productName, finalTitulo, result.score);
      }
      return {
        ...result,
        titulo: finalTitulo
      };
    }

    console.error('[AI] Todos os modelos de IA falharam para legenda.');
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
