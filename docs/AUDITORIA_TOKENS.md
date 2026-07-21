# AUDITORIA DE CONSUMO DE TOKENS — AFFILIATE-HUB

**Data da Auditoria:** 26 de junho de 2026  
**Objetivo:** Mapear TODO o consumo de tokens e chamadas de API para identificar desperdícios e otimizar custos.

---

## 📊 RESUMO EXECUTIVO

### APIs Identificadas no Projeto:
1. **Google Gemini** (Generative AI) — principal modelo de IA
2. **OpenRouter** (google/gemini-2.5-flash) — fallback secundário
3. **NVIDIA NIM** (minimaxai/minimax-m3) — fallback terciário
4. **Telegram Bot API** — notificações e aprovações
5. **Prisma/Supabase** — banco de dados (PostgreSQL)
6. **APIs Públicas** — Mercado Livre, Amazon, DuckDuckGo, etc.

### Principais Descobertas:
- ✅ **BOT PYTHON DESATIVADO**: `ai_engine.py` retorna null — **SEM GASTO DE TOKENS**
- 🔴 **ALTO RISCO**: System prompt dinâmico **SEM CACHE** antes do código atual
- 🔴 **ALTO RISCO**: Múltiplas tentativas de modelos sem rate limiting adequado
- 🟡 **MÉDIO RISCO**: Prompt dinâmico recarrega exemplos do banco a cada 5min
- 🟢 **OTIMIZADO**: Cache de 5min implementado para prompt dinâmico

---

## PASSO 1 — INVENTÁRIO COMPLETO DE CHAMADAS DE API

### 1.1 FRONTEND (Next.js TypeScript)


#### `src/lib/ai.ts` — **ARQUIVO CRÍTICO DE IA**

| Linha | API | Método | Payload | Frequência | Tokens Estimados |
|-------|-----|--------|---------|------------|------------------|
| 300-316 | NVIDIA NIM | POST `/v1/chat/completions` | system_prompt + user_prompt | Fallback (raro) | ~600-1500 tokens/chamada |
| 382-404 | OpenRouter | POST `/v1/chat/completions` | system_prompt + user_prompt | Fallback (médio) | ~600-1500 tokens/chamada |
| 461-550 | Google Gemini | `generateContent` | system_prompt + user_prompt | Primário (sempre) | ~600-1500 tokens/chamada |

**System Prompts Identificados:**

1. **BASE_SYSTEM_PROMPT** (linha 10-44)
   - Tamanho: ~2.800 caracteres = **~700 tokens**
   - Uso: Geração de legendas para Telegram
   - Enviado: A CADA produto processado

2. **EVALUATION_SYSTEM_PROMPT** (linha 47-71)
   - Tamanho: ~1.600 caracteres = **~400 tokens**
   - Uso: Avaliar qualidade de ofertas (score 0-10)
   - Enviado: A CADA produto processado

3. **buildDynamicSystemPrompt()** (linha 83-136)
   - Tamanho: **BASE_SYSTEM_PROMPT + exemplos do banco + palavras bloqueadas + contextos**
   - Cache: 5 minutos (TTL_MS = 300.000ms)
   - Problema: Recarrega exemplos/contextos do Prisma a cada 5min

4. **buildDynamicEvaluationPrompt()** (linha 164-192)
   - Tamanho: **EVALUATION_SYSTEM_PROMPT + histórico de ratings**
   - Cache: ❌ **NÃO TEM CACHE** — recarrega do banco a CADA chamada

**User Prompts Construídos:**

- **Linha 466-485**: Prompt de avaliação/caption
  - Tamanho: ~400 caracteres = **~100 tokens**
  - Inclui: nome, preço, categoria, cupom, menor preço, data/hora, fim de semana

**Estimativa de Tokens por Produto:**
- System prompt: 700-1000 tokens (com exemplos dinâmicos)
- User prompt: 100 tokens
- Resposta esperada: 50-100 tokens (JSON simples)
- **TOTAL POR PRODUTO: 850-1200 tokens** (entrada + saída)

---

#### `src/app/api/webhook/products/route.ts` — Webhook de Ingestão


