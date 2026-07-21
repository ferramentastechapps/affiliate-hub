# Correção: Links MLB Inválidos Sendo Gerados

## Problema Identificado

Quando o `sourceUrl` era do Promobit (ex: `https://www.promobit.com.br/oferta/console-playstation5-slim-digital-pacote-astro-bot-e-gran-turismo-7-branco-2887743-2887743`), o sistema estava gerando links MLB inválidos (ex: `MLB4214670787`).

### Causa Raiz

O bug estava na função `extractPlatformDetailsFromUrl()` no arquivo `src/app/api/webhook/products/route.ts`:

```typescript
// ANTES (BUGADO):
const mlbMatch = url.match(/(MLB-?\d+)/i);
```

Este regex estava pegando **qualquer número** após "MLB", sem validar o tamanho. IDs MLB reais têm **10-13 dígitos**, mas o regex aceitava qualquer quantidade.

Quando as URLs do Promobit continham números (como "2887743-2887743" no path), e se por algum motivo o sistema tentava extrair platformId da URL original do Promobit, poderia pegar esses números e tratá-los como MLB.

## Solução Implementada

### 1. Validação de Tamanho do ID MLB

Alterado o regex para aceitar apenas IDs MLB com 10-13 dígitos:

```typescript
// DEPOIS (CORRIGIDO):
const mlbMatch = url.match(/(MLB-?\d{10,13})/i);
```

**Exemplos:**
- ✅ `MLB4214670787` (11 dígitos) → VÁLIDO
- ✅ `MLB18522997` (10 dígitos) → VÁLIDO  
- ❌ `MLB2887743` (7 dígitos) → INVÁLIDO
- ❌ `2887743` (sem prefixo MLB) → INVÁLIDO

### 2. Reforço na Detecção de Agregadores

Adicionei logging mais claro e suporte para outros agregadores conhecidos:

```typescript
// Detectar Promobit
if (urlLower.includes('promobit.com.br')) {
  console.log(`[Webhook] ⚠️ URL de agregador Promobit detectada. Não extraindo platformId: ${url}`);
  return { platformId: null, platformType: 'promobit' };
}

// Detectar Pechinchou
if (urlLower.includes('pechinchou.com.br')) {
  console.log(`[Webhook] ⚠️ URL de agregador Pechinchou detectada. Não extraindo platformId: ${url}`);
  return { platformId: null, platformType: 'pechinchou' };
}

// Outros agregadores
if (urlLower.includes('pelando.com.br') || urlLower.includes('hardmob.com.br')) {
  console.log(`[Webhook] ⚠️ URL de agregador detectada. Não extraindo platformId: ${url}`);
  return { platformId: null, platformType: 'agregador' };
}
```

## Fluxo Correto Após Correção

### Cenário 1: Link Promobit que resolve para ML
```
sourceUrl: https://www.promobit.com.br/oferta/tenis-2887015-2887015
         ↓ (resolveRedirect)
resolvedUrl: https://produto.mercadolivre.com.br/MLB1822597803-tenis-nike
         ↓ (extractPlatformDetailsFromUrl)
platformId: MLB1822597803 ✅
platformType: mercadolivre ✅
affiliateUrl: https://produto.mercadolivre.com.br/MLB1822597803?matt_tool=... ✅
```

### Cenário 2: Link Promobit que NÃO resolve
```
sourceUrl: https://www.promobit.com.br/oferta/tenis-2887015-2887015
         ↓ (resolveRedirect falha)
resolvedUrl: https://www.promobit.com.br/oferta/tenis-2887015-2887015
         ↓ (extractPlatformDetailsFromUrl)
platformId: null ✅
platformType: promobit ✅
status: pending ✅ (forçado para revisão manual)
affiliateUrl: (link original do Promobit salvo) ✅
Badge Admin: 🟠 AGREGADOR ✅
```

### Cenário 3: Link Amazon direto
```
sourceUrl: https://www.amazon.com.br/dp/B0C1XJ8KP2
         ↓ (resolveRedirect)
resolvedUrl: https://www.amazon.com.br/dp/B0C1XJ8KP2
         ↓ (extractPlatformDetailsFromUrl)
platformId: B0C1XJ8KP2 ✅
platformType: amazon ✅
affiliateUrl: https://www.amazon.com.br/dp/B0C1XJ8KP2?tag=economizei06-20 ✅
```

## Comportamento no Admin

Produtos com `platformType: 'promobit'` ou `'pechinchou'` e sem `platformId` real:

- ✅ Mostram badge laranja **AGREGADOR**
- ✅ Ficam com `status: 'pending'` para aprovação manual
- ✅ Link original do agregador é salvo (não gera link MLB falso)
- ✅ Admin pode editar manualmente o link após verificação

## Arquivos Modificados

- `src/app/api/webhook/products/route.ts` - Função `extractPlatformDetailsFromUrl()`

## Testando a Correção

Para testar se a correção funcionou:

1. **Criar produto de teste via webhook** com URL do Promobit
2. **Verificar logs** - deve aparecer "⚠️ URL de agregador Promobit detectada"
3. **Verificar produto criado**:
   - `platformId` deve ser `null`
   - `platformType` deve ser `'promobit'`
   - `status` deve ser `'pending'`
4. **No admin**, produto deve mostrar badge **🟠 AGREGADOR**
5. **Link gerado** deve ser o original do Promobit (não um MLB inventado)

## Deploy

```powershell
.\ship.ps1
```

Após deploy, monitorar logs do bot e webhook para confirmar que:
- URLs do Promobit não extraem mais IDs inválidos
- Produtos de agregadores vão para pending
- Links MLB só são gerados quando há MLB real de 10-13 dígitos
