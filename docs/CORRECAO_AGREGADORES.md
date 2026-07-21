# Correção: Links de Agregadores (Promobit/Pechinchou)

## Problema Identificado

Quando o `resolveRedirect` não conseguia extrair o ID real da loja (MLB, ASIN, etc.) de links de agregadores (Promobit/Pechinchou), o sistema estava:

1. ❌ Usando o ID do agregador (ex: 2887015) como `platformId`
2. ❌ Gerando links ML incorretos com MLB inventado
3. ❌ Usuários clicavam e iam para produtos errados

### Exemplo Real
- **Samsung S25** no Promobit tinha ID `2887015`
- Sistema gerava link ML com `MLB2887015` (produto diferente!)
- Usuário clicava e via produto errado

---

## Solução Implementada

### 1. Detecção de URLs de Agregadores (`route.ts`)

```typescript
function extractPlatformDetailsFromUrl(url: string, platform: string) {
  // NOVA VALIDAÇÃO: Detectar URLs de agregadores
  if (urlLower.includes('promobit.com.br')) {
    return { platformId: null, platformType: 'promobit' };
  }
  
  if (urlLower.includes('pechinchou.com.br')) {
    return { platformId: null, platformType: 'pechinchou' };
  }
  
  // Continua para extrair IDs reais de lojas...
}
```

**Resultado:**
- URLs de agregadores não extraem platformId
- platformType é marcado como 'promobit' ou 'pechinchou'
- Sistema sabe que não tem ID real de loja

### 2. Forçar Status Pending para Agregadores

```typescript
// Se for agregador e não tem platformId real, forçar pending
const isAggregatorPlatform = finalPlatformType === 'promobit' || finalPlatformType === 'pechinchou';

if (isAggregatorPlatform && !finalPlatformId) {
  console.log(`[Webhook] ⚠️ Produto de agregador sem platformId real. Forçando status=pending`);
  finalStatus = 'pending';
}
```

**Resultado:**
- Produtos de agregadores sem ID real vão para aprovação manual
- Admin pode verificar e corrigir o link antes de publicar

### 3. Badge de Aviso no Admin (`ProductsTab.tsx`)

Adicionado badge visual laranja em 3 lugares:

#### Modo "Melhores pra Postar"
```tsx
{(product.platformType === 'promobit' || product.platformType === 'pechinchou') && (
  <span className="... bg-orange-950/50 text-orange-400 border-orange-800 ...">
    <Warning size={12} weight="fill" />
    AGREGADOR - Revisar Link
  </span>
)}
```

#### Modo Lista
```tsx
{(product.platformType === 'promobit' || product.platformType === 'pechinchou') && (
  <span className="... bg-orange-950/90 text-orange-400 ...">
    <Warning size={10} weight="fill" />
    AGREGADOR
  </span>
)}
```

#### Modo Grade (Grid)
```tsx
{(product.platformType === 'promobit' || product.platformType === 'pechinchou') && (
  <span className="... bg-orange-950/90 text-orange-400 ...">
    <Warning size={12} weight="fill" />
    AGREGADOR
  </span>
)}
```

---

## Fluxo Corrigido

### Cenário 1: Link ML Real Resolvido ✅
1. Scraper encontra link Promobit → `https://promobit.com.br/oferta/12345`
2. `resolveRedirect` extrai link real → `https://produto.mercadolivre.com.br/MLB18522997`
3. `extractPlatformDetailsFromUrl` extrai → `platformId: MLB18522997, platformType: mercadolivre`
4. Produto salvo com ID real → webhook gera link ML correto ✅

### Cenário 2: Link Agregador Não Resolvido (Corrigido) ✅
1. Scraper encontra link Promobit → `https://promobit.com.br/oferta/2887015`
2. `resolveRedirect` não consegue extrair link real → retorna URL do Promobit
3. `extractPlatformDetailsFromUrl` detecta agregador → `platformId: null, platformType: 'promobit'`
4. **NOVO:** Sistema força `status: pending` para aprovação manual
5. **NOVO:** Admin vê badge laranja "AGREGADOR - Revisar Link"
6. Admin pode editar o link manualmente antes de aprovar ✅

### Cenário 3: Link Amazon/Shopee de Agregador ✅
1. Scraper encontra link Promobit → `https://promobit.com.br/oferta/99999`
2. `resolveRedirect` extrai → `https://amzn.to/xyz123`
3. `resolveRedirect` resolve Amazon → `https://amazon.com.br/dp/B08ABC1234`
4. `extractPlatformDetailsFromUrl` extrai ASIN real → `platformId: B08ABC1234, platformType: amazon`
5. Produto salvo com ID real da Amazon → link afiliado correto ✅

---

## Verificação

### Como Confirmar a Correção

1. **Produto com ID Real (MLB/ASIN):**
   - ✅ platformId preenchido com ID real
   - ✅ platformType = 'mercadolivre', 'amazon', etc.
   - ✅ Sem badge de aviso
   - ✅ Status pode ser 'active' se aprovado pela IA

2. **Produto de Agregador Não Resolvido:**
   - ✅ platformId = null
   - ✅ platformType = 'promobit' ou 'pechinchou'
   - ✅ Badge laranja "AGREGADOR - Revisar Link" aparece no admin
   - ✅ Status = 'pending' para aprovação manual

### Testar Agora

Execute no VPS para confirmar:

```bash
# Disparar webhook com link do Promobit que não resolve
curl -X POST https://seu-site.com/api/webhook/products \
  -H "Content-Type: application/json" \
  -H "x-webhook-signature: sua-assinatura" \
  -d '{
    "name": "Samsung Galaxy S25 - Teste Agregador",
    "category": "Eletrônicos",
    "imageUrl": "https://exemplo.com/imagem.jpg",
    "links": {
      "mercadoLivre": "https://www.promobit.com.br/oferta/2887015/smartphone-samsung-galaxy-s25"
    }
  }'
```

**Resultado Esperado:**
- Produto criado com `platformType: 'promobit'`
- `platformId: null`
- `status: 'pending'`
- Badge laranja visível no admin

---

## Arquivos Modificados

1. ✅ `src/app/api/webhook/products/route.ts`
   - Validação de URLs de agregadores em `extractPlatformDetailsFromUrl`
   - Lógica para forçar status pending para agregadores sem ID real

2. ✅ `src/components/admin/ProductsTab.tsx`
   - Adicionado `platformType` e `platformId` ao tipo `Product`
   - Badge de aviso laranja para agregadores em todos os modos de visualização

---

## Benefícios

✅ **Previne Links Incorretos:** Não gera mais links ML com IDs inventados  
✅ **Visibilidade Clara:** Admin vê imediatamente produtos que precisam revisão  
✅ **Aprovação Manual:** Produtos de agregadores não resolvidos vão para pending  
✅ **Preserva Links Válidos:** Links que resolvem corretamente continuam funcionando  
✅ **Badge Visual:** Identificação rápida de produtos problemáticos

---

## Próximos Passos

1. ✅ Deploy das alterações
2. ✅ Testar com produto Samsung S25 (ID 2887015)
3. ✅ Confirmar que badge aparece no admin
4. ✅ Verificar que produto vai para pending
5. ✅ Confirmar que links reais continuam funcionando normalmente