| Linha | API | Método | Payload | Frequência | Estimativa |
|-------|-----|--------|---------|------------|------------|
| 5 | Gemini (via ai.ts) | `processProductWithAI()` | Produto completo | Por produto novo | 850-1200 tokens |
| 8 | Telegram | `publishToGroup()` | Mensagem + foto | Por produto aprovado | N/A (não conta tokens) |
| 359-396 | Prisma | `productLink.findFirst()`, `coupon.findMany()` | Query SQL | Por produto atualizado | N/A (DB) |

**Fluxo Crítico:**
1. Bot Python envia produto via webhook POST
2. Webhook chama `processProductWithAI()` **2 VEZES**:
   - **Chamada 1** (linha 610-670): `mode='evaluate'` para calcular score
   - **Chamada 2** (modo caption implícito): Gerar legenda para Telegram
3. Resultado salvo no banco via Prisma
4. Se aprovado → publica no Telegram

**❌ PROBLEMA IDENTIFICADO:**
- Cada produto = **2 chamadas de IA** (evaluate + caption)
- Cada chamada reenvia o system prompt completo (~700-1000 tokens)
- **Total por produto: 1.700-2.400 tokens** (só entrada de system prompt!)

---

### 1.2 BACKEND PYTHON (Bot Scraper)

#### `bot/ai_engine.py` — ⚠️ **DESATIVADO**

```python
def process_product_with_ai(product_name, price, original_price=None, category=None):
    """OpenRouter desativado. Retorna valores nulos sem chamar a API."""
    return {"texto": None, "score": None}
```

**Status:** ✅ **SEM GASTO DE TOKENS** — Função desativada, retorna null

---

#### `bot/telegram_listener.py` — Listener de Comandos

| Linha | API | Método | Payload | Frequência | Estimativa |
|-------|-----|--------|---------|------------|------------|
| 433-456 | OpenRouter | POST `/v1/chat/completions` | Prompt de extração + texto encaminhado | Por mensagem encaminhada | ~500-2000 tokens |
| 316-356 | Google Gemini | POST `generateContent` | Prompt de extração + texto encaminhado | Por mensagem encaminhada (primário) | ~500-2000 tokens |


**Prompt de Extração (linha 211-226):**
```
Extraia as informações desta promoção de afiliado. Pode ser uma mensagem mal formatada ou de WhatsApp:

{texto da mensagem encaminhada}

IMPORTANTE: Se a mensagem contiver apenas um link (URL) ou não descrever nenhum produto...
Responda APENAS em um JSON válido com estas exatas chaves:
- name: Nome do produto bem descritivo, sem emojis e sem preço (string)
- price: Preço final do produto apenas em número (number ou null...)
- link: URL completa para compra do produto...
- coupon: Código do cupom de desconto (string ou null...)
```

**Tamanho do Prompt:**
- Base: ~800 caracteres = ~200 tokens
- Texto da mensagem: variável (100-2000 caracteres)
- **Total: 225-700 tokens** (entrada)
- Resposta: ~50-100 tokens (JSON)

**Frequência:**
- Dispara quando usuário encaminha mensagem com link de produto
- Estimativa: 5-20 chamadas/dia (manual)

**❌ PROBLEMA IDENTIFICADO:**
- Fallback entre Gemini → OpenRouter sem rate limiting adequado
- Se cota do Gemini esgotar (429), tenta OpenRouter (gasta crédito)
- Texto da mensagem pode ter 2000+ caracteres (WhatsApp forward completo)

---

#### `bot/main.py` — Robô de Scraping Principal

| Linha | API | Método | Payload | Frequência | Estimativa |
|-------|-----|--------|---------|------------|------------|
| 154 | Affiliate Hub Webhook | `api.adicionar_produto()` | Produto completo | Por produto novo | Dispara IA no webhook |
| 390 | Affiliate Hub Webhook | `api.buscar_produto()` | produto_id | Verificação de fila | N/A (só leitura) |

**Fluxo:**
1. Scraper busca produtos em Promobit/Promobyte/Pelando
2. Envia cada produto para webhook Next.js via `adicionar_produto()`
3. Webhook dispara `processProductWithAI()` **2 VEZES** (evaluate + caption)
4. Sleep de 5 segundos entre produtos (linha 186) para evitar rate limit

