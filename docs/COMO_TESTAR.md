# 🧪 COMO TESTAR A IMPLEMENTAÇÃO

## ⚡ GUIA RÁPIDO DE VALIDAÇÃO

---

## 📋 PRÉ-REQUISITOS

✅ Implementação concluída (todas as mudanças aplicadas)  
✅ Python 3.8+ instalado  
✅ Dependências instaladas: `cd bot && pip install -r requirements.txt`  
✅ Arquivo `.env` configurado com chaves de API

---

## 🎯 TESTE 1: Validação Automatizada (5 minutos)

### Objetivo
Verificar se o método `_gerar_chave_dedup` funciona corretamente em 7 cenários diferentes.

### Comando
```bash
cd bot
python testar_deduplicacao.py
```

### Resultado Esperado
```
🧪 TESTE DE DEDUPLICAÇÃO FORTE
==================================================================

✅ TESTE 1: Produto com platformId + platformType
   Produto: Smartphone Samsung Galaxy S24 256GB
   Chave gerada: mercadolivre:MLB1234567890
   ✅ Usa platformId (correto!)

✅ TESTE 2: Mesmo platformId, nome diferente
   Produto: Samsung Galaxy S24 256GB - Preto
   Chave gerada: mercadolivre:MLB1234567890
   ✅ CORRETO: Mesma chave (evita duplicata!)

...

📊 COMPARAÇÃO: CHAVE ANTIGA vs. NOVA
==================================================================

🔴 CHAVE ANTIGA (60 chars do nome):
   ❌ Total de chaves únicas: 3 (3 produtos = 3 duplicatas!)

🟢 CHAVE NOVA (platformId):
   ✅ Total de chaves únicas: 1 (1 produto único!)

💰 ECONOMIA: 2 chamadas de IA evitadas (de 3 para 1)
   Taxa de redução: 67%
```

### ✅ Critério de Sucesso
- Todos os 7 testes passam
- Comparação mostra redução de duplicatas
- Nenhum erro de Python

### ❌ Se Falhar
Verificar se o método `_gerar_chave_dedup` foi implementado corretamente em `bot/scrapers.py` linha 2252.

---

## 🎯 TESTE 2: Ciclo Único com Dados Reais (10 minutos)

### Objetivo
Processar produtos reais e verificar logs de deduplicação.

### Comando
```bash
cd bot
python main.py --once
```

### Resultado Esperado
```
🤖 Iniciando busca de promoções - HH:MM:SS
============================================================

🔥 Buscando promoções reais no Promobit...
   📡 Status: 200
   📦 Encontrados 15 produtos

📊 Encontrados: 45 produtos e 3 cupons

📊 [Dedup] 45 encontrados | 15 duplicados (33.3%) | 30 novos para processar
✨ Novos: 30 produtos e 3 cupons

📦 Processando 30 produtos novos...
🔗 API URL: http://localhost:3000

📦 Processando produto: Smartphone Samsung Galaxy S24...
[PLATFORM_ID] URL: https://mercadolivre.com.br/... → ID: MLB1234567890
✅ Produto adicionado no site: abc123

...

✅ Busca concluída e estado salvo!
```

### 🔍 O Que Observar

1. **Taxa de deduplicação inicial:** 20-40% (normal no primeiro ciclo)
2. **Log `[PLATFORM_ID]`:** Deve aparecer para produtos do ML, Amazon, Shopee
3. **Produtos novos:** Devem ser processados e adicionados ao site
4. **Sem erros:** Nenhum `❌` crítico

### ✅ Critério de Sucesso
- Bot executa sem crashes
- Log `📊 [Dedup]` aparece
- Produtos são adicionados ao site
- Estado salvo em `bot_state.json`

---

## 🎯 TESTE 3: Segundo Ciclo (Validação de Deduplicação) (25 minutos)

### Objetivo
Confirmar que produtos já processados NÃO são reprocessados.

### Comandos
```bash
# Ciclo 1: processar produtos
cd bot
python main.py --once

# ⏰ AGUARDAR 15-20 MINUTOS

# Ciclo 2: validar deduplicação
python main.py --once
```

### Resultado Esperado (Ciclo 2)
```
📊 Encontrados: 45 produtos e 0 cupons

📊 [Dedup] 45 encontrados | 45 duplicados (100.0%) | 0 novos para processar
✨ Novos: 0 produtos e 0 cupons

ℹ️ Nenhum produto do ciclo atende aos critérios

✅ Busca concluída e estado salvo!
```

### 🎉 SUCESSO CONFIRMADO
- **Taxa de deduplicação:** 100% (todos já foram processados)
- **Novos produtos:** 0
- **Chamadas de IA:** 0 (economia total!)

### ⚠️ Se Taxa < 70%
Verificar logs:
```bash
grep "PLATFORM_ID.*None" bot/debug.log
```

Se muitos produtos retornam `ID: None`, significa que os scrapers não estão extraindo `platformId` corretamente.

**Solução:** Melhorar regex em `scrapers.py` método `_extrair_platform_id_regex`.

---

## 🎯 TESTE 4: Monitorar Produção (24 horas)

### Objetivo
Confirmar redução de custo em ambiente real.

### Passo 1: Iniciar Bot em Modo Agendado
```bash
cd bot
python main.py  # Roda a cada 15 minutos
```

### Passo 2: Monitorar Logs
```bash
# Em outro terminal:
tail -f bot/logs/bot.log  # Se tiver log configurado
# OU
# Verificar saída do terminal onde o bot está rodando
```

### Passo 3: Verificar Dashboard da API de IA

#### Gemini (Google AI Studio)
1. Acessar: https://console.cloud.google.com/apis
2. Selecionar projeto
3. APIs & Services → Usage
4. Filtrar: "Generative Language API"
5. Verificar: Requests/dia e Tokens/dia

