#!/usr/bin/env python3
"""
Exemplo de integração do robô de promoções com Affiliate Hub
"""

import requests
import json
from datetime import datetime, timedelta

class AffiliateHubAPI:
    def __init__(self, base_url, api_key):
        self.base_url = base_url.rstrip('/')
        self.headers = {
            "Content-Type": "application/json",
            "x-api-key": api_key
        }
    
    def adicionar_produto(self, produto):
        """Adiciona um produto único"""
        url = f"{self.base_url}/api/webhook/products"
        try:
            response = requests.post(url, headers=self.headers, json=produto)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Erro ao adicionar produto: {e}")
            return None
    
    def adicionar_produtos_lote(self, produtos):
        """Adiciona múltiplos produtos de uma vez"""
        url = f"{self.base_url}/api/webhook/products"
        try:
            response = requests.put(url, headers=self.headers, json={"products": produtos})
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Erro ao adicionar produtos em lote: {e}")
            return None
    
    def adicionar_cupom(self, cupom):
        """Adiciona um cupom único"""
        url = f"{self.base_url}/api/webhook/coupons"
        try:
            response = requests.post(url, headers=self.headers, json=cupom)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Erro ao adicionar cupom: {e}")
            return None
    
    def adicionar_cupons_lote(self, cupons):
        """Adiciona múltiplos cupons de uma vez"""
        url = f"{self.base_url}/api/webhook/coupons"
        try:
            response = requests.put(url, headers=self.headers, json={"coupons": cupons})
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Erro ao adicionar cupons em lote: {e}")
            return None


# Configuração
API_URL = "https://seu-dominio.com"  # Altere para sua URL
API_KEY = "sua-chave-super-secreta-123"  # Altere para sua chave

# Inicializar API
api = AffiliateHubAPI(API_URL, API_KEY)


# Exemplo 1: Adicionar produto único encontrado pelo robô
def exemplo_produto_unico():
    produto = {
        "name": "Mouse Gamer Logitech G502",
        "category": "Gaming",
        "description": "Mouse gamer com 11 botões programáveis e sensor HERO 25K",
        "imageUrl": "https://exemplo.com/mouse-g502.jpg",
        "price": 189.90,
        "links": {
            "amazon": "https://amazon.com.br/dp/B07GBZ4Q68",
            "mercadoLivre": "https://produto.mercadolivre.com.br/MLB-123456",
            "shopee": "https://shopee.com.br/product/123456"
        }
    }
    
    resultado = api.adicionar_produto(produto)
    if resultado and resultado.get('success'):
        print(f"✅ Produto adicionado: {produto['name']}")
        print(f"   ID: {resultado['product']['id']}")
    else:
        print(f"❌ Erro ao adicionar produto")


# Exemplo 2: Adicionar múltiplos produtos (quando o robô encontra várias promoções)
def exemplo_produtos_lote():
    produtos = [
        {
            "name": "Teclado Mecânico Redragon K552",
            "category": "Gaming",
            "imageUrl": "https://exemplo.com/teclado-k552.jpg",
            "price": 249.90,
            "links": {
                "amazon": "https://amazon.com.br/dp/B016MAK38U"
            }
        },
        {
            "name": "Headset HyperX Cloud II",
            "category": "Gaming",
            "imageUrl": "https://exemplo.com/headset-cloud2.jpg",
            "price": 399.90,
            "links": {
                "amazon": "https://amazon.com.br/dp/B00SAYCXWG",
                "shopee": "https://shopee.com.br/product/789012"
            }
        },
        {
            "name": "Webcam Logitech C920",
            "category": "Streaming",
            "imageUrl": "https://exemplo.com/webcam-c920.jpg",
            "price": 449.90,
            "links": {
                "mercadoLivre": "https://produto.mercadolivre.com.br/MLB-789012"
            }
        }
    ]
    
    resultado = api.adicionar_produtos_lote(produtos)
    if resultado and resultado.get('success'):
        print(f"✅ {resultado['created']} produtos adicionados")
        if resultado['errors'] > 0:
            print(f"⚠️  {resultado['errors']} erros")
    else:
        print(f"❌ Erro ao adicionar produtos em lote")


