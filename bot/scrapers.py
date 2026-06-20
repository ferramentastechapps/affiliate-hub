import requests
from bs4 import BeautifulSoup
from typing import List, Dict, Optional
import re
from config import CATEGORIES, MIN_DISCOUNT_PERCENT


def _melhorar_qualidade_imagem(url: str) -> str:
    """
    Tenta obter a versão de maior qualidade de uma URL de imagem de produto.
    Suporta: Mercado Livre, Amazon, Shopee, e CDNs genéricos.
    """
    if not url or 'placeholder' in url:
        return url

    # --- Mercado Livre ---
    # Padrão: https://http2.mlstatic.com/D_NQ_NP_XXXXX-MLB_XXXXX-I.jpg
    # Sufixos de tamanho: -I (interme.), -V (variante), -S (small), -F, -O (original/máx)
    if 'mlstatic.com' in url or 'mla-s' in url or 'mlimg' in url:
        url = re.sub(r'-[A-Z]\.(jpg|jpeg|png|webp)', r'-O.\1', url, flags=re.IGNORECASE)
        return url

    # --- Amazon ---
    # Padrão: https://m.media-amazon.com/images/I/XXXXX._SX300_.jpg
    # Remover restrições de tamanho (._SX300_, ._AC_SX450_, etc.) para obter imagem original
    if 'amazon.com' in url or 'media-amazon.com' in url:
        # Remove qualquer ._XXXX_. (parâmetros de resize da Amazon)
        url = re.sub(r'\._[A-Z0-9_,]+_\.', '.', url)
        return url

    # --- Shopee ---
    # Padrão: https://down-br.img.susercontent.com/file/XXXXX
    # Shopee usa sufixos como _tn (thumbnail), removendo fica a original
    if 'susercontent.com' in url or 'shopee' in url.lower():
        url = re.sub(r'_tn$', '', url)  # Remove sufixo de thumbnail
        return url

    # --- Promobit CDN (i.promobit.com.br) ---
    # Promobit redimensiona: ?w=200&h=200 — sem parâmetros = qualidade máxima
    if 'promobit.com.br' in url:
        # Remove parâmetros de resize se existirem
        url = url.split('?')[0]
        return url

    return url


try:
    from scraper_ml import MercadoLivreAPIScraper
    _ml_scraper = MercadoLivreAPIScraper()
except Exception as _e:
    print(f'⚠️ Scraper ML não carregado: {_e}')
    _ml_scraper = None


