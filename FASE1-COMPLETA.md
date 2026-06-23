# ✅ FASE 1 CONCLUÍDA - IDs ÚNICOS POR PLATAFORMA

## 📋 O QUE FOI IMPLEMENTADO

### 1. **Schema do Banco de Dados Atualizado**
- ✅ Adicionados campos `platformId` e `platformType` em `Product`
- ✅ Criado índice único composto `@@unique([platformId, platformType])`
- ✅ Produtos com mesmo ID da plataforma não podem duplicar

### 2. **Scrapers Python Atualizados**
- ✅ Função `extrair_platform_id()` melhorada com suporte para:
  - Amazon (ASIN)
  - Mercado Livre (MLB123456)
  - Shopee (shopId-productId)
  - Magalu (productId)
  - KaBuM (productId)
  - Netshoes (productId)
  - AliExpress (productId)
  - TikTok Shop (productId)
- ✅ Todos os produtos agora incluem `platformType` e `platformId`
- ✅ Campo `source` diferencia origem (`promobit`, `promobyte`, `mercadolivre_api`)

### 3. **API Webhook com Deduplicação Inteligente**
- ✅ **Prioridade 1**: Busca por `platformId + platformType` (mais preciso)
- ✅ **Prioridade 2**: Busca por `externalId + source` (compatibilidade)
- ✅ **Prioridade 3**: Busca por nome nos últimos 7 dias (ativos/aprovados)
- ✅ **Prioridade 4**: Busca por nome nas últimas 24h (pendentes)

### 4. **Atualização Automática de Preços**
- ✅ Quando produto duplicado é detectado via `platformId`:
  - Atualiza `price` e `originalPrice` se mudaram
  - Cria registro em `PriceHistory`
  - Respeita `isFixed=true` (não sobrescreve imagem/links)
  - Retorna status 200 com mensagem "Preço atualizado"
  - Dispara alertas configurados pelo usuário

### 5. **Script de Backfill**
- ✅ Script `scripts/backfill-platform-ids.ts` criado
- ✅ Extrai `platformId` e `platformType` de produtos existentes
- ✅ Evita conflitos (não atualiza se encontrar duplicata)
- ✅ Suporte para ProductLinks e Links legados

## 🚀 COMO APLICAR AS MUDANÇAS

### Passo 1: Atualizar o Banco de Dados
```bash
# Na VPS ou local (onde o banco PostgreSQL está)
cd /path/to/affiliate-hub
npx prisma db push
```

### Passo 2: Executar Backfill (Opcional mas Recomendado)
```bash
# Popula platformId/platformType em produtos existentes
npm run tsx scripts/backfill-platform-ids.ts
```

### Passo 3: Reiniciar o Bot Python
```bash
cd bot
# Parar processo existente
pkill -f main.py

# Iniciar novamente
nohup python3 main.py > bot.log 2>&1 &
```

### Passo 4: Rebuild e Reiniciar Next.js (se necessário)
```bash
npm run build
pm2 restart affiliate-hub
```

## 📊 BENEFÍCIOS IMEDIATOS

### ✅ Zero Duplicatas de Produtos Reais
- Mesmo produto do Mercado Livre não entra 2x (mesmo vindo de fontes diferentes)
- Amazon ASIN garante produto único
- Shopee usa combinação shopId-productId

### ✅ Histórico de Preços Automático
- Quando scraper encontra produto existente, apenas atualiza preço
- Histórico cresce automaticamente
- Base para Fase 2 (monitoramento de quedas)

### ✅ Rastreamento Cross-Platform
- Mesmo produto em plataformas diferentes é distinguível
- iPhone 15 na Amazon ≠ iPhone 15 no ML (diferentes platformId)

### ✅ Compatibilidade Total
- Sistema antigo continua funcionando (externalId + source)
- Produtos sem platformId usam fallback de nome
- Migração gradual sem quebrar nada

## 🔍 EXEMPLOS DE DEDUPLICAÇÃO

### Exemplo 1: Produto do Mercado Livre
```json
{
  "name": "iPhone 15 Pro 256GB",
  "platformType": "mercadolivre",
  "platformId": "MLB123456789",
  "source": "promobit"
}
```
**Resultado**: Se outro scraper (promobyte, pechinchou) enviar o mesmo `MLB123456789`, o webhook:
1. Encontra o produto existente
2. Atualiza apenas o preço
3. Cria registro em PriceHistory
4. Retorna 200 (não cria duplicata)

### Exemplo 2: Produto da Amazon
```json
{
  "name": "Echo Dot 5ª Geração",
  "platformType": "amazon",
  "platformId": "B09B8V1LZ3",
  "source": "promobyte"
}
```
**Resultado**: ASIN `B09B8V1LZ3` é único. Qualquer fonte que enviar o mesmo ASIN atualiza o existente.

### Exemplo 3: Produto sem Platform ID
```json
{
  "name": "Liquidificador Turbo 1000W",
  "platformType": null,
  "platformId": null,
  "source": "gatry"
}
```
**Resultado**: Usa deduplicação por nome (24h para pending, 7d para active).

## 📁 ARQUIVOS MODIFICADOS

```
✅ prisma/schema.prisma (novos campos + índice único)
✅ bot/scrapers.py (extrair_platform_id + todos produtos.append)
✅ bot/scraper_ml.py (_item_para_produto + platformId)
✅ src/app/api/webhook/products/route.ts (deduplicação inteligente)
✅ scripts/backfill-platform-ids.ts (NOVO - popular dados existentes)
```

## 🐛 TROUBLESHOOTING

### Erro: "Unique constraint failed"
- **Causa**: Tentou criar produto com `platformId+platformType` que já existe
- **Solução**: Já está tratado! O webhook retorna 200 e atualiza preço

### Backfill encontra muitas duplicatas
- **Normal**: Significa que o sistema antigo tinha duplicatas
- **Ação**: Revisar produtos duplicados e manter o melhor (maior score, mais completo)

### Produtos novos não têm platformId
- **Causa**: URL não é reconhecida pela regex
- **Solução**: Adicionar novo padrão em `extrair_platform_id()` no scrapers.py

## ➡️ PRÓXIMOS PASSOS (FASE 2)

Com a Fase 1 concluída, temos a fundação para:
- ✅ Monitoramento automático de preços (já funciona parcialmente)
- ✅ Identificação de quedas de preço
- ✅ Alertas inteligentes
- ✅ Filtro "Produtos com preço em queda" no admin

**A Fase 2 vai adicionar**:
- API endpoint `/api/products?filter=price-drops`
- Badge "▼ X% vs máximo" no admin
- Publicação automática no Telegram para quedas > 15%
- Fila de prioridade alta para produtos com queda de preço

## 📝 NOTAS IMPORTANTES

1. **Índice único permite `null`**: Produtos sem `platformId` podem coexistir (não violam constraint)
2. **Retrocompatibilidade**: Sistema antigo (`externalId + source`) continua funcionando
3. **Migração gradual**: Produtos novos já vêm com `platformId`, antigos podem ser populados via backfill
4. **Performance**: Índice único `[platformId, platformType]` torna busca instantânea

---

**Status**: ✅ FASE 1 COMPLETA E PRONTA PARA PRODUÇÃO

**Próxima Fase**: FASE 2 - MONITORAMENTO DE QUEDAS DE PREÇO
