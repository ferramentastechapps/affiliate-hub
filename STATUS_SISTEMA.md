# 🎯 STATUS DO SISTEMA - AFFILIATE HUB

**Última atualização:** 27/06/2026 às 21:20  
**Versão do código:** Ship update (último deploy)

---

## 🟢 SERVIÇOS ATIVOS (VPS: 212.85.10.239)

| Serviço | Status | Uptime | Memória | CPU |
|---------|--------|--------|---------|-----|
| **Next.js** (Web) | 🟢 ONLINE | 13s | 55MB | 0% |
| **Scraper Bot** | 🟢 ONLINE | 6m | 123MB | 0% |
| **Telegram Listener** | 🟢 ONLINE | 6m | 64MB | 0% |
| **Signal Engine** | 🟢 ONLINE | 15h | 201MB | 0% |

**Comando de verificação:**
```bash
ssh root@212.85.10.239 "pm2 status"
```

---

## ✅ CORREÇÕES IMPLEMENTADAS

### 1. FILTRO DE PREÇO ✅
- **Status:** IMPLEMENTADO
- **O que mudou:** Removido limite de R$300
- **Agora aceita:** Qualquer preço > R$0 (com lifestyle + link afiliado)
- **Arquivo:** `bot/main.py` linha 159
- **Deploy:** ✅ Sim
- **Testado:** ⏳ Aguardando próximo ciclo (15 min)

### 2. RESOLUÇÃO DE LINKS DE AGREGADORES ✅
- **Status:** IMPLEMENTADO
- **O que mudou:** Bot resolve links do Promobit/Pechinchou ANTES de enviar
- **Como funciona:** 
  1. Tenta redirect (10s timeout)
  2. Se falhar, scrape HTML
  3. Cache de 1h em memória
- **Arquivo:** `bot/scrapers.py` linha 135
- **Deploy:** ✅ Sim
- **Testado:** ⏳ Aguardando próximo ciclo (15 min)

### 3. TAG DE AFILIADO AMAZON ✅
- **Status:** CORRIGIDO
- **O que mudou:** Removidas aspas do `.env`
- **Tag correta:** `AMAZON_TAG=jota012d-20`
- **Arquivo:** `/root/affiliate-hub/.env` na VPS
- **Deploy:** ✅ Sim
- **Testado:** ✅ Confirmado (Next.js reiniciado)

---

## 📊 MÉTRICAS ATUAIS

### Taxa de Foto Lifestyle
| Período | Taxa |
|---------|------|
| **Antes** | 81% |
| **Meta** | 90%+ |
| **Atual** | ⏳ Medindo... |

**Próxima medição:** Após 24h (28/06/2026 às 21:20)

### Produtos Publicados
| Critério | Antes | Agora |
|----------|-------|-------|
| **< R$300** | ✅ Aceitos | ✅ Aceitos |
| **> R$300** | ❌ Bloqueados | ✅ Aceitos |
| **Sem lifestyle** | ❌ Bloqueados | ❌ Bloqueados |
| **Sem link afiliado** | ❌ Bloqueados | ❌ Bloqueados |

### Links de Afiliado
| Plataforma | Tag/ID | Status |
|------------|--------|--------|
| **Amazon** | jota012d-20 | ✅ OK |
| **Mercado Livre** | 57548960 (economizei) | ✅ OK |
| **Magalu** | jotashopindica | ✅ OK |
| **Shopee** | App ID: 18306580346 | ✅ OK |
| **AliExpress** | Template configurado | ✅ OK |
| **KaBuM** | Awin ID: 2934481 | ✅ OK |

---

## 🔄 FLUXO DO SISTEMA

### Scraping → Processamento → Publicação

```
1. BOT SCRAPER (a cada 15 min)
   └─> Busca Promobit/Pechinchou/Gatry
   └─> ✅ NOVO: Resolve links de agregadores
   └─> Envia para webhook (/api/webhook/products)

2. WEBHOOK NEXT.JS
   └─> Recebe produto
   └─> Gera links de afiliado
   └─> ✅ NOVO: Aplica tag=jota012d-20
   └─> Busca imagem de alta qualidade
   └─> Envia para IA (Gemini) para análise
   └─> Salva no banco (Prisma/PostgreSQL)

3. BOT TELEGRAM
   └─> ✅ NOVO: Aceita produtos > R$300
   └─> Filtra: precisa ter lifestyle + link afiliado
   └─> Publica no grupo (5 em 5 min)
   └─> Top 3 produtos por ciclo vão para fila
```

