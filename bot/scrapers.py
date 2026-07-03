import requests
from bs4 import BeautifulSoup
from typing import List, Dict, Optional
import re
import concurrent.futures
import time
from difflib import SequenceMatcher
from config import CATEGORIES, MIN_DISCOUNT_PERCENT, MIN_QUALITY_SCORE


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

    @property
    def headers(self) -> Dict[str, str]:
        import random
        user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0'
        ]
        return {
            'User-Agent': random.choice(user_agents),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            'Connection': 'keep-alive'
        }

    def __init__(self):
        pass

    def _resolver_url_intermediaria(self, url: str) -> str:
        """
        Resolve redirecionamentos de URLs curtas ou de agregadores.
        """
        if not url:
            return url

        dominios_resolver = [
            'promobit.com.br', 'promobyte.site', 'pelando.com.br', 'gatry.com', 
            'zoom.com.br', 'buscape.com.br', 'pechinchou.com.br', 'amzn.to',
            'shope.ee', 'meli.la'
        ]
        
        url_lower = url.lower()
        deve_resolver = any(d in url_lower for d in dominios_resolver)
        
        if not deve_resolver:
            return url
            
        try:
            # Usar HEAD primeiro (rápido e econômico)
            print(f"[Scraper] Resolvendo redirecionamento (HEAD) para: {url}")
            response = requests.head(
                url, 
                headers=self.headers, 
                allow_redirects=True, 
                timeout=10,
                verify=False
            )
            final_url = response.url
            
            # Se for a mesma URL e o status foi erro de HEAD (405/404/403/501), tentamos GET leve
            if final_url == url and response.status_code in [403, 404, 405, 501]:
                print(f"[Scraper] HEAD falhou com status {response.status_code}. Tentando GET leve...")
                response_get = requests.get(
                    url,
                    headers=self.headers,
                    allow_redirects=True,
                    timeout=10,
                    stream=True,
                    verify=False
                )
                final_url = response_get.url
                response_get.close()
                
            print(f"[Scraper] URL resolvida: {url} -> {final_url}")
            return final_url
        except Exception as e:
            print(f"[Scraper] Erro ao resolver URL {url}: {e}")
            return url

    # Cache de resolução de links (url_agregador -> (url_varejista, timestamp))
    _link_resolution_cache = {}

    def _resolver_link_agregador_com_scraping(self, url: str) -> str:
        """
        Resolve links de agregadores (Promobit, Pechinchou, Gatry) para obter o link real do varejista.
        Tenta redirecionamento primeiro, se falhar, scrape o HTML para encontrar o botão.
        Usa cache em memória com TTL de 1 hora.
        
        Args:
            url: Link do agregador (Promobit, Pechinchou, Gatry)
            
        Returns:
            Link real do varejista ou link original se falhar
        """
        if not url:
            return url
        
        # Detectar se é agregador
        agregadores = ['promobit.com.br', 'pechinchou.com.br', 'gatry.com']
        url_lower = url.lower()
        eh_agregador = any(a in url_lower for a in agregadores)
        
        # Se não é agregador, retornar como está
        if not eh_agregador:
            return url
        
        # Verificar cache (TTL 1 hora = 3600 segundos)
        import time
        now = time.time()
        if url in self._link_resolution_cache:
            url_resolvida, timestamp = self._link_resolution_cache[url]
            if now - timestamp < 3600:  # Cache válido
                print(f'[Resolver-Cache] ✅ {url[:50]}... → {url_resolvida[:50]}...')
                return url_resolvida
        
        try:
            # TENTATIVA 1: Resolver via redirecionamento (rápido)
            print(f'[Resolver] Tentando redirecionamento: {url[:60]}...')
            response = requests.get(
                url,
                headers=self.headers,
                timeout=10,
                allow_redirects=True,
                verify=False
            )
            
            final_url = response.url
            
            # Se redirecionou para varejista (não contém mais agregador), sucesso!
            if not any(a in final_url.lower() for a in agregadores):
                print(f'[Resolver] ✅ Redirecionamento: {url[:50]}... → {final_url[:50]}...')
                self._link_resolution_cache[url] = (final_url, now)
                return final_url
            
            # TENTATIVA 2: Parsear HTML para encontrar o link
            print(f'[Resolver] Redirecionamento falhou, parseando HTML...')
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Seletores comuns de botões "Ver oferta" em agregadores
            selectors = [
                # Promobit/Pechinchou
                'a.offer-btn',
                'a.offer-link',
                'a[data-link]',
                'a.btn-offer',
                'a[rel="nofollow"]',
                'button[data-url]',
                # Links diretos de varejistas no HTML
                'a[href*="amazon.com"]',
                'a[href*="mercadolivre.com"]',
                'a[href*="shopee.com"]',
                'a[href*="magalu.com"]',
                'a[href*="americanas.com"]',
                'a[href*="fastshop.com"]',
                'a[href*="kabum.com"]',
                'a[href*="aliexpress.com"]',
                'a[href*="netshoes.com"]',
                # Gatry
                'a.deal-link',
                'a[data-deal-url]'
            ]
            
            for selector in selectors:
                elementos = soup.select(selector)
                for el in elementos:
                    href = el.get('href') or el.get('data-link') or el.get('data-url') or el.get('data-deal-url')
                    if href and not any(a in href.lower() for a in agregadores):
                        # Encontrou link do varejista!
                        if not href.startswith('http'):
                            href = 'https:' + href if href.startswith('//') else url.rsplit('/', 1)[0] + '/' + href.lstrip('/')
                        print(f'[Resolver] ✅ HTML: {url[:50]}... → {href[:50]}...')
                        self._link_resolution_cache[url] = (href, now)
                        return href
            
            # Se não encontrou, retornar original
            print(f'[Resolver] ⚠️ Não resolveu, usando original: {url[:60]}...')
            self._link_resolution_cache[url] = (url, now)
            return url
            
        except Exception as e:
            print(f'[Resolver] ❌ Erro ao resolver {url[:60]}...: {e}')
            # Em caso de erro, usar original como fallback
            self._link_resolution_cache[url] = (url, now)
            return url

    def _extrair_platform_id_regex(self, url: str) -> tuple[str | None, str | None]:
        """
        Executa a extração por Expressões Regulares de (platformType, platformId) de uma URL direta da loja.
        """
        url_lower = url.lower()

        # Amazon — ASIN: 10 chars alfanuméricos após /dp/ ou /gp/product/
        if 'amazon' in url_lower or 'amzn' in url_lower:
            match = re.search(r'/(?:dp|gp/product)/([A-Z0-9]{10})', url, re.IGNORECASE)
            if match:
                return ('amazon', match.group(1).upper())

        # Mercado Livre — MLB seguido de dígitos (ex: MLB12345678 ou MLB-12345678)
        if 'mercadolivre' in url_lower or 'mercadolibre' in url_lower or 'meli.la' in url_lower:
            match = re.search(r'(MLB-?\d+)', url, re.IGNORECASE)
            if match:
                mlb_id = match.group(1).upper().replace('-', '')
                return ('mercadolivre', mlb_id)

        # Shopee — item ID e shop ID da URL: shopee.com.br/product/SHOPID/ITEMID ou -i.SHOPID.ITEMID
        if 'shopee' in url_lower or 'shope.ee' in url_lower:
            match = re.search(r'product/(\d+)/(\d+)', url)
            if match:
                return ('shopee', f"{match.group(1)}-{match.group(2)}")
            match = re.search(r'-i\.(\d+)\.(\d+)', url)
            if match:
                return ('shopee', f"{match.group(1)}-{match.group(2)}")

        # Magalu (Magazine Luiza) — /p/PRODUCTID/
        if 'magalu' in url_lower or 'magazineluiza' in url_lower or 'magazinevoce' in url_lower:
            match = re.search(r'/p/([a-z0-9-]+)/', url, re.IGNORECASE)
            if match:
                return ('magalu', match.group(1).lower())

        # KaBuM — /produto/PRODUCTID/
        if 'kabum' in url_lower:
            match = re.search(r'/produto/(\d+)', url, re.IGNORECASE)
            if match:
                return ('kabum', match.group(1))

        # Netshoes — /produto/PRODUCTID
        if 'netshoes' in url_lower:
            match = re.search(r'/produto/([a-z0-9-]+)', url, re.IGNORECASE)
            if match:
                return ('netshoes', match.group(1).lower())

        # AliExpress — /item/PRODUCTID.html
        if 'aliexpress' in url_lower:
            match = re.search(r'/item/(\d+)\.html', url, re.IGNORECASE)
            if match:
                return ('aliexpress', match.group(1))

        # TikTok Shop — /product/PRODUCTID
        if 'tiktok.com' in url_lower:
            match = re.search(r'/product/(\d+)', url, re.IGNORECASE)
            if match:
                return ('tiktok', match.group(1))

        return (None, None)

    def extrair_platform_id(self, url: str) -> tuple[str | None, str | None]:
        """
        Extrai (platformType, platformId) do link original da loja.
        Retorna (None, None) se não identificar a plataforma.
        """
        if not url:
            print(f"[PLATFORM_ID] URL: {url} → ID: None")
            return (None, None)

        # 1. Tentar extrair diretamente para evitar HTTP requests desnecessários
        plat_type, plat_id = self._extrair_platform_id_regex(url)
        if plat_type and plat_id:
            print(f"[PLATFORM_ID] URL: {url} → ID: {plat_id}")
            return (plat_type, plat_id)

        # 2. Se não identificar, e for um link de redirecionamento ou agregador, resolve a URL
        resolved_url = self._resolver_url_intermediaria(url)
        if resolved_url != url:
            plat_type, plat_id = self._extrair_platform_id_regex(resolved_url)
            if plat_type and plat_id:
                print(f"[PLATFORM_ID] URL: {url} → ID: {plat_id}")
                return (plat_type, plat_id)

        print(f"[PLATFORM_ID] URL: {url} → ID: None")
        return (None, None)

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

                    # NOVO: Resolver link de agregador para obter URL real do varejista
                    # Isso aumenta a taxa de sucesso de foto lifestyle de 81% para ~90%+
                    link_produto_resolvido = self._resolver_link_agregador_com_scraping(link_produto)

                    loja = offer.get('storeName', 'Desconhecido')
                    links = self._criar_links(link_produto_resolvido, loja)

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
                    # Validação final: garante que o cupom não é um valor inválido
                    if cupom and str(cupom).strip() and str(cupom).strip().upper() not in _VALORES_INVALIDOS_CUPOM:
                        descricao += f"\n🎟️ CUPOM: {cupom}"

                    # IMPORTANTE: Usar link_produto_resolvido para extrair platformId
                    platform_type, platform_id = self.extrair_platform_id(link_produto_resolvido)

                    # Capturar o offerId do Promobit para usar como chave de deduplicação
                    offer_id = str(offer.get('offerId', ''))

                    # Fallback: quando o link_produto é do próprio Promobit (ex: /oferta/...)
                    # ou de uma loja não reconhecida, usar o offerId como platformId
                    # para garantir unicidade via @@unique([platformId, platformType])
                    if not platform_id and offer_id:
                        platform_id = offer_id
                        platform_type = 'promobit'
                        print(f'  ℹ️  [Promobit] Link sem platformId reconhecido — usando offerId como fallback: {offer_id}')

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
                        'autoApprove': loja in LOJAS_COM_AFILIADO,
                        'source': 'promobit',
                        'externalId': offer_id,        # ID único da oferta no Promobit (garante deduplicação)
                        'platformType': platform_type,
                        'platformId': platform_id
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
                    # Promobyte: evitar links do cabeçalho
                    cards = (
                        soup.select('article') or
                        soup.select('.card, .deal-card, .promo-card') or
                        []
                    )
                    # Fallback: se não achar cards, procura por links de deals específicos
                    if not cards:
                        cards = [a for a in soup.select('a[href]') if '/p/' in a['href'] or '/oferta/' in a['href'] or re.search(r'-\d+$', a['href'])]
                    print(f'   📦 Encontrados {len(cards)} cards nesta página')

                    for card in cards:
                        if len(produtos) >= limite:
                            break
                        try:
                            # Se card for a tag <a>, usa o href dele. Se for article, busca o link dentro
                            link = card.get('href') if card.name == 'a' else card.select_one('a').get('href', '')
                            if not link: continue
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

                            platform_type, platform_id = self.extrair_platform_id(link)
                            produtos.append({
                                'name': nome[:200],
                                'category': categoria,
                                'description': descricao,
                                'imageUrl': '/placeholder.webp',
                                'price': preco,
                                'originalPrice': preco_original,
                                'links': links,
                                'storeName': loja,
                                'source': 'promobyte',


                                'platformType': platform_type,

                                'platformId': platform_id
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

                    platform_type, platform_id = self.extrair_platform_id(link)
                    produtos.append({
                        'name': nome[:200],
                        'category': categoria,
                        'description': f"Oferta no Pelando via {loja}",
                        'imageUrl': '/placeholder.webp',
                        'price': preco,
                        'originalPrice': preco_original,
                        'links': links,
                        'storeName': loja,
                        'source': 'promobyte',


                        'platformType': platform_type,

                        'platformId': platform_id
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
            
            # Gatry usa cards de promoção em tags <article> sem classe específica
            cards = soup.select('article') or soup.select('div.deal-item')
            print(f'   📦 Encontrados {len(cards)} cards')
            
            for card in cards[:limite]:
                try:
                    # Buscar título
                    titulo_elem = card.select_one('h2, h3, .deal-title, .title')
                    if not titulo_elem:
                        continue
                    
                    nome = titulo_elem.get_text(strip=True)
                    
                    # Buscar link
                    link_elem = card if card.name == 'a' else card.select_one('a[href*="/deal/"], a')
                    link = link_elem.get('href', '') if link_elem else ''
                    
                    if not link:
                        print(f'  ⚠️  [Gatry] Card sem link - pulando')
                        continue
                    
                    if not link.startswith('http'):
                        link = 'https://gatry.com' + link
                    
                    # CORREÇÃO 1: Resolver link do agregador para obter a URL real da loja
                    print(f'  🔗 [Gatry] Resolvendo link: {link[:60]}...')
                    link_resolvido = self._resolver_link_agregador_com_scraping(link)
                    
                    # Buscar imagem ANTES de resolver o link (pode estar no card)
                    img_elem = card.select_one('img[src], img[data-src]')
                    imagem_url = '/placeholder.webp'
                    if img_elem:
                        imagem_src = img_elem.get('src') or img_elem.get('data-src') or ''
                        if imagem_src and not imagem_src.endswith('.svg') and 'placeholder' not in imagem_src.lower():
                            # Garantir URL completa
                            if imagem_src.startswith('//'):
                                imagem_url = 'https:' + imagem_src
                            elif imagem_src.startswith('/'):
                                imagem_url = 'https://gatry.com' + imagem_src
                            elif imagem_src.startswith('http'):
                                imagem_url = imagem_src
                            # Melhorar qualidade da imagem
                            imagem_url = _melhorar_qualidade_imagem(imagem_url)
                            print(f'  🖼️  [Gatry] Imagem encontrada: {imagem_url[:60]}...')
                    
                    # Buscar preço
                    preco_elem = card.select_one('.price, .deal-price, [class*="price"]')
                    preco = None
                    if preco_elem:
                        preco = self._extrair_preco(preco_elem.get_text())
                    
                    # Detectar loja do link resolvido E do texto
                    texto_lower = nome.lower() + ' ' + link_resolvido.lower()
                    loja = 'Amazon'
                    if 'mercado livre' in texto_lower or 'mercadolivre' in texto_lower:
                        loja = 'Mercado Livre'
                    elif 'shopee' in texto_lower:
                        loja = 'Shopee'
                    elif 'kabum' in texto_lower:
                        loja = 'KaBuM'
                    elif 'magalu' in texto_lower or 'magazine' in texto_lower:
                        loja = 'Magalu'
                    elif 'aliexpress' in texto_lower:
                        loja = 'AliExpress'
                    elif 'netshoes' in texto_lower:
                        loja = 'Netshoes'

                    # Detectar condições especiais Amazon no card/título
                    card_text_lower = card.get_text(separator=' ', strip=True).lower()
                    condicao_extra = ''
                    if loja == 'Amazon':
                        # Busca 'prime' como palavra isolada para evitar falsos positivos
                        import re as _re
                        if _re.search(r'\bprime\b', card_text_lower):
                            condicao_extra = 'Exclusivo Membros Prime'
                        elif 'programe e poupe' in card_text_lower or 'subscribe & save' in card_text_lower:
                            condicao_extra = 'Programe e poupe'

                    # Montar descrição: condição especial primeiro, depois fonte
                    if condicao_extra:
                        descricao = f"{condicao_extra}\nOferta no Gatry via {loja}"
                    else:
                        descricao = f"Oferta no Gatry via {loja}"

                    # CORREÇÃO 2: Usar o link resolvido ao invés do link do Gatry
                    links = self._criar_links(link_resolvido, loja)
                    categoria = self._detectar_categoria(nome)

                    # CORREÇÃO 3: Extrair platformId da URL resolvida (real da loja)
                    platform_type, platform_id = self.extrair_platform_id(link_resolvido)

                    produtos.append({
                        'name': nome[:200],
                        'category': categoria,
                        'description': descricao,
                        'imageUrl': imagem_url,  # CORREÇÃO 4: Usar imagem real ao invés de placeholder
                        'price': preco,
                        'links': links,
                        'storeName': loja,
                        'source': 'gatry',  # CORREÇÃO 5: Source correto
                        'platformType': platform_type,
                        'platformId': platform_id
                    })
                    _prime_flag = f' 👑 PRIME' if condicao_extra == 'Exclusivo Membros Prime' else ''
                    print(f'  ✅ [Gatry] {nome[:50]}... (loja: {loja}{_prime_flag}, platformId: {platform_id or "N/A"})') 
                    
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
                    
                    platform_type, platform_id = self.extrair_platform_id(link)
                    produtos.append({
                        'name': nome[:200],
                        'category': categoria,
                        'description': f"Melhor preço no Zoom via {loja}",
                        'imageUrl': imagem_url,
                        'price': preco,
                        'links': links,
                        'storeName': loja,
                        'source': 'promobyte',


                        'platformType': platform_type,

                        'platformId': platform_id
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
                    
                    platform_type, platform_id = self.extrair_platform_id(link)
                    produtos.append({
                        'name': nome[:200],
                        'category': categoria,
                        'description': descricao,
                        'imageUrl': imagem_url,
                        'price': preco,
                        'originalPrice': preco_original,
                        'links': links,
                        'storeName': loja,
                        'source': 'promobyte',


                        'platformType': platform_type,

                        'platformId': platform_id
                    })
                    cupom_log = f' 🎟️ {cupom}' if cupom else ''
                    print(f'  ✅ [Buscapé] {nome[:45]}...{cupom_log}')
                    
                except Exception as e:
                    print(f'  ⚠️  Erro ao processar oferta Buscapé: {e}')
            
        except Exception as e:
            print(f'❌ Erro ao buscar no Buscapé: {e}')
        
        print(f'   ✅ Total Buscapé: {len(produtos)} produtos')
        return produtos

    def buscar_promocoes_hardmob_fixed(self, limite: int = 15) -> List[Dict]:
        """Busca promoções do Hardmob com headers anti-403"""
        produtos = []
        try:
            print('🔥 Buscando promoções no Hardmob (anti-403)...')
            headers_hardmob = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept-Encoding': 'gzip, deflate, br',
                'Referer': 'https://www.google.com.br/',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            }
            url = 'https://www.hardmob.com.br/forums/407-Promocoes'
            response = requests.get(url, headers=headers_hardmob, timeout=15)
            print(f'   📡 Status: {response.status_code}')
            
            if response.status_code != 200:
                print(f'⚠️  Hardmob ainda bloqueado (status {response.status_code}) - pulando...')
                return produtos

            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Hardmob usa estrutura de fórum - buscar tópicos
            topicos = soup.select('li.threadbit, div[class*="thread"], tr[class*="thread"]')
            print(f'   📦 Encontrados {len(topicos)} tópicos')
            
            for topico in topicos[:limite]:
                try:
                    # Título do tópico
                    titulo_elem = topico.select_one('a.title, a[class*="title"], h3 a')
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
                    
                    platform_type, platform_id = self.extrair_platform_id(link)
                    produtos.append({
                        'name': nome[:200],
                        'category': categoria,
                        'description': f"Oferta no Hardmob via {loja}",
                        'imageUrl': 'https://via.placeholder.com/800x1000',
                        'price': preco,
                        'links': links,
                        'storeName': loja,
                        'source': 'promobyte',


                        'platformType': platform_type,

                        'platformId': platform_id
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

            # Buscar as imagens reais (lifestyle) em paralelo
            slugs = [promo.get('slug') for promo in results[:limite] if promo.get('slug')]
            
            def _buscar_imagem_real_detalhes(slug):
                if not slug:
                    return slug, None
                link_oferta = f"https://pechinchou.com.br/oferta/{slug}"
                try:
                    detail_res = requests.get(link_oferta, headers=self.headers, timeout=5)
                    if detail_res.status_code == 200:
                        detail_soup = BeautifulSoup(detail_res.content, 'html.parser')
                        detail_script = detail_soup.find('script', id='__NEXT_DATA__')
                        if detail_script:
                            detail_data = json.loads(detail_script.string)
                            promo_detail = detail_data.get('props', {}).get('pageProps', {}).get('promo', {})
                            return slug, (promo_detail.get('image_real') or promo_detail.get('image_social'))
                except Exception:
                    pass
                return slug, None

            imagens_reais = {}
            with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
                futures = [executor.submit(_buscar_imagem_real_detalhes, slug) for slug in slugs]
                for future in concurrent.futures.as_completed(futures):
                    try:
                        slug_res, img_url = future.result()
                        if img_url:
                            imagens_reais[slug_res] = img_url
                    except Exception:
                        pass

            for promo in results[:limite]:
                try:
                    nome = promo.get('title', 'Sem título')
                    link_oferta = f"https://pechinchou.com.br/oferta/{promo.get('slug', '')}"
                    preco = float(promo.get('price', 0))
                    
                    foto = promo.get('image')
                    imagem_url = _melhorar_qualidade_imagem(foto) if foto else '/placeholder.webp'

                    slug = promo.get('slug', '')
                    enhanced_image_url = None
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
                        
                        # Apenas usa o resolvido se ele for um link direto de produto (não for outra vitrine ou inválido)
                        if link_resolvido and link_resolvido != 'VITRINE_INVALIDA' and not any(x in link_resolvido for x in ['meli.la', '/sec/', '/social/']):
                            link_produto = link_resolvido
                        else:
                            print(f'  [Pechinchou] ⚠️ Produto não extraído da vitrine. Ignorando oferta (sem fallback Pechinchou).')
                            continue
                    else:
                        if not link_direto:
                            print(f'  [Pechinchou] ⚠️ Sem link direto. Ignorando oferta (sem fallback Pechinchou).')
                            continue
                        link_produto = link_direto
                    
                    # NOVO: Resolver link de agregador para obter URL real do varejista
                    # Isso aumenta a taxa de sucesso de foto lifestyle de 81% para ~90%+
                    link_produto_resolvido = self._resolver_link_agregador_com_scraping(link_produto)
                    
                    links = self._criar_links(link_produto_resolvido, loja)

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

                    # IMPORTANTE: Usar link_produto_resolvido para extrair platformId
                    platform_type, platform_id = self.extrair_platform_id(link_produto_resolvido)
                    LOJAS_COM_AFILIADO = {'Amazon', 'Mercado Livre', 'Magalu', 'AliExpress', 'KaBuM'}
                    produtos.append({
                        'name': nome,
                        'category': categoria,
                        'description': descricao,
                        'imageUrl': imagem_url,
                        'enhancedImageUrl': enhanced_image_url,
                        'price': preco,
                        'originalPrice': float(promo.get('old_price', 0)) if promo.get('old_price') else None,
                        'links': links,
                        'storeName': loja,
                        'autoApprove': loja in LOJAS_COM_AFILIADO,
                        'source': 'promobyte',


                        'platformType': platform_type,

                        'platformId': platform_id
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
                    
                    platform_type, platform_id = self.extrair_platform_id(link_afiliado)
                    if not ext_id and link_afiliado:
                        import urllib.parse
                        parsed = urllib.parse.urlparse(link_afiliado)
                        queries = urllib.parse.parse_qs(parsed.query)
                        for q_val in queries.values():
                            for val in q_val:
                                if val.startswith('http'):
                                    s_opt, e_opt = self.extrair_platform_id(val)
                                    if e_opt:
                                        source, ext_id = s_opt, e_opt
                                        break
                    produtos.append({
                        'name': nome[:200],
                        'category': categoria,
                        'description': descricao,
                        'imageUrl': imagem_url,
                        'price': float(preco) if preco else None,
                        'originalPrice': float(preco_original) if preco_original else None,
                        'links': links,
                        'storeName': loja,
                        'autoApprove': True,  # Link já é afiliado
                        'source': 'promobyte',


                        'platformType': platform_type,

                        'platformId': platform_id
                    })
                    print(f'  ✅ [Lomadee] {nome[:45]}...')
                except Exception as e:
                    print(f'  ⚠️  Erro ao processar oferta Lomadee: {e}')
                    
        except Exception as e:
            print(f'❌ Erro ao buscar na Lomadee: {e}')
            
        print(f'   ✅ Total Lomadee: {len(produtos)} produtos')
        return produtos

    def buscar_promocoes_shopee(self, limite: int = 20) -> List[Dict]:
        """Busca promoções do Shopee Flash Sale"""
        produtos = []
        try:
            print('🛍️ Buscando promoções no Shopee Flash Sale...')
            headers_shopee = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'pt-BR,pt;q=0.9',
                'Referer': 'https://www.google.com.br/'
            }
            url = 'https://shopee.com.br/flash_sale'
            response = requests.get(url, headers=headers_shopee, timeout=15)
            print(f'   📡 Status: {response.status_code}')
            
            if response.status_code != 200:
                print(f'⚠️  Shopee bloqueou (status {response.status_code})')
                return produtos

            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Shopee usa estrutura de cards
            cards = soup.select('div[data-sqe="item"], a[data-sqe="link"]')
            print(f'   📦 Encontrados {len(cards)} cards')
            
            for card in cards[:limite]:
                try:
                    # Nome do produto
                    nome_elem = card.select_one('div[class*="title"], span[class*="title"]')
                    if not nome_elem:
                        continue
                    
                    nome = nome_elem.get_text(strip=True)
                    if not nome or len(nome) < 10:
                        continue
                    
                    # Link
                    link_elem = card if card.name == 'a' else card.select_one('a')
                    link = ''
                    if link_elem:
                        link = link_elem.get('href', '')
                        if link and not link.startswith('http'):
                            link = 'https://shopee.com.br' + link
                    
                    # Preço
                    preco_elem = card.select_one('span[class*="price"], div[class*="price"]')
                    preco = None
                    if preco_elem:
                        preco = self._extrair_preco(preco_elem.get_text())
                    
                    # Preço original
                    preco_original = None
                    original_elem = card.select_one('span[class*="original"], del, s')
                    if original_elem:
                        preco_original = self._extrair_preco(original_elem.get_text())
                    
                    # Imagem
                    img_elem = card.select_one('img')
                    imagem_url = 'https://via.placeholder.com/800x1000'
                    if img_elem:
                        imagem_url = img_elem.get('src') or img_elem.get('data-src') or imagem_url
                    
                    # Desconto
                    desconto_elem = card.select_one('span[class*="discount"], div[class*="discount"]')
                    desconto_texto = ''
                    if desconto_elem:
                        desconto_texto = desconto_elem.get_text(strip=True)
                    
                    links = {'shopee': link} if link else {}
                    categoria = self._detectar_categoria(nome)
                    
                    descricao = f"Flash Sale Shopee"
                    if desconto_texto:
                        descricao += f" - {desconto_texto}"
                    
                    platform_type, platform_id = self.extrair_platform_id(link)
                    produtos.append({
                        'name': nome[:200],
                        'category': categoria,
                        'description': descricao,
                        'imageUrl': imagem_url,
                        'price': preco,
                        'originalPrice': preco_original,
                        'links': links,
                        'storeName': 'Shopee',
                        'source': 'promobyte',


                        'platformType': platform_type,

                        'platformId': platform_id
                    })
                    print(f'  ✅ [Shopee] {nome[:50]}...')
                    
                except Exception as e:
                    print(f'  ⚠️  Erro ao processar oferta Shopee: {e}')
            
        except Exception as e:
            print(f'❌ Erro ao buscar no Shopee: {e}')
        
        print(f'   ✅ Total Shopee: {len(produtos)} produtos')
        return produtos

    def buscar_cupons_cuponomia(self, limite: int = 20) -> List[Dict]:
        """Busca cupons exclusivos no Cuponomia"""
        cupons = []
        try:
            print('🎫 Buscando cupons no Cuponomia...')
            headers_cuponomia = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'pt-BR,pt;q=0.9',
                'Referer': 'https://www.google.com.br/'
            }
            url = 'https://www.cuponomia.com.br/cupons'
            response = requests.get(url, headers=headers_cuponomia, timeout=15)
            print(f'   📡 Status: {response.status_code}')
            
            if response.status_code != 200:
                print(f'⚠️  Cuponomia bloqueou (status {response.status_code})')
                return cupons

            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Cuponomia usa cards de cupom
            cards = soup.select('div[class*="coupon"], article[class*="coupon"], div[data-coupon]')
            print(f'   📦 Encontrados {len(cards)} cupons')
            
            for card in cards[:limite]:
                try:
                    # Código do cupom
                    codigo_elem = card.select_one('code, span[class*="code"], div[class*="code"]')
                    if not codigo_elem:
                        continue
                    
                    codigo = codigo_elem.get_text(strip=True).upper()
                    if not codigo or len(codigo) < 3:
                        continue
                    
                    # Descrição
                    desc_elem = card.select_one('p, div[class*="description"], span[class*="title"]')
                    descricao = desc_elem.get_text(strip=True)[:190] if desc_elem else 'Cupom de desconto'
                    
                    # Desconto
                    desconto_elem = card.select_one('span[class*="discount"], div[class*="discount"]')
                    desconto = desconto_elem.get_text(strip=True) if desconto_elem else 'Oferta'
                    
                    # Loja
                    loja_elem = card.select_one('span[class*="store"], div[class*="store"], a[class*="store"]')
                    loja = loja_elem.get_text(strip=True) if loja_elem else 'Vários'
                    
                    cupons.append({
                        'code': codigo,
                        'description': descricao,
                        'discount': desconto,
                        'platform': loja
                    })
                    print(f'  ✅ Cupom {codigo} - {loja}')
                    
                except Exception as e:
                    print(f'  ⚠️  Erro ao processar cupom Cuponomia: {e}')
            
        except Exception as e:
            print(f'❌ Erro ao buscar no Cuponomia: {e}')
        
        print(f'   ✅ Total Cuponomia: {len(cupons)} cupons')
        return cupons

    def buscar_promocoes_meliuz(self, limite: int = 20) -> List[Dict]:
        """Busca promoções e cashback no Méliuz"""
        produtos = []
        try:
            print('💰 Buscando promoções no Méliuz...')
            headers_meliuz = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'pt-BR,pt;q=0.9',
                'Referer': 'https://www.google.com.br/'
            }
            url = 'https://www.meliuz.com.br/oferta'
            response = requests.get(url, headers=headers_meliuz, timeout=15)
            print(f'   📡 Status: {response.status_code}')
            
            if response.status_code != 200:
                print(f'⚠️  Méliuz bloqueou (status {response.status_code})')
                return produtos

            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Méliuz usa cards de oferta
            cards = soup.select('div[class*="offer"], article[class*="offer"], a[class*="offer"]')
            print(f'   📦 Encontrados {len(cards)} cards')
            
            for card in cards[:limite]:
                try:
                    # Nome do produto
                    nome_elem = card.select_one('h2, h3, div[class*="title"], span[class*="title"]')
                    if not nome_elem:
                        continue
                    
                    nome = nome_elem.get_text(strip=True)
                    if not nome or len(nome) < 10:
                        continue
                    
                    # Link
                    link_elem = card if card.name == 'a' else card.select_one('a')
                    link = ''
                    if link_elem:
                        link = link_elem.get('href', '')
                        if link and not link.startswith('http'):
                            link = 'https://www.meliuz.com.br' + link
                    
                    # Preço
                    preco_elem = card.select_one('span[class*="price"], div[class*="price"]')
                    preco = None
                    if preco_elem:
                        preco = self._extrair_preco(preco_elem.get_text())
                    
                    # Cashback
                    cashback_elem = card.select_one('span[class*="cashback"], div[class*="cashback"]')
                    cashback_texto = ''
                    if cashback_elem:
                        cashback_texto = cashback_elem.get_text(strip=True)
                    
                    # Loja
                    loja_elem = card.select_one('span[class*="store"], div[class*="store"]')
                    loja = loja_elem.get_text(strip=True) if loja_elem else 'Amazon'
                    
                    # Imagem
                    img_elem = card.select_one('img')
                    imagem_url = 'https://via.placeholder.com/800x1000'
                    if img_elem:
                        imagem_url = img_elem.get('src') or img_elem.get('data-src') or imagem_url
                    
                    links = self._criar_links(link, loja)
                    categoria = self._detectar_categoria(nome)
                    
                    descricao = f"Oferta Méliuz via {loja}"
                    if cashback_texto:
                        descricao += f" + {cashback_texto} cashback"
                    
                    platform_type, platform_id = self.extrair_platform_id(link)
                    produtos.append({
                        'name': nome[:200],
                        'category': categoria,
                        'description': descricao,
                        'imageUrl': imagem_url,
                        'price': preco,
                        'links': links,
                        'storeName': loja,
                        'source': 'promobyte',


                        'platformType': platform_type,

                        'platformId': platform_id
                    })
                    print(f'  ✅ [Méliuz] {nome[:50]}...')
                    
                except Exception as e:
                    print(f'  ⚠️  Erro ao processar oferta Méliuz: {e}')
            
        except Exception as e:
            print(f'❌ Erro ao buscar no Méliuz: {e}')
        
        print(f'   ✅ Total Méliuz: {len(produtos)} produtos')
        return produtos

    def buscar_promocoes_amazon(self, limite: int = 20) -> List[Dict]:
        """Busca ofertas do dia na Amazon Brasil"""
        produtos = []
        try:
            print('🛒 Buscando ofertas na Amazon...')
            url = 'https://www.amazon.com.br/gp/goldbox'
            response = requests.get(url, headers=self.headers, timeout=15)
            print(f'   📡 Status: {response.status_code}')
            
            if response.status_code != 200:
                print(f'⚠️  Amazon bloqueou (status {response.status_code})')
                return produtos

            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Amazon usa estrutura complexa - buscar cards de oferta
            cards = soup.select('div[data-deal-id], div.DealCard, div[class*="deal"]')
            print(f'   📦 Encontrados {len(cards)} cards')
            
            for card in cards[:limite]:
                try:
                    # Nome do produto
                    nome_elem = card.select_one('a[aria-label], span[class*="title"], div[class*="title"]')
                    if not nome_elem:
                        continue
                    
                    nome = nome_elem.get('aria-label') or nome_elem.get_text(strip=True)
                    if not nome or len(nome) < 10:
                        continue
                    
                    # Link
                    link_elem = card.select_one('a[href*="/dp/"], a[href*="/gp/"]')
                    link = ''
                    if link_elem:
                        link = link_elem.get('href', '')
                        if link and not link.startswith('http'):
                            link = 'https://www.amazon.com.br' + link
                    
                    # Preço
                    preco_elem = card.select_one('span[class*="price"], span.a-price span.a-offscreen')
                    preco = None
                    if preco_elem:
                        preco = self._extrair_preco(preco_elem.get_text())
                    
                    # Preço original (desconto)
                    preco_original = None
                    original_elem = card.select_one('span[class*="original"], span.a-text-strike')
                    if original_elem:
                        preco_original = self._extrair_preco(original_elem.get_text())
                    
                    # Imagem
                    img_elem = card.select_one('img')
                    imagem_url = 'https://via.placeholder.com/800x1000'
                    if img_elem:
                        imagem_url = img_elem.get('src') or img_elem.get('data-src') or imagem_url
                    
                    # Desconto percentual
                    desconto_elem = card.select_one('span[class*="percent"], span[class*="badge"]')
                    desconto_texto = ''
                    if desconto_elem:
                        desconto_texto = desconto_elem.get_text(strip=True)
                    
                    links = {'amazon': link} if link else {}
                    categoria = self._detectar_categoria(nome)
                    
                    descricao = f"Oferta do Dia Amazon"
                    if desconto_texto:
                        descricao += f" - {desconto_texto}"
                    
                    platform_type, platform_id = self.extrair_platform_id(link)
                    produtos.append({
                        'name': nome[:200],
                        'category': categoria,
                        'description': descricao,
                        'imageUrl': imagem_url,
                        'price': preco,
                        'originalPrice': preco_original,
                        'links': links,
                        'storeName': 'Amazon',
                        'source': 'promobyte',


                        'platformType': platform_type,

                        'platformId': platform_id
                    })
                    print(f'  ✅ [Amazon] {nome[:50]}...')
                    
                except Exception as e:
                    print(f'  ⚠️  Erro ao processar oferta Amazon: {e}')
            
        except Exception as e:
            print(f'❌ Erro ao buscar na Amazon: {e}')
        
        print(f'   ✅ Total Amazon: {len(produtos)} produtos')
        return produtos

    def buscar_promocoes_mercadolivre(self, limite: int = 20) -> List[Dict]:
        """Busca ofertas do dia no Mercado Livre"""
        produtos = []
        try:
            print('🛍️ Buscando ofertas no Mercado Livre...')
            url = 'https://www.mercadolivre.com.br/ofertas'
            response = requests.get(url, headers=self.headers, timeout=15)
            print(f'   📡 Status: {response.status_code}')
            
            if response.status_code != 200:
                print(f'⚠️  Mercado Livre bloqueou (status {response.status_code})')
                return produtos

            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Mercado Livre usa estrutura de cards
            cards = soup.select('li.promotion-item, div.poly-card, a[href*="/p/MLB"]')
            print(f'   📦 Encontrados {len(cards)} cards')
            
            for card in cards[:limite]:
                try:
                    # Nome do produto
                    nome_elem = card.select_one('h2, h3, p.poly-component__title, span.poly-component__title')
                    if not nome_elem:
                        continue
                    
                    nome = nome_elem.get_text(strip=True)
                    if not nome or len(nome) < 10:
                        continue
                    
                    # Link
                    link_elem = card if card.name == 'a' else card.select_one('a[href*="/p/"], a[href*="/MLB"]')
                    link = ''
                    if link_elem:
                        link = link_elem.get('href', '')
                        if link and not link.startswith('http'):
                            link = 'https://www.mercadolivre.com.br' + link
                    
                    # Preço
                    preco_elem = card.select_one('span.andes-money-amount__fraction, span[class*="price"]')
                    preco = None
                    if preco_elem:
                        preco = self._extrair_preco(preco_elem.get_text())
                    
                    # Preço original
                    preco_original = None
                    original_elem = card.select_one('s, del, span[class*="previous"]')
                    if original_elem:
                        preco_original = self._extrair_preco(original_elem.get_text())
                    
                    # Imagem
                    img_elem = card.select_one('img')
                    imagem_url = 'https://via.placeholder.com/800x1000'
                    if img_elem:
                        imagem_url = img_elem.get('src') or img_elem.get('data-src') or imagem_url
                        # Melhorar qualidade da imagem
                        if imagem_url and 'http' in imagem_url:
                            imagem_url = imagem_url.replace('-I.jpg', '-O.jpg')
                    
                    # Desconto
                    desconto_elem = card.select_one('span[class*="discount"], span.andes-money-amount__discount')
                    desconto_texto = ''
                    if desconto_elem:
                        desconto_texto = desconto_elem.get_text(strip=True)
                    
                    links = {'mercadoLivre': link} if link else {}
                    categoria = self._detectar_categoria(nome)
                    
                    descricao = f"Oferta Mercado Livre"
                    if desconto_texto:
                        descricao += f" - {desconto_texto}"
                    
                    platform_type, platform_id = self.extrair_platform_id(link)
                    produtos.append({
                        'name': nome[:200],
                        'category': categoria,
                        'description': descricao,
                        'imageUrl': imagem_url,
                        'price': preco,
                        'originalPrice': preco_original,
                        'links': links,
                        'storeName': 'Mercado Livre',
                        'source': 'promobyte',


                        'platformType': platform_type,

                        'platformId': platform_id
                    })
                    print(f'  ✅ [Mercado Livre] {nome[:50]}...')
                    
                except Exception as e:
                    print(f'  ⚠️  Erro ao processar oferta Mercado Livre: {e}')
            
        except Exception as e:
            print(f'❌ Erro ao buscar no Mercado Livre: {e}')
        
        print(f'   ✅ Total Mercado Livre: {len(produtos)} produtos')
        return produtos

    def _calcular_score_promocao(self, produto: Dict) -> int:
        """
        Calcula score de qualidade da promoção (0-100)
        Score alto = promoção melhor
        """
        score = 0
        detalhes = []  # Para logging detalhado
        
        # 1. Desconto real (0-35 pontos)
        if produto.get('originalPrice') and produto.get('price'):
            try:
                desconto = (1 - produto['price'] / produto['originalPrice']) * 100
                if desconto >= 60:
                    score += 35
                    detalhes.append(f'desconto {desconto:.0f}% (+35pts)')
                elif desconto >= 50:
                    score += 30
                    detalhes.append(f'desconto {desconto:.0f}% (+30pts)')
                elif desconto >= 40:
                    score += 25
                    detalhes.append(f'desconto {desconto:.0f}% (+25pts)')
                elif desconto >= 30:
                    score += 20
                    detalhes.append(f'desconto {desconto:.0f}% (+20pts)')
                elif desconto >= 20:
                    score += 15
                    detalhes.append(f'desconto {desconto:.0f}% (+15pts)')
                elif desconto >= 10:
                    score += 10
                    detalhes.append(f'desconto {desconto:.0f}% (+10pts)')
                else:
                    detalhes.append(f'desconto {desconto:.0f}% (+0pts)')
            except:
                detalhes.append('sem desconto calculável')
        else:
            detalhes.append('sem preço original')
        
        # 2. Loja confiável (0-20 pontos)
        lojas_premium = ['Amazon', 'Mercado Livre', 'Magalu', 'KaBuM']
        lojas_boas = ['Shopee', 'Americanas', 'Casas Bahia', 'Terabyte']
        
        loja = produto.get('storeName', '')
        if loja in lojas_premium:
            score += 20
            detalhes.append(f'loja premium {loja} (+20pts)')
        elif loja in lojas_boas:
            score += 15
            detalhes.append(f'loja boa {loja} (+15pts)')
        elif loja:
            score += 10
            detalhes.append(f'loja {loja} (+10pts)')
        else:
            detalhes.append('sem loja (-0pts)')
        
        # 3. Tem cupom adicional (0-15 pontos)
        descricao = produto.get('description', '')
        if 'CUPOM' in descricao.upper() or 'CÓDIGO' in descricao.upper():
            score += 15
            detalhes.append('tem cupom (+15pts)')
        
        # 4. Categoria popular (0-10 pontos)
        categorias_populares = [
            'Smartphones e TV',
            'Informática e Games',
            'Casa e Eletrodomésticos',
            'Moda e Acessórios'
        ]
        if produto.get('category') in categorias_populares:
            score += 10
            detalhes.append(f'categoria popular (+10pts)')
        
        # 5. Imagem real (0-10 pontos)
        imagem = produto.get('imageUrl', '')
        if imagem and 'placeholder' not in imagem:
            score += 10
            detalhes.append('imagem real (+10pts)')
        
        # 6. Preço razoável (0-10 pontos)
        preco = produto.get('price')
        if preco:
            if 20 <= preco <= 5000:  # Faixa de preço normal
                score += 10
                detalhes.append(f'preço R${preco:.2f} (+10pts)')
            elif 5 <= preco < 20 or 5000 < preco <= 10000:
                score += 5
                detalhes.append(f'preço R${preco:.2f} (+5pts)')
        
        # Armazenar detalhes no produto para logging
        produto['_score_detalhes'] = ', '.join(detalhes)
        
        return min(score, 100)  # Máximo 100

    def buscar_promocoes_pague_menos(self, limite: int = 20) -> List[Dict]:
        """Busca ofertas da Pague Menos via API VTEX com link de afiliado."""
        produtos = []
        try:
            import os
            loja_id = os.getenv('PAGUE_MENOS_LOJA', 'economizeiomjota')
            print('💊 Buscando ofertas na Pague Menos (VTEX API)...')

            url = 'https://www.paguemenos.com.br/api/catalog_system/pub/products/search/'
            params = {
                'O': 'OrderByBestDiscountDESC',
                '_from': 0,
                '_to': limite - 1,
                'sc': 1,
            }
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json',
            }
            r = requests.get(url, params=params, headers=headers, timeout=15)
            if r.status_code not in (200, 206):
                print(f'❌ Erro HTTP Pague Menos: {r.status_code}')
                return produtos

            data = r.json()
            for produto in data:
                try:
                    nome = produto.get('productName', '').strip()
                    slug = produto.get('linkText', '')
                    if not nome or not slug:
                        continue

                    item = (produto.get('items') or [{}])[0]
                    offer = (item.get('sellers') or [{}])[0].get('commertialOffer', {})
                    preco = offer.get('Price', 0) or 0
                    preco_original = offer.get('ListPrice', 0) or 0

                    # Filtrar produtos sem preço
                    if preco <= 0:
                        continue

                    # Filtrar descontos artificiais (>80%) — evita medicamentos genéricos
                    if preco_original > 0:
                        desconto_pct = (preco_original - preco) / preco_original * 100
                        if desconto_pct > 80 or desconto_pct < 5:
                            continue
                    else:
                        preco_original = None

                    # Imagem
                    imgs = item.get('images') or []
                    imagem_url = _melhorar_qualidade_imagem(imgs[0].get('imageUrl', '')) if imgs else '/placeholder.webp'

                    # Link de afiliado
                    link_afiliado = f'https://www.paguemenos.com.br/{slug}/p?loja={loja_id}'

                    categoria = self._detectar_categoria(nome)

                    platform_type, platform_id = self.extrair_platform_id(link_afiliado)
                    if not platform_id:
                        platform_type = 'paguemenos'
                        platform_id = slug

                    produtos.append({
                        'name': nome[:200],
                        'category': categoria,
                        'description': f'Oferta na Pague Menos com {int(desconto_pct if preco_original else 0)}% de desconto',
                        'imageUrl': imagem_url or '/placeholder.webp',
                        'price': float(preco),
                        'originalPrice': float(preco_original) if preco_original else None,
                        'links': {'pagueMenos': link_afiliado},
                        'storeName': 'Pague Menos',
                        'autoApprove': True,
                        'source': 'paguemenos',
                        'externalId': slug,
                        'platformType': platform_type,
                        'platformId': platform_id,
                    })
                    print(f'  ✅ [Pague Menos] {nome[:50]}...')
                except Exception as e:
                    print(f'  ⚠️  Erro ao processar produto Pague Menos: {e}')

        except Exception as e:
            print(f'❌ Erro ao buscar na Pague Menos: {e}')

        print(f'   ✅ Total Pague Menos: {len(produtos)} produtos')
        return produtos

    def buscar_todas_promocoes(self) -> Dict[str, List]:
        """Busca promoções em PARALELO em todas as plataformas - 3x mais rápido!"""
        print('\n📡 Buscando em múltiplas fontes (PARALELO)...')

        # Buscar em paralelo usando ThreadPoolExecutor
        with concurrent.futures.ThreadPoolExecutor(max_workers=12) as executor:
            futures = {
                executor.submit(self.buscar_promocoes_pelando): 'Promobit',
                executor.submit(self.buscar_promocoes_promobyte): 'Promobyte',
                executor.submit(self.buscar_promocoes_gatry): 'Gatry',
                executor.submit(self.buscar_promocoes_zoom): 'Zoom',
                executor.submit(self.buscar_promocoes_buscape): 'Buscapé',
                executor.submit(self.buscar_promocoes_amazon): 'Amazon',
                executor.submit(self.buscar_promocoes_mercadolivre): 'Mercado Livre HTML',
                executor.submit(self.buscar_promocoes_shopee): 'Shopee Flash Sale',
                executor.submit(self.buscar_promocoes_meliuz): 'Méliuz',
                executor.submit(self.buscar_promocoes_hardmob_fixed): 'Hardmob',
                executor.submit(self.buscar_promocoes_pechinchou): 'Pechinchou',
                executor.submit(self.buscar_promocoes_pelando_site): 'Pelando Site',
                executor.submit(self.buscar_promocoes_pague_menos): 'Pague Menos',
                executor.submit(self.buscar_cupons_pelando): 'Cupons Promobit',
                executor.submit(self.buscar_cupons_cuponomia): 'Cupons Cuponomia',
            }
            
            # Adicionar a API Oficial do ML se disponível
            if _ml_scraper:
                futures[executor.submit(_ml_scraper.buscar_promocoes_mercadolivre, 8)] = 'Mercado Livre API'

            produtos_por_fonte = {}
            todos_cupons = []
            metricas_por_fonte = {}  # Para rastrear tempo e quantidade
            
            for future in concurrent.futures.as_completed(futures):
                fonte = futures[future]
                inicio = time.time()
                try:
                    resultado = future.result(timeout=30)
                    elapsed = time.time() - inicio
                    
                    if 'Cupons' in fonte:
                        todos_cupons.extend(resultado)
                        metricas_por_fonte[fonte] = {'count': len(resultado), 'time': elapsed}
                    else:
                        produtos_por_fonte[fonte] = resultado
                        metricas_por_fonte[fonte] = {'count': len(resultado), 'time': elapsed}
                    
                    print(f'   ✅ {fonte}: {len(resultado)} itens em {elapsed:.1f}s')
                except Exception as e:
                    elapsed = time.time() - inicio
                    print(f'   ❌ Erro em {fonte} após {elapsed:.1f}s: {e}')
                    if 'Cupons' not in fonte:
                        produtos_por_fonte[fonte] = []
                        metricas_por_fonte[fonte] = {'count': 0, 'time': elapsed, 'erro': str(e)}

        # Combinar todos os produtos
        todos_produtos = []
        for produtos in produtos_por_fonte.values():
            todos_produtos.extend(produtos)

        # Deduplicação melhorada com chave composta e similaridade de texto
        produtos_unicos = []
        chaves_compostas_vistas = set()
        nomes_vistos: List[str] = []
        
        print(f'\n🔍 Deduplicando produtos...')
        for p in todos_produtos:
            src = p.get('source')
            ext_id = p.get('externalId')
            nome_atual = self._normalizar(p['name'])[:80]
            
            if src and ext_id:
                chave_composta = (src, ext_id)
                if chave_composta in chaves_compostas_vistas:
                    continue
                chaves_compostas_vistas.add(chave_composta)
                nomes_vistos.append(nome_atual)
                produtos_unicos.append(p)
            else:
                eh_duplicado = False
                for nome_visto in nomes_vistos:
                    similaridade = SequenceMatcher(None, nome_atual, nome_visto).ratio()
                    if similaridade >= 0.85:
                        eh_duplicado = True
                        break
                
                if not eh_duplicado:
                    nomes_vistos.append(nome_atual)
                    produtos_unicos.append(p)

        # Calcular score e filtrar
        produtos_com_score = []
        produtos_descartados = []
        
        from config import DEBUG_FILTROS, MIN_QUALITY_SCORE
        
        for p in produtos_unicos:
            score = self._calcular_score_promocao(p)
            p['qualityScore'] = score
            
            if DEBUG_FILTROS:
                produtos_com_score.append(p)
                print(f'   🐛 DEBUG: {p["name"][:50]} | score={score} | {p.get("_score_detalhes", "")}')
            elif score >= MIN_QUALITY_SCORE:
                produtos_com_score.append(p)
            else:
                motivo = f'score {score} < mínimo {MIN_QUALITY_SCORE}'
                produtos_descartados.append({
                    'nome': p['name'][:60],
                    'score': score,
                    'motivo': motivo,
                    'detalhes': p.get('_score_detalhes', 'sem detalhes')
                })

        # Ordenar por score (melhores primeiro)
        produtos_com_score.sort(key=lambda x: x['qualityScore'], reverse=True)
        
        if produtos_descartados and not DEBUG_FILTROS:
            print(f'\n⚠️  Produtos descartados (mostrando primeiros 10 de {len(produtos_descartados)}):')
            for i, desc in enumerate(produtos_descartados[:10], 1):
                print(f'   {i}. [{desc["score"]}pts] {desc["nome"]}')
                print(f'      └─ {desc["detalhes"]}')

        print(f'\n📊 Resultados:')
        print(f'   🔍 Total encontrado: {len(todos_produtos)} produtos')
        print(f'   ✨ Únicos: {len(produtos_unicos)} produtos')
        if DEBUG_FILTROS:
            print(f'   🐛 MODO DEBUG ATIVO: Todos os {len(produtos_com_score)} produtos serão enviados')
        else:
            print(f'   🔥 Qualidade alta (score ≥{MIN_QUALITY_SCORE}): {len(produtos_com_score)} produtos')
            print(f'   ❌ Descartados: {len(produtos_descartados)} produtos')
        print(f'   🎫 Cupons: {len(todos_cupons)}')
        
        print(f'\n📈 Métricas por fonte:')
        for fonte, metricas in sorted(metricas_por_fonte.items(), key=lambda x: x[1]['count'], reverse=True):
            if metricas.get('erro'):
                print(f'   ❌ {fonte}: ERRO - {metricas["erro"][:50]}')
            else:
                print(f'   📦 {fonte}: {metricas["count"]} itens em {metricas["time"]:.1f}s')

        todos_cupons = todos_cupons if todos_cupons else []

        if not produtos_com_score:
            print('⚠️ Usando dados de backup para produtos...')
            produtos_com_score = [{
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
            'produtos': produtos_com_score,
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
        elif 'pague menos' in loja_lower or 'paguemenos' in loja_lower:
            from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
            parsed = urlparse(link_oferta)
            query = parse_qs(parsed.query)
            query['loja'] = ['economizeiomjota']
            parsed = parsed._replace(query=urlencode(query, doseq=True))
            links['pagueMenos'] = urlunparse(parsed)
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

    @staticmethod
    def _gerar_chave_dedup(produto: dict) -> str:
        """
        Gera chave única para deduplicação baseada em:
        1. platformId + platformType (ID REAL da plataforma - prioridade máxima)
        2. externalId + source (fallback para sistema antigo)
        3. nome normalizado completo (último recurso - SEM TRUNCAR)
        
        Retorna chave única que identifica o produto sem ambiguidade.
        """
        import hashlib
        
        # Prioridade 1: platformId + platformType (ÚNICO REAL)
        platform_id = produto.get('platformId')
        platform_type = produto.get('platformType')
        if platform_id and platform_type:
            return f"{platform_type}:{platform_id}"
        
        # Prioridade 2: externalId + source (sistema antigo)
        ext_id = produto.get('externalId')
        source = produto.get('source')
        if ext_id and source:
            return f"{source}:{ext_id}"
        
        # Prioridade 3: Hash da primeira URL disponível (evita variações de nome)
        links = produto.get('links', {})
        for platform in ['amazon', 'mercadoLivre', 'shopee', 'aliexpress', 'tiktok', 'magalu', 'kabum', 'netshoes']:
            url = links.get(platform)
            if url:
                # Normaliza URL removendo parâmetros e hash
                url_clean = url.split('?')[0].split('#')[0].lower().strip()
                return hashlib.md5(url_clean.encode()).hexdigest()
        
        # Fallback 4: nome normalizado COMPLETO (sem truncar em 60 chars)
        nome = produto.get('name', '')
        if nome:
            return PromotionScraper._normalizar(nome)
        
        # Último recurso: gera hash do objeto inteiro
        return hashlib.md5(str(produto).encode()).hexdigest()

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