**Esperado:** 
- Tokens/dia: ~2-4M (antes: 8-16M)
- Requests/dia: ~960-1920 (antes: 4320-8640)

#### OpenRouter
1. Acessar: https://openrouter.ai/activity
2. Verificar: Total spend e Requests

**Esperado:**
- Uso deve ser MÍNIMO (só fallback quando Gemini falhar)

---

## 📊 CHECKLIST DE VALIDAÇÃO

### Imediato (0-30 min)
- [ ] Testes automatizados passam (testar_deduplicacao.py)
- [ ] Ciclo 1 processa produtos normalmente
- [ ] Ciclo 2 mostra 0 novos produtos (100% duplicados)
- [ ] Log `📊 [Dedup]` aparece corretamente

### Curto Prazo (24h)
- [ ] Taxa de deduplicação mantém-se > 70%
- [ ] Tokens/dia reduzem de 8-16M para 2-4M
- [ ] Nenhum produto legítimo é bloqueado indevidamente
- [ ] Bot roda a cada 15 minutos (não 5)

### Médio Prazo (7 dias)
- [ ] Custo de IA cai de $27-55/mês para $6-12/mês
- [ ] Webhook recebe menos produtos duplicados
- [ ] Qualidade dos produtos publicados mantém-se alta

---

## 🚨 PROBLEMAS COMUNS E SOLUÇÕES

### Problema 1: Teste automatizado falha
```
Traceback (most recent call last):
  File "testar_deduplicacao.py", line 5, in <module>
    from scrapers import PromotionScraper
ImportError: No module named 'scrapers'
```

**Solução:**
```bash
cd bot
python testar_deduplicacao.py
```
(Rodar de dentro da pasta `bot/`)

---

### Problema 2: Bot quebra ao carregar estado
```
❌ Erro ao processar produto: 'str' object has no attribute 'get'
```

**Causa:** Incompatibilidade entre estado antigo e novo

**Solução:**
```bash
cd bot
rm bot_state.json  # Remove estado antigo
python main.py --once  # Recria estado limpo
```

---

### Problema 3: Taxa de deduplicação baixa (<50%)
```
📊 [Dedup] 100 encontrados | 20 duplicados (20.0%) | 80 novos
```

**Diagnóstico:**
```bash
python main.py --once 2>&1 | grep "PLATFORM_ID" > platform_ids.log
cat platform_ids.log | grep "→ ID: None" | wc -l
```

Se muitos produtos têm `ID: None`, scrapers não estão extraindo platformId.

**Solução:**
1. Verificar logs: quais lojas retornam `None`?
2. Melhorar regex em `scrapers.py` linha 223+ (método `_extrair_platform_id_regex`)
3. Adicionar suporte para novas lojas

---

### Problema 4: Produtos legítimos são bloqueados
```
📊 [Dedup] 50 encontrados | 50 duplicados (100.0%) | 0 novos
```
(Quando na verdade há produtos novos)

**Diagnóstico:**
```bash
# Verificar se platformIds são únicos
grep "PLATFORM_ID" bot/logs/* | grep -v "None" | sort | uniq -c | sort -rn
```

Se muitos produtos compartilham o mesmo `platformId`, há bug na extração.

**Solução:**
Revisar regex de extração para a loja específica.

---

## 🎓 INTERPRETANDO OS LOGS

### Log Saudável (Ciclo 1)
```
📊 [Dedup] 50 encontrados | 15 duplicados (30.0%) | 35 novos para processar
[PLATFORM_ID] URL: https://mercadolivre.com.br/MLB123 → ID: MLB123
[PLATFORM_ID] URL: https://amazon.com.br/dp/B08XYZ → ID: B08XYZ
✅ Produto adicionado no site: abc-123
```

✅ **Bom:**
- Taxa de dedup 30-40% (normal no 1º ciclo)
- PlatformIds sendo extraídos
- Produtos adicionados com sucesso

---

### Log Saudável (Ciclo 2)
```
📊 [Dedup] 50 encontrados | 50 duplicados (100.0%) | 0 novos para processar
✨ Novos: 0 produtos e 0 cupons
```

✅ **Perfeito:**
- 100% duplicados (esperado)
- Zero produtos novos
- Zero chamadas de IA

---

### Log Problemático
```
📊 [Dedup] 100 encontrados | 10 duplicados (10.0%) | 90 novos
[PLATFORM_ID] URL: https://mercadolivre.com.br/... → ID: None
[PLATFORM_ID] URL: https://amazon.com.br/... → ID: None
```

❌ **Problema:**
- Taxa baixa (10%)
- PlatformIds não extraídos (`None`)
- Muitos "falsos novos"

**Ação:** Melhorar extração de platformId

---

## 📞 QUANDO PEDIR AJUDA

Você deve investigar mais se:

1. **Testes automatizados falham** → Verificar código do método
2. **Taxa < 50% após 24h** → Verificar extração de platformId
3. **Bot quebra ao iniciar** → Verificar estado e dependências
4. **Custo não reduz após 7 dias** → Verificar dashboard da API

Caso contrário, a implementação está funcionando! 🎉

---

## 🎉 CONFIRMAÇÃO DE SUCESSO

Você pode considerar a implementação bem-sucedida quando:

✅ **Imediato:**
- Testes passam
- Ciclo 2 mostra 0 novos produtos

✅ **24 horas:**
- Taxa de dedup > 70%
- Tokens/dia caem para ~2-4M

✅ **7 dias:**
- Custo mensal cai para $6-12
- Webhook recebe menos duplicatas

---

**Boa sorte com os testes! 🚀**