---

## 📝 LOGS IMPORTANTES

### Ver logs em tempo real:
```bash
# Scraper (resolução de links)
ssh root@212.85.10.239 "pm2 logs affiliate-scraper --lines 50"

# Webhook (processamento)
ssh root@212.85.10.239 "pm2 logs nextjs --lines 50"

# Bot Telegram (publicação)
ssh root@212.85.10.239 "pm2 logs affiliate-hub-listener --lines 50"
```

### Procurar por eventos específicos:
```bash
# Ver resolução de links funcionando
ssh root@212.85.10.239 "pm2 logs affiliate-scraper --nostream | grep 'Resolver'"

# Ver tags de afiliado sendo aplicadas
ssh root@212.85.10.239 "pm2 logs nextjs --nostream | grep 'tag='"

# Ver produtos sendo aceitos/rejeitados
ssh root@212.85.10.239 "pm2 logs affiliate-scraper --nostream | grep -E 'Candidato|ignorado'"
```

---

## ⏰ PRÓXIMAS VALIDAÇÕES

| Validação | Quando | Status |
|-----------|--------|--------|
| **Próximo ciclo de scraping** | Em ~15 min | ⏳ Aguardando |
| **Teste de link terceiro** | Agora (manual) | ⚠️ Fazer teste |
| **Produtos > R$300 no Telegram** | Após 6h | ⏳ Aguardando |
| **Taxa de lifestyle** | Após 24h | ⏳ Aguardando |
| **Comissões Amazon** | Após 24-48h | ⏳ Aguardando |

**Arquivo de checklist completo:** `CHECKLIST_VALIDACAO_24H.md`

---

## 🆘 COMANDOS RÁPIDOS DE EMERGÊNCIA

### Se algo parar de funcionar:

**Reiniciar tudo:**
```bash
ssh root@212.85.10.239 "pm2 restart ecosystem.config.js"
```

**Refazer build do Next.js:**
```bash
ssh root@212.85.10.239 "cd /root/affiliate-hub && npm run build && pm2 restart nextjs"
```

**Ver erros recentes:**
```bash
ssh root@212.85.10.239 "pm2 logs --err --lines 100 --nostream"
```

**Verificar se .env está OK:**
```bash
ssh root@212.85.10.239 "grep -E '(AMAZON|MERCADO|SHOPEE)' /root/affiliate-hub/.env"
```

**Refazer deploy completo (local):**
```powershell
# No Windows, na pasta do projeto:
.\ship.ps1
```

---

## 📚 DOCUMENTAÇÃO RELACIONADA

| Documento | Descrição |
|-----------|-----------|
| `RESUMO_FINAL_CORRECOES.md` | Todas as correções implementadas |
| `CHECKLIST_VALIDACAO_24H.md` | Checklist de validação detalhado |
| `CORRECAO_LINKS_TERCEIROS.md` | Análise de links de terceiros |
| `STATUS_IMAGENS.md` | Status das melhorias de imagens |
| `RESOLUCAO_LINKS_AGREGADORES.md` | Como funciona resolução de links |

---

## 🎯 OBJETIVOS CUMPRIDOS HOJE

- [✅] Remover filtro de preço < R$300
- [✅] Implementar resolução de links de agregadores
- [✅] Corrigir tag de afiliado Amazon
- [✅] Deploy completo via ship.ps1
- [✅] Todos os serviços online e funcionando
- [✅] Documentação completa criada

---

## 🚀 PRÓXIMOS PASSOS

1. ⏳ **AGORA:** Testar link de terceiro manualmente no Telegram
2. ⏳ **15 min:** Aguardar próximo ciclo de scraping e verificar logs
3. ⏳ **6h:** Confirmar que produtos > R$300 estão no Telegram
4. ⏳ **24h:** Medir taxa de lifestyle (meta: 90%+)
5. ⏳ **48h:** Verificar comissões da Amazon no painel

---

**STATUS GERAL:** 🟢 **SISTEMA 100% OPERACIONAL**

**Última revisão:** 27/06/2026 às 21:20  
**Próxima revisão:** 28/06/2026 às 21:20 (24h depois)

---

**TUDO PRONTO PARA VALIDAÇÃO!** ✅
