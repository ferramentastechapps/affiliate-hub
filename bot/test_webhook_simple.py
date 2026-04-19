#!/usr/bin/env python3
"""
Teste simples para verificar se o webhook está retornando o ID
"""

import requests
import json
from config import AFFILIATE_HUB_URL, AFFILIATE_HUB_API_KEY

# Produto de teste mínimo
produto = {
    "name": "Teste ID - Produto Simples",
    "category": "Teste",
    "imageUrl": "https://via.placeholder.com/300"
}

print("🧪 Testando webhook de produtos...")
print(f"📍 URL: {AFFILIATE_HUB_URL}/api/webhook/products")
print(f"📦 Produto: {produto['name']}")
print()

try:
    response = requests.post(
        f"{AFFILIATE_HUB_URL}/api/webhook/products",
        headers={
            'Content-Type': 'application/json',
            'x-api-key': AFFILIATE_HUB_API_KEY
        },
        json=produto,
        timeout=10,
        verify=False
    )
    
    print(f"📊 Status Code: {response.status_code}")
    print(f"📋 Response Headers: {dict(response.headers)}")
    print()
    
    if response.status_code == 201:
        resultado = response.json()
        print("✅ Resposta recebida:")
        print(json.dumps(resultado, indent=2, ensure_ascii=False))
        print()
        
        if resultado.get('success'):
            print("✅ success = True")
            
            if resultado.get('product'):
                print("✅ Campo 'product' presente")
                produto_obj = resultado['product']
                
                if 'id' in produto_obj:
                    print(f"✅ ID encontrado: {produto_obj['id']}")
                    print()
                    print("🎉 SUCESSO! O webhook está retornando o ID corretamente!")
                else:
                    print("❌ Campo 'id' NÃO encontrado no produto")
                    print(f"🔍 Campos disponíveis: {list(produto_obj.keys())}")
            else:
                print("❌ Campo 'product' NÃO encontrado")
                print(f"🔍 Campos disponíveis: {list(resultado.keys())}")
        else:
            print("❌ success = False ou não presente")
    else:
        print(f"❌ Erro HTTP {response.status_code}")
        print(f"📄 Resposta: {response.text}")
        
except Exception as e:
    print(f"❌ Erro na requisição: {e}")
    import traceback
    traceback.print_exc()
