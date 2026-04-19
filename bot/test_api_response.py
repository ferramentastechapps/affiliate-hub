#!/usr/bin/env python3
"""
Script de teste para verificar a resposta da API ao criar um produto
"""

import json
from affiliate_hub_api import AffiliateHubAPI

def test_criar_produto():
    """Testa a criação de um produto e verifica o ID retornado"""
    
    api = AffiliateHubAPI()
    
    # Produto de teste
    produto_teste = {
        "name": "TESTE - Produto para verificar ID",
        "category": "Teste",
        "imageUrl": "https://via.placeholder.com/300",
        "price": 99.99,
        "description": "Produto de teste para verificar se o ID está sendo retornado",
        "links": {
            "amazon": "https://amazon.com.br/teste"
        }
    }
    
    print("🧪 Testando criação de produto...")
    print(f"📦 Produto: {produto_teste['name']}")
    print("\n" + "="*60)
    
    # Chamar API
    resultado = api.adicionar_produto(produto_teste)
    
    print("\n📋 RESPOSTA DA API:")
    print("="*60)
    print(f"Type: {type(resultado)}")
    print(f"\nConteúdo completo:")
    print(json.dumps(resultado, indent=2, default=str))
    print("="*60)
    
    # Verificar estrutura
    if resultado:
        print("\n🔍 ANÁLISE DA ESTRUTURA:")
        print(f"✓ 'success' presente: {('success' in resultado)}")
        print(f"✓ 'success' = True: {resultado.get('success') == True}")
        print(f"✓ 'product' presente: {('product' in resultado)}")
        
        if 'product' in resultado:
            produto = resultado['product']
            print(f"✓ 'product' é dict: {isinstance(produto, dict)}")
            print(f"✓ Keys em 'product': {list(produto.keys())}")
            print(f"✓ 'id' presente em 'product': {('id' in produto)}")
            
            if 'id' in produto:
                print(f"\n✅ ID ENCONTRADO: {produto['id']}")
                print(f"   Tipo do ID: {type(produto['id'])}")
            else:
                print("\n❌ ID NÃO ENCONTRADO!")
                print(f"   Conteúdo de 'product': {json.dumps(produto, indent=2, default=str)}")
        else:
            print("\n❌ 'product' NÃO ENCONTRADO na resposta!")
    else:
        print("\n❌ RESPOSTA VAZIA OU NULA!")
    
    print("\n" + "="*60)

if __name__ == '__main__':
    try:
        test_criar_produto()
    except Exception as e:
        print(f"\n❌ ERRO: {e}")
        import traceback
        traceback.print_exc()