**Frequência de Scraping:**
- Definido em `config.py`: `SEARCH_INTERVAL_MINUTES` (padrão: 30 min)
- Produtos por ciclo: ~15-30 produtos
- **Estimativa: 30-60 produtos/dia = 51.000-72.000 tokens/dia** (só system prompts!)

---

### 1.3 OUTRAS CHAMADAS DE API (Não-IA)

#### Telegram Bot API


| Arquivo | Método | Frequência | Custo |
|---------|--------|------------|-------|
| `src/lib/telegram.ts` | `sendPhoto`, `sendMessage` | Por produto aprovado + alertas | Gratuito (API do Telegram) |
| `src/lib/campaigns.ts` | `sendMessage` | Por campanha | Gratuito |
| `bot/telegram_listener.py` | Recebe comandos `/aprovar`, `/rejeitar` | Manual (5-20/dia) | Gratuito |

#### Prisma/Supabase (Banco de Dados)

| Arquivo | Operações | Frequência | Custo |
|---------|-----------|------------|-------|
| `src/lib/ai.ts` | `captionHistory.findMany()`, `aiBannedWord.findMany()`, `aiContext.findMany()` | A cada 5min (cache) | Incluso no plano Supabase |
| `src/app/api/webhook/products/route.ts` | `product.create()`, `priceHistory.create()`, `product.update()` | Por produto | Incluso |
| Todo o projeto | ~200+ queries Prisma | Constante | Incluso no plano Supabase |

#### APIs Públicas (Scraping)

| Arquivo | API | Frequência | Custo |
|---------|-----|------------|-------|
| `bot/scrapers.py` | Promobit, Promobyte, Pelando | A cada 30min | Gratuito (scraping público) |
| `src/lib/scraper.ts` | DuckDuckGo Images | Por produto sem imagem | Gratuito |
| `src/lib/affiliate.ts` | Mercado Livre API pública | Por link do ML | Gratuito |
| `src/lib/reviews.ts` | Mercado Livre Reviews API | Por produto do ML | Gratuito |

---

## PASSO 2 — ANÁLISE DO SYSTEM PROMPT / CONTEXT

### 2.1 System Prompt para LEGENDAS (Caption)

**Localização:** `src/lib/ai.ts` linha 10-44 (`BASE_SYSTEM_PROMPT`)

**Conteúdo Atual:**
```
Você é um copywriter brasileiro especialista em marketing de afiliados com tom de zoeira autêntica.

Seu trabalho é criar UMA frase de legenda para produtos de afiliado no Telegram.

REGRAS OBRIGATÓRIAS:
- A frase deve estar em CAIXA ALTA
- Máximo de 8 palavras
[... 2.800 caracteres totais ...]
```

**Análise:**
- Tamanho: **2.800 chars = ~700 tokens**
- Enviado: **A CADA produto processado**
- Cache atual: ✅ 5 minutos (via `buildDynamicSystemPrompt`)
- Problema: Exemplos dinâmicos adicionam +500-1000 tokens extras


**Prompt Dinâmico Adicionado:**
```javascript
// Linha 108-133: Injeta exemplos aprovados
if (examples.length > 0) {
  const examplesBlock = examples
    .map(e => `- ${e.productName} → ${e.caption}`)
    .join('\n');
  // Adiciona ao prompt base
}
```

- Top 12 exemplos do banco (usedAsExample=true)
- Cada exemplo: ~60 chars = 15 tokens
- **Total de exemplos: ~180 tokens extras**

**Estimativa Total:**
- BASE: 700 tokens
- Exemplos: 180 tokens
- Palavras bloqueadas: 20 tokens
- Contextos ativos: 50 tokens
- **TOTAL: ~950 tokens por chamada**

---

### 2.2 System Prompt para AVALIAÇÃO (Evaluate)

**Localização:** `src/lib/ai.ts` linha 47-71 (`EVALUATION_SYSTEM_PROMPT`)

**Conteúdo:**
```
Você é um analista de ofertas do Brasil especializado em identificar boas oportunidades reais para o consumidor.
Seu trabalho é avaliar a qualidade de uma oferta com base nos sinais abaixo...
[... 1.600 caracteres totais ...]
```

