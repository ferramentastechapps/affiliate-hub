#!/usr/bin/env python3
import sys
sys.path.insert(0, '/root/affiliate-hub/bot')

from scrapers import buscar_promocoes
from affiliate_hub_api import adicionar_produtos_api
import asyncio

print('🔍 Forçando busca de produtos...')
produtos, cupons = buscar_promocoes()
print(f'📦 Encontrados {len(produtos)} produtos e {len(cupons)} cupons')

# Pegar só os primeiros 15 produtos para não demorar muito
produtos_limitados = produtos[:15]
cupons_limitados = cupons[:5]

print(f'📤 Enviando {len(produtos_limitados)} produtos para a API...')
asyncio.run(adicionar_produtos_api(produtos_limitados, cupons_limitados))

print('✅ Busca concluída!')
