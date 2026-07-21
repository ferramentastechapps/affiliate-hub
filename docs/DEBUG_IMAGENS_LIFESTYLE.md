# 🔍 DEBUG: Imagens Lifestyle não chegando no Telegram

**Data:** 26/06/2026  
**Problema:** Fotos lifestyle detectadas pelo scraper não estão sendo usadas no Telegram

---

## ✅ LOGS DE DEBUG ADICIONADOS

### O que foi feito

Adicionei logs detalhados na API webhook para rastrear o `enhancedImageUrl`:

**Local:** `src/app/api/webhook/products/route.ts` (linhas 656-670 e 1189-1203)

**Logs adicionados:**
```typescript
// DEBUG: Log do enhancedImageUrl recebido do scraper
if (product.enhancedImageUrl) {
  console.log(`[Webhook AI] enhancedImageUrl JÁ VINHA DO SCRAPER: ${product.enhancedImageUrl}`);
} else {
  console.log(`[Webhook AI] enhancedImageUrl VAZIO - tentando buscar secundária...`);
}

// ... lógica de busca secundária ...

if (finalEnhancedImageUrl) {
  console.log(`[Webhook AI] USANDO enhancedImageUrl do scraper (PRIORIDADE): ${finalEnhancedImageUrl}`);
}
```

---

## 🎯 SITUAÇÃO ATUAL

### Scraper (Bot Python)

**Status:** ✅ Detectando fotos lifestyle corretamente

**Evidência nos logs:**
```
📸 [Pechinchou] Encontrada foto real/lifestyle (paralelo): 
https://assets.pechinchou.com.br/media/img/products/social/sabao-em-po-brilhante-limpeza-total-22kg_umdD2Za.jpg

📸 [Pechinchou] Encontrada foto real/lifestyle (paralelo): 
https://assets.pechinchou.com.br/media/img/products/social/Henrique_2025_2_6_C3eCtIH.jpg
```

**Código:** ✅ Enviando `enhancedImageUrl` na requisição para API

### API (Next.js)

**Status:** 🔄 Deploy concluído com logs de debug

**Commits:**
- f8defd6: "debug: adicionar logs para rastrear enhancedImageUrl"
- 50b2389: "fix: remover codigo duplicado"

**Build:** ✅ Sucesso em 32.6s
**PM2:** ✅ Nextjs reiniciado (pid 3368248)

---

## 📊 PRÓXIMOS PASSOS

### 1. Aguardar Próximo Ciclo do Bot

O bot roda a cada 15 minutos. No próximo ciclo, os logs do Next.js vão mostrar:

**SE o enhancedImageUrl estiver chegando:**
```
[Webhook AI] enhancedImageUrl JÁ VINHA DO SCRAPER: https://assets.pechinchou.com.br/XXX.jpg
[Webhook AI] USANDO enhancedImageUrl do scraper (PRIORIDADE): https://assets.pechinchou.com.br/XXX.jpg
```

**SE o enhancedImageUrl NÃO estiver chegando:**
```
[Webhook AI] enhancedImageUrl VAZIO - tentando buscar secundária...
[Scraper-Imagem] Imagem secundária encontrada: https://i.promobit.com.br/XXX.png
[Webhook AI] Encontrada imagem do varejista (fundo branco): /enhanced/XXX.jpg
```

### 2. Diagnóstico

**Cenário A:** Log mostra "JÁ VINHA DO SCRAPER"
- ✅ Bot está enviando corretamente
- ✅ API está recebendo corretamente
- ✅ Problema RESOLVIDO

**Cenário B:** Log mostra "VAZIO"
- ❌ Bot não está enviando **OU**
- ❌ API não está recebendo o campo
- 🔄 Próximo passo: Verificar requisição HTTP do bot

---

## 🔍 ANÁLISE TÉCNICA

### Fluxo Esperado

```
1. SCRAPER (bot/scrapers.py)
   └─> Detecta foto lifestyle do Pechinchou
   └─> Monta objeto com:
       {
         'imageUrl': 'https://i.promobit.com.br/XXX.png',  ← Agregador
         'enhancedImageUrl': 'https://assets.pechinchou.com.br/XXX.jpg'  ← Lifestyle
       }
   └─> POST /api/webhook/products

2. API (route.ts)
   └─> Recebe body.enhancedImageUrl
   └─> Cria produto no banco:
       enhancedImageUrl: body.enhancedImageUrl || null  (linha 505)
   └─> Processa IA
   └─> Verifica se product.enhancedImageUrl existe (linha 655)
       SE SIM: Usa ele (PRIORIDADE)
       SE NÃO: Busca secundária do Promobit

3. BOT (telegram_bot.py)
   └─> Busca produto do banco
   └─> Verifica produto.enhancedImageUrl (linha 523)
       SE SIM: usa enhancedImageUrl
       SE NÃO: usa imageUrl
```

### Onde pode estar falhando?

**Opção 1:** Bot não envia `enhancedImageUrl`
- Verificar: logs do bot mostram "Encontrada foto real" mas não envia?
- Fix: Confirmar que `enhanced_image_url` está sendo passado para a API

**Opção 2:** API não salva `enhancedImageUrl` no banco
- Verificar: Linha 505 está salvando? `enhancedImageUrl: body.enhancedImageUrl || null`
- Fix: Se for `null`, investigar por quê

**Opção 3:** API sobrescreve com imagem do Promobit
- Verificar: Logs mostrarão se está entrando no `if (!finalEnhancedImageUrl)`
- Fix: Já corrigido com priorização do scraper

---

## 📋 COMANDOS DE MONITORAMENTO

### Ver Logs do Next.js (próximo ciclo)
```bash
ssh root@212.85.10.239 "pm2 logs nextjs --lines 200" | grep -E "enhancedImageUrl|JÁ VINHA|VAZIO|USANDO"
```

### Ver Logs do Bot (fotos detectadas)
```bash
ssh root@212.85.10.239 "pm2 logs affiliate-scraper --lines 200" | grep -E "foto real|lifestyle|Encontrada foto"
```

### Verificar Produto no Banco (via API)
```bash
# Pegar ID de um produto recente
curl -H "x-api-key: SEU_API_KEY" https://economizei.ftech-apps.com.br/api/products/PRODUTO_ID
```

---

## ✅ STATUS ATUAL

### Deploy
- [x] ✅ Logs adicionados no código
- [x] ✅ Build do Next.js concluído
- [x] ✅ Next.js reiniciado
- [ ] ⏳ Aguardando próximo ciclo do bot (~15 min)

### Diagnóstico
- [ ] ⏳ Ver logs do Next.js com debug
- [ ] ⏳ Confirmar se enhancedImageUrl chega na API
- [ ] ⏳ Aplicar correção se necessário

---

**ETA para diagnóstico:** Próximo ciclo de scraping (00:00, 00:15, 00:30, 00:45)  
**Commit:** 50b2389  
**Status:** 🔄 **AGUARDANDO LOGS DO PRÓXIMO CICLO**
