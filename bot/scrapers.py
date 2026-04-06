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
    
    def buscar_promocoes_pelando(self, limite: int = 20) -> List[Dict]:
        """Busca as promoções mais quentes do Pelando"""
        produtos = []
        try:
            print('🔥 Buscando promoções quentes no Pelando...')
            response = requests.get('https://www.pelando.com.br/hot', headers=self.headers, timeout=15)
            if response.status_code != 200:
                print(f'❌ Erro HTTP: {response.status_code}')
                return produtos
            
            soup = BeautifulSoup(response.content, 'html.parser')
            ofertas = soup.find_all('article', class_='thread', limit=limite)
            
            for oferta in ofertas:
                try:
                    produto = self._extrair_dados_oferta(oferta)
                    if produto:
                        produtos.append(produto)
                        print(f'  ✅ {produto["name"][:50]}...')
                except Exception as e:
                    print(f'  ⚠️  Erro ao processar oferta: {e}')
                    continue
        except Exception as e:
            print(f'❌ Erro ao buscar no Pelando: {e}')
        return produtos
    
    def buscar_cupons_pelando(self, limite: int = 10) -> List[Dict]:
        """Busca cupons no Pelando"""
        cupons = []
        try:
            print('🎫 Buscando cupons no Pelando...')
            response = requests.get('https://www.pelando.com.br/cupons', headers=self.headers, timeout=15)
            if response.status_code != 200:
                print(f'❌ Erro HTTP: {response.status_code}')
                return cupons
            
            soup = BeautifulSoup(response.content, 'html.parser')
            ofertas = soup.find_all('article', class_='thread', limit=limite)
            
            for oferta in ofertas:
                try:
                    cupom = self._extrair_dados_cupom(oferta)
                    if cupom:
                        cupons.append(cupom)
                        print(f'  ✅ Cupom {cupom["code"]}')
                except Exception as e:
                    print(f'  ⚠️  Erro ao processar cupom: {e}')
                    continue
        except Exception as e:
            print(f'❌ Erro ao buscar cupons no Pelando: {e}')
        return cupons

    def buscar_todas_promocoes(self) -> Dict[str, List]:
        """Busca promoções em todas as plataformas"""
        todos_produtos = self.buscar_promocoes_pelando()
        todos_cupons = self.buscar_cupons_pelando()
        
        # Fallback para caso o Pelando bloqueie o acesso (404/403)
        if not todos_produtos:
            print('⚠️ Usando dados de backup para produtos...')
            todos_produtos = [{
                'name': 'Teclado Mecânico Gamer Redragon Kumara',
                'category': 'Gaming',
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
            preco_texto = preco_elem.text.strip()
            preco = self._extrair_preco(preco_texto)
            
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
        
    def _detectar_categoria(self, nome: str) -> str:
        nome_lower = nome.lower()
        if any(palavra in nome_lower for palavra in ['mouse', 'teclado', 'headset', 'gamer', 'gaming', 'rgb', 'mecânico']):
            return 'Gaming'
        if any(palavra in nome_lower for palavra in ['webcam', 'microfone', 'ring light', 'iluminação']):
            return 'Streaming'
        if any(palavra in nome_lower for palavra in ['cadeira', 'mesa', 'suporte', 'ergonômico']):
            return 'Home Office'
        if any(palavra in nome_lower for palavra in ['monitor', 'ssd', 'hd', 'memória', 'processador', 'placa']):
            return 'Setup'
        return 'Setup'
    
    def _extrair_preco(self, texto: str) -> Optional[float]:
        try:
            numeros = re.findall(r'[\d.,]+', texto)
            if numeros:
                preco_str = numeros[0]
                preco_str = preco_str.replace('.', '').replace(',', '.')
                return float(preco_str)
        except:
            pass
        return None
