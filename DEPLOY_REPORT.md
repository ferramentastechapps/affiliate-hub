# ✅ RELATÓRIO DE DEPLOY — 26/06/2026

## 🎯 OBJETIVO
Deploy da otimização de custo de IA (-78%) e correção de links de afiliados terceiros

---

## ✅ DEPLOY CONCLUÍDO COM SUCESSO

### Timestamp
- **Início:** 26/06/2026 (horário do commit)
- **Término:** 26/06/2026 (deploy confirmado)
- **Duração total:** ~5 minutos

---

## 📦 O QUE FOI DEPLOYADO

### 1. Otimização de Custo de IA
- ✅ Deduplicação forte por platformId (`bot/scrapers.py`)
- ✅ Intervalo de scraping 5→15 min (`bot/config.py`, `.env`)
- ✅ Logs de eficiência (`bot/main.py`)
- ✅ Script de teste automatizado (`bot/testar_deduplicacao.py`)
- ✅ 12 arquivos de documentação

### 2. Correção de Links de Afiliados Terceiros
- ✅ Resolve redirect antes de scraping (`bot/telegram_listener.py`)
- ✅ `AMAZON_TAG=jota012d-20` configurada no `.env`

---

## 🔧 CONFIGURAÇÕES APLICADAS NA VPS

### Variáveis de Ambiente
```bash
# /root/affiliate-hub/.env
AMAZON_TAG="jota012d-20"

# /root/affiliate-hub/bot/.env
SEARCH_INTERVAL_MINUTES=15
AMAZON_TAG=jota012d-20
```

### Serviços PM2
```
┌─────┬───────────────────────────┬─────────┬───────────┐
│ id  │ name                      │ status  │ uptime    │
├─────┼───────────────────────────┼─────────┼───────────┤
│ 535 │ nextjs                    │ online  │ 7m        │
│ 536 │ affiliate-hub-listener    │ online  │ 7m        │
│ 537 │ affiliate-scraper         │ online  │ restart   │
│ 0   │ signal-engine             │ online  │ 3h        │
└─────┴───────────────────────────┴─────────┴───────────┘
```

---

## ✅ VALIDAÇÕES REALIZADAS

### 1. Build do Next.js
```
✓ Compiled successfully in 105s
✓ Generating static pages using 1 worker (63/63) in 1175ms
```

### 2. Logs do Next.js
- ✅ Servidor rodando em `http://127.0.0.1:3005`
- ✅ Webhook processando produtos normalmente
- ✅ IA gerando captions (Gemini Flash)
- ✅ Links de afiliado sendo gerados

### 3. Bot de Scraping
- ✅ Intervalo configurado para 15 minutos
- ✅ Deduplicação ativa (`🔍 Deduplicando produtos...`)
- ✅ Processando produtos novos (`📦 Processando 4 produtos novos...`)

### 4. Variáveis de Ambiente
- ✅ `AMAZON_TAG` configurada em ambos `.env`
- ✅ `SEARCH_INTERVAL_MINUTES=15` ativa no bot

---

## 📊 ARQUIVOS DEPLOYADOS

### Código (3 modificados)
- `bot/scrapers.py` — Método `_gerar_chave_dedup` (linha 2252)
- `bot/main.py` — 4 alterações para deduplicação
- `bot/config.py` — Padrão 15 minutos

### Scripts (3 novos)
- `bot/testar_deduplicacao.py` — Validação automatizada
- `check_volume_real.js` — Diagnóstico de volume
- `diagnostico_ai_processing.js` — Análise de processamento

### Documentação (12 novos)
1. `AUDITORIA_TOKENS.md`
2. `GAP_CUSTO_REAL.md`
3. `DIAGNOSTICO_REPROCESSAMENTO.md`
4. `RESUMO_DIAGNOSTICO.md`
5. `RESUMO_EXECUTIVO.md`
6. `STATUS_IMPLEMENTACAO.md`
7. `COMO_TESTAR.md`
8. `ESTADO_ATUAL.md`
9. `DEPLOY.md`
10. `MUDANCAS.md`
11. `CORRECAO_LINKS_TERCEIROS.md` (existente, atualizado)
12. `DEPLOY_REPORT.md` (este arquivo)

---

## 🎯 RESULTADO ESPERADO

### Performance
| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| Ciclos/dia | 288 | 96 | -67% ✅ |
| Produtos/dia | 4.320-8.640 | 960-1.920 | -78% ✅ |
| Taxa de deduplicação | ~30% | ~90% | +200% ⏳ |

### Custo
| Métrica | Antes | Depois | Economia |
|---------|-------|--------|----------|
| Tokens/dia | 8.4M-16.8M | 1.9M-3.7M | -78% ⏳ |
| **Custo/mês** | **$27-55** | **$6-12** | **-78% ⏳** |

**Economia anual esperada: $252-516**

---

## 🧪 PRÓXIMOS PASSOS (VALIDAÇÃO)

### Imediato (hoje)
- [ ] Monitorar logs do bot por 1 hora
- [ ] Verificar taxa de deduplicação nos logs
- [ ] Testar link de afiliado terceiro no Telegram

### Curto Prazo (24h)
- [ ] Confirmar que bot roda a cada 15 min (não 5)
- [ ] Verificar taxa de deduplicação > 70%
- [ ] Validar que links terceiros têm `tag=jota012d-20`