# Exemplo 3: Adicionar cupom encontrado pelo robô
def exemplo_cupom_unico():
    # Cupom expira em 7 dias
    expira_em = (datetime.now() + timedelta(days=7)).isoformat()
    
    cupom = {
        "code": "TECH10",
        "description": "10% de desconto em produtos de tecnologia",
        "discount": "10% OFF",
        "platform": "Amazon",
        "expiresAt": expira_em
    }
    
    resultado = api.adicionar_cupom(cupom)
    if resultado and resultado.get('success'):
        print(f"✅ Cupom adicionado: {cupom['code']}")
        print(f"   Expira em: {expira_em}")
    else:
        print(f"❌ Erro ao adicionar cupom")


# Exemplo 4: Adicionar múltiplos cupons
def exemplo_cupons_lote():
    cupons = [
        {
            "code": "FRETEGRATIS",
            "description": "Frete grátis acima de R$ 100",
            "discount": "Frete Grátis",
            "platform": "Shopee"
        },
        {
            "code": "PRIMEIRACOMPRA",
            "description": "R$ 20 OFF na primeira compra",
            "discount": "R$ 20 OFF",
            "platform": "Mercado Livre"
        },
        {
            "code": "BLACKFRIDAY",
            "description": "Até 50% de desconto",
            "discount": "Até 50% OFF",
            "platform": "Geral",
            "expiresAt": "2024-11-30T23:59:59Z"
        }
    ]
    
    resultado = api.adicionar_cupons_lote(cupons)
    if resultado and resultado.get('success'):
        print(f"✅ {resultado['created']} cupons adicionados")
        if resultado['errors'] > 0:
            print(f"⚠️  {resultado['errors']} erros")
    else:
        print(f"❌ Erro ao adicionar cupons em lote")


# Exemplo 5: Integração completa - simula o que seu robô faria
def exemplo_integracao_completa():
    """
    Simula o fluxo completo do seu robô:
    1. Encontra promoções
    2. Extrai dados
    3. Envia para o Affiliate Hub
    """
    
    print("🤖 Iniciando busca de promoções...")
    
    # Simula dados extraídos pelo seu robô
    promocoes_encontradas = [
        {
            "name": "SSD Kingston A400 480GB",
            "category": "Setup",
            "description": "SSD SATA III 2.5\" com velocidade de leitura de até 500MB/s",
            "imageUrl": "https://exemplo.com/ssd-kingston.jpg",
            "price": 199.90,
            "links": {
                "amazon": "https://amazon.com.br/dp/B01N5IB20Q",
                "mercadoLivre": "https://produto.mercadolivre.com.br/MLB-111111"
            }
        },
        {
            "name": "Monitor LG 24\" Full HD",
            "category": "Setup",
            "description": "Monitor IPS 24 polegadas Full HD com taxa de atualização de 75Hz",
            "imageUrl": "https://exemplo.com/monitor-lg.jpg",
            "price": 699.90,
            "links": {
                "shopee": "https://shopee.com.br/product/222222"
            }
        }
    ]
    
    cupons_encontrados = [
        {
            "code": "TECH15",
            "description": "15% de desconto em periféricos",
            "discount": "15% OFF",
            "platform": "Amazon",
            "expiresAt": (datetime.now() + timedelta(days=5)).isoformat()
        }
    ]
    
    # Enviar produtos
    print(f"\n📦 Enviando {len(promocoes_encontradas)} produtos...")
    resultado_produtos = api.adicionar_produtos_lote(promocoes_encontradas)
    
    if resultado_produtos and resultado_produtos.get('success'):
        print(f"✅ {resultado_produtos['created']} produtos adicionados com sucesso!")
    
    # Enviar cupons
    print(f"\n🎫 Enviando {len(cupons_encontrados)} cupons...")
    resultado_cupons = api.adicionar_cupons_lote(cupons_encontrados)
    
    if resultado_cupons and resultado_cupons.get('success'):
        print(f"✅ {resultado_cupons['created']} cupons adicionados com sucesso!")
    
    print("\n✨ Integração concluída!")


if __name__ == "__main__":
    print("=" * 60)
    print("🤖 Robô de Promoções - Integração com Affiliate Hub")
    print("=" * 60)
    
    # Descomente o exemplo que deseja testar:
    
    # exemplo_produto_unico()
    # exemplo_produtos_lote()
    # exemplo_cupom_unico()
    # exemplo_cupons_lote()
    exemplo_integracao_completa()
