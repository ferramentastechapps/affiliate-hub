#!/usr/bin/env python3
"""
Robô de Promoções - Busca, adiciona no site e envia para Telegram
"""

import time
import schedule
from datetime import datetime
from affiliate_hub_api import AffiliateHubAPI
from telegram_bot import TelegramNotifier
from scrapers import PromotionScraper
from config import SEARCH_INTERVAL_MINUTES


import json
from pathlib import Path

class PromotionBot:
    """Robô principal que coordena tudo"""
    
    def __init__(self):
        self.api = AffiliateHubAPI()
        self.telegram = TelegramNotifier()
        self.scraper = PromotionScraper()
        
        self.state_file = Path('bot_state.json')
        self._load_state()
        
    def _load_state(self):
        self.produtos_enviados = set()
        self.cupons_enviados = set()
        try:
            if self.state_file.exists():
                with open(self.state_file, 'r', encoding='utf-8') as f:
                    state = json.load(f)
                    self.produtos_enviados = set(state.get('produtos', []))
                    self.cupons_enviados = set(state.get('cupons', []))
        except Exception as e:
            print(f'Aviso: Não foi possível carregar o estado anterior: {e}')
            
    def _save_state(self):
        try:
            with open(self.state_file, 'w', encoding='utf-8') as f:
                json.dump({
                    'produtos': list(self.produtos_enviados),
                    'cupons': list(self.cupons_enviados)
                }, f, ensure_ascii=False)
        except Exception as e:
            print(f'Aviso: Não foi possível salvar o estado: {e}')
    
    def executar_busca(self):
        """Executa uma busca completa"""
        print('\n' + '='*60)
        print(f'🤖 Iniciando busca de promoções - {datetime.now().strftime("%H:%M:%S")}')
        print('='*60)
        
        try:
            # 1. Buscar promoções
            resultados = self.scraper.buscar_todas_promocoes()
            produtos = resultados['produtos']
            cupons = resultados['cupons']
            
            print(f'\n📊 Encontrados: {len(produtos)} produtos e {len(cupons)} cupons')
            
            # 2. Filtrar produtos novos
            produtos_novos = [
                p for p in produtos 
                if p['name'] not in self.produtos_enviados
            ]
            
            cupons_novos = [
                c for c in cupons 
                if c['code'] not in self.cupons_enviados
            ]
            
            print(f'✨ Novos: {len(produtos_novos)} produtos e {len(cupons_novos)} cupons')
            
            # 3. Adicionar produtos no site e enviar para Telegram com ID
            if produtos_novos:
                print(f'\n📦 Adicionando {len(produtos_novos)} produtos no site...')
                print(f'📱 Enviando produtos para Telegram...')
                
                for produto in produtos_novos:
                    # Adicionar produto na API
                    resultado = self.api.adicionar_produto(produto)
                    
                    if resultado and resultado.get('success'):
                        produto_retornado = resultado.get('product')
                        if produto_retornado and produto_retornado.get('id'):
                            # Capturar o ID retornado pela API
                            produto['id'] = produto_retornado['id']
                            print(f'✅ Produto adicionado com ID: {produto["id"]} | {produto["name"][:50]}')
                        else:
                            print(f'⚠️ Produto adicionado mas ID não retornado: {produto["name"][:50]}')
                    else:
                        erro = resultado.get('error') if resultado else 'Falha na comunicação com a API'
                        print(f'❌ Falha ao adicionar "{produto["name"][:40]}": {erro}')
                    
                    # Enviar para Telegram (com ou sem ID)
                    self.telegram.enviar_sync('produto', produto)
                    self.produtos_enviados.add(produto['name'])
                    time.sleep(1)  # Evitar rate limit
            
            # 5. Adicionar cupons no site
            if cupons_novos:
                print(f'\n🎫 Adicionando {len(cupons_novos)} cupons no site...')
                resultado = self.api.adicionar_cupons_lote(cupons_novos)
                
                if resultado and resultado.get('success'):
                    print(f'✅ {resultado["created"]} cupons adicionados no site')
                else:
                    print('⚠️ Falha ao adicionar cupons no site, mas continuaremos com o envio para Telegram')
                    
                # 6. Enviar para Telegram
                print(f'\n📱 Enviando cupons para Telegram...')
                for cupom in cupons_novos:
                    self.telegram.enviar_sync('cupom', cupom)
                    self.cupons_enviados.add(cupom['code'])
                    time.sleep(1)
            
            # 7. Enviar resumo
            if produtos_novos or cupons_novos:
                self.telegram.enviar_sync('resumo', {
                    'produtos': len(produtos_novos),
                    'cupons': len(cupons_novos)
                })
            
            # 8. Salvar o estado para evitar envios duplicados após reinicialização
            self._save_state()
            print(f'\n✅ Busca concluída e estado salvo!')
            
        except Exception as e:
            print(f'\n❌ Erro na busca: {e}')
    
    def iniciar_modo_agendado(self):
        """Inicia o robô em modo agendado"""
        print('🤖 Robô de Promoções Iniciado!')
        print(f'⏰ Buscando a cada {SEARCH_INTERVAL_MINUTES} minutos')
        print('='*60)
        
        # Executar imediatamente
        self.executar_busca()
        
        # Agendar execuções
        schedule.every(SEARCH_INTERVAL_MINUTES).minutes.do(self.executar_busca)
        
        # Loop principal
        while True:
            schedule.run_pending()
            time.sleep(60)
    
    def iniciar_modo_continuo(self):
        """Inicia o robô em modo contínuo (para testes)"""
        print('🤖 Robô de Promoções - Modo Contínuo')
        print('='*60)
        
        while True:
            self.executar_busca()
            print(f'\n⏳ Aguardando {SEARCH_INTERVAL_MINUTES} minutos...\n')
            time.sleep(SEARCH_INTERVAL_MINUTES * 60)


def main():
    """Função principal"""
    import sys
    
    bot = PromotionBot()
    
    # Verificar argumentos
    if len(sys.argv) > 1:
        if sys.argv[1] == '--once':
            # Executar apenas uma vez (para testes)
            print('🧪 Modo de teste - Executando uma vez')
            bot.executar_busca()
            return
        elif sys.argv[1] == '--continuous':
            # Modo contínuo
            bot.iniciar_modo_continuo()
            return
    
    # Modo padrão: agendado
    bot.iniciar_modo_agendado()


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print('\n\n👋 Robô finalizado pelo usuário')
    except Exception as e:
        print(f'\n❌ Erro fatal: {e}')
