"""
Scraper da API Oficial do Mercado Livre
Busca produtos em promoção diretamente na API pública do ML,
sem depender de sites intermediários como Pechinchou ou Promobit.

API Docs: https://developers.mercadolivre.com.br/
"""

import os
import requests
import re
import json
from pathlib import Path
from typing import List, Dict, Optional
from urllib.parse import urlencode


ML_API_BASE = 'https://api.mercadolibre.com'
ML_SITE_ID  = 'MLB'  # Brasil

# Categorias do ML mapeadas para as nossas categorias internas
CATEGORIA_MAP = {
    'MLB1000':  'Informática e Games',      # Tecnologia e Computação
    'MLB1001':  'Informática e Games',      # Acessórios para Veículos
    'MLB1002':  'Informática e Games',      # Agro
    'MLB1144':  'Informática e Games',      # Câmeras e Acessórios
    'MLB1246':  'Casa e Eletrodomésticos',  # Antiguidades e Coleções
    'MLB1276':  'Beleza e Saúde',           # Bebidas e Alimentos
    'MLB1367':  'Diversos',                 # Bebes
    'MLB1368':  'Beleza e Saúde',           # Beleza e Cuidado Pessoal
    'MLB1500':  'Casa e Eletrodomésticos',  # Brinquedos
    'MLB1574':  'Diversos',                 # Calçados, Roupas e Bolsas (Moda)
    'MLB1648':  'Casa e Eletrodomésticos',  # Casa, Móveis e Decoração
    'MLB1649':  'Esportes e Fitness',       # Esportes e Fitness
    'MLB1672':  'Eletrônicos',              # Eletrônicos, Áudio e Vídeo
    'MLB1700':  'Casa e Eletrodomésticos',  # Ferramentas
    'MLB1714':  'Informática e Games',      # Games e Consoles
    'MLB1743':  'Informática e Games',      # Informática
    'MLB1786':  'Eletrônicos',              # Instrumentos Musicais
    'MLB1798':  'Eletrônicos',              # Celulares e Smartphones
    'MLB1805':  'Casa e Eletrodomésticos',  # Eletrodomésticos
    'MLB1852':  'Beleza e Saúde',           # Saúde
    'MLB218519': 'Diversos',                # Serviços
    'MLB3937':  'Informática e Games',      # Acessórios para Notebook/PC
    'MLB5726':  'Eletrônicos',              # TVs e Projetores
    'MLB7440':  'Casa e Eletrodomésticos',  # Construção
}

# Categorias prioritárias para buscar promoções
CATEGORIAS_PRIORITARIAS = [
    'MLB1798',   # Celulares e Smartphones
    'MLB1672',   # Eletrônicos, Áudio e Vídeo
    'MLB5726',   # TVs e Projetores
    'MLB1743',   # Informática
    'MLB1714',   # Games e Consoles
    'MLB1805',   # Eletrodomésticos
    'MLB1648',   # Casa, Móveis e Decoração
    'MLB1574',   # Moda
    'MLB1649',   # Esportes e Fitness
    'MLB1368',   # Beleza e Cuidado Pessoal
]


def _mapear_categoria_ml(category_id: str, category_path: list = None) -> str:
    """Converte categoria do ML para nossa categoria interna"""
    if category_id in CATEGORIA_MAP:
        return CATEGORIA_MAP[category_id]
    # Tentar pelos pais da categoria
    if category_path:
        for parent in category_path:
            pid = parent.get('id', '')
            if pid in CATEGORIA_MAP:
                return CATEGORIA_MAP[pid]
    return 'Diversos'


def _gerar_link_afiliado(url: str, tag: str, word: str = None) -> str:
    """Adiciona os parâmetros de afiliado do ML na URL do produto"""
    if not tag:
        return url
    if not word:
        word = tag
    separator = '&' if '?' in url else '?'
    return f"{url}{separator}matt_tool={tag}&matt_word={word}"


