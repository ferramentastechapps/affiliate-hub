#!/usr/bin/env python3
"""
Debug completo: testa adicionar produto na API E enviar para Telegram
Execute no VPS: python3 bot/debug_envio.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

import asyncio
from affiliate_hub_api import AffiliateHubAPI
from telegram_bot import TelegramNotifier
from config import AFFILIATE_HUB_URL, AFFILIATE_HUB_API_KEY, TELEGRAM_CHAT_ID

print('='*60)
print('🔍 DEBUG COMPLETO - PRODUTO + TELEGRAM')
print('='*60)
print(f'API URL: {AFFILIATE_HUB_URL}')
print(f'Chat ID: {TELEGRAM_CHAT_ID}')
print()

api = AffiliateHubAPI()

# Produto de teste real
produto_teste = {
    'name': 'Ar Condicionado Split Inverter Philco PAC12QC 12000 BTUs',
    'category': 'Casa e Eletrodomésticos',
    'description': 'Oferta na loja Magalu no Promobit\n🎟️ CUPOM: PAC12QC',
    'imageUrl': 'https://via.placeholder.com/800x1000',
    'price': 1999.00,
    'links': {'magalu': 'https://www.promobit.com.br/oferta/ar-condicionado-split-inverter-philco-pac12qc-12000-btus-qf-220v-1234'},
    'storeName': 'Magalu'
}

print('1️⃣  Adicionando produto na API...')
resultado = api.adicionar_produto(produto_teste)
print(f'   Resultado: {resultado}')

if resultado and resultado.get('success'):
    produto_retornado = resultado.get('product', {})
    produto_teste['id'] = produto_retornado.get('id', 'sem-id')
    print(f'   ✅ Produto criado com ID: {produto_teste["id"]}')
else:
    print(f'   ❌ Falha na API! Usando ID temporário para testar Telegram...')
    produto_teste['id'] = 'TEST-DEBUG-123'

print()
print('2️⃣  Enviando para Telegram...')
try:
    telegram = TelegramNotifier()
    telegram.enviar_sync('produto', produto_teste)
    print('   ✅ Mensagem enviada!')
except Exception as e:
    print(f'   ❌ Erro no Telegram: {e}')
    import traceback
    traceback.print_exc()

print()
print('✅ Debug concluído! Verifique o Telegram.')
