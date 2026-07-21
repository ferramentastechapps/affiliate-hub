# Correção: Produtos do Gatry sem Foto e Sem Link

## Problema Identificado

Quando o bot raspava produtos do site **gatry.com**, os produtos eram publicados:
- ❌ **Sem foto** (apenas placeholder)
- ❌ **Sem link de afiliado válido** (link ainda apontava para o Gatry)
- ❌ **Sem platformId** (não conseguia deduplicar)
- ❌ Com source errado (`'promobyte'` ao invés de `'gatry'`)

### Exemplo do Problema

```
📦 Produto do Gatry
├─ Imagem: /placeholder.webp ❌
├─ Link: https://gatry.com/deal/12345 ❌ (agregador, não a loja)
├─ platformId: null ❌
├─ source: promobyte ❌
└─ Resultado: IA publica produto sem imagem e com link inválido
```

## Causa Raiz

O scraper em `bot/scrapers.py` na função `buscar_promocoes_gatry()` tinha **5 problemas**:

### 1. Imagem Hardcoded como Placeholder
```python
# ANTES (linha 721):
'imageUrl': '/placeholder.webp',  # ❌ SEMPRE placeholder
```

O código **nunca tentava** buscar a imagem real do card do HTML.

### 2. Link Não Era Resolvido
```python
# ANTES:
link = 'https://gatry.com/deal/12345'
links = self._criar_links(link, loja)  # ❌ Passa link do Gatry, não da loja
```

O Gatry é um **agregador** (como Promobit). Os links no HTML são da página do Gatry, não da loja real. O código não estava chamando `_resolver_url_intermediaria()` para seguir os redirecionamentos e obter o link real (Amazon, ML, etc).

### 3. platformId Extraído do Link Errado
```python
# ANTES:
platform_type, platform_id = self.extrair_platform_id(link)  # ❌ link = gatry.com
```

Como o link ainda era do Gatry, não conseguia extrair o ASIN (Amazon), MLB (Mercado Livre), etc.

### 4. Source Errado
```python
# ANTES (linha 726):
'source': 'promobyte',  # ❌ Deveria ser 'gatry'
```

### 5. Seletor de Link Muito Específico
```python
# ANTES:
link_elem = card.select_one('a[href*="/deal/"]')  # ❌ Pode não achar todos os links
```

## Solução Implementada

### 1. ✅ Buscar Imagem Real do HTML
```python
# DEPOIS:
img_elem = card.select_one('img[src], img[data-src]')
imagem_url = '/placeholder.webp'  # fallback
if img_elem:
    imagem_src = img_elem.get('src') or img_elem.get('data-src') or ''
    if imagem_src and not imagem_src.endswith('.svg') and 'placeholder' not in imagem_src.lower():
        # Garantir URL completa
        if imagem_src.startswith('//'):
            imagem_url = 'https:' + imagem_src
        elif imagem_src.startswith('/'):
            imagem_url = 'https://gatry.com' + imagem_src
        elif imagem_src.startswith('http'):
            imagem_url = imagem_src
        # Melhorar qualidade da imagem
        imagem_url = _melhorar_qualidade_imagem(imagem_url)
        print(f'  🖼️  [Gatry] Imagem encontrada: {imagem_url[:60]}...')
```

### 2. ✅ Resolver Link do Agregador
```python
# DEPOIS:
print(f'  🔗 [Gatry] Resolvendo link: {link[:60]}...')
link_resolvido = self._resolver_url_intermediaria(link)

# Usar o link resolvido ao invés do link do Gatry
links = self._criar_links(link_resolvido, loja)
```

Agora o scraper:
1. Pega o link do Gatry (ex: `https://gatry.com/deal/12345`)
2. Resolve redirecionamentos HTTP (HEAD/GET)
3. Obtém a URL real da loja (ex: `https://www.amazon.com.br/dp/B0C1XJ8KP2`)
4. Usa essa URL para gerar o link de afiliado

### 3. ✅ Extrair platformId da URL Real
```python
# DEPOIS:
platform_type, platform_id = self.extrair_platform_id(link_resolvido)
```

### 4. ✅ Source Correto
```python
# DEPOIS:
'source': 'gatry',  # ✅ Correto
```

### 5. ✅ Seletor de Link Mais Robusto
```python
# DEPOIS:
link_elem = card if card.name == 'a' else card.select_one('a[href*="/deal/"], a')
```

