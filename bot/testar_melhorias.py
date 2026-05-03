#!/usr/bin/env python3
"""
Script para testar as melhorias implementadas no bot
"""

import time
from scrapers import PromotionScraper
from config import MIN_QUALITY_SCORE

def testar_busca_paralela():
    """Testa a busca paralela e mede o tempo"""
    print('='*60)
    print('🧪 TESTE 1: Busca Paralela')
    print('='*60)
    
    scraper = PromotionScraper()
    
    print('\n⏱️  Iniciando busca paralela...')
    inicio = time.time()
    
    resultados = scraper.buscar_todas_promocoes()
    
    fim = time.time()
    tempo_total = fim - inicio
    
    produtos = resultados['produtos']
    cupons = resultados['cupons']
    
    print(f'\n✅ Busca concluída em {tempo_total:.2f} segundos')
    print(f'📦 Produtos encontrados: {len(produtos)}')
    print(f'🎫 Cupons encontrados: {len(cupons)}')
    
    if tempo_total < 30:
        print('✅ PASSOU: Busca paralela está funcionando! (< 30s)')
    else:
        print('⚠️  ATENÇÃO: Busca está lenta (> 30s)')
    
    return produtos, cupons


def testar_sistema_score(produtos):
    """Testa o sistema de score"""
    print('\n' + '='*60)
    print('🧪 TESTE 2: Sistema de Score')
    print('='*60)
    
    if not produtos:
        print('⚠️  Nenhum produto para testar')
        return
    
    # Verificar se todos têm score
    produtos_com_score = [p for p in produtos if 'qualityScore' in p]
    
    print(f'\n📊 Produtos com score: {len(produtos_com_score)}/{len(produtos)}')
    
    if len(produtos_com_score) == len(produtos):
        print('✅ PASSOU: Todos os produtos têm score')
    else:
        print('❌ FALHOU: Alguns produtos não têm score')
    
    # Estatísticas de score
    if produtos_com_score:
        scores = [p['qualityScore'] for p in produtos_com_score]
        score_medio = sum(scores) / len(scores)
        score_max = max(scores)
        score_min = min(scores)
        
        print(f'\n📈 Estatísticas de Score:')
        print(f'   Média: {score_medio:.1f}')
        print(f'   Máximo: {score_max}')
        print(f'   Mínimo: {score_min}')
        
        # Distribuição
        urgentes = len([s for s in scores if s >= 70])
        bons = len([s for s in scores if 50 <= s < 70])
        medianos = len([s for s in scores if 30 <= s < 50])
        ruins = len([s for s in scores if s < 30])
        
        print(f'\n📊 Distribuição:')
        print(f'   🔥🔥🔥 Urgentes (≥70): {urgentes}')
        print(f'   🔥🔥 Bons (50-69): {bons}')
        print(f'   🔥 Medianos (30-49): {medianos}')
        print(f'   ❌ Ruins (<30): {ruins}')
        
        # Top 5
        produtos_ordenados = sorted(produtos_com_score, key=lambda x: x['qualityScore'], reverse=True)
        print(f'\n🏆 Top 5 Melhores Promoções:')
        for i, p in enumerate(produtos_ordenados[:5], 1):
            score = p['qualityScore']
            nome = p['name'][:50]
            preco = p.get('price', 0)
            loja = p.get('storeName', 'N/A')
            print(f'   {i}. [{score}] {nome}... - R$ {preco:.2f} ({loja})')


def testar_filtros(produtos):
    """Testa os filtros de qualidade"""
    print('\n' + '='*60)
    print('🧪 TESTE 3: Filtros de Qualidade')
    print('='*60)
    
    if not produtos:
        print('⚠️  Nenhum produto para testar')
        return
    
    total = len(produtos)
    filtrados = len([p for p in produtos if p.get('qualityScore', 0) >= MIN_QUALITY_SCORE])
    removidos = total - filtrados
    
    print(f'\n📊 Filtros aplicados:')
    print(f'   Total encontrado: {total}')
    print(f'   Passou no filtro (≥{MIN_QUALITY_SCORE}): {filtrados}')
    print(f'   Removidos: {removidos}')
    print(f'   Taxa de aprovação: {(filtrados/total*100):.1f}%')
    
    if filtrados > 0:
        print('✅ PASSOU: Filtros estão funcionando')
    else:
        print('⚠️  ATENÇÃO: Nenhum produto passou no filtro (score muito alto?)')