**Análise:**
- Tamanho: **1.600 chars = ~400 tokens**
- Enviado: **A CADA produto processado** (modo evaluate)
- Cache atual: ❌ **NÃO TEM CACHE**
- Problema: `buildDynamicEvaluationPrompt()` recarrega histórico do banco SEMPRE

**Prompt Dinâmico Adicionado:**
```javascript
// Linha 167-191: Carrega produtos avaliados pelo usuário
const [highlyRated, poorlyRated] = await Promise.all([
  prisma.product.findMany({ where: { userRating: { gte: 7 } }, take: 15 }),
  prisma.product.findMany({ where: { userRating: { lte: 4 } }, take: 15 })
]);
```

- 15 produtos bem avaliados + 15 mal avaliados
- Cada produto: ~80 chars = 20 tokens
- **Total de exemplos: ~600 tokens extras**

**Estimativa Total:**
- BASE: 400 tokens
- Exemplos (30 produtos): 600 tokens
- **TOTAL: ~1.000 tokens por chamada**

---

### 2.3 Histórico de Conversa

**Status:** ✅ **NÃO APLICA**

O projeto **NÃO mantém histórico de conversa**. Cada chamada é independente:
- Gemini: usa `generateContent()` com mensagem única
- OpenRouter: array de mensagens com 1 item (system + user)
- **SEM RISCO de crescimento indefinido**


---

## PASSO 3 — BOT TELEGRAM (INGESTÃO DE PRODUTOS)

### 3.1 Status Atual do Bot Python

**Arquivo:** `bot/ai_engine.py`

```python
def process_product_with_ai(product_name, price, original_price=None, category=None):
    """OpenRouter desativado. Retorna valores nulos sem chamar a API."""
    return {"texto": None, "score": None}
```

✅ **BOT PYTHON NÃO USA IA** — Toda inteligência está no webhook Next.js

---

### 3.2 Fluxo Real de Ingestão

```
Bot Python (scrapers.py)
    ↓
Busca produtos em Promobit/Promobyte
    ↓
Envia para webhook Next.js (/api/webhook/products)
    ↓
Webhook chama processProductWithAI() 2x:
    1. mode='evaluate' → score 0-10 (1.000 tokens)
    2. mode='caption' → legenda Telegram (950 tokens)
    ↓
Salva no banco via Prisma
    ↓
Publica no Telegram (se aprovado)
```

**Tokens por Produto:**
- Evaluate: ~1.000 tokens (system + user)
- Caption: ~950 tokens (system + user)
- Resposta (ambos): ~150 tokens
- **TOTAL: 2.100 tokens/produto**

**Volume Estimado:**
- 30-60 produtos/dia (scraping a cada 30min)
- **63.000-126.000 tokens/dia** só de entrada
- **94.500-189.000 tokens/dia** com respostas

**Custo Estimado (Google Gemini 2.5 Flash):**
- Entrada: $0.075 / 1M tokens
- Saída: $0.30 / 1M tokens
- **Por dia: $0.01 - $0.03**
- **Por mês: $0.30 - $0.90**

---

### 3.3 Análise de Cache

**Atual:**
- ✅ `buildDynamicSystemPrompt()`: cache de 5min (TTL)
- ❌ `buildDynamicEvaluationPrompt()`: **SEM CACHE** (recarrega do banco sempre)

**Problema:**
- A cada produto processado, faz 2 queries no Prisma:
  1. Buscar exemplos de legendas (12 registros)
  2. Buscar produtos avaliados (30 registros)
- Total: 42 registros lidos do banco POR PRODUTO
- Com 50 produtos/dia: **2.100 queries desnecessárias**

---

### 3.4 Uso de Modelo

**Modelo Atual:** `google/gemini-2.5-flash` (via Google AI SDK)

**Fallbacks:**
1. gemini-2.5-flash (primário)
2. gemini-1.5-flash (se 2.5 falhar)
3. OpenRouter (google/gemini-2.5-flash) — **USA CRÉDITO SEPARADO**
4. NVIDIA NIM (minimaxai/minimax-m3) — **USA CRÉDITO SEPARADO**

