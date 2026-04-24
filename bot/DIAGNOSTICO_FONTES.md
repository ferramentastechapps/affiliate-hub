# 🔍 Diagnóstico: Por que só aparecem produtos do Promobit?

## 📊 Problema Identificado

Você está vendo **apenas produtos do Promobit** no seu site, mesmo que o código busque em 3 fontes:
- ✅ **Promobit** (funcionando)
- ❌ **Promobyte** (provavelmente falhando silenciosamente)
- ❌ **Pelando** (provavelmente falhando silenciosamente)

## 🔎 Possíveis Causas

### 1. **Bloqueio Anti-Bot** (mais provável)
Sites como Promobyte e Pelando podem estar:
- Detectando que é um bot (User-Agent, padrão de requisições)
- Retornando erro 403 (Forbidden) ou 429 (Too Many Requests)
- Retornando HTML vazio ou com estrutura diferente

### 2. **Mudança na Estrutura HTML**
Os seletores CSS podem estar desatualizados:
- Promobyte: `a[href*="/p/"]` pode não existir mais
- Pelando: `a[href*="/d/"]` pode ter mudado

### 3. **Timeout ou Erro de Rede**
- Sites podem estar lentos ou indisponíveis
- Timeout de 15 segundos pode não ser suficiente

### 4. **Deduplicação Agressiva**
O código remove produtos duplicados por nome. Se Promobyte/Pelando tiverem os mesmos produtos do Promobit, eles são descartados.

## ✅ Melhorias Implementadas

Adicionei logs detalhados em `bot/scrapers.py`:

```python
# Promobyte
print(f'   📡 {url} - Status: {response.status_code}')
print(f'   📦 Encontrados {len(cards)} cards nesta página')
print(f'   ✅ Total Promobyte: {len(produtos)} produtos')

# Pelando
print(f'   📡 Status: {response.status_code}')
print(f'   📦 Encontrados {len(cards)} cards')
print(f'   ✅ Total Pelando: {len(produtos)} produtos')
```

## 🧪 Como Testar

### Opção 1: Rodar o script de teste
```bash
cd bot
python test_sources.py
```

### Opção 2: Testar manualmente no Python
```python
from scrapers import PromotionScraper

scraper = PromotionScraper()

# Testar Promobyte
produtos_promobyte = scraper.buscar_promocoes_promobyte(limite=5)
print(f"Promobyte: {len(produtos_promobyte)} produtos")

# Testar Pelando
produtos_pelando = scraper.buscar_promocoes_pelando_site(limite=5)
print(f"Pelando: {len(produtos_pelando)} produtos")
```

### Opção 3: Verificar logs do robô
Quando o robô rodar, você verá logs como:
```
🔥 Buscando promoções no Promobyte...
   📡 https://promobyte.site/promocoes-do-dia - Status: 200
   📦 Encontrados 0 cards nesta página  ← PROBLEMA AQUI!
   ✅ Total Promobyte: 0 produtos
```

## 🛠️ Soluções Possíveis

### Se for bloqueio anti-bot:

1. **Adicionar delays entre requisições**
```python
import time
time.sleep(2)  # Aguardar 2 segundos entre requisições
```

2. **Rotacionar User-Agents**
```python
import random
user_agents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64)...',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...',
    # ... mais user agents
]
headers = {'User-Agent': random.choice(user_agents)}
```

3. **Usar proxies** (mais avançado)

### Se for mudança na estrutura HTML:

1. **Inspecionar o HTML atual**
```python
import requests
from bs4 import BeautifulSoup

response = requests.get('https://promobyte.site/promocoes-do-dia')
soup = BeautifulSoup(response.content, 'html.parser')

# Ver todos os links
links = soup.find_all('a')
for link in links[:10]:
    print(link.get('href'))
```

2. **Atualizar os seletores CSS** no código

### Se for deduplicação:

1. **Verificar se produtos estão sendo descartados**
```python
# Em buscar_todas_promocoes()
print(f'Antes da deduplicação: {len(produtos_promobit + produtos_promobyte + produtos_pelando)}')
print(f'Depois da deduplicação: {len(todos_produtos)}')
```

## 🎯 Recomendação Imediata

**Focar apenas no Promobit** (que está funcionando) e adicionar produtos manualmente de outras fontes:

1. **Desabilitar Promobyte e Pelando temporariamente**
```python
def buscar_todas_promocoes(self):
    produtos_promobit = self.buscar_promocoes_pelando()
    # produtos_promobyte = []  # Desabilitado
    # produtos_pelando = []    # Desabilitado
```

2. **Usar o comando /tiktok para adicionar produtos manualmente**
```
/tiktok https://link.com Nome_Produto 39.90 moda
```

3. **Aumentar o limite do Promobit**
```python
produtos_promobit = self.buscar_promocoes_pelando(limite=30)  # Mais produtos
```

## 📝 Próximos Passos

1. ✅ Logs detalhados adicionados
2. ⏳ Rodar o robô e verificar os logs
3. ⏳ Identificar a causa exata (status code, cards encontrados)
4. ⏳ Aplicar a solução apropriada
5. ⏳ Considerar adicionar mais fontes (AliExpress, Shopee direto)
