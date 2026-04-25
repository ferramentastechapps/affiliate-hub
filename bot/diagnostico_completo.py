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
    print('🔥 TESTANDO: PROMOBYTE (CORRIGIDO)')
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
                
                # Testar seletor CORRIGIDO
                cards_promo = soup.select('a[href*="/promo"]')
                
                print(f'   📦 Cards com /promo: {len(cards_promo)} ✅ CORRIGIDO!')
                
                if cards_promo:
                    total_cards += len(cards_promo)
                    print(f'   ✅ Primeiro card encontrado:')
                    primeiro = cards_promo[0]
                    print(f'      Link: {primeiro.get("href", "N/A")[:60]}...')
                    print(f'      Texto: {primeiro.get_text(strip=True)[:60]}...')
                else:
                    print(f'   ⚠️  Nenhum card /promo encontrado!')
                            
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

def testar_hardmob():
    print('\n' + '='*70)
    print('🔥 TESTANDO: HARDMOB (SUBSTITUI PELANDO)')
    print('='*70)
    
    try:
        url = 'https://www.hardmob.com.br/forums/407-Promocoes'
        print(f'📡 URL: {url}')
        response = requests.get(url, headers=headers, timeout=15)
        print(f'✅ Status Code: {response.status_code}')
        print(f'📦 Tamanho: {len(response.content)} bytes')
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Hardmob usa estrutura de fórum
            topicos = soup.select('li.threadbit')
            
            print(f'📦 Tópicos encontrados: {len(topicos)}')
            
            if topicos:
                print(f'✅ Primeiro tópico:')
                primeiro = topicos[0]
                titulo = primeiro.select_one('a.title')
                if titulo:
                    print(f'   Título: {titulo.get_text(strip=True)[:60]}...')
                    print(f'   Link: {titulo.get("href", "N/A")[:60]}...')
                return True
            else:
                print(f'⚠️  Nenhum tópico encontrado!')
                return False
                
        else:
            print(f'❌ Erro HTTP: {response.status_code}')
            return False
            
    except Exception as e:
        print(f'❌ ERRO: {e}')
        import traceback
        traceback.print_exc()
        return False

def testar_zoom():
    print('\n' + '='*70)
    print('🔥 TESTANDO: ZOOM (COMPARADOR DE PREÇOS)')
    print('='*70)
    
    try:
        url = 'https://www.zoom.com.br/ofertas'
        print(f'📡 URL: {url}')
        response = requests.get(url, headers=headers, timeout=15)
        print(f'✅ Status Code: {response.status_code}')
        print(f'📦 Tamanho: {len(response.content)} bytes')
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Testar diferentes seletores
            cards_product = soup.select('div[data-product]')
            cards_article = soup.select('article.product')
            cards_link = soup.select('a[href*="/produto/"]')
            
            print(f'📦 Cards com data-product: {len(cards_product)}')
            print(f'📦 Cards article.product: {len(cards_article)}')
            print(f'📦 Links /produto/: {len(cards_link)}')
            
            total = len(cards_product) + len(cards_article) + len(cards_link)
            
            if total > 0:
                print(f'✅ Total de cards encontrados: {total}')
                return True
            else:
                print(f'⚠️  Nenhum card encontrado!')
                return False
                
        else:
            print(f'❌ Erro HTTP: {response.status_code}')
            return False
            
    except Exception as e:
        print(f'❌ ERRO: {e}')
        import traceback
        traceback.print_exc()
        return False

def testar_buscape():
    print('\n' + '='*70)
    print('🔥 TESTANDO: BUSCAPÉ (OFERTAS E CUPONS)')
    print('='*70)
    
    try:
        url = 'https://www.buscape.com.br/ofertas'
        print(f'📡 URL: {url}')
        response = requests.get(url, headers=headers, timeout=15)
        print(f'✅ Status Code: {response.status_code}')
        print(f'📦 Tamanho: {len(response.content)} bytes')
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Testar diferentes seletores
            cards_offer = soup.select('div.offer-card')
            cards_article = soup.select('article.offer')
            cards_link = soup.select('a[href*="/oferta/"]')
            
            print(f'📦 Cards div.offer-card: {len(cards_offer)}')
            print(f'📦 Cards article.offer: {len(cards_article)}')
            print(f'📦 Links /oferta/: {len(cards_link)}')
            
            total = len(cards_offer) + len(cards_article) + len(cards_link)
            
            if total > 0:
                print(f'✅ Total de cards encontrados: {total}')
                return True
            else:
                print(f'⚠️  Nenhum card encontrado!')
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
        'Hardmob': testar_hardmob(),
        'Zoom': testar_zoom(),
        'Buscapé': testar_buscape()
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
        print('⚠️  PROMOBYTE: Ainda com problemas após correção')
        print('   Solução: Verificar estrutura HTML manualmente')
    else:
        print('✅ PROMOBYTE: Corrigido! Agora busca /promo ao invés de /p/')
    
    if not resultados['Hardmob']:
        print('⚠️  HARDMOB: Não conseguiu buscar tópicos')
        print('   Solução: Verificar se site está acessível')
    else:
        print('✅ HARDMOB: Funcionando como alternativa ao Pelando!')
    
    if not resultados['Zoom']:
        print('⚠️  ZOOM: Não conseguiu buscar ofertas')
        print('   Solução: Verificar seletores CSS ou usar Selenium')
    else:
        print('✅ ZOOM: Funcionando! Comparador de preços ativo!')
    
    if not resultados['Buscapé']:
        print('⚠️  BUSCAPÉ: Não conseguiu buscar ofertas')
        print('   Solução: Verificar seletores CSS ou usar Selenium')
    else:
        print('✅ BUSCAPÉ: Funcionando! Ofertas e cupons ativos!')
    
    total_funcionando = sum(resultados.values())
    print(f'\n🎯 TOTAL: {total_funcionando}/5 fontes funcionando')
    
    if total_funcionando >= 3:
        print('✅ Excelente! Você terá grande variedade de promoções!')
    elif total_funcionando >= 2:
        print('✅ Bom! Você terá variedade de promoções de múltiplas fontes!')
    elif total_funcionando == 1:
        print('⚠️  Apenas 1 fonte funcionando. Considere adicionar mais fontes.')

if __name__ == '__main__':
    main()