### Médio Prazo (7 dias)
- [ ] Monitorar dashboard Gemini
- [ ] Confirmar tokens/dia caíram para 2-4M
- [ ] Validar custo mensal em $6-12

---

## 📝 COMANDOS ÚTEIS

### Verificar Logs
```bash
# Logs do Next.js
ssh root@212.85.10.239 "pm2 logs nextjs --lines 50"

# Logs do bot
ssh root@212.85.10.239 "pm2 logs affiliate-scraper --lines 50"

# Logs de deduplicação
ssh root@212.85.10.239 "pm2 logs affiliate-scraper | grep Dedup"
```

### Verificar Configuração
```bash
# Variáveis de ambiente
ssh root@212.85.10.239 "grep -E 'SEARCH_INTERVAL|AMAZON_TAG' /root/affiliate-hub/bot/.env"

# Status dos serviços
ssh root@212.85.10.239 "pm2 status"
```

### Reiniciar Serviços
```bash
# Reiniciar bot
ssh root@212.85.10.239 "pm2 restart affiliate-scraper"

# Reiniciar Next.js
ssh root@212.85.10.239 "pm2 restart nextjs"

# Reiniciar todos
ssh root@212.85.10.239 "pm2 restart all"
```

---

## ⚠️ OBSERVAÇÕES IMPORTANTES

### 1. Intervalo de Scraping
O bot agora roda **a cada 15 minutos** (antes: 5 minutos)
- Primeira execução após deploy: imediata
- Próximos ciclos: a cada 15 minutos
- Validar nos logs: timestamp entre "Iniciando busca"

### 2. Taxa de Deduplicação
Esperar que aumente gradualmente:
- **Primeiro ciclo** (hoje): 30-50% (normal, estado inicial)
- **Segundo ciclo** (15 min depois): 60-80% (produtos já vistos)
- **Ciclos subsequentes** (24h): 70-95% (estado ideal)

### 3. Links de Afiliados Terceiros
Para testar, enviar no Telegram:
```
https://amzn.divulgador.link/JsQPa8IE
```
**Resultado esperado:**
- Nome: "Chaleira Elétrica..." (não "Amazon.com.br")
- Link: contém `tag=jota012d-20`
- Foto: imagem da chaleira

---

## 🚨 TROUBLESHOOTING

### Se taxa de deduplicação continuar baixa (<50% após 24h)
```bash
# Ver quantos produtos retornam platformId None
ssh root@212.85.10.239 "pm2 logs affiliate-scraper | grep 'PLATFORM_ID.*None' | wc -l"
```
**Solução:** Melhorar regex de extração em `scrapers.py`

### Se bot não respeitar intervalo de 15 minutos
```bash
# Verificar configuração
ssh root@212.85.10.239 "grep SEARCH_INTERVAL /root/affiliate-hub/bot/.env"
```
**Solução:** Reconfigurar e reiniciar:
```bash
ssh root@212.85.10.239 "sed -i 's/SEARCH_INTERVAL_MINUTES=5/SEARCH_INTERVAL_MINUTES=15/g' /root/affiliate-hub/bot/.env && pm2 restart affiliate-scraper"
```

### Se links terceiros não tiverem tag correta
```bash
# Verificar configuração
ssh root@212.85.10.239 "grep AMAZON_TAG /root/affiliate-hub/.env"
```
**Solução:** Reconfigurar e reiniciar:
```bash
ssh root@212.85.10.239 "echo 'AMAZON_TAG=jota012d-20' >> /root/affiliate-hub/.env && pm2 restart nextjs"
```

---

## ✅ CHECKLIST FINAL

### Deploy
- [x] ✅ Código commitado e pushed
- [x] ✅ Build do Next.js bem-sucedido
- [x] ✅ Serviços PM2 rodando
- [x] ✅ Variáveis de ambiente configuradas

### Configuração
- [x] ✅ AMAZON_TAG definida
- [x] ✅ SEARCH_INTERVAL_MINUTES=15
- [x] ✅ Bot reiniciado com novas configs

### Validação Imediata
- [x] ✅ Next.js respondendo
- [x] ✅ Bot processando produtos
- [x] ✅ Deduplicação ativa
- [ ] ⏳ Taxa de deduplicação > 70% (aguardar 24h)
- [ ] ⏳ Custo reduzido (aguardar 7 dias)

---

## 📊 MONITORAMENTO

### Dashboard Gemini
URL: https://console.cloud.google.com/apis
- **Métrica:** Tokens consumidos/dia
- **Alvo:** 2-4M (antes: 8-16M)
- **Verificar:** Após 7 dias

### Logs do Bot
```bash
ssh root@212.85.10.239 "tail -f /root/.pm2/logs/affiliate-scraper-out.log"
```
- **Procurar por:** `📊 [Dedup]`
- **Alvo:** Taxa > 70%
- **Verificar:** A cada ciclo (15 min)

---

## 🎉 CONCLUSÃO

**Deploy concluído com sucesso!** ✅

Todas as mudanças foram aplicadas corretamente:
- ✅ Código deployado na VPS
- ✅ Serviços reiniciados
- ✅ Configurações aplicadas
- ✅ Sistema funcionando normalmente

**Próximos passos:**
1. Monitorar logs por 24h
2. Validar taxa de deduplicação
3. Confirmar redução de custo após 7 dias

---

**Data do deploy:** 26/06/2026  
**Responsável:** Sistema automatizado via `ship.ps1`  
**Status:** ✅ **SUCESSO**