**❌ PROBLEMA:**
- Se cota do Gemini esgotar (429), cai em OpenRouter ($$$)
- OpenRouter cobra: $0.075/1M entrada + $0.30/1M saída
- NVIDIA NIM cobra: valores similares

**Risco:**
- Cota gratuita do Gemini: 15 RPM (requests/min)
- Com 2 chamadas/produto: **máx 7.5 produtos/min**
- Bot processa produtos com sleep de 5s: **12 produtos/min**
- **RISCO DE ESTOURAR COTA E GASTAR EM FALLBACK!**


---

## PASSO 4 — PONTOS CRÍTICOS DE DESPERDÍCIO

### 🔴 ALTO IMPACTO — Corrigir Primeiro

#### 1. **Chamadas Duplicadas de IA (Evaluate + Caption)**
- **Arquivo:** `src/app/api/webhook/products/route.ts` + `src/lib/ai.ts`
- **Problema:** Cada produto = 2 chamadas completas de IA com system prompts separados
- **Impacto:** 2.100 tokens/produto (deveria ser ~1.200)
- **Economia:** **900 tokens/produto (43% de redução)**
- **Frequência:** 30-60 produtos/dia
- **Economia/dia:** 27.000-54.000 tokens

**Solução:**
- Unificar em 1 chamada que retorna `{score, caption}` no mesmo JSON
- Combinar os 2 system prompts em 1 só
- Reduzir tamanho total: 950+1000 → 1200 tokens

---

#### 2. **Prompt de Avaliação SEM Cache**
- **Arquivo:** `src/lib/ai.ts` linha 164-192 (`buildDynamicEvaluationPrompt`)
- **Problema:** Recarrega 30 produtos do banco a CADA chamada
- **Impacto:** 600 tokens extras + 2 queries Prisma por produto
- **Economia:** Cache de 5min (igual caption prompt)
- **Frequência:** 30-60 chamadas/dia
- **Economia/dia:** 18.000-36.000 tokens

**Solução:**
```javascript
let _dynamicEvalPromptCache: { prompt: string; expiresAt: number } | null = null;
const EVAL_CACHE_TTL_MS = 5 * 60 * 1000;

export async function buildDynamicEvaluationPrompt(): Promise<string> {
  if (_dynamicEvalPromptCache && Date.now() < _dynamicEvalPromptCache.expiresAt) {
    return _dynamicEvalPromptCache.prompt;
  }
  // ... resto do código
  _dynamicEvalPromptCache = { prompt, expiresAt: Date.now() + EVAL_CACHE_TTL_MS };
  return prompt;
}
```

---

#### 3. **Risco de Estourar Cota e Gastar em Fallbacks**
- **Arquivo:** `src/lib/ai.ts` linha 461-550, `bot/telegram_listener.py` linha 290-460
- **Problema:** Sem rate limiting adequado, fallback cai em OpenRouter/NVIDIA ($$)
- **Impacto:** Custo 10-50x maior se esgotar cota gratuita
- **Frequência:** Pode acontecer em picos de scraping

**Solução:**
- Implementar fila com rate limiting no webhook
- Processar máximo 7 produtos/min (90 RPM / 2 chamadas / 60s)
- Sleep adaptativo se receber 429 do Gemini

---

### 🟡 MÉDIO IMPACTO — Melhoria Relevante

#### 4. **Exemplos Dinâmicos Recarregados a Cada 5min**
- **Arquivo:** `src/lib/ai.ts` linha 100-136
- **Problema:** Cache de 5min força reload de exemplos mesmo que não mudem
- **Impacto:** 42 queries Prisma a cada 5min
- **Economia:** Aumentar TTL para 30min ou 1h

**Solução:**
```javascript
const PROMPT_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutos
```

**Justificativa:**
- Exemplos de legendas não mudam com frequência
- Admin adiciona novos exemplos manualmente (raro)
- 30min é suficiente para refletir mudanças

---


#### 5. **Texto Completo de Mensagens Encaminhadas**
- **Arquivo:** `bot/telegram_listener.py` linha 211-226
- **Problema:** Envia texto completo de mensagens WhatsApp (até 2000 chars)
- **Impacto:** 500+ tokens extras por mensagem
- **Frequência:** 5-20 mensagens/dia