def testar_novas_fontes(produtos):
    """Testa se as novas fontes estão funcionando"""
    print('\n' + '='*60)
    print('🧪 TESTE 4: Novas Fontes (Amazon e Mercado Livre)')
    print('='*60)
    
    if not produtos:
        print('⚠️  Nenhum produto para testar')
        return
    
    # Contar por loja
    lojas = {}
    for p in produtos:
        loja = p.get('storeName', 'Desconhecida')
        lojas[loja] = lojas.get(loja, 0) + 1
    
    print(f'\n📊 Produtos por loja:')
    for loja, count in sorted(lojas.items(), key=lambda x: x[1], reverse=True):
        print(f'   {loja}: {count}')
    
    # Verificar novas fontes
    tem_amazon = 'Amazon' in lojas
    tem_ml = 'Mercado Livre' in lojas
    
    print(f'\n🆕 Novas fontes:')
    print(f'   Amazon: {"✅ Funcionando" if tem_amazon else "❌ Não encontrou produtos"}')
    print(f'   Mercado Livre: {"✅ Funcionando" if tem_ml else "❌ Não encontrou produtos"}')
    
    if tem_amazon or tem_ml:
        print('✅ PASSOU: Pelo menos uma nova fonte está funcionando')
    else:
        print('⚠️  ATENÇÃO: Novas fontes podem estar bloqueadas')


def testar_mensagens():
    """Testa formatação de mensagens"""
    print('\n' + '='*60)
    print('🧪 TESTE 5: Mensagens do Telegram')
    print('='*60)
    
    from telegram_bot import TelegramNotifier
    
    notifier = TelegramNotifier()
    
    # Produto de teste
    produto_teste = {
        'name': 'Notebook Gamer Acer Nitro 5 - Intel Core i5, 8GB, 512GB SSD, GTX 1650',
        'category': 'Informática e Games',
        'price': 2999.90,
        'originalPrice': 4999.90,
        'storeName': 'Amazon',
        'qualityScore': 85,
        'description': 'Super oferta!\n🎟️ CUPOM: GAMER10',
        'links': {'amazon': 'https://amazon.com.br/produto'},
        'id': 'TEST123'
    }
    
    mensagem = notifier._formatar_mensagem_produto(produto_teste)
    
    print('\n📱 Exemplo de mensagem formatada:')
    print('-' * 60)
    print(mensagem)
    print('-' * 60)
    
    # Verificar elementos importantes
    checks = {
        'Score visível': '⭐' in mensagem or 'Score' in mensagem or 'Qualidade' in mensagem,
        'Desconto calculado': '% OFF' in mensagem,
        'Cupom destacado': 'CUPOM' in mensagem,
        'Emoji de qualidade': '🔥🔥🔥' in mensagem or '🔥🔥' in mensagem,
        'Link de compra': 'COMPRAR' in mensagem or 'Ver' in mensagem,
    }
    
    print('\n✅ Elementos da mensagem:')
    for elemento, presente in checks.items():
        status = '✅' if presente else '❌'
        print(f'   {status} {elemento}')
    
    if all(checks.values()):
        print('\n✅ PASSOU: Mensagem está completa e bem formatada')
    else:
        print('\n⚠️  ATENÇÃO: Alguns elementos podem estar faltando')


def main():
    """Executa todos os testes"""
    print('\n🚀 TESTANDO MELHORIAS DO BOT DE PROMOÇÕES')
    print('='*60)
    
    try:
        # Teste 1: Busca paralela
        produtos, cupons = testar_busca_paralela()
        
        # Teste 2: Sistema de score
        testar_sistema_score(produtos)
        
        # Teste 3: Filtros
        testar_filtros(produtos)
        
        # Teste 4: Novas fontes
        testar_novas_fontes(produtos)
        
        # Teste 5: Mensagens
        testar_mensagens()
        
        # Resumo final
        print('\n' + '='*60)
        print('📊 RESUMO DOS TESTES')
        print('='*60)
        print('✅ Todos os testes foram executados!')
        print('\n💡 Dicas:')
        print('   - Se alguma fonte não funcionou, pode estar bloqueada')
        print('   - Ajuste MIN_QUALITY_SCORE no .env se necessário')
        print('   - Execute "python main.py --once" para testar o fluxo completo')
        
    except Exception as e:
        print(f'\n❌ Erro durante os testes: {e}')
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()
