#!/usr/bin/env python3
"""
Script para marcar todos os produtos existentes como 'pending'
Execute após atualizar o schema do banco de dados
"""

import requests
import urllib3
from config import AFFILIATE_HUB_URL, AFFILIATE_HUB_API_KEY

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def marcar_produtos_pending():
    """Marca todos os produtos como pending"""
    print('🔄 Marcando todos os produtos como pending...')
    print('='*60)
    
    try:
        # Buscar todos os produtos
        response = requests.get(
            f'{AFFILIATE_HUB_URL}/api/products',
            headers={'x-api-key': AFFILIATE_HUB_API_KEY},
            timeout=10,
            verify=False
        )
        response.raise_for_status()
        produtos = response.json()
        
        print(f'📦 Encontrados {len(produtos)} produtos')
        
        if not produtos:
            print('✅ Nenhum produto para atualizar')
            return
        
        # Atualizar cada produto
        for produto in produtos:
            produto_id = produto['id']
            nome = produto['name']
            
            try:
                # Atualizar status via API
                update_response = requests.patch(
                    f'{AFFILIATE_HUB_URL}/api/products/{produto_id}',
                    headers={
                        'Content-Type': 'application/json',
                        'x-api-key': AFFILIATE_HUB_API_KEY
                    },
                    json={'status': 'pending'},
                    timeout=10,
                    verify=False
                )
                update_response.raise_for_status()
                print(f'✅ {nome[:50]}... → pending')
                
            except Exception as e:
                print(f'❌ Erro ao atualizar {nome[:50]}...: {e}')
        
        print('='*60)
        print('✅ Processo concluído!')
        print('\n📋 Próximos passos:')
        print('1. Revise os produtos no Telegram')
        print('2. Use /aprovar [ID] [SEU_LINK] para aprovar')
        print('3. Use /rejeitar [ID] para rejeitar')
        
    except Exception as e:
        print(f'❌ Erro ao buscar produtos: {e}')

if __name__ == '__main__':
    try:
        marcar_produtos_pending()
    except KeyboardInterrupt:
        print('\n\n👋 Script cancelado pelo usuário')
    except Exception as e:
        print(f'\n❌ Erro fatal: {e}')
