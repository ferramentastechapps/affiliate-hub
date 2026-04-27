#!/usr/bin/env python3
"""
Testa a API do site e mostra exatamente o que está falhando
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

import requests
import urllib3
urllib3.disable_warnings()

from config import AFFILIATE_HUB_URL, AFFILIATE_HUB_API_KEY

print('='*60)
print('🔍 DIAGNÓSTICO DA API')
print('='*60)
print(f'URL: {AFFILIATE_HUB_URL}')
print(f'API Key: {AFFILIATE_HUB_API_KEY[:10]}...' if AFFILIATE_HUB_API_KEY else 'API Key: NÃO CONFIGURADA')
print()

headers = {
    'Content-Type': 'application/json',
    'x-api-key': AFFILIATE_HUB_API_KEY
}

# 1. Testar se o site está online
print('1️⃣  Testando se o site está online...')
try:
    r = requests.get(AFFILIATE_HUB_URL, timeout=5, verify=False)
    print(f'   ✅ Site online - Status: {r.status_code}')
except Exception as e:
    print(f'   ❌ Site OFFLINE: {e}')
    print()
    print('💡 SOLUÇÃO: O site Next.js não está rodando!')
    print('   Execute: pm2 start nextjs  OU  npm run start')
    sys.exit(1)

print()

# 2. Testar a API de webhook com produto mínimo
print('2️⃣  Testando POST /api/webhook/products...')
produto_teste = {
    'name': 'Produto Teste Diagnóstico',
    'category': 'Diversos',
    'imageUrl': 'https://via.placeholder.com/800x1000',
    'price': 99.90,
    'links': {'amazon': 'https://amazon.com.br'}
}

try:
    r = requests.post(
        f'{AFFILIATE_HUB_URL}/api/webhook/products',
        headers=headers,
        json=produto_teste,
        timeout=10,
        verify=False
    )
    print(f'   Status: {r.status_code}')
    print(f'   Resposta: {r.text[:500]}')
    
    if r.status_code == 201:
        data = r.json()
        produto_id = data.get('product', {}).get('id')
        print(f'   ✅ API funcionando! ID criado: {produto_id}')
        
        # Limpar produto de teste
        if produto_id:
            try:
                r2 = requests.delete(
                    f'{AFFILIATE_HUB_URL}/api/webhook/products/{produto_id}',
                    headers=headers, timeout=5, verify=False
                )
                print(f'   🗑️  Produto de teste removido')
            except:
                pass
                
    elif r.status_code == 401:
        print(f'   ❌ ERRO 401: API Key inválida!')
        print(f'   Verifique AFFILIATE_HUB_API_KEY no .env')
        print(f'   Deve ser igual ao API_SECRET_KEY do site')
        
    elif r.status_code == 400:
        print(f'   ❌ ERRO 400: Dados inválidos')
        print(f'   Resposta: {r.text}')
        
    elif r.status_code == 500:
        print(f'   ❌ ERRO 500: Erro interno do servidor')
        print(f'   Verifique os logs do Next.js: pm2 logs nextjs')
        
    else:
        print(f'   ⚠️  Status inesperado: {r.status_code}')
        
except requests.exceptions.ConnectionError:
    print(f'   ❌ Não conseguiu conectar em {AFFILIATE_HUB_URL}')
    print(f'   O site está rodando na porta correta?')
except Exception as e:
    print(f'   ❌ Erro: {e}')

print()

# 3. Testar Telegram
print('3️⃣  Testando configuração do Telegram...')
from config import TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
if not TELEGRAM_BOT_TOKEN:
    print('   ❌ TELEGRAM_BOT_TOKEN não configurado!')
elif not TELEGRAM_CHAT_ID:
    print('   ❌ TELEGRAM_CHAT_ID não configurado!')
else:
    try:
        r = requests.get(
            f'https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getMe',
            timeout=5
        )
        if r.status_code == 200:
            bot_info = r.json().get('result', {})
            print(f'   ✅ Bot OK: @{bot_info.get("username")}')
            print(f'   Chat ID configurado: {TELEGRAM_CHAT_ID}')
        else:
            print(f'   ❌ Token inválido: {r.text}')
    except Exception as e:
        print(f'   ❌ Erro ao testar Telegram: {e}')

print()
print('='*60)
print('✅ Diagnóstico concluído!')
