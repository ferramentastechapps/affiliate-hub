# 🔧 Correção FINAL - Agregadores

## ❌ Problema Encontrado Após Deploy

Você testou e o produto **Tênis Asics** ainda foi criado incorretamente:
- ❌ platformId = "2887188" (ID do Promobit, não MLB)
- ❌ Link ML gerado: `MLB6551509188` (produto errado!)
- ✅ Badge laranja apareceu (mas produto ficou ativo mesmo assim)

## 🔍 Causa Raiz

O **scraper Python** está enviando `platformId` e `platformType` no webhook:

```json
{
  "name": "Tênis Asics...",
  "platformId": "2887188",  // ❌ ID do Promobit enviado pelo scraper
  "platformType": "promobit",
  "links": {
    "mercadoLivre": "https://www.promobit.com.br/oferta/..."
  }
}
```

O código estava aceitando esses valores **diretamente** do scraper:

```typescript
// ❌ PROBLEMA: Aceitava o que o scraper enviou
let finalPlatformId = platformId;  // body.platformId
let finalPlatformType = platformType;  // body.platformType

if (!finalPlatformId || !finalPlatformType) {
  // só extraía se não foi fornecido
}
```

**Resultado:** Como o scraper já enviou, a extração era pulada!

---

## ✅ Correção Aplicada

### Mudança Principal

**SEMPRE** extrair `platformId` e `platformType` das URLs, **IGNORANDO** o que o scraper enviou:

```typescript
// ✅ CORRIGIDO: Ignora o que o scraper enviou
let finalPlatformId = null;  // Sempre começa null
let finalPlatformType = null;  // Sempre começa null

// Extrai das URLs resolvidas SEMPRE
for (const p of platforms) {
  const urlToParse = resolvedUrls?.[p];
  if (urlToParse) {
    const extracted = extractPlatformDetailsFromUrl(urlToParse, p);
    
    // Se é agregador, detecta mas não pega o ID
    if (extracted.platformType && !extracted.platformId) {
      finalPlatformType = extracted.platformType;  // 'promobit'
      // finalPlatformId permanece null ✅
      break;
    }
    
    // Se é loja real, pega ID e tipo
    if (extracted.platformId && extracted.platformType) {
      finalPlatformId = extracted.platformId;  // 'MLB123...'
      finalPlatformType = extracted.platformType;  // 'mercadolivre'
      break;
    }
  }
}
```

### Logs Adicionados

```typescript
// Novo log quando detecta agregador
console.log(`[Webhook] [AGGREGATOR_DETECTED] Agregador detectado: ${url} -> platformType: ${finalPlatformType}, platformId: null`);
```

---

## 🧪 Como Testar Agora

### 1. Faça o Deploy

```powershell
# No PowerShell local
.\ship.ps1
```

### 2. Execute o Teste na VPS

```bash
ssh root@212.85.10.239
cd ~/affiliate-hub
./testar-correcao-agregadores.sh
```

**Resultado Esperado:**
```
✅ TESTE PASSOU! Correção funcionando:
   ✅ platformType = "promobit" (detectado corretamente)
   ✅ platformId = null (não usou ID do agregador)
   ✅ status = "pending" (forçado para aprovação manual)
```

### 3. Teste Manual no Admin

1. Adicione um produto com link Promobit
2. Verifique:
   - ✅ Badge laranja "AGREGADOR"
   - ✅ Status "Pendente"
   - ✅ platformId não preenchido (ou null)

---

## 📊 Comparação

### ❌ ANTES (ERRADO):

```json
{
  "name": "Tênis Asics...",
  "platformId": "2887188",      // ❌ ID do Promobit
  "platformType": "promobit",   // ✅ Tipo correto
  "status": "active",           // ❌ Ativo (não deveria)
  "generatedAffiliateUrl": "https://produto.mercadolivre.com.br/MLB6551509188"  // ❌ MLB errado!
}
```

**Problemas:**
- Link ML com produto errado
- Usuário clica e vê produto diferente
- Badge aparece mas produto fica ativo

---

### ✅ DEPOIS (CORRETO):

```json
{
  "name": "Tênis Asics...",
  "platformId": null,           // ✅ Null (não tem ID real)
  "platformType": "promobit",   // ✅ Tipo correto
  "status": "pending",          // ✅ Pending para revisão
  "sourceUrl": "https://www.promobit.com.br/oferta/..."  // ✅ Link original preservado
}
```

**Benefícios:**
- Não gera link ML inventado
- Badge laranja aparece
- Status pending para admin revisar
- Admin pode corrigir link manualmente

---

## 🔄 Arquivos Modificados

**`src/app/api/webhook/products/route.ts`**

1. ✅ Ignora `platformId` e `platformType` do body do webhook
2. ✅ Sempre extrai das URLs resolvidas
3. ✅ Detecta agregadores e deixa platformId como null
4. ✅ Adiciona logs detalhados de agregadores

---

## 🎯 Checklist Final

Antes de testar:
- [ ] Executar `.\ship.ps1` para fazer deploy
- [ ] Aguardar PM2 reiniciar (~1 minuto)

Ao testar:
- [ ] Script de teste passa (platformId = null)
- [ ] Badge laranja aparece no admin
- [ ] Status = pending (não active)
- [ ] Link ML **NÃO** é gerado

Se tudo passar:
- [ ] ✅ Correção 100% funcional!
- [ ] Apagar produtos antigos
- [ ] Novos produtos funcionarão corretamente

---

## 💡 Explicação Simples

**O que mudou:**

**ANTES:** Confiava no scraper → Scraper enviava ID errado → Salvava ID errado

**DEPOIS:** Ignora o scraper → Analisa as URLs sempre → Detecta agregador → Deixa platformId null

**Por quê:** O scraper Python extrai IDs das URLs do Promobit, mas esses IDs não são de produtos reais (são IDs internos do Promobit). A única forma de ter o ID real é quando o link é resolvido para a loja final (ML, Amazon, etc).

---

Pronto para fazer o deploy e testar! 🚀
