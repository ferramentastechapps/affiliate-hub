# 🤖 Integração com Robô de Promoções

Este documento explica como integrar seu robô VPS com o Affiliate Hub.

## 🔐 Configuração

1. Configure a API key no arquivo `.env`:
```env
API_SECRET_KEY="sua-chave-super-secreta-123"
```

2. Use essa mesma chave no seu robô para autenticação.

## 📡 Endpoints Disponíveis

### 1. Adicionar Produto Único

**POST** `/api/webhook/products`

```bash
curl -X POST https://seu-dominio.com/api/webhook/products \
  -H "Content-Type: application/json" \
  -H "x-api-key: sua-chave-super-secreta-123" \
  -d '{
    "name": "Mouse Gamer RGB",
    "category": "Gaming",
    "description": "Mouse gamer com 7 botões programáveis",
    "imageUrl": "https://exemplo.com/imagem.jpg",
    "price": 89.90,
    "links": {
      "amazon": "https://amazon.com.br/produto",
      "mercadoLivre": "https://mercadolivre.com.br/produto",
      "shopee": "https://shopee.com.br/produto"
    }
  }'
```

### 2. Adicionar Múltiplos Produtos

**PUT** `/api/webhook/products`

```bash
curl -X PUT https://seu-dominio.com/api/webhook/products \
  -H "Content-Type: application/json" \
  -H "x-api-key: sua-chave-super-secreta-123" \
  -d '{
    "products": [
      {
        "name": "Produto 1",
        "category": "Gaming",
        "imageUrl": "https://exemplo.com/img1.jpg",
        "price": 99.90,
        "links": {
          "amazon": "https://amazon.com.br/produto1"
        }
      },
      {
        "name": "Produto 2",
        "category": "Setup",
        "imageUrl": "https://exemplo.com/img2.jpg",
        "price": 149.90,
        "links": {
          "shopee": "https://shopee.com.br/produto2"
        }
      }
    ]
  }'
```

### 3. Adicionar Cupom Único

**POST** `/api/webhook/coupons`

```bash
curl -X POST https://seu-dominio.com/api/webhook/coupons \
  -H "Content-Type: application/json" \
  -H "x-api-key: sua-chave-super-secreta-123" \
  -d '{
    "code": "DESCONTO10",
    "description": "10% de desconto na primeira compra",
    "discount": "10% OFF",
    "platform": "Amazon",
    "expiresAt": "2024-12-31T23:59:59Z"
  }'
```

### 4. Adicionar Múltiplos Cupons

**PUT** `/api/webhook/coupons`

```bash
curl -X PUT https://seu-dominio.com/api/webhook/coupons \
  -H "Content-Type: application/json" \
  -H "x-api-key: sua-chave-super-secreta-123" \
  -d '{
    "coupons": [
      {
        "code": "PROMO20",
        "description": "20% de desconto",
        "discount": "20% OFF",
        "platform": "Shopee"
      },
      {
        "code": "FRETEGRATIS",
        "description": "Frete grátis acima de R$ 100",
        "discount": "Frete Grátis",
        "platform": "Mercado Livre"
      }
    ]
  }'
```

## 🐍 Exemplo em Python

```python
import requests
import json

# Configuração
API_URL = "https://seu-dominio.com/api/webhook"
API_KEY = "sua-chave-super-secreta-123"

headers = {
    "Content-Type": "application/json",
    "x-api-key": API_KEY
}

# Adicionar produto único
def adicionar_produto(produto):
    response = requests.post(
        f"{API_URL}/products",
        headers=headers,
        json=produto
    )
    return response.json()

# Adicionar múltiplos produtos
def adicionar_produtos_lote(produtos):
    response = requests.put(
        f"{API_URL}/products",
        headers=headers,
        json={"products": produtos}
    )
    return response.json()

# Adicionar cupom
def adicionar_cupom(cupom):
    response = requests.post(
        f"{API_URL}/coupons",
        headers=headers,
        json=cupom
    )
    return response.json()

# Exemplo de uso
produto = {
    "name": "Teclado Mecânico RGB",
    "category": "Gaming",
    "description": "Teclado mecânico com switches blue",
    "imageUrl": "https://exemplo.com/teclado.jpg",
    "price": 299.90,
    "links": {
        "amazon": "https://amazon.com.br/teclado",
        "shopee": "https://shopee.com.br/teclado"
    }
}

resultado = adicionar_produto(produto)
print(resultado)
```

