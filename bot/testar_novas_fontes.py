#!/usr/bin/env python3
"""
Script de teste para validar as novas fontes e melhorias do bot
"""

import sys
from scrapers import PromotionScraper
from config import MIN_QUALITY_SCORE, DEBUG_FILTROS

def testar_fonte(nome, metodo):
    """Testa uma fonte específica"""
    print(f'\n{"="*60}')
    print(f'🧪 Testando: {nome}')
    print(f'{"="*60}')
    
    try:
        resultados = metodo()
        print(f'✅ {nome}: {len(resultados)} itens encontrados')
        
        if resultados:
            print(f'\n📦 Primeiros 3 itens:')
            for i, item in enumerate(resultados[:3], 1):
                if 'name' in item:  # Produto
                    print(f'   {i}. {item["name"][:60]}')
                    print(f'      Loja: {item.get("storeName", "N/A")}')
                    print(f'      Preço: R$ {item.get("price", "N/A")}')
                else:  # Cupom
                    print(f'   {i}. {item["code"]} - {item["description"][:50]}')
                    print(f'      Plataforma: {item.get("platform", "N/A")}')
        
        return True, len(resultados)
    except Exception as e:
        print(f'❌ Erro em {nome}: {e}')
        return False, 0

def main():
    print('🚀 Teste das Novas Fontes e Melhorias')
    print('='*60)
    print(f'⚙️  Configurações:')
    print(f'   MIN_QUALITY_SCORE: {MIN_QUALITY_SCORE}')
    print(f'   DEBUG_FILTROS: {DEBUG_FILTROS}')
    
    scraper = PromotionScraper()
    
    # Testar novas fontes
    fontes_novas = [
        ('Shopee Flash Sale', scraper.buscar_promocoes_shopee),
        ('Cuponomia (Cupons)', scraper.buscar_cupons_cuponomia),
        ('Méliuz', scraper.buscar_promocoes_meliuz),
        ('Hardmob (Fix 403)', scraper.buscar_promocoes_hardmob_fixed),
    ]
    
    resultados = {}
    
    print('\n\n🆕 TESTANDO NOVAS FONTES:')
    for nome, metodo in fontes_novas:
        sucesso, count = testar_fonte(nome, metodo)
        resultados[nome] = {'sucesso': sucesso, 'count': count}
    
    # Testar busca completa
    print(f'\n\n{"="*60}')
    print('🔄 Testando Busca Completa (Todas as Fontes em Paralelo)')
    print(f'{"="*60}')
    
    try:
        resultado_completo = scraper.buscar_todas_promocoes()
        produtos = resultado_completo['produtos']
        cupons = resultado_completo['cupons']
        
        print(f'\n✅ Busca completa finalizada!')
        print(f'   📦 Produtos: {len(produtos)}')
        print(f'   🎫 Cupons: {len(cupons)}')
        
        if produtos:
            print(f'\n🏆 Top 5 produtos por score:')
            for i, p in enumerate(produtos[:5], 1):
                score = p.get('qualityScore', 0)
                print(f'   {i}. [{score}pts] {p["name"][:55]}')
                print(f'      └─ {p.get("_score_detalhes", "sem detalhes")}')
        
    except Exception as e:
        print(f'❌ Erro na busca completa: {e}')
    
    # Resumo
    print(f'\n\n{"="*60}')
    print('📊 RESUMO DOS TESTES')
    print(f'{"="*60}')
    
    total_sucesso = sum(1 for r in resultados.values() if r['sucesso'])
    total_fontes = len(resultados)
    total_itens = sum(r['count'] for r in resultados.values())
    
    print(f'✅ Fontes testadas: {total_sucesso}/{total_fontes}')
    print(f'📦 Total de itens encontrados: {total_itens}')
    
    print(f'\n📋 Detalhes por fonte:')
    for nome, res in resultados.items():
        status = '✅' if res['sucesso'] else '❌'
        print(f'   {status} {nome}: {res["count"]} itens')
    
    # Verificar se modo debug está ativo
    if DEBUG_FILTROS:
        print(f'\n⚠️  ATENÇÃO: Modo DEBUG está ATIVO!')
        print(f'   Todos os produtos serão enviados sem filtro de score.')
        print(f'   Para desativar, defina DEBUG_FILTROS=false no .env')
    
    print(f'\n✅ Testes concluídos!')

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print('\n\n👋 Testes interrompidos pelo usuário')
    except Exception as e:
        print(f'\n❌ Erro fatal: {e}')
        sys.exit(1)