Agora aceita qualquer `<a>`, não apenas os com `/deal/` no href.

## Fluxo Correto Após Correção

```
1. Scraper busca HTML do Gatry
   ↓
2. Para cada card:
   ├─ Extrai imagem do <img> ✅
   ├─ Extrai link do <a>
   ├─ Resolve redirecionamento: gatry.com → amazon.com.br ✅
   ├─ Extrai platformId (ASIN/MLB) da URL real ✅
   ├─ Gera links de afiliado com URL real ✅
   └─ Define source: 'gatry' ✅
   ↓
3. Webhook recebe produto com:
   ├─ imageUrl: URL real da imagem do produto ✅
   ├─ links: URLs das lojas reais (não do Gatry) ✅
   ├─ platformId: ID real do produto (ASIN, MLB, etc) ✅
   └─ source: 'gatry' ✅
   ↓
4. IA processa e publica no Telegram:
   ├─ COM foto ✅
   ├─ COM link de afiliado válido ✅
   └─ Pode deduplicar por platformId ✅
```

## Exemplo de Resultado

### ANTES (❌):
```json
{
  "name": "Console PlayStation 5 Slim",
  "imageUrl": "/placeholder.webp",
  "links": {
    "amazon": "https://gatry.com/deal/12345"
  },
  "platformId": null,
  "platformType": null,
  "source": "promobyte"
}
```
**Resultado**: IA posta no Telegram sem imagem e com link quebrado

### DEPOIS (✅):
```json
{
  "name": "Console PlayStation 5 Slim",
  "imageUrl": "https://m.media-amazon.com/images/I/51vDHh...",
  "links": {
    "amazon": "https://www.amazon.com.br/dp/B0C1XJ8KP2"
  },
  "platformId": "B0C1XJ8KP2",
  "platformType": "amazon",
  "source": "gatry"
}
```
**Resultado**: IA posta no Telegram com imagem bonita e link de afiliado funcional

## Logs de Diagnóstico

Com as correções, o scraper agora mostra logs claros:

```
🔥 Buscando promoções no Gatry...
   📡 Status: 200
   📦 Encontrados 15 cards
  🔗 [Gatry] Resolvendo link: https://gatry.com/deal/12345...
  [Scraper] Resolvendo redirecionamento (HEAD) para: https://gatry.com/deal/12345
  [Scraper] URL resolvida: https://gatry.com/deal/12345 -> https://www.amazon.com.br/dp/B0C1XJ8KP2
  🖼️  [Gatry] Imagem encontrada: https://m.media-amazon.com/images/I/51vDHh...
  [PLATFORM_ID] URL: https://www.amazon.com.br/dp/B0C1XJ8KP2 → ID: B0C1XJ8KP2
  ✅ [Gatry] Console PlayStation 5 Slim... (loja: Amazon, platformId: B0C1XJ8KP2)
```

## Arquivos Modificados

- `bot/scrapers.py` - Função `buscar_promocoes_gatry()`

## Testando a Correção

1. **Executar o scraper**:
   ```bash
   cd bot
   python main.py --once
   ```

2. **Verificar os logs**:
   - Deve aparecer "🔗 [Gatry] Resolvendo link:"
   - Deve aparecer "🖼️ [Gatry] Imagem encontrada:"
   - Deve aparecer "platformId: XXXXX" (não null)

3. **Verificar produto criado no admin**:
   - Deve ter imagem real (não placeholder)
   - Link deve ser da loja (Amazon, ML), não do Gatry
   - Deve ter platformId válido
   - Source deve ser "gatry"

4. **Verificar Telegram**:
   - Mensagem deve ter foto
   - Link deve funcionar e levar para a loja

## Deploy

Para aplicar as correções na VPS:

```bash
# Na VPS
cd affiliate-hub/bot
git pull
sudo systemctl restart affiliate-bot
sudo systemctl status affiliate-bot
```

Ou usar o script de deploy:
```powershell
.\ship.ps1
```

## Notas Adicionais

- A função `_resolver_url_intermediaria()` já suportava `gatry.com` na lista de domínios a resolver
- A função `_melhorar_qualidade_imagem()` tenta obter versões de alta qualidade das imagens
- O código agora valida se a imagem não é SVG ou placeholder antes de usar
- Logs detalhados facilitam debug de problemas futuros