def _extrair_preco(item: dict) -> tuple:
    """Extrai preço atual e original de um item do ML"""
    preco = item.get('price', 0) or 0
    preco_original = None

    # Tentar pegar preço original de vários campos
    original_price = item.get('original_price')
    if original_price and original_price > preco:
        preco_original = original_price

    # Também verificar nos atributos de promoção
    installments = item.get('installments', {}) or {}

    return float(preco), float(preco_original) if preco_original else None


def _calcular_desconto(preco: float, preco_original: float) -> float:
    """Calcula o percentual de desconto"""
    if not preco_original or preco_original <= 0 or preco >= preco_original:
        return 0
    return round((1 - preco / preco_original) * 100, 1)


class MercadoLivreAPIScraper:
    """Busca produtos em promoção diretamente na API oficial do Mercado Livre"""

    def __init__(self):
        self.tag = os.getenv('MERCADOLIVRE_TAG', '')
        self.word = os.getenv('MERCADOLIVRE_WORD', self.tag)
        self.headers = {
            'User-Agent': 'affiliate-hub-bot/1.0',
            'Accept': 'application/json',
        }
        self.min_desconto = float(os.getenv('ML_MIN_DESCONTO_PERCENT', '10'))
        self.max_preco = float(os.getenv('ML_MAX_PRECO', '5000'))
        
        self.token_file = Path(os.path.dirname(__file__)) / 'ml_token.json'
        self.access_token = None
        self.refresh_token = None
        self.client_id = None
        self.client_secret = None
        self._load_tokens()

    def _load_tokens(self):
        if self.token_file.exists():
            try:
                with open(self.token_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.access_token = data.get('access_token')
                    self.refresh_token = data.get('refresh_token')
                    self.client_id = data.get('client_id')
                    self.client_secret = data.get('client_secret')
            except Exception as e:
                print(f'⚠️ Erro ao carregar ml_token.json: {e}')

    def _save_tokens(self):
        try:
            data = {
                'access_token': self.access_token,
                'refresh_token': self.refresh_token,
                'client_id': self.client_id,
                'client_secret': self.client_secret
            }
            with open(self.token_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            print(f'⚠️ Erro ao salvar ml_token.json: {e}')

    def _do_refresh(self) -> bool:
        if not all([self.refresh_token, self.client_id, self.client_secret]):
            print('⚠️ Impossível renovar token: credenciais incompletas.')
            return False
            
        url = f'{ML_API_BASE}/oauth/token'
        data = {
            'grant_type': 'refresh_token',
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'refresh_token': self.refresh_token
        }
        try:
            r = requests.post(url, data=data, timeout=60)
            if r.status_code == 200:
                resp_json = r.json()
                self.access_token = resp_json.get('access_token')
                self.refresh_token = resp_json.get('refresh_token')
                self._save_tokens()
                print('✅ Token do Mercado Livre renovado com sucesso!')
                return True
            else:
                print(f'⚠️ Erro ao renovar token ML: {r.status_code} {r.text}')
                return False
        except Exception as e:
            print(f'⚠️ Exceção ao renovar token ML: {e}')
            return False

    def _request(self, method: str, url: str, **kwargs) -> requests.Response:
        """Faz requisição e trata token expirado (401/403)"""
        if self.access_token:
            headers = kwargs.get('headers', self.headers.copy())
            headers['Authorization'] = f'Bearer {self.access_token}'
            kwargs['headers'] = headers
            
        r = requests.request(method, url, **kwargs)
        
        # Se for 401 ou 403 e tivermos os dados de refresh, tenta renovar 1 vez
        if r.status_code in (401, 403) and self.refresh_token:
            print('🔄 Token do ML parece expirado ou inválido. Tentando renovar...')
            if self._do_refresh():
                # Tenta novamente com o novo token
                headers = kwargs.get('headers', self.headers.copy())
                headers['Authorization'] = f'Bearer {self.access_token}'
                kwargs['headers'] = headers
                r = requests.request(method, url, **kwargs)
        
        return r

    def _buscar_destaques_categoria(self, category_id: str, limite: int = 10) -> List[dict]:
        """Busca produtos em destaque/promoção de uma categoria"""
        try:
            url = f"{ML_API_BASE}/sites/{ML_SITE_ID}/search"
            params = {
                'category': category_id,
                'sort': 'relevance',
                'limit': limite,
                'promotions': 'DEAL',  # Apenas produtos com promoção ativa
            }
            r = self._request('GET', url, params=params, timeout=10)
            if r.status_code == 200:
                data = r.json()
                return data.get('results', [])
        except Exception as e:
            print(f'  ⚠️ Erro ao buscar categoria {category_id}: {e}')
        return []

    def _buscar_produtos_desconto(self, category_id: str, limite: int = 10) -> List[dict]:
        """Busca produtos com desconto mais agressivo (sem filtro DEAL que nem sempre funciona)"""
        try:
            url = f"{ML_API_BASE}/sites/{ML_SITE_ID}/search"
            params = {
                'category': category_id,
                'sort': 'relevance',
                'limit': limite,
            }
            r = self._request('GET', url, params=params, timeout=10)
            if r.status_code == 200:
                data = r.json()
                return data.get('results', [])
        except Exception as e:
            print(f'  ⚠️ Erro ao buscar categoria {category_id}: {e}')
        return []

    def _buscar_trends(self) -> List[dict]:
        """Busca produtos em tendência no ML"""
        try:
            url = f"{ML_API_BASE}/sites/{ML_SITE_ID}/trends"
            r = self._request('GET', url, timeout=10)
            if r.status_code == 200:
                trends = r.json()
                keywords = [t.get('keyword', '') for t in trends[:5]]
                
                produtos = []
                for kw in keywords:
                    if not kw:
                        continue
                    search_url = f"{ML_API_BASE}/sites/{ML_SITE_ID}/search"
                    params = {'q': kw, 'sort': 'relevance', 'limit': 5}
                    sr = self._request('GET', search_url, params=params, timeout=10)
                    if sr.status_code == 200:
                        produtos.extend(sr.json().get('results', []))
                return produtos
        except Exception as e:
            print(f'  ⚠️ Erro ao buscar trends: {e}')
        return []

    def _item_para_produto(self, item: dict) -> Optional[dict]:
        """Converte um item da API do ML para o formato do nosso sistema"""
        try:
            nome = item.get('title', '').strip()
            if not nome:
                return None

            preco, preco_original = _extrair_preco(item)
            if preco <= 0 or preco > self.max_preco:
                return None

            desconto = _calcular_desconto(preco, preco_original)

            # Link do produto com tag de afiliado
            link_ml = item.get('permalink', '')
            if not link_ml:
                return None
            link_afiliado = _gerar_link_afiliado(link_ml, self.tag, self.word)

            # Imagem — buscar a maior resolução disponível
            # Prioridade 1: campo 'pictures' da API do ML (retorna URLs em alta qualidade)
            pictures = item.get('pictures', [])
            images = []
            if pictures and isinstance(pictures, list):
                for pic in pictures[:8]:
                    pic_url = pic.get('secure_url') or pic.get('url')
                    if pic_url:
                        images.append(pic_url)
            
            imagem_url = images[0] if images else ''

            # Prioridade 2: thumbnail com substituição para versão original (-O.)
            if not imagem_url:
                thumbnail = item.get('thumbnail', '')
                if thumbnail:
                    # Substituir sufixos de baixa/média resolução pelo original (máxima qualidade)
                    import re as _re
                    imagem_url = _re.sub(r'-[A-Z]\.(jpg|jpeg|png|webp)', r'-O.\1', thumbnail, flags=_re.IGNORECASE)
                    if imagem_url == thumbnail:
                        imagem_url = thumbnail.replace('-I.', '-O.').replace('-V.', '-O.')
            
            # Garantir que a imagem principal esteja na lista de images, se possível
            if imagem_url and imagem_url not in images:
                images.insert(0, imagem_url)
            
            # Limitar a 8 imagens
            images = images[:8]

            # Categoria
            category_id = item.get('category_id', '')
            categoria = _mapear_categoria_ml(category_id)

            # Vendedor e condição
            vendedor = item.get('seller', {}) or {}
            condicao = item.get('condition', 'new')
            condicao_str = 'Novo' if condicao == 'new' else 'Usado'

            # Frete grátis
            shipping = item.get('shipping', {}) or {}
            frete_gratis = shipping.get('free_shipping', False)

            descricao = f"Oferta na loja Mercado Livre\n{condicao_str}"
            if frete_gratis:
                descricao += ' • Frete Grátis'
            if desconto >= self.min_desconto and preco_original:
                descricao += f' • {desconto:.0f}% OFF'

            # Extração de Atributos (Brand, Model)
            attributes = item.get('attributes', [])
            brand_api = None
            model_api = None
            if isinstance(attributes, list):
                for attr in attributes:
                    attr_id = attr.get('id')
                    if attr_id == 'BRAND':
                        brand_api = attr.get('value_name')
                    elif attr_id == 'MODEL':
                        model_api = attr.get('value_name')

            platform_product_id = item.get('id')
            external_id = platform_product_id

            return {
                'name': nome,
                'category': categoria,
                'description': descricao,
                'imageUrl': imagem_url,
                'images': images,
                'price': preco,
                'originalPrice': preco_original,
                'desconto_percent': desconto,
                'storeName': 'Mercado Livre',
                'brand': brand_api,
                'model': model_api,
                'platformProductId': platform_product_id,
                'externalId': external_id,
                'source': 'mercadolivre_api',
                'platformType': 'mercadolivre',
                'platformId': platform_product_id,
                'links': {
                    'mercadoLivre': link_afiliado,
                },
                'frete_gratis': frete_gratis,
            }
        except Exception as e:
            print(f'  ⚠️ Erro ao converter item ML: {e}')
            return None

    def buscar_promocoes_mercadolivre(self, limite_por_categoria: int = 8) -> List[dict]:
        """Busca promoções do Mercado Livre via API oficial"""
        print('🛒 Buscando promoções no Mercado Livre (API Oficial)...')
        
        if not self.tag:
            print('  ⚠️ MERCADOLIVRE_TAG não configurada no .env! Links serão sem tag de afiliado.')

        todos_itens = []
        ids_vistos = set()

        for cat_id in CATEGORIAS_PRIORITARIAS:
            itens = self._buscar_produtos_desconto(cat_id, limite=limite_por_categoria)
            for item in itens:
                item_id = item.get('id', '')
                if item_id and item_id not in ids_vistos:
                    ids_vistos.add(item_id)
                    todos_itens.append(item)

        # Também buscar trends
        trend_itens = self._buscar_trends()
        for item in trend_itens:
            item_id = item.get('id', '')
            if item_id and item_id not in ids_vistos:
                ids_vistos.add(item_id)
                todos_itens.append(item)

        print(f'  📦 {len(todos_itens)} itens brutos encontrados no ML')

        # Converter para o formato do sistema
        produtos = []
        for item in todos_itens:
            produto = self._item_para_produto(item)
            if produto:
                # Filtrar: preferir produtos com desconto ativo
                desconto = produto.get('desconto_percent', 0)
                preco_original = produto.get('originalPrice')
                # Aceita: com desconto OU frete grátis OU preço baixo razoável
                if desconto >= self.min_desconto or produto.get('frete_gratis') or (preco_original and preco_original > produto['price']):
                    produtos.append(produto)

        print(f'  ✅ {len(produtos)} produtos com desconto/promoção do ML encontrados')
        return produtos
