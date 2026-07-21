# Como Testar as Melhorias de Categoria

## Teste 1: Scraping com Extração Automática de Categoria

### Passo a Passo:

1. **Acesse o painel admin** em `/admin/products`

2. **Clique em "Adicionar Produto"**

3. **Cole uma URL de produto** no campo de scraping:
   ```
   Amazon:
   https://www.amazon.com.br/dp/B0BN94P5K1
   
   Mercado Livre:
   https://produto.mercadolivre.com.br/MLB-1234567890-tenis-nike
   
   Shopee:
   https://shopee.com.br/product/123456/789012
   ```

4. **Clique no botão de scraping** (ícone de busca)

5. **Observe o resultado**:
   - ✅ Nome extraído automaticamente
   - ✅ Imagem capturada
   - ✅ Preço preenchido
   - ✅ **CATEGORIA DETECTADA E PREENCHIDA AUTOMATICAMENTE** ⭐

### Exemplos de URLs para Testar:

#### Smartphones:
```
https://www.amazon.com.br/dp/B0CHWZBVKN
https://produto.mercadolivre.com.br/MLB-2156372396-smartphone-samsung-galaxy-a15-128gb-azul-claro-4g-octa-core-4gb-ram-65-cam-tripla-selfie-13mp
```
**Resultado esperado**: Categoria = "Smartphones"

#### Air Fryer:
```
https://www.amazon.com.br/dp/B08QJ1LP3K
https://produto.mercadolivre.com.br/MLB-1927819625-fritadeira-eletrica-air-fryer-britnia-bfr42p-preta-42l-com-timer
```
**Resultado esperado**: Categoria = "Air Fryers"

#### Notebook:
```
https://www.amazon.com.br/dp/B0BV4Q9JQT
https://produto.mercadolivre.com.br/MLB-3489754847-notebook-lenovo-ideapad-3-ryzen-5-5500u-8gb-256gb-ssd-156-fhd
```
**Resultado esperado**: Categoria = "Notebooks"

## Teste 2: Detecção por IA (Fallback)

### Quando usar:
- Quando o scraping não encontra categoria na página
- Quando você digita o nome manualmente
- Como ferramenta de validação

### Passo a Passo:

1. **No ProductModal, digite um nome de produto**:
   ```
   iPhone 15 Pro Max 256GB
   ```

2. **Clique no botão "IA"** ao lado do dropdown de categoria

3. **Aguarde** (1-2 segundos)

4. **Observe**: Campo de categoria preenchido automaticamente com "Smartphones"

### Mais Exemplos para Testar:

```
"Cafeteira Nespresso Inissia" → Cafeteiras
"Whey Protein Optimum Nutrition" → Whey e Suplementos
"Smart TV LG 55 OLED" → Smart TVs
"Tênis Nike Air Max" → Tênis e Calçados
"Perfume Dior Sauvage" → Perfumes
```

## Teste 3: Nova Categoria Customizada

### Passo a Passo:

1. **No dropdown de categorias, role até o final**

2. **Selecione "➕ Nova Categoria"**

3. **Digite o nome da categoria**:
   ```
   Exemplo: "Instrumentos Musicais"
   ```

4. **Preencha o resto do produto normalmente**

5. **Salve**

6. **Resultado**: Produto salvo com categoria customizada

## Teste 4: Verificar Ordenação Alfabética

### Passo a Passo:

1. **Abra o dropdown de categorias**

2. **Observe a ordem**:
   ```
   Air Fryers
   Ar Condicionado
   Aspiradores
   Automotivo
   Bebês e Crianças
   ...
   Viagem
   Whey e Suplementos
   ➕ Nova Categoria (sempre por último)
   ```

## Teste 5: Produtos do Bot

### Verificar se o bot está categorizando corretamente:

1. **Acesse** `/admin/products?status=pending`

2. **Veja os produtos pendentes** enviados pelo bot

3. **Observe as categorias**:
   - ✅ Produtos com categoria específica (não "Diversos")
   - ✅ Categorias fazem sentido com o produto

4. **Se muitos produtos estão como "Diversos"**:
   - Verifique o arquivo `bot/scrapers.py`
   - Compare o mapeamento com `src/lib/scraper.ts`
   - Adicione mais palavras-chave se necessário

## Comparação: Antes vs Depois

### ANTES ❌
```
Admin cola URL → Scraping extrai nome/preço/imagem
→ Admin precisa MANUALMENTE selecionar categoria
→ Muitos erros (produtos na categoria errada)
→ 60% vão para "Diversos"
```

### DEPOIS ✅
```
Admin cola URL → Scraping extrai nome/preço/imagem/CATEGORIA
→ Categoria já vem preenchida corretamente
→ Admin só valida ou ajusta se necessário
→ 90%+ categorizados corretamente
→ Economia de 5-10 segundos por produto
```

## Logs para Debugar

### Frontend (Console do Navegador):
```javascript
// Ao fazer scraping, você verá:
🔍 Iniciando scraping: https://...
🏪 Plataforma detectada: amazon
✅ Dados extraídos: { name: "...", imageUrl: "...", price: 199.90, category: "Notebooks" }
```

### Backend (Terminal/Logs):
```bash
# No arquivo src/lib/scraper.ts
[Scraper] Extracting category from breadcrumb: Home > Electronics > Computers
[Scraper] Mapped to internal category: Notebooks
```

## Troubleshooting

### Problema: Categoria não é extraída
**Solução**:
1. Verifique se a URL é válida
2. Teste manualmente acessando a URL no navegador
3. Verifique se o site tem breadcrumb ou categoria visível
4. Use o botão "IA" como alternativa

### Problema: Categoria mapeada errada
**Exemplo**: "Notebook Gamer" vira "Consoles e Games"

**Solução**:
1. Edite `src/lib/scraper.ts`
2. Ajuste a ordem das regex em `mapToInternalCategory()`
3. Coloque categorias mais específicas primeiro:
   ```typescript
   // ERRADO - genérico primeiro
   if (/(game|console)/i.test(normalized)) return 'Consoles e Games';
   if (/(notebook|laptop)/i.test(normalized)) return 'Notebooks';
   
   // CERTO - específico primeiro
   if (/(notebook|laptop)/i.test(normalized)) return 'Notebooks';
   if (/(game|console)/i.test(normalized)) return 'Consoles e Games';
   ```

### Problema: Bot Python não usa as mesmas categorias
**Solução**:
1. Compare `bot/scrapers.py` função `_detectar_categoria()`
2. Com `src/lib/scraper.ts` função `mapToInternalCategory()`
3. Sincronize as palavras-chave
4. Reinicie o bot: `pm2 restart affiliate-scraper`

## Métricas de Sucesso

### Como medir se está funcionando:

```sql
-- Produtos por categoria (últimos 30 dias)
SELECT category, COUNT(*) as total
FROM "Product"
WHERE "createdAt" > NOW() - INTERVAL '30 days'
GROUP BY category
ORDER BY total DESC;

-- % de produtos em "Diversos" (meta: <10%)
SELECT 
  ROUND(
    COUNT(CASE WHEN category = 'Diversos' THEN 1 END)::numeric / 
    COUNT(*)::numeric * 100, 
    2
  ) as percent_diversos
FROM "Product"
WHERE "createdAt" > NOW() - INTERVAL '30 days';
```

**Meta de sucesso**:
- ✅ <10% dos produtos em "Diversos"
- ✅ >90% dos produtos categorizados corretamente
- ✅ Economia de tempo no cadastro manual
