#!/usr/bin/env python3
"""
Script de diagnóstico: testa cada fonte de promoções individualmente
"""

import sys
from scrapers import PromotionScraper

def testar_fonte(nome, funcao, *args):
    """Testa uma fonte específica"""
    print(f'\n{"="*60}')
    print(f'🧪 TESTANDO: {nome}')
    print(f'{"="*60}')
    
    try:
        resultados = funcao(*args)
        print(f'✅ Sucesso! Encontrados: {len(resultados)} itens')
        
        if resultados:
            print(f'\n📋 Primeiros 3 resultados:')
            for i, item in enumerate(resultados[:3], 1):
                nome_item = item.get('name', item.get('code', 'N/A'))
                print(f'  {i}. {nome_item[:70]}...')
        else:
            print('⚠️  Nenhum resultado encontrado')
            
        return len(resultados)
        
    except Exception as e:
        print(f'❌ ERRO: {e}')
        import traceback
        traceback.print_exc()
        return 0

def main():
    scraper = PromotionScraper()
    
    print('\n🤖 DIAGNÓSTICO DE FONTES DE PROMOÇÕES')
    print('='*60)
    
    # Testar cada fonte
    total_promobit = testar_fonte('Promobit (Produtos)', scraper.buscar_promocoes_pelando, 5)
    total_promobyte = testar_fonte('Promobyte (Produtos)', scraper.buscar_promocoes_promobyte, 5)
    total_pelando = testar_fonte('Pelando (Produtos)', scraper.buscar_promocoes_pelando_site, 5)
    total_cupons = testar_fonte('Promobit (Cupons)', scraper.buscar_cupons_pelando, 5)
    
    # Resumo
    print(f'\n{"="*60}')
    print('📊 RESUMO')
    print(f'{"="*60}')
    print(f'Promobit (Produtos):  {total_promobit} itens')
    print(f'Promobyte (Produtos): {total_promobyte} itens')
    print(f'Pelando (Produtos):   {total_pelando} itens')
    print(f'Promobit (Cupons):    {total_cupons} itens')
    print(f'{"="*60}')
    print(f'TOTAL: {total_promobit + total_promobyte + total_pelando} produtos')
    
    # Diagnóstico
    print(f'\n🔍 DIAGNÓSTICO:')
    if total_promobyte == 0:
        print('⚠️  Promobyte não retornou resultados - possível bloqueio ou mudança no site')
    if total_pelando == 0:
        print('⚠️  Pelando não retornou resultados - possível bloqueio ou mudança no site')
    if total_promobit > 0 and (total_promobyte == 0 and total_pelando == 0):
        print('⚠️  APENAS Promobit está funcionando!')
        print('    Isso explica por que você só vê produtos do Promobit no site.')

if __name__ == '__main__':
    main()
