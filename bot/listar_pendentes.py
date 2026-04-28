#!/usr/bin/env python3
"""
Lista produtos pendentes de aprovação
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from affiliate_hub_api import AffiliateHubAPI
import requests

def listar_produtos_pendentes():
    """Lista todos os produtos pendentes"""
    api = AffiliateHubAPI()
    
    print('🔍 Buscando produtos pendentes...\n')
    
    try:
        # Fazer requisição para listar produtos
        response = requests.get(
            f'{api.base_url}/api/webhook/products',
            headers=api.headers,
            timeout=10,
            verify=False
        )
        
        if response.status_code != 200:
            print(f'❌ Erro ao buscar produtos: {response.status_code}')
            print(f'   Resposta: {response.text[:200]}')
            return
        
        data = response.json()
        produtos = data.get('products', [])
        
        # Filtrar apenas pendentes
        pendentes = [p for p in produtos if p.get('status') == 'pending']
        ativos = [p for p in produtos if p.get('status') == 'active']
        rejeitados = [p for p in produtos if p.get('status') == 'rejected']
        
        print('📊 RESUMO:')
        print(f'   Total: {len(produtos)} produtos')
        print(f'   ✅ Ativos: {len(ativos)}')
        print(f'   ⏳ Pendentes: {len(pendentes)}')
        print(f'   ❌ Rejeitados: {len(rejeitados)}')
        print()
        
        if not pendentes:
            print('✅ Não há produtos pendentes de aprovação!')
            return
        
        print(f'⏳ PRODUTOS PENDENTES ({len(pendentes)}):')
        print('='*80)
        
        for i, produto in enumerate(pendentes, 1):
            produto_id = produto.get('id', 'N/A')
            nome = produto.get('name', 'Sem nome')
            preco = produto.get('price')
            categoria = produto.get('category', 'N/A')
            loja = produto.get('storeName', 'N/A')
            
            print(f'\n{i}. {nome[:60]}')
            print(f'   🆔 ID: {produto_id}')
            print(f'   💰 Preço: R$ {preco:.2f}' if preco else '   💰 Preço: N/A')
            print(f'   📂 Categoria: {categoria}')
            print(f'   🏪 Loja: {loja}')
            print(f'   ✅ Para aprovar: /aprovar {produto_id} [SEU_LINK]')
            print(f'   ❌ Para rejeitar: /rejeitar {produto_id}')
        
        print('\n' + '='*80)
        print(f'\n💡 Use os comandos acima no Telegram para aprovar/rejeitar')
        
    except Exception as e:
        print(f'❌ Erro: {e}')
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    listar_produtos_pendentes()
