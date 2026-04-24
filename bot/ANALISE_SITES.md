# 🔍 Análise Detalhada dos Sites de Promoções

## 🎯 Objetivo
Identificar por que Promobyte e Pelando não estão retornando produtos.

## 📊 Sites Analisados

### 1. ✅ Promobit (FUNCIONANDO)
**URL:** https://www.promobit.com.br/

**Método de scraping:**
- Busca tag `<script id="__NEXT_DATA__">` no HTML
- Extrai JSON com todas as ofertas
- Caminho: `props.pageProps.serverOffers.offers[]`

**Por que funciona:**
- ✅ JSON estruturado e estável
- ✅ Não requer parsing complexo de HTML
- ✅ Menos propenso a mudanças

**Exemplo de estrutura:**
```json
{
  "offerId": "123456",
  "offerTitle": "Teclado Mecânico...",
  "offerPrice": 149.90,
  "storeName": "Amazon",
  "offerPhoto": "/path/to/image.jpg"
}
```

---

### 2. ❌ Promobyte (PROVAVELMENTE COM PROBLEMAS)
**URLs testadas:**
- https://promobyte.site/promocoes-do-dia
- https://promobyte.site/lojas/amazon
- https://promobyte.site/lojas/mercadolivre

**Método de scraping atual:**
- Busca links com padrão `a[href*="/p/"]`
- Extrai texto e preços via regex

**Possíveis problemas:**

#### A) Seletor CSS desatualizado
O site pode ter mudado a estrutura:
- Antes: `<a href="/p/produto-123">...</a>`
- Agora: `<a href="/oferta/produto-123">...</a>` ou outro padrão

#### B) Proteção anti-bot
- Cloudflare ou similar bloqueando requisições
- Retorna 403 Forbidden ou 503 Service Unavailable
- Requer JavaScript para carregar conteúdo

#### C) Site fora do ar
- Domínio pode ter mudado
- Servidor temporariamente indisponível

**Como verificar:**
1. Abrir https://promobyte.site/promocoes-do-dia no navegador
2. Inspecionar elemento (F12)
3. Procurar por links de produtos
4. Ver qual é o padrão atual (href="/p/" ou outro?)

**Solução se for seletor desatualizado:**
```python
# Testar novos seletores
cards = soup.select('a[href*="/oferta/"]')  # ou
cards = soup.select('div.produto-card a')  # ou
cards = soup.select('[data-product-id]')   # etc
```

---

### 3. ❌ Pelando (PROVAVELMENTE COM PROBLEMAS)
**URL:** https://www.pelando.com.br

**Método de scraping atual:**
- Busca links com padrão `a[href*="/d/"]`
- Extrai texto e preços via regex

**Possíveis problemas:**

#### A) Seletor CSS desatualizado
Similar ao Promobyte, o padrão pode ter mudado:
- Antes: `<a href="/d/produto-slug-HASH">...</a>`
- Agora: Outro padrão

#### B) Proteção anti-bot FORTE
Pelando é conhecido por ter proteção anti-scraping:
- Cloudflare Turnstile (captcha invisível)
- Rate limiting agressivo
- Fingerprinting de navegador

#### C) Conteúdo carregado via JavaScript
- HTML inicial pode estar vazio
- Produtos carregados via AJAX/fetch
- Requer navegador real (Selenium/Playwright)

**Como verificar:**
1. Abrir https://www.pelando.com.br no navegador
2. Desabilitar JavaScript (F12 > Settings > Disable JavaScript)
3. Recarregar página
4. Se produtos não aparecerem = precisa de JavaScript

**Solução se for JavaScript:**
```python
# Usar Selenium
from selenium import webdriver
driver = webdriver.Chrome()
driver.get('https://www.pelando.com.br')
html = driver.page_source
# Agora fazer parsing do HTML completo
```

---

## 🛠️ Plano de Ação

### Fase 1: Diagnóstico (AGORA)
1. ✅ Adicionar logs detalhados (já feito)
2. ⏳ Rodar `diagnostico_completo.py` na VPS
3. ⏳ Verificar status HTTP e quantidade de cards encontrados

### Fase 2: Correção Rápida
Se o problema for **seletor CSS desatualizado**:
1. Inspecionar HTML atual dos sites
2. Atualizar seletores em `scrapers.py`
3. Testar novamente

### Fase 3: Solução Robusta
Se o problema for **proteção anti-bot**:

#### Opção A: Selenium/Playwright (mais confiável)
```python
from playwright.sync_api import sync_playwright

def buscar_com_playwright(url):
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(url)
        page.wait_for_selector('a[href*="/p/"]')
        html = page.content()
        browser.close()
        return html
```

**Prós:**
- ✅ Executa JavaScript
- ✅ Passa por proteções anti-bot
- ✅ Simula navegador real

**Contras:**
- ❌ Mais lento (2-5 segundos por página)
- ❌ Consome mais recursos (RAM, CPU)
- ❌ Requer instalação de navegador

#### Opção B: Proxies rotativos
```python
proxies = {
    'http': 'http://proxy1.com:8080',
    'https': 'http://proxy1.com:8080',
}
response = requests.get(url, proxies=proxies)
```

#### Opção C: Headers mais realistas
```python
headers = {
    'User-Agent': '...',
    'Accept': 'text/html,application/xhtml+xml,...',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Referer': 'https://www.google.com/',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
}
```

### Fase 4: Fontes Alternativas
Adicionar novos sites que funcionam bem:

1. **Hardmob** (https://www.hardmob.com.br/forums/407-Promocoes)
2. **Zoom** (https://www.zoom.com.br/ofertas)
3. **Buscapé** (https://www.buscape.com.br/ofertas)
4. **Gatry** (https://gatry.com/)
5. **Cuponomia** (https://www.cuponomia.com.br/)

---

## 📝 Comandos para Rodar na VPS

```bash
# 1. Conectar na VPS
ssh root@SEU_IP

# 2. Ir para pasta do bot
cd /root/affiliate-hub/bot

# 3. Rodar diagnóstico
chmod +x RODAR_DIAGNOSTICO.sh
./RODAR_DIAGNOSTICO.sh

# 4. Ver resultado
# O script mostrará:
# - Status HTTP de cada site
# - Quantos cards foram encontrados
# - Primeiros links encontrados (para debug)
```

---

## 🎯 Resultado Esperado

Após rodar o diagnóstico, você verá algo como:

```
🔥 TESTANDO: PROMOBYTE
📡 URL: https://promobyte.site/promocoes-do-dia
   Status Code: 403  ← BLOQUEADO!
   
OU

📡 URL: https://promobyte.site/promocoes-do-dia
   Status Code: 200
   📦 Cards com /p/: 0  ← SELETOR ERRADO!
   🔍 Primeiros 5 links encontrados:
      1. /oferta/produto-123  ← NOVO PADRÃO!
```

Com essa informação, saberemos exatamente qual é o problema e como corrigir.
