#!/usr/bin/env python3
"""
Script de teste para verificar se a API está retornando o ID do produto
"""

from affiliate_hub_api import AffiliateHubAPI
import json

# Criar cliente da API
api = AffiliateHubAPI()

# Produto de teste
produto_teste = {
    "name": "Produto de Teste - Verificação de ID",
    "category": "Teste",
    "imageUrl": "https://via.placeholder.com/300",
    "price": 99.99,
    "description": "Produto criado apenas para testar se o ID está sendo retornado",
    "links": {
        "amazon": "https://amazon.com.br/teste"
    }
}

print("🧪 Testando criação de produto via API...")
print(f"📦 Produto: {produto_teste['name']}")
print()

# Adicionar produto
resultado = api.adicionar_produto(produto_teste)

print("📋 Resultado completo da API:")
print(json.dumps(resultado, indent=2, ensure_ascii=False))
print()

# Verificar se o ID está presente
if resultado and resultado.get('success'):
    print("✅ API retornou success=True")
    
    if resultado.get('product'):
        print("✅ Campo 'product' está presente")
        
        produto_retornado = resultado['product']
        if produto_retornado.get('id'):
            print(f"✅ ID do produto: {produto_retornado['id']}")
            print()
            print("🎉 SUCESSO! A API está retornando o ID corretamente!")
        else:
            print("❌ Campo 'id' não encontrado no produto")
            print(f"🔍 Chaves disponíveis: {list(produto_retornado.keys())}")
    else:
        print("❌ Campo 'product' não encontrado na resposta")
        print(f"🔍 Chaves disponíveis: {list(resultado.keys())}")
else:
    print("❌ API não retornou success ou houve erro")
    if resultado:
        print(f"🔍 Erro: {resultado.get('error', 'Desconhecido')}")
