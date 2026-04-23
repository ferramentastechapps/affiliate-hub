# 🎵 Guia: Como Adicionar Produtos do TikTok Shop

## ⚠️ Importante

O TikTok Shop **não tem API pública** para scraping automático como outros sites. Existem 3 formas de adicionar produtos:

---

## 📝 Opção 1: Adicionar Manualmente (Mais Fácil)

### Via Admin do Site:
1. Acesse: `https://seu-site.com/admin`
2. Vá em "Produtos"
3. Clique em "Adicionar Produto"
4. Preencha:
   - Nome do produto
   - Categoria
   - Preço
   - Imagem (URL)
   - **Link TikTok**: Cole o link do produto no campo `links.tiktok`

### Via Telegram Bot:
```
/adicionar_produto
Nome: Produto do TikTok
Categoria: Moda e Acessórios
Preço: 49.90
Link: https://www.tiktok.com/@loja/video/123456789
Imagem: URL_DA_IMAGEM
```

---

## 🔗 Opção 2: Links de Afiliado TikTok

Se você tem links de afiliado do TikTok, adicione-os diretamente:

### 1. Edite `bot/scrapers.py`:
```python
def buscar_promocoes_tiktok(self, limite: int = 10) -> List[Dict]:
    produtos = []
    
    # Seus links de afiliado TikTok
    links_tiktok = [
        {
            'name': 'Produto 1',
            'link': 'https://www.tiktok.com/@loja/video/123',
            'price': 49.90,
            'image': 'URL_IMAGEM',
            'category': 'Moda e Acessórios'
        },
        # Adicione mais produtos aqui
    ]
    
    for item in links_tiktok:
        produtos.append({
            'name': item['name'],
            'category': item['category'],
            'description': f"Oferta exclusiva no TikTok Shop",
            'imageUrl': item['image'],
            'price': item['price'],
            'links': {'tiktok': item['link']}
        })
    
    return produtos
```

### 2. Rode o bot:
```bash
cd bot
python main.py
```

---

## 🤖 Opção 3: Scraping Avançado (Requer Selenium)

TikTok tem proteções anti-bot. Para scraping real, você precisa:

### 1. Instalar Selenium:
```bash
pip install selenium webdriver-manager
```

### 2. Criar scraper com Selenium:
```python
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

def buscar_promocoes_tiktok_selenium(self, limite: int = 10):
    produtos = []
    
    # Configurar Chrome
    options = webdriver.ChromeOptions()
    options.add_argument('--headless')  # Rodar sem abrir janela
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    
    driver = webdriver.Chrome(
        service=Service(ChromeDriverManager().install()),
        options=options
    )
    
    try:
        # Acessar TikTok Shop
        driver.get('https://shop.tiktok.com/view/promo')
        
        # Esperar carregar
        import time
        time.sleep(3)
        
        # Buscar produtos (adapte os seletores)
        cards = driver.find_elements(By.CSS_SELECTOR, '.product-card')
        
        for card in cards[:limite]:
            try:
                nome = card.find_element(By.CSS_SELECTOR, '.product-name').text
                preco = card.find_element(By.CSS_SELECTOR, '.product-price').text
                link = card.find_element(By.CSS_SELECTOR, 'a').get_attribute('href')
                imagem = card.find_element(By.CSS_SELECTOR, 'img').get_attribute('src')
                
                produtos.append({
                    'name': nome,
                    'category': self._detectar_categoria(nome),
                    'description': 'Oferta no TikTok Shop',
                    'imageUrl': imagem,
                    'price': self._extrair_preco(preco),
                    'links': {'tiktok': link}
                })
            except Exception as e:
                print(f'Erro ao processar produto: {e}')
                
    finally:
        driver.quit()
    
    return produtos
```

---

## 🔑 Opção 4: TikTok Seller API (Se você é vendedor)

Se você tem uma conta de vendedor no TikTok Shop:

### 1. Acesse o Seller Center:
https://seller.tiktokglobalshop.com/

### 2. Gere API Key:
- Vá em Settings → Open Platform
- Crie um App
- Copie `App Key` e `App Secret`

### 3. Configure no `.env`:
```env
TIKTOK_APP_KEY=seu_app_key
TIKTOK_APP_SECRET=seu_app_secret
```

### 4. Use a API oficial:
```python
import requests

def buscar_produtos_tiktok_api(self):
    # Documentação: https://seller.tiktokglobalshop.com/document
    
    app_key = os.getenv('TIKTOK_APP_KEY')
    app_secret = os.getenv('TIKTOK_APP_SECRET')
    
    # Autenticar e buscar produtos
    # (Veja documentação oficial para detalhes)
```

---

## 📊 Recomendação

Para começar, use a **Opção 1 (Manual)** ou **Opção 2 (Links de Afiliado)**.

São as formas mais simples e confiáveis. Você pode adicionar produtos do TikTok conforme encontra boas ofertas.

---

## 🎯 Exemplo Prático

### Adicionar produto via código:

Edite `bot/scrapers.py` e descomente/adapte a função `buscar_promocoes_tiktok`:

```python
def buscar_promocoes_tiktok(self, limite: int = 10) -> List[Dict]:
    produtos = []
    
    # Exemplo: Produtos que você encontrou no TikTok
    produtos_tiktok = [
        {
            'name': 'Bolsa Feminina Transversal Couro',
            'price': 39.90,
            'image': 'https://exemplo.com/bolsa.jpg',
            'link': 'https://www.tiktok.com/@loja/video/123456',
            'category': 'Moda e Acessórios'
        },
        {
            'name': 'Fone Bluetooth TWS Pro',
            'price': 29.90,
            'image': 'https://exemplo.com/fone.jpg',
            'link': 'https://www.tiktok.com/@loja/video/789012',
            'category': 'Smartphones e TV'
        }
    ]
    
    for item in produtos_tiktok:
        produtos.append({
            'name': item['name'],
            'category': item['category'],
            'description': f"Oferta exclusiva no TikTok Shop",
            'imageUrl': item['image'],
            'price': item['price'],
            'links': {'tiktok': item['link']}
        })
        print(f'  ✅ [TikTok] {item["name"][:50]}...')
    
    return produtos
```

Depois rode:
```bash
cd bot
python main.py
```

---

## ✅ Pronto!

Agora você tem 4 opções para adicionar produtos do TikTok Shop. Escolha a que melhor se adapta ao seu caso! 🚀