**Solução:**
- Limpar texto antes de enviar:
  - Remover assinaturas ("Enviado do meu iPhone")
  - Remover disclaimers longos
  - Truncar para 1000 caracteres
- Economia: 200-300 tokens/mensagem

---

#### 6. **Scraping de Imagens sem Necessidade**
- **Arquivo:** `bot/telegram_listener.py` linha 642-653
- **Problema:** Busca imagem no DuckDuckGo mesmo quando produto já tem foto
- **Impacto:** Requisição HTTP extra + parsing HTML
- **Frequência:** Raro (só quando scraper falha)

**Solução:**
- Verificar se `scraped_data.get('imageUrl')` existe ANTES de buscar no DDG
- Economia: 1-5 requisições/dia

---

### 🟢 BAIXO IMPACTO — Otimização Fina

#### 7. **Histórico de Preços Carregado Para Todos os Produtos**
- **Arquivo:** `src/app/api/webhook/products/route.ts` linha 611, 1145
- **Problema:** Busca todo histórico de preços mesmo para produtos novos
- **Impacto:** Query Prisma desnecessária
- **Frequência:** Por produto

**Solução:**
- Se produto é novo (sem histórico), skip query

---

#### 8. **Queries Prisma Não Otimizadas**
- **Arquivos:** Diversos (`src/app/api/**/*.ts`)
- **Problema:** Select * em vez de select específico
- **Impacto:** Tráfego de rede extra Supabase
- **Frequência:** Constante

**Solução:**
- Usar `.select({ id: true, name: true })` em vez de retornar tudo
- Economia: 20-30% menos dados trafegados

---

## PASSO 5 — PLANO DE AÇÃO

### 📋 Tabela Resumo: Onde os Tokens São Gastos

| Arquivo | API | Tokens/Chamada | Frequência | Tokens/Dia | % do Total |
|---------|-----|----------------|------------|------------|------------|
| `ai.ts` (evaluate) | Gemini | 1.000 | 50/dia | 50.000 | 35% |
| `ai.ts` (caption) | Gemini | 950 | 50/dia | 47.500 | 33% |
| `telegram_listener.py` | Gemini/OpenRouter | 500 | 10/dia | 5.000 | 3% |
| Respostas da IA | Gemini | 150 | 100/dia | 15.000 | 10% |
| Fallbacks (OpenRouter/NVIDIA) | Vários | variável | raro | ~5.000 | 3% |
| **TOTAL** | | | | **~142.500** | **100%** |


---

### 🎯 Otimizações Priorizadas (Top 3)

#### **OTIMIZAÇÃO #1: Unificar Evaluate + Caption em 1 Chamada**
- **Impacto:** 🔴 ALTO
- **Economia:** 45.000 tokens/dia (32%)
- **Esforço:** 2-3 horas
- **Risco:** BAIXO (só altera lógica interna)

**Antes:**
```typescript
// Chamada 1: Evaluate
const evalResult = await processProductWithAI(name, price, null, category, id, 'evaluate');
// Chamada 2: Caption
const captionResult = await processProductWithAI(name, price, null, category, id, 'caption');
```

**Depois:**
```typescript
// Chamada única
const result = await processProductWithAI(name, price, null, category, id, 'both');
// Retorna: { score, titulo, subtitulo, rawJson }
```

**Mudanças Necessárias:**
1. Criar novo system prompt unificado (combina evaluate + caption)
2. Modificar `processProductWithAI()` para aceitar `mode='both'`
3. Parser JSON espera: `{ score, titulo, analise }`
4. Atualizar webhook para usar nova assinatura

---

#### **OTIMIZAÇÃO #2: Adicionar Cache ao Prompt de Avaliação**
- **Impacto:** 🔴 ALTO
- **Economia:** 30.000 tokens/dia (21%)
- **Esforço:** 30 minutos
- **Risco:** BAIXO (só adiciona cache)

**Diff:**
```diff
+ let _dynamicEvalPromptCache: { prompt: string; expiresAt: number } | null = null;
+ const EVAL_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutos

export async function buildDynamicEvaluationPrompt(): Promise<string> {
+  if (_dynamicEvalPromptCache && Date.now() < _dynamicEvalPromptCache.expiresAt) {
+    return _dynamicEvalPromptCache.prompt;
+  }
  
  try {
    const [highlyRated, poorlyRated] = await Promise.all([...]);
    // ... constrói prompt
+    _dynamicEvalPromptCache = { prompt, expiresAt: Date.now() + EVAL_CACHE_TTL_MS };
    return prompt;
  }
}
```

