import requests
from bs4 import BeautifulSoup
from typing import List, Dict, Optional
import re
from config import CATEGORIES, MIN_DISCOUNT_PERCENT


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
                    link_oferta = f"https://www.promobit.com.br/oferta/{offer.get('offerSlug', '')}-{offer.get('offerId', '')}"
                    preco = float(offer.get('offerPrice', 0))

                    foto = offer.get('offerPhoto')
                    imagem_url = f"https://i.promobit.com.br{foto}" if foto else 'https://via.placeholder.com/800x1000'

                    loja = offer.get('storeName', 'Desconhecido')
                    links = self._criar_links(link_oferta, loja)

                    # Tentar pegar categoria do Promobit primeiro
                    categoria_promobit = offer.get('categoryName') or offer.get('category', {}).get('name')
                    if categoria_promobit:
                        categoria = self._mapear_categoria_promobit(categoria_promobit)
                    else:
                        categoria = self._detectar_categoria(nome)

                    # Cupom: tentar vários campos possíveis do JSON do Promobit
                    cupom = (
                        offer.get('offerCoupon') or
                        offer.get('couponCode') or
                        offer.get('coupon') or
                        offer.get('offerCode') or
                        offer.get('discountCode') or
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

                    produtos.append({
                        'name': nome,
                        'category': categoria,
                        'description': descricao,
                        'imageUrl': imagem_url,
                        'price': preco,
                        'links': links
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
                    if response.status_code != 200:
                        continue

                    soup = BeautifulSoup(response.content, 'html.parser')
                    cards = soup.select('a[href*="/p/"]')

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
                                'imageUrl': 'https://via.placeholder.com/800x1000',
                                'price': preco,
                                'originalPrice': preco_original,
                                'links': links
                            })
                            cupom_log = f' 🎟️ {cupom}' if cupom else ''
                            print(f'  ✅ [Promobyte] {nome[:45]}...{cupom_log}')
                        except Exception as e:
                            print(f'  ⚠️  Erro ao processar oferta Promobyte: {e}')
                except Exception as e:
                    print(f'  ⚠️  Erro ao acessar {url}: {e}')

        except Exception as e:
            print(f'❌ Erro ao buscar no Promobyte: {e}')
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
            if response.status_code != 200:
                print(f'❌ Erro HTTP Pelando: {response.status_code}')
                return produtos

            soup = BeautifulSoup(response.content, 'html.parser')

            # Links de deals: /d/slug-HASH
            cards = soup.select('a[href*="/d/"]')
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
                    preco = self._extrair_preco('R$ ' + precos[0]) if precos else None

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
                        'imageUrl': 'https://via.placeholder.com/800x1000',
                        'price': preco,
                        'links': links
                    })
                    print(f'  ✅ [Pelando] {nome[:50]}...')
                except Exception as e:
                    print(f'  ⚠️  Erro ao processar oferta Pelando: {e}')

        except Exception as e:
            print(f'❌ Erro ao buscar no Pelando: {e}')
        return produtos

    def buscar_todas_promocoes(self) -> Dict[str, List]:
        """Busca promoções em todas as plataformas: Promobit, Promobyte e Pelando"""
        print('\n📡 Buscando em múltiplas fontes...')

        produtos_promobit  = self.buscar_promocoes_pelando()       # Promobit
        produtos_promobyte = self.buscar_promocoes_promobyte()     # Promobyte
        produtos_pelando   = self.buscar_promocoes_pelando_site()  # Pelando

        # Combinar e deduplicar por nome normalizado
        todos_produtos = []
        nomes_vistos: set = set()
        for p in produtos_promobit + produtos_promobyte + produtos_pelando:
            chave = self._normalizar(p['name'])[:60]
            if chave not in nomes_vistos:
                nomes_vistos.add(chave)
                todos_produtos.append(p)

        print(f'📊 Total combinado: {len(todos_produtos)} produtos únicos '
              f'({len(produtos_promobit)} Promobit | '
              f'{len(produtos_promobyte)} Promobyte | '
              f'{len(produtos_pelando)} Pelando)')

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

        imagem_url = 'https://via.placeholder.com/800x1000'
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
            'links': links
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
        elif 'mercado livre' in loja_lower or 'mercadolivre' in loja_lower:
            links['mercadoLivre'] = link_oferta
        elif 'shopee' in loja_lower:
            links['shopee'] = link_oferta
        elif 'aliexpress' in loja_lower:
            links['aliexpress'] = link_oferta
        else:
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