class PromotionScraper:
    """Busca promoções em diferentes sites"""

    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }

    def buscar_promocoes_pelando(self, limite: int = 15) -> List[Dict]:
        """Busca as promoções mais recentes do Promobit (ex Pelando)"""
        produtos = []
        try:
            print('🔥 Buscando promoções reais no Promobit...')
            response = requests.get('https://www.promobit.com.br/', headers=self.headers, timeout=15)
            if response.status_code != 200:
                print(f'❌ Erro HTTP Promobit: {response.status_code}')
                return produtos

            import json
            soup = BeautifulSoup(response.content, 'html.parser')
            script = soup.find('script', id='__NEXT_DATA__')
            if not script:
                return produtos

            data = json.loads(script.string)
            offers = data.get('props', {}).get('pageProps', {}).get('serverOffers', {}).get('offers', [])

            for offer in offers[:limite]:
                try:
                    nome = offer.get('offerTitle', 'Sem título')
                    # Usar o link direto do produto (evita passar pela página do Promobit)
                    # offerUrl pode ser: (a) link direto da loja, (b) link social do ML com ref=
                    link_direto = offer.get('offerUrl') or offer.get('offer_url') or offer.get('url')
                    link_oferta = f"https://www.promobit.com.br/oferta/{offer.get('offerSlug', '')}-{offer.get('offerId', '')}"

                    # Diagnóstico: identificar tipo de link
                    if link_direto and 'mercadolivre.com.br/social/' in link_direto.lower():
                        # É um link social do ML — preservar o ref= intacto para resolveRedirect
                        # O next.js affiliate.ts tentará decodificar o ref= para obter o produto
                        print(f'  ⚠️  [Promobit] offerUrl é link social ML: {link_direto[:80]}')
                        link_produto = link_direto  # Preservar com ref= para resolveRedirect
                    elif link_direto:
                        link_produto = link_direto  # Link direto da loja
                    else:
                        link_produto = link_oferta  # Fallback: página do Promobit
                        print(f'  ⚠️  [Promobit] offerUrl ausente, usando link da página do Promobit')

                    loja = offer.get('storeName', 'Desconhecido')
                    links = self._criar_links(link_produto, loja)

                    preco = float(offer.get('offerPrice', 0))
                    foto = offer.get('offerPhoto')
                    if foto:
                        # Montar URL completa do CDN do Promobit e garantir máxima qualidade
                        imagem_raw = f"https://i.promobit.com.br{foto}" if foto.startswith('/') else foto
                        imagem_url = _melhorar_qualidade_imagem(imagem_raw)
                    else:
                        imagem_url = '/placeholder.webp'

                    # Tentar pegar categoria do Promobit primeiro
                    categoria_promobit = offer.get('categoryName') or offer.get('category', {}).get('name')
                    if categoria_promobit:
                        categoria = self._mapear_categoria_promobit(categoria_promobit)
                    else:
                        categoria = self._detectar_categoria(nome)

                    # Cupom: tentar vários campos possíveis do JSON do Promobit
                    # Nota: 'coupon' pode retornar "NORMAL" (tipo de desconto), não um código real
                    _VALORES_INVALIDOS_CUPOM = {
                        'NORMAL', 'NONE', 'NULL', 'N/A', 'NA', '',
                        'ADMIN', 'GRATIS', 'FREE', 'DESCONTO', 'OFERTA',
                        'PROMO', 'PROMOBIT', 'PECHINCHOU', 'PELANDO',
                        'DISCOUNT', 'COUPON', 'CODE', 'CUPOM', 'CODIGO',
                        'SIM', 'NAO', 'YES', 'NO', 'TRUE', 'FALSE',
                    }
                    def _cupom_valido(v):
                        return v and str(v).strip().upper() not in _VALORES_INVALIDOS_CUPOM

                    cupom = next(
                        (v for v in [
                            offer.get('offerCoupon'),
                            offer.get('couponCode'),
                            offer.get('coupon'),
                            offer.get('offerCode'),
                            offer.get('discountCode'),
                        ] if _cupom_valido(v)),
                        ''
                    )
                    # Fallback: procurar no título
                    if not cupom:
                        match = re.search(r'cupom[:\s]+([a-zA-Z0-9_-]+)', nome, re.IGNORECASE)
                        if match:
                            cupom = match.group(1).upper()
                    # Fallback: procurar na descrição da oferta
                    if not cupom:
                        descricao_oferta = offer.get('offerDescription', '') or ''
                        match = re.search(r'cupom[:\s]+([a-zA-Z0-9_-]+)', descricao_oferta, re.IGNORECASE)
                        if match:
                            cupom = match.group(1).upper()
                    # Fallback: extrair do texto completo da oferta
                    if not cupom:
                        texto_completo = str(offer)
                        cupom = self._extrair_cupom_texto(texto_completo)

                    descricao = f"Oferta na loja {loja} no Promobit"
                    if cupom and str(cupom).strip():
                        descricao += f"\n🎟️ CUPOM: {cupom}"

                    LOJAS_COM_AFILIADO = {'Amazon', 'Mercado Livre', 'Magalu', 'AliExpress', 'KaBuM'}
                    produtos.append({
                        'name': nome,
                        'category': categoria,
                        'description': descricao,
                        'imageUrl': imagem_url,
                        'price': preco,
                        'originalPrice': float(offer.get('offerOriginalPrice', 0)) if offer.get('offerOriginalPrice') else None,
                        'links': links,
                        'storeName': loja,
                        'autoApprove': loja in LOJAS_COM_AFILIADO
                    })
                    print(f'  ✅ {nome[:50]}...')
                except Exception as e:
                    print(f'  ⚠️  Erro ao processar oferta: {e}')

        except Exception as e:
            print(f'❌ Erro ao buscar no Promobit: {e}')
        return produtos

    def buscar_cupons_pelando(self, limite: int = 10) -> List[Dict]:
        """Busca cupons reais no Promobit"""
        cupons = []
        try:
            print('🎫 Buscando cupons no Promobit...')
            response = requests.get('https://www.promobit.com.br/cupons', headers=self.headers, timeout=15)
            if response.status_code != 200:
                print(f'❌ Erro HTTP Promobit Cupons: {response.status_code}')
                return cupons

            import json
            soup = BeautifulSoup(response.content, 'html.parser')
            script = soup.find('script', id='__NEXT_DATA__')
            if not script:
                return cupons

            data = json.loads(script.string)
            lista_cupons = data.get('props', {}).get('pageProps', {}).get('serverCoupons', {}).get('coupons', [])

            for c in lista_cupons[:limite]:
                try:
                    codigo = c.get('couponCode')
                    if not codigo:
                        continue

                    loja = c.get('storeName', 'Vários')
                    desc = c.get('couponTitle') or c.get('couponInstructions') or 'Cupom de desconto'
                    desconto = c.get('couponDiscountShort', 'Oferta')

                    cupons.append({
                        'code': codigo.upper(),
                        'description': desc[:190],
                        'discount': desconto,
                        'platform': loja
                    })
                    print(f'  ✅ Cupom {codigo}')
                except Exception as e:
                    print(f'  ⚠️  Erro ao processar cupom: {e}')
        except Exception as e:
            print(f'❌ Erro ao buscar cupons: {e}')
        return cupons

    # Palavras em maiúsculas que NÃO são cupons
    _NAO_CUPOM = {
        'WIFI', 'HDMI', 'USB', 'SSD', 'RAM', 'CPU', 'GPU', 'LED', 'LCD',
        'UHD', 'FHD', 'QHD', 'HDR', 'PS4', 'PS5', 'PS3', 'OLED', 'QLED',
        'AMOLED', 'FULL', 'SMART', 'DUAL', 'QUAD', 'CORE', 'PLUS', 'MINI',
        'ULTRA', 'PRO', 'MAX', 'LITE', 'SLIM', 'TURBO', 'BOOST', 'FAST',
        'WIFI6', 'WIFI5', 'HDMI2', 'USB3', 'TYPE', 'INCH', 'BTUS', 'BTUH',
        'SAMSUNG', 'APPLE', 'SONY', 'ASUS', 'INTEL', 'NVIDIA', 'AMD',
        'EPSON', 'PHILIPS', 'LENOVO', 'XIAOMI', 'MOTOROLA', 'LOGITECH',
        'INTELBRAS', 'GAINWARD', 'HISENSE', 'SAFETY', 'NINTENDO', 'SWITCH',
        'GALAXY', 'IPHONE', 'AIRPOD', 'MACBOOK', 'IPAD',
    }

    def _extrair_cupom_texto(self, texto: str) -> str:
        """Extrai código de cupom de um texto. Retorna string vazia se não encontrar."""
        # Padrão 1: letras maiúsculas + números (ex: CAMISA10, KABUM15, MELIMODA18)
        for m in re.finditer(r'\b([A-Z]{3,}[0-9]{1,4}|[A-Z]{2,}[0-9]{2,}[A-Z]*)\b', texto):
            c = m.group(1)
            if c not in self._NAO_CUPOM and len(c) >= 4:
                return c
        # Padrão 2: só letras maiúsculas com 5+ chars que não sejam marcas (ex: MELIMODA)
        for m in re.finditer(r'\b([A-Z]{5,15})\b', texto):
            c = m.group(1)
            if c not in self._NAO_CUPOM:
                return c
        return ''

    def buscar_promocoes_promobyte(self, limite: int = 15) -> List[Dict]:
        """Busca promoções do Promobyte (promobyte.site)"""
        produtos = []
        vistos: set = set()
        # Buscar em múltiplas páginas para ter mais variedade
        urls_busca = [
            'https://promobyte.site/promocoes-do-dia',
            'https://promobyte.site/lojas/amazon',
            'https://promobyte.site/lojas/mercadolivre',
        ]
        try:
            print('🔥 Buscando promoções no Promobyte...')
            for url in urls_busca:
                if len(produtos) >= limite:
                    break
                try:
                    response = requests.get(url, headers=self.headers, timeout=15)
                    print(f'   📡 {url} - Status: {response.status_code}')
                    if response.status_code != 200:
                        print(f'   ⚠️  Pulando URL (status {response.status_code})')
                        continue

                    soup = BeautifulSoup(response.content, 'html.parser')
                    # Promobyte mudou de /p/ para /promo
                    cards = soup.select('a[href*="/promo"]')
                    print(f'   📦 Encontrados {len(cards)} cards nesta página')

                    for card in cards:
                        if len(produtos) >= limite:
                            break
                        try:
                            link = card.get('href', '')
                            if not link.startswith('http'):
                                link = 'https://promobyte.site' + link
                            if link in vistos:
                                continue
                            vistos.add(link)

                            texto = card.get_text(separator=' ', strip=True)

                            # Nome: texto antes do "há Xh/Xmin"
                            partes = re.split(r'\s+há\s+\d+\s*[mh]', texto)
                            nome = re.sub(r'^-?\d+%\s*', '', partes[0].strip())
                            if not nome or len(nome) < 5:
                                continue

                            # Preços
                            precos_raw = re.findall(r'R\$\s*([\d.,]+)', texto)
                            preco = None
                            preco_original = None
                            if len(precos_raw) >= 2:
                                preco_original = self._extrair_preco('R$ ' + precos_raw[0])
                                preco = self._extrair_preco('R$ ' + precos_raw[-1])
                            elif len(precos_raw) == 1:
                                preco = self._extrair_preco('R$ ' + precos_raw[0])

                            # Cupom — extrair da parte APÓS o "há Xh" para evitar
                            # pegar siglas do nome do produto
                            texto_pos_tempo = texto
                            if len(partes) > 1:
                                texto_pos_tempo = ' '.join(partes[1:])
                            cupom = self._extrair_cupom_texto(texto_pos_tempo)

                            loja = self._detectar_loja_promobyte(texto, url)
                            links = self._criar_links(link, loja)
                            categoria = self._detectar_categoria(nome)

                            descricao = f"Oferta no Promobyte via {loja}"
                            if cupom:
                                descricao += f"\n🎟️ CUPOM: {cupom}"

                            produtos.append({
                                'name': nome[:200],
                                'category': categoria,
                                'description': descricao,
                                'imageUrl': '/placeholder.webp',
                                'price': preco,
                                'originalPrice': preco_original,
                                'links': links,
                                'storeName': loja
                            })
                            cupom_log = f' 🎟️ {cupom}' if cupom else ''
                            print(f'  ✅ [Promobyte] {nome[:45]}...{cupom_log}')
                        except Exception as e:
                            print(f'  ⚠️  Erro ao processar oferta Promobyte: {e}')
                except Exception as e:
                    print(f'  ❌ Erro ao acessar {url}: {e}')

        except Exception as e:
            print(f'❌ Erro ao buscar no Promobyte: {e}')
        
        print(f'   ✅ Total Promobyte: {len(produtos)} produtos')
        return produtos

    def _detectar_loja_promobyte(self, texto: str, url: str) -> str:
        """Detecta a loja de uma oferta do Promobyte"""
        t = texto.lower()
        u = url.lower()
        if 'mercado livre' in t or 'mercadolivre' in t or 'melimoda' in t or 'mercadolivre' in u:
            return 'Mercado Livre'
        if 'shopee' in t or 'shopee' in u:
            return 'Shopee'
        if 'aliexpress' in t or 'aliexpress' in u:
            return 'AliExpress'
        if 'kabum' in t or 'kabum' in u:
            return 'KaBuM'
        if 'magalu' in t or 'magazine' in t or 'magalu' in u:
            return 'Magalu'
        if 'terabyte' in t or 'terabyte' in u:
            return 'Terabyte'
        if 'casas bahia' in t:
            return 'Casas Bahia'
        if 'americanas' in t:
            return 'Americanas'
        return 'Amazon'

    def buscar_promocoes_pelando_site(self, limite: int = 15) -> List[Dict]:
        """Busca promoções do Pelando (pelando.com.br)"""
        produtos = []
        try:
            print('🔥 Buscando promoções no Pelando...')
            response = requests.get('https://www.pelando.com.br', headers=self.headers, timeout=15)
            print(f'   📡 Status: {response.status_code}')
            if response.status_code != 200:
                print(f'❌ Erro HTTP Pelando: {response.status_code}')
                return produtos

            soup = BeautifulSoup(response.content, 'html.parser')

            # Links de deals: /d/slug-HASH
            cards = soup.select('a[href*="/d/"]')
            print(f'   📦 Encontrados {len(cards)} cards')
            vistos = set()

            for card in cards:
                if len(produtos) >= limite:
                    break
                try:
                    link = card.get('href', '')
                    if not link.startswith('http'):
                        link = 'https://www.pelando.com.br' + link
                    # Deduplicar
                    slug = link.split('?')[0]
                    if slug in vistos:
                        continue
                    vistos.add(slug)

                    # Nome: texto do <h3> ou <a> mais próximo
                    h3 = card.find('h3')
                    nome = h3.get_text(strip=True) if h3 else card.get_text(separator=' ', strip=True)[:100]
                    nome = re.sub(r'\s+', ' ', nome).strip()
                    if not nome or len(nome) < 5:
                        continue

                    texto = card.get_text(separator=' ', strip=True)

                    # Preço
                    precos = re.findall(r'R\$\s*([\d.,]+)', texto)
                    preco = None
                    preco_original = None
                    if precos:
                        if len(precos) >= 2:
                            preco_original = self._extrair_preco('R$ ' + precos[0])
                            preco = self._extrair_preco('R$ ' + precos[-1])
                        else:
                            preco = self._extrair_preco('R$ ' + precos[0])

                    # Loja
                    loja = 'Amazon'
                    texto_lower = texto.lower()
                    if 'mercado livre' in texto_lower:
                        loja = 'Mercado Livre'
                    elif 'shopee' in texto_lower:
                        loja = 'Shopee'
                    elif 'aliexpress' in texto_lower:
                        loja = 'AliExpress'
                    elif 'kabum' in texto_lower:
                        loja = 'KaBuM'
                    elif 'magalu' in texto_lower or 'magazine' in texto_lower:
                        loja = 'Magalu'
                    elif 'casas bahia' in texto_lower:
                        loja = 'Casas Bahia'
                    elif 'americanas' in texto_lower:
                        loja = 'Americanas'

                    links = self._criar_links(link, loja)
                    categoria = self._detectar_categoria(nome)

                    produtos.append({
                        'name': nome[:200],
                        'category': categoria,
                        'description': f"Oferta no Pelando via {loja}",
                        'imageUrl': '/placeholder.webp',
                        'price': preco,
                        'originalPrice': preco_original,
                        'links': links,
                        'storeName': loja
                    })
                    print(f'  ✅ [Pelando] {nome[:50]}...')
                except Exception as e:
                    print(f'  ⚠️  Erro ao processar oferta Pelando: {e}')

        except Exception as e:
            print(f'❌ Erro ao buscar no Pelando: {e}')
        
        print(f'   ✅ Total Pelando: {len(produtos)} produtos')
        return produtos

    def buscar_promocoes_gatry(self, limite: int = 15) -> List[Dict]:
        """Busca promoções do Gatry (agregador de promoções)"""
        produtos = []
        try:
            print('🔥 Buscando promoções no Gatry...')
            url = 'https://gatry.com/promocoes'
            response = requests.get(url, headers=self.headers, timeout=15)
            print(f'   📡 Status: {response.status_code}')
            
            if response.status_code != 200:
                print(f'❌ Erro HTTP Gatry: {response.status_code}')
                return produtos

            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Gatry usa cards de promoção
            cards = soup.select('article.deal-card, div.deal-item, a[href*="/deal/"]')
            print(f'   📦 Encontrados {len(cards)} cards')
            
            for card in cards[:limite]:
                try:
                    # Buscar título
                    titulo_elem = card.select_one('h2, h3, .deal-title, .title')
                    if not titulo_elem:
                        continue
                    
                    nome = titulo_elem.get_text(strip=True)
                    
                    # Buscar link
                    link_elem = card if card.name == 'a' else card.select_one('a[href*="/deal/"]')
                    link = link_elem.get('href', '') if link_elem else ''
                    
                    if not link.startswith('http'):
                        link = 'https://gatry.com' + link
                    
                    # Buscar preço
                    preco_elem = card.select_one('.price, .deal-price, [class*="price"]')
                    preco = None
                    if preco_elem:
                        preco = self._extrair_preco(preco_elem.get_text())
                    
                    # Detectar loja do texto
                    texto_lower = nome.lower()
                    loja = 'Amazon'
                    if 'mercado livre' in texto_lower or 'mercadolivre' in texto_lower:
                        loja = 'Mercado Livre'
                    elif 'shopee' in texto_lower:
                        loja = 'Shopee'
                    elif 'kabum' in texto_lower:
                        loja = 'KaBuM'
                    elif 'magalu' in texto_lower:
                        loja = 'Magalu'
                    elif 'aliexpress' in texto_lower:
                        loja = 'AliExpress'
                    
                    links = self._criar_links(link, loja)
                    categoria = self._detectar_categoria(nome)
                    
                    produtos.append({
                        'name': nome[:200],
                        'category': categoria,
                        'description': f"Oferta no Gatry via {loja}",
                        'imageUrl': '/placeholder.webp',
                        'price': preco,
                        'links': links,
                        'storeName': loja
                    })
                    print(f'  ✅ [Gatry] {nome[:50]}...')
                    
                except Exception as e:
                    print(f'  ⚠️  Erro ao processar card Gatry: {e}')
            
        except Exception as e:
            print(f'❌ Erro ao buscar no Gatry: {e}')
        
        print(f'   ✅ Total Gatry: {len(produtos)} produtos')
        return produtos

    def buscar_promocoes_zoom(self, limite: int = 15) -> List[Dict]:
        """Busca ofertas do Zoom (comparador de preços)"""
        produtos = []
        try:
            print('🔥 Buscando ofertas no Zoom...')
            url = 'https://www.zoom.com.br/ofertas'
            response = requests.get(url, headers=self.headers, timeout=15)
            print(f'   📡 Status: {response.status_code}')
            
            if response.status_code != 200:
                print(f'❌ Erro HTTP Zoom: {response.status_code}')
                return produtos

            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Zoom usa cards de produto
            cards = soup.select('div[data-product], article.product, div.ProductCard, a[href*="/produto/"]')
            print(f'   📦 Encontrados {len(cards)} cards')
            
            for card in cards[:limite]:
                try:
                    # Nome do produto
                    nome_elem = card.select_one('h2, h3, .product-name, .ProductCard__Name, [class*="title"]')
                    if not nome_elem:
                        continue
                    
                    nome = nome_elem.get_text(strip=True)
                    
                    # Link do produto
                    link_elem = card if card.name == 'a' else card.select_one('a[href*="/produto/"]')
                    link = link_elem.get('href', '') if link_elem else ''
                    
                    if link and not link.startswith('http'):
                        link = 'https://www.zoom.com.br' + link
                    
                    # Preço
                    preco_elem = card.select_one('.price, .ProductCard__Price, [class*="price"]')
                    preco = None
                    if preco_elem:
                        preco = self._extrair_preco(preco_elem.get_text())
                    
                    # Imagem
                    img_elem = card.select_one('img')
                    imagem_url = '/placeholder.webp'
                    if img_elem:
                        imagem_url = img_elem.get('src') or img_elem.get('data-src') or imagem_url
                        if imagem_url.startswith('//'):
                            imagem_url = 'https:' + imagem_url
                    
                    # Detectar loja (Zoom mostra várias lojas, pegar a mais barata)
                    loja = 'Amazon'  # Default
                    loja_elem = card.select_one('.store-name, .seller, [class*="store"]')
                    if loja_elem:
                        loja_texto = loja_elem.get_text(strip=True).lower()
                        if 'mercado livre' in loja_texto:
                            loja = 'Mercado Livre'
                        elif 'shopee' in loja_texto:
                            loja = 'Shopee'
                        elif 'kabum' in loja_texto:
                            loja = 'KaBuM'
                        elif 'magalu' in loja_texto:
                            loja = 'Magalu'
                    
                    links = self._criar_links(link, loja)
                    categoria = self._detectar_categoria(nome)
                    
                    produtos.append({
                        'name': nome[:200],
                        'category': categoria,
                        'description': f"Melhor preço no Zoom via {loja}",
                        'imageUrl': imagem_url,
                        'price': preco,
                        'links': links,
                        'storeName': loja
                    })
                    print(f'  ✅ [Zoom] {nome[:50]}...')
                    
                except Exception as e:
                    print(f'  ⚠️  Erro ao processar produto Zoom: {e}')
            
        except Exception as e:
            print(f'❌ Erro ao buscar no Zoom: {e}')
        
        print(f'   ✅ Total Zoom: {len(produtos)} produtos')
        return produtos

    def buscar_promocoes_buscape(self, limite: int = 15) -> List[Dict]:
        """Busca ofertas e cupons do Buscapé"""
        produtos = []
        try:
            print('🔥 Buscando ofertas no Buscapé...')
            url = 'https://www.buscape.com.br/ofertas'
            response = requests.get(url, headers=self.headers, timeout=15)
            print(f'   📡 Status: {response.status_code}')
            
            if response.status_code != 200:
                print(f'❌ Erro HTTP Buscapé: {response.status_code}')
                return produtos

            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Buscapé usa cards de oferta
            cards = soup.select('div.offer-card, article.offer, div[data-offer], a[href*="/oferta/"]')
            print(f'   📦 Encontrados {len(cards)} cards')
            
            for card in cards[:limite]:
                try:
                    # Nome do produto
                    nome_elem = card.select_one('h2, h3, .offer-title, .product-title, [class*="title"]')
                    if not nome_elem:
                        continue
                    
                    nome = nome_elem.get_text(strip=True)
                    
                    # Link
                    link_elem = card if card.name == 'a' else card.select_one('a[href*="/oferta/"], a[href*="/produto/"]')
                    link = link_elem.get('href', '') if link_elem else ''
                    
                    if link and not link.startswith('http'):
                        link = 'https://www.buscape.com.br' + link
                    
                    # Preço
                    preco_elem = card.select_one('.price, .offer-price, [class*="price"]')
                    preco = None
                    preco_original = None
                    
                    if preco_elem:
                        texto_preco = preco_elem.get_text()
                        precos = re.findall(r'R\$\s*([\d.,]+)', texto_preco)
                        if len(precos) >= 2:
                            preco_original = self._extrair_preco('R$ ' + precos[0])
                            preco = self._extrair_preco('R$ ' + precos[-1])
                        elif len(precos) == 1:
                            preco = self._extrair_preco('R$ ' + precos[0])
                    
                    # Imagem
                    img_elem = card.select_one('img')
                    imagem_url = '/placeholder.webp'
                    if img_elem:
                        imagem_url = img_elem.get('src') or img_elem.get('data-src') or imagem_url
                        if imagem_url.startswith('//'):
                            imagem_url = 'https:' + imagem_url
                    
                    # Detectar loja
                    loja = 'Amazon'
                    loja_elem = card.select_one('.store, .seller, [class*="store"]')
                    if loja_elem:
                        loja_texto = loja_elem.get_text(strip=True).lower()
                        if 'mercado livre' in loja_texto:
                            loja = 'Mercado Livre'
                        elif 'shopee' in loja_texto:
                            loja = 'Shopee'
                        elif 'kabum' in loja_texto:
                            loja = 'KaBuM'
                        elif 'magalu' in loja_texto:
                            loja = 'Magalu'
                        elif 'americanas' in loja_texto:
                            loja = 'Americanas'
                    
                    # Buscar cupom no card
                    cupom = ''
                    cupom_elem = card.select_one('.coupon, [class*="cupom"]')
                    if cupom_elem:
                        cupom = cupom_elem.get_text(strip=True)
                    
                    links = self._criar_links(link, loja)
                    categoria = self._detectar_categoria(nome)
                    
                    descricao = f"Oferta no Buscapé via {loja}"
                    if cupom:
                        descricao += f"\n🎟️ CUPOM: {cupom}"
                    
                    produtos.append({
                        'name': nome[:200],
                        'category': categoria,
                        'description': descricao,
                        'imageUrl': imagem_url,
                        'price': preco,
                        'originalPrice': preco_original,
                        'links': links,
                        'storeName': loja
                    })
                    cupom_log = f' 🎟️ {cupom}' if cupom else ''
                    print(f'  ✅ [Buscapé] {nome[:45]}...{cupom_log}')
                    
                except Exception as e:
                    print(f'  ⚠️  Erro ao processar oferta Buscapé: {e}')
            
        except Exception as e:
            print(f'❌ Erro ao buscar no Buscapé: {e}')
        
        print(f'   ✅ Total Buscapé: {len(produtos)} produtos')
        return produtos

    def buscar_promocoes_hardmob(self, limite: int = 15) -> List[Dict]:
        """Busca promoções do Hardmob (fórum de promoções) - DESABILITADO (403)"""
        produtos = []
        try:
            print('🔥 Buscando promoções no Hardmob...')
            url = 'https://www.hardmob.com.br/forums/407-Promocoes'
            response = requests.get(url, headers=self.headers, timeout=15)
            print(f'   📡 Status: {response.status_code}')
            
            if response.status_code != 200:
                print(f'⚠️  Hardmob bloqueado (403) - pulando...')
                return produtos

            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Hardmob usa estrutura de fórum - buscar tópicos
            topicos = soup.select('li.threadbit')
            print(f'   📦 Encontrados {len(topicos)} tópicos')
            
            for topico in topicos[:limite]:
                try:
                    # Título do tópico
                    titulo_elem = topico.select_one('a.title')
                    if not titulo_elem:
                        continue
                    
                    nome = titulo_elem.get_text(strip=True)
                    link = titulo_elem.get('href', '')
                    
                    if not link.startswith('http'):
                        link = 'https://www.hardmob.com.br' + link
                    
                    # Filtrar apenas tópicos de promoção (que mencionam preço ou loja)
                    texto_lower = nome.lower()
                    if not any(x in texto_lower for x in ['r$', 'reais', 'amazon', 'mercado', 'shopee', 'kabum', 'off', '%']):
                        continue
                    
                    # Tentar extrair preço do título
                    precos = re.findall(r'R\$\s*([\d.,]+)', nome)
                    preco = self._extrair_preco('R$ ' + precos[0]) if precos else None
                    
                    # Detectar loja
                    loja = 'Amazon'
                    if 'mercado livre' in texto_lower or 'mercadolivre' in texto_lower:
                        loja = 'Mercado Livre'
                    elif 'shopee' in texto_lower:
                        loja = 'Shopee'
                    elif 'kabum' in texto_lower:
                        loja = 'KaBuM'
                    elif 'magalu' in texto_lower:
                        loja = 'Magalu'
                    elif 'aliexpress' in texto_lower:
                        loja = 'AliExpress'
                    
                    links = self._criar_links(link, loja)
                    categoria = self._detectar_categoria(nome)
                    
                    produtos.append({
                        'name': nome[:200],
                        'category': categoria,
                        'description': f"Oferta no Hardmob via {loja}",
                        'imageUrl': '/placeholder.webp',
                        'price': preco,
                        'links': links,
                        'storeName': loja
                    })
                    print(f'  ✅ [Hardmob] {nome[:50]}...')
                    
                except Exception as e:
                    print(f'  ⚠️  Erro ao processar tópico Hardmob: {e}')
            
        except Exception as e:
            print(f'❌ Erro ao buscar no Hardmob: {e}')
        
        print(f'   ✅ Total Hardmob: {len(produtos)} produtos')
        return produtos

    def buscar_promocoes_tiktok(self, limite: int = 10) -> List[Dict]:
        """
        Busca promoções do TikTok Shop
        
        NOTA: TikTok Shop não tem API pública oficial para scraping.
        Esta função é um placeholder que você pode adaptar de 3 formas:
        
        1. MANUAL: Adicionar produtos manualmente via admin
        2. WEBHOOK: Configurar webhook do TikTok Seller Center (se você for vendedor)
        3. SCRAPING AVANÇADO: Usar Selenium/Playwright para simular navegação
        
        Por enquanto, retorna lista vazia. Para ativar:
        - Descomente o código abaixo e adapte conforme necessário
        """
        produtos = []
        try:
            print('🎵 Buscando promoções no TikTok Shop...')
            
            # OPÇÃO 1: Scraping básico (pode não funcionar devido a proteções anti-bot)
            # response = requests.get('https://shop.tiktok.com/view/promo', headers=self.headers, timeout=15)
            # if response.status_code == 200:
            #     soup = BeautifulSoup(response.content, 'html.parser')
            #     # Adaptar seletores conforme estrutura do site
            
            # OPÇÃO 2: Se você tem links específicos de afiliado TikTok
            # links_afiliados_tiktok = [
            #     'https://www.tiktok.com/@loja/video/123456789',
            #     # Adicione seus links aqui
            # ]
            # for link in links_afiliados_tiktok:
            #     # Processar cada link
            
            # OPÇÃO 3: Integração com TikTok Seller API (requer conta de vendedor)
            # Documentação: https://seller.tiktokglobalshop.com/document
            
            print('⚠️  TikTok Shop: Adicione produtos manualmente via admin ou configure API')
            print('   Documentação: https://seller.tiktokglobalshop.com/document')
            
        except Exception as e:
            print(f'❌ Erro ao buscar no TikTok Shop: {e}')
        
        return produtos

    def _resolver_link_meli_la(self, url_curta: str) -> str:
        """
        Resolve um link meli.la que aponta para uma vitrine social do ML.

        Fluxo real:
          1. meli.la/XXXXX  ->  redireciona para  mercadolivre.com.br/social/pp2025.../lists
          2. Nessa pagina social os produtos sao listados como cards com links diretos
             (anchor tags com classe 'poly-component__title' apontando para /p/MLB ou /MLB)
          3. O primeiro link de produto encontrado e o produto anunciado.

        Retorna o link real do produto ou a url_curta original se nao conseguir.
        """
        try:
            import re as _re

            headers = dict(self.headers)
            headers['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            resp = requests.get(url_curta, headers=headers, allow_redirects=True, timeout=15)
            url_social = resp.url
            print(f'  [meli.la] resolvido para: {url_social[:80]}')

            def _extrair_primeiro_produto(html_content):
                soup = BeautifulSoup(html_content, 'html.parser')

                # Prioridade 1: botao com texto "Ir para produto" / "Ir ao produto"
                for a in soup.find_all('a', href=True):
                    texto = a.get_text(strip=True).lower()
                    href = a['href']
                    if 'ir para produto' in texto or 'ir ao produto' in texto:
                        if href.startswith('/'):
                            href = 'https://www.mercadolivre.com.br' + href
                        print(f'  [meli.la] link extraido (botao): {href[:80]}')
                        return href

                # Prioridade 2: card de produto (poly-component__title)
                for a in soup.find_all('a', class_='poly-component__title', href=True):
                    href = a['href'].split('#')[0]
                    if 'MLB' in href:
                        if href.startswith('/'):
                            href = 'https://www.mercadolivre.com.br' + href
                        print(f'  [meli.la] link extraido (card ML): {href[:80]}')
                        return href

                # Prioridade 3: qualquer link /p/MLB ou /MLB
                for a in soup.find_all('a', href=True):
                    href = a['href']
                    if _re.search(r'/(?:p/)?MLB\d+', href):
                        href = href.split('#')[0]
                        if href.startswith('/'):
                            href = 'https://www.mercadolivre.com.br' + href
                        print(f'  [meli.la] link extraido (MLB fallback): {href[:80]}')
                        return href

                return None

            # Tentar extrair da pagina de redirect direto
            link = _extrair_primeiro_produto(resp.content)
            if link:
                return link

            # Se a pagina tem sublistas (/lists/UUID), buscar a primeira
            if '/social/' in url_social:
                soup_social = BeautifulSoup(resp.content, 'html.parser')
                for a in soup_social.find_all('a', href=True):
                    href = a['href']
                    if _re.search(r'/social/.+/lists/[a-f0-9-]{36}', href):
                        lista_url = href if href.startswith('http') else 'https://www.mercadolivre.com.br' + href
                        print(f'  [meli.la] buscando na sublista: {lista_url[:80]}')
                        try:
                            resp2 = requests.get(lista_url, headers=headers, timeout=15)
                            link = _extrair_primeiro_produto(resp2.content)
                            if link:
                                return link
                        except Exception:
                            pass
                        break  # tenta apenas a primeira sublista

            print(f'  [meli.la] nao encontrou link do produto - falha na resolucao')
            return None

        except Exception as e:
            print(f'  [meli.la] erro ao resolver {url_curta}: {e}')
            return url_curta

    def buscar_promocoes_pechinchou(self, limite: int = 15) -> List[Dict]:
        """Busca as promoções mais recentes do Pechinchou"""
        produtos = []
        try:
            print('🔥 Buscando promoções no Pechinchou...')
            response = requests.get('https://pechinchou.com.br/', headers=self.headers, timeout=15)
            if response.status_code != 200:
                print(f'❌ Erro HTTP Pechinchou: {response.status_code}')
                return produtos

            import json
            soup = BeautifulSoup(response.content, 'html.parser')
            script = soup.find('script', id='__NEXT_DATA__')
            if not script:
                return produtos

            data = json.loads(script.string)
            results = data.get('props', {}).get('pageProps', {}).get('promos', {}).get('results', [])

            for promo in results[:limite]:
                try:
                    nome = promo.get('title', 'Sem título')
                    link_oferta = f"https://pechinchou.com.br/oferta/{promo.get('slug', '')}"
                    preco = float(promo.get('price', 0))
                    
                    foto = promo.get('image')
                    imagem_url = _melhorar_qualidade_imagem(foto) if foto else '/placeholder.webp'

                    loja_dict = promo.get('store') or {}
                    loja = loja_dict.get('name', 'Desconhecido')
                    
                    # Usar o link direto do produto (long_url/short_url) ao invés do link da página do Pechinchou
                    # Isso evita que o usuário veja o perfil social do Pechinchou no ML.
                    # EXCEÇÃO: se o link for meli.la, ele redireciona para uma vitrine genérica ML
                    # (ex: /social/pp2025...) que mostra um produto DIFERENTE do anunciado.
                    # Nesses casos, usamos a página do Pechinchou que tem o botão correto.
                    link_direto = promo.get('long_url') or promo.get('short_url') or promo.get('url') or promo.get('offer_url')
                    link_pechinchou = f"https://pechinchou.com.br/oferta/{promo.get('slug', '')}"
                    
                    # Se o link direto é vitrine (meli.la, /sec/ ou /social/), tentar extrair o produto
                    is_vitrine = link_direto and any(x in link_direto for x in ['meli.la', '/sec/', '/social/'])
                    if is_vitrine:
                        print(f'  🔍 [Pechinchou] Link vitrine ML detectado → tentando resolver para produto real...')
                        link_resolvido = self._resolver_link_meli_la(link_direto)
                        
                        # Apenas usa o resolvido se ele for um link direto de produto (não for outra vitrine)
                        if link_resolvido and not any(x in link_resolvido for x in ['meli.la', '/sec/', '/social/']):
                            link_produto = link_resolvido
                        else:
                            print(f'  [Pechinchou] ⚠️ Produto não extraído da vitrine. Ignorando oferta (sem fallback Pechinchou).')
                            continue
                    else:
                        if not link_direto:
                            print(f'  [Pechinchou] ⚠️ Sem link direto. Ignorando oferta (sem fallback Pechinchou).')
                            continue
                        link_produto = link_direto
                        
                    links = self._criar_links(link_produto, loja)

                    categoria_str = promo.get('subcategory', {}).get('category', {}).get('name')
                    if categoria_str:
                        categoria = self._detectar_categoria(categoria_str)
                    else:
                        categoria = self._detectar_categoria(nome)

                    cupom = ''
                    cupons_list = promo.get('coupons', [])
                    if cupons_list and isinstance(cupons_list, list) and len(cupons_list) > 0:
                        cupom = cupons_list[0]
                    
                    descricao = f"Oferta na loja {loja} no Pechinchou"
                    if cupom and str(cupom).strip():
                        descricao += f"\n🎟️ CUPOM: {cupom}"

                    LOJAS_COM_AFILIADO = {'Amazon', 'Mercado Livre', 'Magalu', 'AliExpress', 'KaBuM'}
                    produtos.append({
                        'name': nome,
                        'category': categoria,
                        'description': descricao,
                        'imageUrl': imagem_url,
                        'price': preco,
                        'originalPrice': float(promo.get('old_price', 0)) if promo.get('old_price') else None,
                        'links': links,
                        'storeName': loja,
                        'autoApprove': loja in LOJAS_COM_AFILIADO
                    })
                    print(f'  ✅ [Pechinchou] {nome[:45]}...')
                except Exception as e:
                    print(f'  ⚠️  Erro ao processar oferta: {e}')

        except Exception as e:
            print(f'❌ Erro ao buscar no Pechinchou: {e}')
        
        print(f'   ✅ Total Pechinchou: {len(produtos)} produtos')
        return produtos

    def buscar_promocoes_lomadee(self, limite: int = 15) -> List[Dict]:
        """Busca promoções na API da Lomadee"""
        produtos = []
        try:
            print('🔥 Buscando promoções na Lomadee...')
            import os
            app_token = os.getenv('LOMADEE_APP_TOKEN')
            source_id = os.getenv('LOMADEE_SOURCE_ID')
            
            if not app_token or not source_id:
                print('⚠️  LOMADEE_APP_TOKEN ou LOMADEE_SOURCE_ID não configurados no .env')
                return produtos

            url = f'https://api.lomadee.com/v3/{app_token}/offer/_search'
            params = {
                'sourceId': source_id,
                'size': limite,
                'sort': 'discount'
            }
            
            response = requests.get(url, params=params, headers=self.headers, timeout=15)
            if response.status_code != 200:
                print(f'❌ Erro HTTP Lomadee: {response.status_code}')
                return produtos
                
            data = response.json()
            offers = data.get('offers', [])
            
            for offer in offers[:limite]:
                try:
                    nome = offer.get('name', 'Sem título')
                    preco = offer.get('price')
                    preco_original = offer.get('priceFrom')
                    imagem_url = _melhorar_qualidade_imagem(offer.get('thumbnail') or '') or '/placeholder.webp'
                    link_afiliado = offer.get('link')
                    
                    store_info = offer.get('store', {})
                    loja = store_info.get('name') if isinstance(store_info, dict) else 'Lomadee'
                    if not loja or loja.lower() == 'lomadee':
                        loja = self._detectar_loja_promobyte(nome, link_afiliado)
                    
                    links = self._criar_links(link_afiliado, loja)
                    categoria = self._detectar_categoria(nome)
                    
                    desconto = offer.get('discount', 0)
                    descricao = f"Oferta via {loja} na Lomadee"
                    if desconto and desconto > 0:
                        descricao += f"\nDesconto de {desconto}%!"
                    
                    LOJAS_COM_AFILIADO = {'Amazon', 'Mercado Livre', 'Magalu', 'AliExpress', 'KaBuM', 'Lomadee', 'Shopee', 'Americanas', 'Netshoes'}
                    
                    produtos.append({
                        'name': nome[:200],
                        'category': categoria,
                        'description': descricao,
                        'imageUrl': imagem_url,
                        'price': float(preco) if preco else None,
                        'originalPrice': float(preco_original) if preco_original else None,
                        'links': links,
                        'storeName': loja,
                        'autoApprove': True  # Link já é afiliado
                    })
                    print(f'  ✅ [Lomadee] {nome[:45]}...')
                except Exception as e:
                    print(f'  ⚠️  Erro ao processar oferta Lomadee: {e}')
                    
        except Exception as e:
            print(f'❌ Erro ao buscar na Lomadee: {e}')
            
        print(f'   ✅ Total Lomadee: {len(produtos)} produtos')
        return produtos

    def buscar_todas_promocoes(self) -> Dict[str, List]:
        """Busca promoções em todas as plataformas: Promobit, Promobyte, Gatry, Zoom, Buscapé, TikTok e ML API"""
        print('\n📡 Buscando em múltiplas fontes...')

        produtos_promobit  = self.buscar_promocoes_pelando()       # Promobit
        produtos_promobyte = self.buscar_promocoes_promobyte()     # Promobyte (corrigido)
        produtos_gatry     = self.buscar_promocoes_gatry()         # Gatry
        produtos_zoom      = self.buscar_promocoes_zoom()          # Zoom (novo)
        produtos_buscape   = self.buscar_promocoes_buscape()       # Buscapé (novo)
        produtos_tiktok    = self.buscar_promocoes_tiktok()        # TikTok Shop
        produtos_pechinchou = self.buscar_promocoes_pechinchou()   # Pechinchou
        produtos_lomadee   = self.buscar_promocoes_lomadee()       # Lomadee (novo)

        # 🆕 Mercado Livre API Oficial (links de afiliado já gerados, sem intermediários!)
        produtos_ml_api = []
        if _ml_scraper:
            try:
                produtos_ml_api = _ml_scraper.buscar_promocoes_mercadolivre(limite_por_categoria=8)
            except Exception as e:
                print(f'⚠️ Erro no scraper ML API: {e}')

        # Combinar e deduplicar por nome normalizado
        todos_produtos = []
        nomes_vistos: set = set()
        # ML API e Lomadee primeiro para garantir que links limpos tenham prioridade
        for p in produtos_ml_api + produtos_lomadee + produtos_promobit + produtos_promobyte + produtos_gatry + produtos_zoom + produtos_buscape + produtos_tiktok + produtos_pechinchou:
            chave = self._normalizar(p['name'])[:60]
            if chave not in nomes_vistos:
                nomes_vistos.add(chave)
                todos_produtos.append(p)

        print(f'📊 Total combinado: {len(todos_produtos)} produtos únicos')
        print(f'   🛒 ML API: {len(produtos_ml_api)} | Lomadee: {len(produtos_lomadee)} | Promobit: {len(produtos_promobit)} | Promobyte: {len(produtos_promobyte)}')
        print(f'   🔍 Gatry: {len(produtos_gatry)} | Zoom: {len(produtos_zoom)} | Buscapé: {len(produtos_buscape)} | Pechinchou: {len(produtos_pechinchou)}')

        todos_cupons = self.buscar_cupons_pelando()

        if not todos_produtos:
            print('⚠️ Usando dados de backup para produtos...')
            todos_produtos = [{
                'name': 'Teclado Mecânico Gamer Redragon Kumara',
                'category': 'Informática e Games',
                'description': 'Teclado mecânico compacto de alto desempenho. Oferta imperdível!',
                'imageUrl': 'https://http2.mlstatic.com/D_NQ_NP_833325-MLA41480037142_042020-O.webp',
                'price': 149.90,
                'links': {'amazon': 'https://amazon.com.br'}
            }]

        if not todos_cupons:
            print('⚠️ Usando dados de backup para cupons...')
            todos_cupons = [{
                'code': 'BEMVINDO10',
                'description': '10% de desconto em todo o site na primeira compra',
                'discount': '10% OFF',
                'platform': 'Amazon'
            }]

        return {
            'produtos': todos_produtos,
            'cupons': todos_cupons
        }

    def _extrair_dados_oferta(self, oferta) -> Dict:
        titulo_elem = oferta.find('a', class_='thread-link')
        if not titulo_elem:
            return None

        nome = titulo_elem.get('title', '').strip()
        link_oferta = titulo_elem.get('href', '')
        if not nome:
            return None

        preco = None
        preco_elem = oferta.find('span', class_='thread-price')
        if preco_elem:
            preco = self._extrair_preco(preco_elem.text.strip())

        imagem_url = '/placeholder.webp'
        img_elem = oferta.find('img', class_='thread-image')
        if img_elem:
            imagem_url = img_elem.get('src', '') or img_elem.get('data-src', '')

        loja_elem = oferta.find('span', class_='thread-merchant')
        loja = loja_elem.text.strip() if loja_elem else 'Desconhecido'

        links = self._criar_links(link_oferta, loja)
        categoria = self._detectar_categoria(nome)

        desc_elem = oferta.find('div', class_='thread-description')
        descricao = desc_elem.text.strip()[:200] if desc_elem else None

        return {
            'name': nome,
            'category': categoria,
            'description': descricao,
            'imageUrl': imagem_url,
            'price': preco,
            'links': links,
            'storeName': loja  # nome original da loja para exibir na notificação
        }

    def _extrair_dados_cupom(self, oferta) -> Dict:
        titulo_elem = oferta.find('a', class_='thread-link')
        if not titulo_elem:
            return None

        descricao = titulo_elem.get('title', '').strip()
        if not descricao:
            return None

        code = "OFERTA"
        match = re.search(r'([A-Z0-9]{4,15})', descricao)
        if match:
            code = match.group(1)

        loja_elem = oferta.find('span', class_='thread-merchant')
        plataforma = loja_elem.text.strip() if loja_elem else 'Desconhecido'

        desconto = "Oferta"
        match_desc = re.search(r'(\d+%)|R\$\s*(\d+[.,]?\d*)', descricao)
        if match_desc:
            desconto = match_desc.group(0)

        return {
            'code': code.upper() if code != 'OFERTA' else str(hash(descricao))[-6:].upper(),
            'description': descricao,
            'discount': desconto,
            'platform': plataforma
        }

    def _criar_links(self, link_oferta: str, loja: str) -> Dict:
        links = {}
        loja_lower = loja.lower()
        if 'amazon' in loja_lower:
            links['amazon'] = link_oferta
        elif 'mercado livre' in loja_lower or 'mercadolivre' in loja_lower or 'meli' in loja_lower:
            links['mercadoLivre'] = link_oferta
        elif 'shopee' in loja_lower:
            links['shopee'] = link_oferta
        elif 'aliexpress' in loja_lower:
            links['aliexpress'] = link_oferta
        elif 'netshoes' in loja_lower:
            links['netshoes'] = link_oferta
        elif 'magalu' in loja_lower or 'magazine luiza' in loja_lower or 'magazine' in loja_lower:
            links['magalu'] = link_oferta
        elif 'kabum' in loja_lower:
            links['kabum'] = link_oferta
        elif 'tiktok' in loja_lower:
            links['tiktok'] = link_oferta
        else:
            # Lojas sem campo próprio: salva como amazon (campo genérico de link)
            # Inclui: Adidas, Nike, Centauro, Renner, C&A, Riachuelo, Zara,
            # Casas Bahia, Americanas, Submarino, Ponto, Fast Shop, etc.
            if link_oferta:
                links['amazon'] = link_oferta
        return links

    @staticmethod
    def _normalizar(texto: str) -> str:
        import unicodedata
        t = unicodedata.normalize('NFD', texto.lower().strip())
        return ''.join(ch for ch in t if unicodedata.category(ch) != 'Mn')

    def _mapear_categoria_promobit(self, categoria_promobit: str) -> str:
        """Mapeia TODAS as categorias e subcategorias do Promobit para as categorias do site"""
        c = self._normalizar(categoria_promobit)

        # ── Smartphones, Eletrônicos e TV ──────────────────────────────
        # Subcategorias: Celulares, Smartphones, TV, Rádio, Som, Câmeras,
        # Fones, Smartwatches, Carregadores, Cabos, Adaptadores
        if any(x in c for x in [
            'smartphone', 'celular', 'iphone', 'android', 'tablet',
            'tv', 'televisao', 'televisor', 'smart tv', 'oled', 'qled',
            'radio', 'som ', 'caixa de som', 'soundbar', 'home theater',
            'projetor', 'camera', 'filmadora', 'drone',
            'fone', 'headphone', 'earphone', 'airpod', 'earbud',
            'relogio inteligente', 'smartwatch', 'wearable',
            'carregador', 'cabo ', 'adaptador', 'power bank',
            'eletronico', 'eletronicos e tv',
        ]):
            return 'Smartphones e TV'

        # ── Informática e Games ────────────────────────────────────────
        # Subcategorias: Notebooks, Computadores, Monitores, Periféricos,
        # Armazenamento, Redes, Impressoras, Games, Consoles, Acessórios Gamer
        if any(x in c for x in [
            'notebook', 'laptop', 'computador', 'desktop', 'pc gamer',
            'monitor', 'teclado', 'mouse', 'mousepad',
            'ssd', 'hd', 'hdd', 'memoria ram', 'processador',
            'placa de video', 'placa mae', 'gabinete', 'fonte', 'cooler',
            'impressora', 'scanner', 'webcam', 'microfone',
            'roteador', 'switch', 'hub', 'pendrive', 'memoria usb',
            'informatica', 'games', 'game', 'console', 'playstation',
            'xbox', 'nintendo', 'ps4', 'ps5', 'ps3',
            'headset', 'gamer', 'gaming', 'rgb',
            'controle', 'joystick', 'volante gamer',
        ]):
            return 'Informática e Games'

        # ── Casa e Eletrodomésticos ────────────────────────────────────
        # Subcategorias: Geladeiras, Lavadoras, Fogões, Ar-condicionado,
        # Aspiradores, Pequenos Eletros, Móveis, Cama/Mesa/Banho,
        # Decoração, Casa e Construção, Construção e Reforma
        if any(x in c for x in [
            'geladeira', 'refrigerador', 'freezer',
            'maquina de lavar', 'lava e seca', 'secadora',
            'fogao', 'cooktop', 'forno', 'micro-ondas', 'microondas',
            'ar condicionado', 'ventilador', 'climatizador', 'purificador',
            'aspirador', 'vassoura eletrica',
            'liquidificador', 'batedeira', 'processador de alimentos',
            'cafeteira', 'chaleira', 'airfryer', 'fritadeira',
            'ferro de passar', 'panela eletrica', 'panela de pressao',
            'churrasqueira', 'grill',
            'sofa', 'cama', 'colchao', 'travesseiro', 'edredom',
            'armario', 'estante', 'rack',
            'luminaria', 'abajur', 'lustre',
            'tapete', 'cortina', 'persiana',
            'casa e', 'eletrodomestico', 'movel', 'decoracao',
            'cozinha', 'banheiro', 'quarto', 'sala',
            'construcao', 'reforma', 'casa e construcao',
        ]):
            return 'Casa e Eletrodomésticos'

        # ── Moda e Acessórios ──────────────────────────────────────────
        # Subcategorias: Roupas Masculinas, Femininas, Calçados,
        # Bolsas, Acessórios, Relógios, Óculos, Joias
        if any(x in c for x in [
            'camiseta', 'camisa', 'blusa', 'regata',
            'calca', 'bermuda', 'shorts', 'saia', 'vestido',
            'jaqueta', 'casaco', 'moletom', 'agasalho',
            'tenis', 'sapato', 'sandalia', 'chinelo', 'bota',
            'bolsa', 'carteira', 'necessaire',
            'oculos', 'relogio', 'pulseira', 'colar', 'brinco',
            'cinto', 'gravata', 'meia', 'cueca', 'calcinha',
            'moda', 'roupa', 'vestuario', 'calcado',
            'lingerie', 'pijama',
        ]):
            return 'Moda e Acessórios'

        # ── Bebês e Crianças ───────────────────────────────────────────
        # Subcategorias: Fraldas, Carrinho, Berço, Brinquedos,
        # Lego, Jogos, Material Escolar, Papelaria, Pilhas
        if any(x in c for x in [
            'bebe', 'infantil', 'crianca', 'fraldas', 'mamadeira',
            'carrinho de bebe', 'berco', 'brinquedo', 'boneca',
            'lego', 'quebra-cabeca', 'jogo de tabuleiro',
            'escolar', 'material escolar',
            'papelaria', 'pilha',
        ]):
            return 'Bebês e Crianças'

        # ── Saúde e Beleza ─────────────────────────────────────────────
        # Subcategorias Perfumes e Beleza: Barbeador, Aparador de pelos,
        # Escova rotativa, Maquiagem, Perfumes e Colônias, Secadores, Skin Care
        # Subcategorias Saúde e Higiene: Desodorante, Escova de dente,
        # Escova de dente elétrica, Monitor cardíaco, Protetor solar, Sabonete
        if any(x in c for x in [
            'perfume', 'colonia', 'barbeador', 'aparador de pelos',
            'escova rotativa', 'maquiagem', 'secador',
            'skin care', 'skincare',
            'desodorante', 'escova de dente', 'monitor cardiaco',
            'protetor solar', 'sabonete',
            'shampoo', 'condicionador', 'mascara capilar',
            'creme', 'hidratante', 'serum',
            'batom', 'rimel', 'sombra',
            'escova de cabelo', 'chapinha',
            'depilador', 'fio dental', 'enxaguante',
            'sabao liquido', 'saude e beleza', 'beleza',
            'higiene', 'cosmetico', 'vitamina', 'suplemento vitaminico',
        ]):
            return 'Saúde e Beleza'

        # ── Esporte e Suplementos ──────────────────────────────────────
        # Subcategorias Esporte e Lazer: Basquete, Bicicleta, Camping,
        # Cooler e Bolsa Térmica, Futebol, Natação, Patins
        # Subcategorias Suplementos e Fitness: Aparelhos e Acessórios,
        # BCAA, Creatina, Pré-treino, Suplementos, Whey Protein
        if any(x in c for x in [
            'basquete', 'bicicleta', 'bike', 'ciclismo',
            'camping', 'cooler', 'bolsa termica',
            'futebol', 'natacao', 'patins',
            'esteira', 'eliptico',
            'haltere', 'anilha', 'barra', 'academia',
            'tenis de corrida', 'chuteira', 'bola',
            'oculos de natacao', 'yoga', 'pilates', 'colchonete',
            'whey', 'whey protein', 'creatina', 'pre-treino', 'bcaa',
            'proteina', 'suplemento', 'hipercalorico',
            'aparelhos e acessorios', 'suplementos e fitness',
            'esporte', 'fitness', 'musculacao', 'treino', 'lazer',
        ]):
            return 'Esporte e Suplementos'

        # ── Supermercado e Delivery ────────────────────────────────────
        # Subcategorias Bebidas: Cervejas, Outros destilados,
        # Vinhos e Espumantes, Vodka, Whisky
        # Subcategorias Supermercado e Delivery: Comida,
        # Itens de Lavanderia, Não Alcoólico, Produtos de limpeza
        if any(x in c for x in [
            'cerveja', 'destilado', 'vinho', 'espumante', 'vodka', 'whisky',
            'nao alcoolico', 'bebida',
            'comida', 'itens de lavanderia', 'produtos de limpeza',
            'chocolate', 'biscoito', 'bolacha', 'salgadinho',
            'cafe', 'cha', 'achocolatado', 'suco',
            'arroz', 'feijao', 'macarrao', 'farinha',
            'oleo', 'azeite', 'molho', 'tempero',
            'leite', 'iogurte', 'queijo', 'manteiga',
            'frango', 'carne', 'peixe',
            'supermercado', 'delivery', 'mercado', 'alimentacao',
            'snack', 'barra de proteina',
        ]):
            return 'Supermercado e Delivery'

        # ── Livros, eBooks e eReaders ──────────────────────────────────
        # Subcategorias: eBooks, eReaders, HQ, Livros
        # Filmes, Música e Seriados
        if any(x in c for x in [
            'livro', 'ebook', 'ereader', 'kindle', 'hq', 'quadrinho',
            'revista', 'manga',
            'filme', 'serie', 'musica', 'seriado',
            'spotify', 'netflix', 'disney', 'prime video',
        ]):
            return 'Livros, eBooks e eReaders'

        # ── Ferramentas e Jardim ───────────────────────────────────────
        # Subcategorias: Compressor de ar, Ferramentas manuais, Furadeira,
        # Lavadora de alta pressão, Móveis para ambientes externos,
        # Parafusadeira, Serra tico-tico, Utensílios para jardim
        if any(x in c for x in [
            'compressor de ar', 'ferramentas manuais', 'furadeira',
            'lavadora de alta pressao', 'moveis para ambientes externos',
            'parafusadeira', 'serra', 'tico-tico', 'utensilios para jardim',
            'esmerilhadeira', 'chave de fenda', 'alicate', 'martelo',
            'mangueira', 'regador', 'vaso', 'planta',
            'cortador de grama', 'ferramenta', 'jardim',
        ]):
            return 'Ferramentas e Jardim'

        # ── Automotivo ─────────────────────────────────────────────────
        # Subcategorias Peças e Acessórios para Automóveis:
        # Acessórios para carros e motos, CD e DVD players,
        # Central Multimídia, Pneus
        # Casa e Construção: Construção e Reforma
        if any(x in c for x in [
            'acessorios para carros', 'acessorios para motos',
            'cd e dvd players', 'central multimidia', 'pneu',
            'automovel', 'carro', 'moto',
            'suporte veicular', 'carregador veicular',
            'som automotivo', 'camera de re', 'automotivo',
        ]):
            return 'Automotivo'

        # ── Pet ────────────────────────────────────────────────────────
        # Subcategorias: Petshop (categoria própria no Promobit)
        if any(x in c for x in [
            'racao', 'petisco', 'coleira', 'guia', 'cama pet',
            'arranhador', 'aquario', 'petshop', 'pet',
            'animal de estimacao', 'cachorro', 'gato', 'passaro',
        ]):
            return 'Pet'

        # ── Viagem, Pacotes e Passagens ────────────────────────────────
        # Subcategorias: Pacote de viagem, Passagem aérea, Passagem de ônibus
        if any(x in c for x in [
            'pacote de viagem', 'passagem aerea', 'passagem de onibus',
            'mala', 'hotel', 'viagem', 'turismo', 'seguro viagem',
        ]):
            return 'Viagem'

        # ── Compras Internacionais / Diversos ──────────────────────────
        if any(x in c for x in [
            'compras internacionais', 'importado',
            'diversos', 'outros', 'ofertas gratis',
        ]):
            return 'Diversos'

        # Fallback: tenta detectar pelo nome do produto
        return self._detectar_categoria(categoria_promobit)

    def _detectar_categoria(self, nome: str) -> str:
        """Detecta categoria baseada em palavras-chave no nome do produto (fallback)"""
        n = self._normalizar(nome)

        if any(x in n for x in ['smartphone', 'iphone', 'celular', 'smart tv', 'televisao',
                                 'soundbar', 'caixa de som', 'fone de ouvido', 'earphone',
                                 'smartwatch', 'camera fotografica', 'drone', 'power bank', 'tablet']):
            return 'Smartphones e TV'

        if any(x in n for x in ['notebook', 'laptop', 'monitor ', 'teclado', 'mouse ', 'ssd',
                                 'processador', 'placa de video', 'memoria ram', 'roteador',
                                 'pendrive', 'webcam', 'microfone', 'headset', 'gamer', 'gaming',
                                 'console', 'playstation', 'xbox', 'nintendo', 'ps4', 'ps5',
                                 'controle', 'joystick', 'mousepad', 'rgb']):
            return 'Informática e Games'

        if any(x in n for x in ['geladeira', 'maquina de lavar', 'fogao', 'ar condicionado',
                                 'microondas', 'airfryer', 'cafeteira', 'aspirador',
                                 'sofa', 'colchao', 'luminaria', 'tapete', 'cortina', 'panela',
                                 'construcao', 'reforma']):
            return 'Casa e Eletrodomésticos'

        if any(x in n for x in ['camiseta', 'calca ', 'tenis ', 'sapato', 'bolsa ',
                                 'jaqueta', 'vestido', 'shorts ', 'oculos', 'relogio ', 'cinto ',
                                 'sandalia', 'chinelo', 'bota ', 'moletom', 'lingerie']):
            return 'Moda e Acessórios'

        if any(x in n for x in ['bebe', 'infantil', 'brinquedo', 'boneca', 'lego', 'fraldas',
                                 'material escolar', 'pilha']):
            return 'Bebês e Crianças'

        if any(x in n for x in ['perfume', 'shampoo', 'creme ', 'maquiagem', 'hidratante',
                                 'protetor solar', 'desodorante', 'sabonete', 'barbeador',
                                 'serum', 'skincare', 'escova de dente', 'monitor cardiaco']):
            return 'Saúde e Beleza'

        if any(x in n for x in ['bicicleta', 'esteira', 'haltere', 'whey', 'creatina', 'bcaa',
                                 'suplemento', 'proteina', 'academia', 'fitness', 'futebol',
                                 'natacao', 'camping', 'basquete', 'patins']):
            return 'Esporte e Suplementos'

        if any(x in n for x in ['chocolate', 'cafe ', 'cerveja', 'vinho ', 'whisky', 'vodka',
                                 'arroz ', 'leite ', 'biscoito', 'salgadinho', 'iogurte',
                                 'produto de limpeza', 'detergente']):
            return 'Supermercado e Delivery'

        if any(x in n for x in ['livro', 'ebook', 'kindle', 'revista', 'manga', 'hq',
                                 'filme', 'serie', 'musica']):
            return 'Livros, eBooks e eReaders'

        if any(x in n for x in ['furadeira', 'parafusadeira', 'ferramenta', 'mangueira',
                                 'compressor', 'lavadora de pressao', 'serra ']):
            return 'Ferramentas e Jardim'

        if any(x in n for x in ['pneu', 'carro ', 'moto ', 'automotivo', 'multimidia automotiva']):
            return 'Automotivo'

        if any(x in n for x in ['racao', 'coleira', 'petshop', 'cachorro', 'gato ']):
            return 'Pet'

        if any(x in n for x in ['passagem', 'pacote de viagem', 'hotel', 'mala ']):
            return 'Viagem'

        return 'Diversos'

    def _extrair_preco(self, texto: str) -> Optional[float]:
        try:
            numeros = re.findall(r'[\d.,]+', texto)
            if numeros:
                preco_str = numeros[0].replace('.', '').replace(',', '.')
                return float(preco_str)
        except Exception:
            pass
        return None