## 🟢 Exemplo em Node.js

```javascript
const axios = require('axios');

const API_URL = 'https://seu-dominio.com/api/webhook';
const API_KEY = 'sua-chave-super-secreta-123';

const headers = {
  'Content-Type': 'application/json',
  'x-api-key': API_KEY
};

// Adicionar produto
async function adicionarProduto(produto) {
  try {
    const response = await axios.post(
      `${API_URL}/products`,
      produto,
      { headers }
    );
    return response.data;
  } catch (error) {
    console.error('Erro:', error.response?.data || error.message);
  }
}

// Adicionar múltiplos produtos
async function adicionarProdutosLote(produtos) {
  try {
    const response = await axios.put(
      `${API_URL}/products`,
      { products: produtos },
      { headers }
    );
    return response.data;
  } catch (error) {
    console.error('Erro:', error.response?.data || error.message);
  }
}

// Exemplo de uso
const produto = {
  name: 'Headset Gamer 7.1',
  category: 'Gaming',
  imageUrl: 'https://exemplo.com/headset.jpg',
  price: 199.90,
  links: {
    amazon: 'https://amazon.com.br/headset'
  }
};

adicionarProduto(produto).then(console.log);
```

## 📋 Campos Disponíveis

### Produto
- `name` (obrigatório) - Nome do produto
- `category` (obrigatório) - Categoria: "Gaming", "Home Office", "Setup", "Streaming"
- `imageUrl` (obrigatório) - URL da imagem
- `description` (opcional) - Descrição do produto
- `price` (opcional) - Preço em número (ex: 99.90)
- `links` (opcional) - Objeto com links das plataformas:
  - `amazon`
  - `mercadoLivre`
  - `shopee`
  - `aliexpress`
  - `tiktok`

### Cupom
- `code` (obrigatório) - Código do cupom (será convertido para maiúsculas)
- `description` (obrigatório) - Descrição do cupom
- `discount` (obrigatório) - Valor do desconto (ex: "10% OFF", "R$ 50 OFF")
- `platform` (obrigatório) - Plataforma: "Amazon", "Mercado Livre", "Shopee", "AliExpress", "TikTok", "Geral"
- `productId` (opcional) - ID do produto específico
- `expiresAt` (opcional) - Data de expiração (ISO 8601)
- `isActive` (opcional) - true/false (padrão: true)

## 🔒 Segurança

- Mantenha sua API key em segredo
- Use HTTPS em produção
- Não compartilhe a chave em repositórios públicos
- Considere rotacionar a chave periodicamente

## ✅ Respostas

### Sucesso (201)
```json
{
  "success": true,
  "product": { ... }
}
```

### Erro de Autenticação (401)
```json
{
  "error": "Não autorizado. API key inválida."
}
```

### Erro de Validação (400)
```json
{
  "error": "Campos obrigatórios: name, category, imageUrl"
}
```

### Erro do Servidor (500)
```json
{
  "error": "Erro ao criar produto"
}
```

## 🚀 Deploy

Após fazer deploy na Vercel ou outra plataforma:

1. Configure a variável de ambiente `API_SECRET_KEY`
2. Use a URL do deploy no seu robô
3. Teste a integração com curl primeiro
4. Configure seu robô para enviar as promoções automaticamente

## 📞 Testando Localmente

```bash
# Inicie o servidor
npm run dev

# Teste o endpoint
curl -X POST http://localhost:3000/api/webhook/products \
  -H "Content-Type: application/json" \
  -H "x-api-key: minha-chave-super-secreta-123" \
  -d '{"name":"Teste","category":"Gaming","imageUrl":"https://via.placeholder.com/800"}'
```
