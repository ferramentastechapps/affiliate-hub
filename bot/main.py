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
from metadata_utils import enriquecer_produto

import json
from pathlib import Path


def wait_for_ai_analysis(api: AffiliateHubAPI, produto_id: str, max_wait: int = 15, intervalo: int = 2) -> dict | None:
    """
    Aguarda até max_wait segundos para o campo aiAnalysis ser preenchido.
    Retorna o produto atualizado ou None se o timeout esgotar.
    """
    elapsed = 0
    while elapsed < max_wait:
        time.sleep(intervalo)
        elapsed += intervalo
        resultado = api.buscar_produto(produto_id)
        if resultado and resultado.get('success'):
            produto = resultado.get('product', {})
            if produto.get('aiAnalysis'):
                print(f'✅ aiAnalysis recebido após {elapsed}s para produto {produto_id}')
                return produto
        print(f'⏳ Aguardando IA... ({elapsed}/{max_wait}s)')
    print(f'⚠️ Timeout aguardando aiAnalysis para {produto_id}. Publicando sem legenda da IA.')
    return None


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
        self.fila_grupo = []
        self.ultimo_envio_grupo = 0
        try:
            if self.state_file.exists():
                with open(self.state_file, 'r', encoding='utf-8') as f:
                    state = json.load(f)
                    
                    # Normalizar os produtos do estado antigo para evitar reenvio
                    loaded_produtos = state.get('produtos', [])
                    for p in loaded_produtos:
                        # Compatibilidade: se é string antiga (nome truncado), mantém
                        # Se é dict novo (do estado futuro), usa chave forte
                        if isinstance(p, dict):
                            chave = self.scraper._gerar_chave_dedup(p)
                        else:
                            # String antiga: mantém compatibilidade
                            chave = p if len(p) <= 64 else self.scraper._normalizar(p)[:60]
                        self.produtos_enviados.add(chave)
                        
                    self.cupons_enviados = set(state.get('cupons', []))
                    self.fila_grupo = state.get('fila_grupo', [])
                    self.ultimo_envio_grupo = state.get('ultimo_envio_grupo', 0)
        except Exception as e:
            print(f'Aviso: Não foi possível carregar o estado anterior: {e}')
            
    def _save_state(self):
        try:
            with open(self.state_file, 'w', encoding='utf-8') as f:
                json.dump({
                    'produtos': list(self.produtos_enviados),
                    'cupons': list(self.cupons_enviados),
                    'fila_grupo': self.fila_grupo,
                    'ultimo_envio_grupo': self.ultimo_envio_grupo
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
            produtos_novos = []
            produtos_duplicados = 0
            for p in produtos:
                chave = self.scraper._gerar_chave_dedup(p)
                if chave not in self.produtos_enviados:
                    produtos_novos.append(p)
                else:
                    produtos_duplicados += 1
            
            cupons_novos = [
                c for c in cupons 
                if c['code'] not in self.cupons_enviados
            ]
            
            # Log de deduplicação
            total_bruto = len(produtos)
            taxa_dedup = (produtos_duplicados / total_bruto * 100) if total_bruto > 0 else 0
            print(f'📊 [Dedup] {total_bruto} encontrados | {produtos_duplicados} duplicados ({taxa_dedup:.1f}%) | {len(produtos_novos)} novos para processar')
            print(f'✨ Novos: {len(produtos_novos)} produtos e {len(cupons_novos)} cupons')
            
            # 3. Adicionar produtos no site e escolher um para o grupo
            if produtos_novos:
                print(f'\n📦 Processando {len(produtos_novos)} produtos novos...')
                print(f'🔗 API URL: {self.api.base_url}')
                
                candidatos_grupo_lote = []  # Candidatos a publicar no grupo DESTE ciclo

                for produto in produtos_novos:
                    print(f'\n📦 Processando produto: {produto["name"][:60]}...')
                    
                    produto = enriquecer_produto(produto)
                    produto['autoApprove'] = True  # Força aprovação direta para ir ao site
                    
                    # Adicionar produto na API
                    resultado = self.api.adicionar_produto(produto)
                    
                    if resultado and resultado.get('success'):
                        produto_retornado = resultado.get('product')
                        if produto_retornado and produto_retornado.get('id'):
                            produto['id'] = produto_retornado['id']
                            print(f'✅ Produto adicionado no site: {produto["id"]}')
                        else:
                            print(f'⚠️ Produto adicionado mas ID não retornado')
                        
                        # Pegamos preço do produto retornado ou original
                        price_val = produto_retornado.get('price') if produto_retornado else None
                        if price_val is None:
                            price_val = produto.get('price')
                        try:
                            price_float = float(price_val) if price_val is not None else 0.0
                        except:
                            price_float = 0.0
                            
                        # Verificar se o produto tem preço válido
                        if price_float > 0:
                            # Coletar links de afiliado do produto retornado
                            links = (produto_retornado.get('links', {}) if produto_retornado else {}) or {}
                            platform = None
                            affiliate_link = None
                            for p_name in ['amazon', 'aliexpress', 'shopee', 'mercadoLivre', 'tiktok', 'netshoes', 'magalu', 'kabum']:
                                if links.get(p_name):
                                    platform = p_name
                                    affiliate_link = links.get(p_name)
                                    break
                            
                            if platform and affiliate_link:
                                candidatos_grupo_lote.append({
                                    'produto': produto_retornado,
                                    'platform': platform,
                                    'affiliate_link': affiliate_link,
                                    'score': produto.get('qualityScore', 0)
                                })
                                print(f'📋 Candidato ao grupo coletado (preço R${price_float:.2f}, score {produto.get("qualityScore", 0)}): {produto["name"][:50]}')
                            else:
                                print(f'⚠️ Produto sem link de afiliado correspondente para o Telegram.')
                        else:
                            print(f'ℹ️ Produto ignorado para o grupo (preço R${price_float:.2f} inválido).')
                            
                        chave = self.scraper._gerar_chave_dedup(produto)
                        self.produtos_enviados.add(chave)
                    else:
                        erro = resultado.get('error') if resultado else 'Falha na comunicação com a API'
                        print(f'❌ Falha ao adicionar "{produto["name"][:40]}": {erro}')
                    
                    # Pausa de 5 segundos para evitar estourar cota do Gemini (429)
                    time.sleep(5)
                
                # Escolher os TOP 3 do lote e ADICIONAR à fila (mantém produtos anteriores)
                if candidatos_grupo_lote:
                    # Ordenar por score (melhor primeiro)
                    candidatos_grupo_lote.sort(key=lambda x: x['score'], reverse=True)
                    
                    # Pegar os 3 melhores (ou menos se houver menos de 3)
                    top3 = candidatos_grupo_lote[:3]
                    descartados = len(candidatos_grupo_lote) - len(top3)
                    
                    print(f'\n🏆 Top {len(top3)} produtos para Telegram:')
                    for i, candidato in enumerate(top3, 1):
                        print(f'   {i}. {candidato["produto"].get("name")[:50]}... (score {candidato["score"]})')
                    
                    if descartados > 0:
                        print(f'🗑️ {descartados} produto(s) descartado(s).')
                    
                    # Aguardar IA gerar legenda para cada produto antes de colocar na fila
                    produtos_adicionados = 0
                    for candidato in top3:
                        produto_com_ia = wait_for_ai_analysis(self.api, candidato['produto']['id'])
                        if produto_com_ia:
                            candidato['produto'] = produto_com_ia
                        
                        # Verificar se tem enhancedImageUrl (foto lifestyle) após o processamento da IA
                        if not candidato['produto'].get('enhancedImageUrl'):
                            print(f"⚠️ Produto sem foto lifestyle após aguardar IA - pulando: {candidato['produto'].get('name')[:50]}")
                            continue
                        
                        # ADICIONA à fila — mantém produtos de ciclos anteriores (publicação a cada 5 min)
                        self.fila_grupo.append(candidato)
                        produtos_adicionados += 1
                    
                    self._save_state()
                    print(f'📥 {produtos_adicionados} produto(s) adicionado(s) à fila. Total na fila: {len(self.fila_grupo)} produto(s).')
                else:
                    print('\nℹ️ Nenhum produto do ciclo atende aos critérios (< R$ 300 com links). Silenciando Telegram neste ciclo.')
            
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
                    self.telegram.enviar_sync('publicar_cupom_grupo', cupom)
                    self.cupons_enviados.add(cupom['code'])
                    time.sleep(3)  # Evitar flood control do Telegram
            
            # 7. Enviar resumo
            if produtos_novos or cupons_novos:
                self.telegram.enviar_sync('resumo', {
                    'produtos': len(produtos_novos),
                    'cupons': len(cupons_novos)
                })
            
            # 8. Salvar o estado para evitar envios duplicados após reinicialização
            self._save_state()
            
            # 9. NÃO processar a fila aqui - deixar o agendamento fazer isso a cada 5 min
            # A fila será processada pelo schedule.every(1).minutes.do(self.publicar_fila_grupo)
            
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
        # Agendar verificações da fila do grupo a cada 1 minuto (ele respeitará o intervalo de 5 min internamente)
        schedule.every(1).minutes.do(self.publicar_fila_grupo)
        
        # Loop principal
        while True:
            schedule.run_pending()
            time.sleep(60)
            
    def publicar_fila_grupo(self):
        """Publica a melhor promoção da fila no grupo respeitando o intervalo de 5 minutos"""
        agora = time.time()
        # Permitir envio se já se passaram 5 minutos (300 segundos) desde o último envio
        if agora - self.ultimo_envio_grupo < 300:
            return

        if not self.fila_grupo:
            return

        print(f'\n⏰ Processando fila do grupo ({len(self.fila_grupo)} itens)...')
        
        # Função para calcular pontuação/desconto
        def get_score(item):
            score = 0
            try:
                p = item['produto'].get('price')
                o = item['produto'].get('originalPrice')
                if p is not None and o is not None:
                    p_float = float(p)
                    o_float = float(o)
                    if o_float > p_float and o_float > 0:
                        score += ((o_float - p_float) / o_float) * 100  # 0 a 100
            except:
                pass
                
            # Bônus por nota da IA (0 a 10 vira 0 a 10)
            ai_score = item['produto'].get('aiScore')
            if ai_score is not None:
                try:
                    score += float(ai_score)
                except:
                    pass
                    
            return score
            
        # Ordenar a fila pelas melhores promoções (maior score: desconto + IA)
        self.fila_grupo.sort(key=get_score, reverse=True)
        
        # Tentar pegar o próximo item válido (produto ainda existe e está ativo no banco)
        melhor_item = None
        itens_removidos = 0
        while self.fila_grupo:
            candidato = self.fila_grupo.pop(0)
            produto_id = candidato.get('produto', {}).get('id')
            
            if not produto_id:
                print(f'⚠️ Item sem ID na fila — descartando.')
                itens_removidos += 1
                continue
            
            # Verificar se o produto ainda existe e está ativo no banco
            resultado = self.api.buscar_produto(produto_id)
            if resultado and resultado.get('success'):
                produto_no_banco = resultado.get('product', {})
                status = produto_no_banco.get('status', '')
                if status in ('active', 'approved'):
                    # Produto válido — atualizar com dados frescos do banco (preço, shortId, etc.)
                    candidato['produto'].update({
                        k: v for k, v in produto_no_banco.items() if v is not None
                    })
                    melhor_item = candidato
                    print(f'✅ Produto confirmado no banco: {produto_id} (status: {status})')
                    break
                else:
                    print(f'⚠️ Produto {produto_id} com status "{status}" — descartando da fila.')
                    itens_removidos += 1
            else:
                print(f'🗑️ Produto {produto_id} não encontrado no banco (foi deletado) — descartando da fila.')
                itens_removidos += 1
        
        if itens_removidos > 0:
            print(f'🧹 {itens_removidos} produto(s) removido(s) da fila por não existirem mais no banco.')
            self._save_state()
        
        if not melhor_item:
            print('📭 Nenhum produto válido na fila para publicar agora.')
            return
        
        print(f'⭐ Publicando melhor promoção no grupo: {melhor_item["produto"].get("name")[:50]} (Score/Desconto: {get_score(melhor_item):.1f})')
        
        self.telegram.enviar_sync('publicar_grupo', melhor_item)
        
        self.ultimo_envio_grupo = agora
        
        # Limitar o tamanho da fila para não crescer infinitamente
        if len(self.fila_grupo) > 50:
            self.fila_grupo = self.fila_grupo[:50]
            
        self._save_state()
    
    def iniciar_modo_continuo(self):
        """Inicia o robô em modo contínuo (para testes)"""
        print('🤖 Robô de Promoções - Modo Contínuo')
        print('='*60)
        
        ultimo_search = 0
        
        while True:
            agora = time.time()
            if agora - ultimo_search >= SEARCH_INTERVAL_MINUTES * 60:
                self.executar_busca()
                ultimo_search = time.time()
                print(f'\n⏳ Aguardando {SEARCH_INTERVAL_MINUTES} minutos para a próxima busca...\n')
            
            self.publicar_fila_grupo()
            time.sleep(60)


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