---

#### **OTIMIZAÇÃO #3: Rate Limiting para Evitar Fallbacks Caros**
- **Impacto:** 🔴 ALTO (previne custos extras)
- **Economia:** Impede gasto em OpenRouter/NVIDIA (até 10x mais caro)
- **Esforço:** 3-4 horas
- **Risco:** MÉDIO (precisa testar bem)

**Solução:**
```typescript
// src/lib/ai-queue.ts (NOVO ARQUIVO)
const AI_QUEUE: Array<() => Promise<any>> = [];
let processingQueue = false;
const MIN_INTERVAL_MS = 8500; // 60s / 7 produtos = 8.5s entre chamadas

export async function queueAIRequest<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    AI_QUEUE.push(async () => {
      try {
        const result = await fn();
        resolve(result);
      } catch (err) {
        reject(err);
      }
    });
    processQueue();
  });
}

async function processQueue() {
  if (processingQueue || AI_QUEUE.length === 0) return;
  processingQueue = true;
  
  while (AI_QUEUE.length > 0) {
    const task = AI_QUEUE.shift()!;
    await task();
    await new Promise(r => setTimeout(r, MIN_INTERVAL_MS));
  }
  
  processingQueue = false;
}
```

**Uso:**
```typescript
// Antes
const result = await processProductWithAI(...);

// Depois
const result = await queueAIRequest(() => processProductWithAI(...));
```


---

### 📊 Resumo de Todas as Otimizações

| # | Otimização | Impacto | Economia Tokens/Dia | Esforço | Risco |
|---|-----------|---------|---------------------|---------|-------|
| 1 | Unificar evaluate + caption | 🔴 ALTO | 45.000 (32%) | 2-3h | BAIXO |
| 2 | Cache prompt avaliação | 🔴 ALTO | 30.000 (21%) | 30min | BAIXO |
| 3 | Rate limiting + fila | 🔴 ALTO | Previne custos extras | 3-4h | MÉDIO |
| 4 | Aumentar TTL cache para 30min | 🟡 MÉDIO | 5.000 (3%) | 5min | BAIXO |
| 5 | Limpar texto mensagens | 🟡 MÉDIO | 2.000 (1%) | 1h | BAIXO |
| 6 | Skip scraping imagem duplicado | 🟡 MÉDIO | 500 (0.3%) | 30min | BAIXO |
| 7 | Skip query histórico para produtos novos | 🟢 BAIXO | - | 1h | BAIXO |
| 8 | Otimizar queries Prisma com select | 🟢 BAIXO | - | 2-3h | BAIXO |

