#!/usr/bin/env python3
"""
Diagnóstico Completo: Testa cada fonte e mostra detalhes técnicos
"""

import requests
from bs4 import BeautifulSoup
import json

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

def testar_promobit():
    print('\n' + '='*70)
    print('🔥 TESTANDO: PROMOBIT')
    print('='*70)
    
    try:
        url = 'https://www.promobit.com.br/'
        print(f'📡 URL: {url}')
        response = requests.get(url, headers=headers, timeout=15)
        print(f'✅ Status Code: {response.status_code}')
        print(f'📦 Tamanho da resposta: {len(response.content)} bytes')
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.content, 'html.parser')
            script = soup.find('script', id='__NEXT_DATA__')
            
            if script:
                print('✅ JSON __NEXT_DATA__ encontrado!')
                data = json.loads(script.string)
                offers = data.get('props', {}).get('pageProps', {}).get('serverOffers', {}).get('offers', [])
                print(f'✅ Ofertas encontradas: {len(offers)}')
                
                if offers:
                    print(f'\n📋 Primeira oferta:')
                    primeira = offers[0]
                    print(f'   Nome: {primeira.get("offerTitle", "N/A")[:60]}...')
                    print(f'   Preço: R$ {primeira.get("offerPrice", "N/A")}')
                    print(f'   Loja: {primeira.get("storeName", "N/A")}')
                    return True
            else:
                print('❌ JSON __NEXT_DATA__ NÃO encontrado!')
                return False
        else:
            print(f'❌ Erro HTTP: {response.status_code}')
            return False
            
    except Exception as e:
        print(f'❌ ERRO: {e}')
        import traceback
        traceback.print_exc()
        return False

def testar_promobyte():
    print('\n' + '='*70)
    print('🔥 TESTANDO: PROMOBYTE')
    print('='*70)
    
    urls = [
        'https://promobyte.site/promocoes-do-dia',
        'https://promobyte.site/lojas/amazon',
        'https://promobyte.site/lojas/mercadolivre',
    ]
    
    total_cards = 0
    
    for url in urls:
        try:
            print(f'\n📡 URL: {url}')
            response = requests.get(url, headers=headers, timeout=15)
            print(f'   Status Code: {response.status_code}')
            print(f'   Tamanho: {len(response.content)} bytes')
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.content, 'html.parser')
                
                # Testar diferentes seletores
                cards_p = soup.select('a[href*="/p/"]')
                cards_promo = soup.select('a[href*="/promo"]')
                cards_oferta = soup.select('a[href*="/oferta"]')
                all_links = soup.find_all('a', href=True)
                
                print(f'   📦 Cards com /p/: {len(cards_p)}')
                print(f'   📦 Cards com /promo: {len(cards_promo)}')
                print(f'   📦 Cards com /oferta: {len(cards_oferta)}')
                print(f'   📦 Total de links: {len(all_links)}')
                
                if cards_p:
                    total_cards += len(cards_p)
                    print(f'   ✅ Primeiro card encontrado:')
                    primeiro = cards_p[0]
                    print(f'      Link: {primeiro.get("href", "N/A")[:60]}...')
                    print(f'      Texto: {primeiro.get_text(strip=True)[:60]}...')
                else:
                    print(f'   ⚠️  Nenhum card /p/ encontrado!')
                    # Mostrar alguns links para debug
                    print(f'   🔍 Primeiros 5 links encontrados:')
                    for i, link in enumerate(all_links[:5], 1):
                        href = link.get('href', '')
                        if href:
                            print(f'      {i}. {href[:60]}')
                            
            else:
                print(f'   ❌ Erro HTTP: {response.status_code}')
                
        except Exception as e:
            print(f'   ❌ ERRO: {e}')
    
    print(f'\n📊 TOTAL PROMOBYTE: {total_cards} cards encontrados')
    return total_cards > 0

def testar_pelando():
    print('\n' + '='*70)
    print('🔥 TESTANDO: PELANDO')
    print('='*70)
    
    try:
        url = 'https://www.pelando.com.br'
        print(f'📡 URL: {url}')
        response = requests.get(url, headers=headers, timeout=15)
        print(f'✅ Status Code: {response.status_code}')
        print(f'📦 Tamanho: {len(response.content)} bytes')
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Testar diferentes seletores
            cards_d = soup.select('a[href*="/d/"]')
            cards_oferta = soup.select('a[href*="/oferta"]')
            cards_promocao = soup.select('a[href*="/promocao"]')
            all_links = soup.find_all('a', href=True)
            
            print(f'📦 Cards com /d/: {len(cards_d)}')
            print(f'📦 Cards com /oferta: {len(cards_oferta)}')
            print(f'📦 Cards com /promocao: {len(cards_promocao)}')
            print(f'📦 Total de links: {len(all_links)}')
            
            if cards_d:
                print(f'✅ Primeiro card encontrado:')
                primeiro = cards_d[0]
                print(f'   Link: {primeiro.get("href", "N/A")[:60]}...')
                print(f'   Texto: {primeiro.get_text(strip=True)[:60]}...')
                return True
            else:
                print(f'⚠️  Nenhum card /d/ encontrado!')
                # Mostrar alguns links para debug
                print(f'🔍 Primeiros 5 links encontrados:')
                for i, link in enumerate(all_links[:5], 1):
                    href = link.get('href', '')
                    if href and not href.startswith('#'):
                        print(f'   {i}. {href[:60]}')
                return False
                
        else:
            print(f'❌ Erro HTTP: {response.status_code}')
            return False
            
    except Exception as e:
        print(f'❌ ERRO: {e}')
        import traceback
        traceback.print_exc()
        return False

def main():
    print('\n🤖 DIAGNÓSTICO COMPLETO DE FONTES DE PROMOÇÕES')
    print('='*70)
    
    resultados = {
        'Promobit': testar_promobit(),
        'Promobyte': testar_promobyte(),
        'Pelando': testar_pelando()
    }
    
    print('\n' + '='*70)
    print('📊 RESUMO FINAL')
    print('='*70)
    
    for fonte, sucesso in resultados.items():
        status = '✅ FUNCIONANDO' if sucesso else '❌ COM PROBLEMAS'
        print(f'{fonte:15} {status}')
    
    print('\n' + '='*70)
    print('💡 RECOMENDAÇÕES')
    print('='*70)
    
    if not resultados['Promobyte']:
        print('⚠️  PROMOBYTE: Seletor CSS pode estar desatualizado ou site bloqueando bot')
        print('   Solução: Atualizar seletores ou usar Selenium/Playwright')
    
    if not resultados['Pelando']:
        print('⚠️  PELANDO: Seletor CSS pode estar desatualizado ou site bloqueando bot')
        print('   Solução: Atualizar seletores ou usar Selenium/Playwright')
    
    if resultados['Promobit'] and not (resultados['Promobyte'] or resultados['Pelando']):
        print('\n🎯 APENAS PROMOBIT ESTÁ FUNCIONANDO!')
        print('   Isso explica por que você só vê produtos do Promobit no site.')

if __name__ == '__main__':
    main()