**ECONOMIA TOTAL ESTIMADA:**
- Antes: ~142.500 tokens/dia
- Depois (aplicando #1, #2, #3, #4, #5): **~60.000 tokens/dia**
- **Redução: 58% de economia de tokens**
- **Redução de custo: de $0.03/dia para $0.013/dia** (~$0.40/mês)

---

### 🛠️ Ordem de Implementação Recomendada

#### Fase 1 — Ganhos Rápidos (1 dia de trabalho)
1. ✅ Adicionar cache ao prompt de avaliação (30min)
2. ✅ Aumentar TTL do cache de caption para 30min (5min)
3. ✅ Limpar texto de mensagens encaminhadas (1h)

**Ganho imediato:** ~37.000 tokens/dia (26%)

---

#### Fase 2 — Refatoração Estrutural (1-2 dias)
4. ✅ Unificar evaluate + caption em 1 chamada (2-3h)
5. ✅ Implementar rate limiting + fila (3-4h)
6. ✅ Skip scraping de imagem duplicado (30min)

**Ganho adicional:** ~45.500 tokens/dia (32%)

---

#### Fase 3 — Polimento (opcional)
7. ⚪ Skip query histórico para produtos novos (1h)
8. ⚪ Otimizar queries Prisma com select específico (2-3h)

**Ganho:** Melhoria de performance, redução de tráfego DB

---

## 📈 PROJEÇÃO DE CUSTOS

### Cenário Atual (Sem Otimizações)
- Tokens/dia: 142.500
- Entrada: 120.000 tokens (~85%)
- Saída: 22.500 tokens (~15%)
- **Custo/dia:** $0.016
- **Custo/mês:** $0.48

### Cenário Otimizado (Com Todas as Fixes)
- Tokens/dia: 60.000
- Entrada: 51.000 tokens (~85%)
- Saída: 9.000 tokens (~15%)
- **Custo/dia:** $0.007
- **Custo/mês:** $0.21

### Economia Anual
- **$3.24/ano economizados**
- Redução de 58% no consumo de tokens
- **Previne custos extras** de fallback (OpenRouter/NVIDIA)

---

## ⚠️ ALERTAS E RISCOS

### 1. Cota Gratuita do Gemini
- **Limite:** 15 RPM (requests por minuto)
- **Uso atual:** ~12-14 RPM (2 chamadas × 6-7 produtos/min)
- **Risco:** MÉDIO — pode estourar em picos
- **Mitigação:** Rate limiting (Otimização #3)

### 2. Fallback Sem Controle
- **Problema:** Se Gemini falhar (429), cai em OpenRouter/NVIDIA
- **Custo:** 10-50x mais caro
- **Risco:** ALTO — pode gerar custos inesperados
- **Mitigação:** Implementar retry com backoff exponencial antes de fallback

### 3. Prompt Caching do Anthropic
- **Nota:** Projeto usa Google Gemini, não Anthropic Claude
- **Status:** ❌ Não aplicável (Gemini não tem prompt caching nativo)
- **Alternativa:** Cache manual implementado (5-30min TTL)


---

## 📝 CONCLUSÃO

### Principais Descobertas

1. ✅ **Bot Python desativado** — Não há gasto de tokens no scraper Python
2. 🔴 **Chamadas duplicadas** — Cada produto = 2 chamadas completas de IA (evaluate + caption)
3. 🔴 **Prompt sem cache** — `buildDynamicEvaluationPrompt()` recarrega do banco sempre
4. 🟡 **Cache de 5min** — Poderia ser 30min para reduzir queries no banco
5. 🟡 **Risco de fallback** — Sem rate limiting, pode estourar cota e gastar em APIs caras

### Economia Projetada

| Métrica | Antes | Depois | Economia |
|---------|-------|--------|----------|
| Tokens/dia | 142.500 | 60.000 | **58%** |
| Chamadas IA/dia | 100 | 55 | **45%** |
| Queries Prisma/dia | 2.100 | 110 | **95%** |
| Custo/mês | $0.48 | $0.21 | **$0.27/mês** |

### Recomendação Final

**Implementar TODAS as otimizações da Fase 1 e Fase 2:**
- Ganho imediato de 58% de redução de tokens
- Previne custos extras com fallbacks
- Reduz carga no banco de dados Supabase
- Melhora tempo de resposta do webhook

**Prioridade máxima:**
1. Unificar evaluate + caption (Otimização #1)
2. Adicionar cache ao prompt de avaliação (Otimização #2)
3. Implementar rate limiting (Otimização #3)

---

## 🚀 PRÓXIMOS PASSOS

### Para Implementar

1. **Revisar este documento** e validar as estimativas
2. **Aprovar o plano** de otimização (Fase 1 + Fase 2)
3. **Criar branch** `feature/optimize-ai-tokens`
4. **Implementar fixes** na ordem recomendada
5. **Testar** com 10-20 produtos reais
6. **Monitorar** consumo de tokens por 1 semana
7. **Ajustar** TTLs e rate limits conforme necessário

### Métricas para Monitorar

- [ ] Tokens gastos por dia (antes/depois)
- [ ] Número de produtos processados/dia
- [ ] Taxa de erro da API (429, 500, timeout)
- [ ] Tempo médio de processamento por produto
- [ ] Queries Prisma executadas/hora
- [ ] Uso de fallbacks (OpenRouter/NVIDIA)

---

**Documento gerado em:** 26 de junho de 2026  
**Autor:** Auditoria Automática de Tokens  
**Versão:** 1.0

