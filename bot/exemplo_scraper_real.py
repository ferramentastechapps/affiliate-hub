#!/usr/bin/env python3
"""
Exemplo de scraper real para o Pelando (site de promoções brasileiro)
"""

import requests
from bs4 import BeautifulSoup
from typing import List, Dict
import re


class PelandoScraper:
    """Scraper para o site Pelando"""
    
    def __init__(self):
        self.base_url = 'https://www.pelando.com.br'
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    
    def buscar_promocoes_quentes(self, limite: int = 20) -> List[Dict]:
        """Busca as promoções mais quentes do Pelando"""
        produtos = []
        
        try:
            print('🔥 Buscando promoções quentes no Pelando...')
            
            response = requests.get(
                f'{self.base_url}/hot',
                headers=self.headers,
                timeout=15
            )
            
            if response.status_code != 200:
                print(f'❌ Erro HTTP: {response.status_code}')
                return produtos
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Encontrar cards de promoção
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
            
            print(f'✅ {len(produtos)} promoções encontradas no Pelando')
            
        except Exception as e:
            print(f'❌ Erro ao buscar no Pelando: {e}')
        
        return produtos
    
    def _extrair_dados_oferta(self, oferta) -> Dict:
        """Extrai dados de uma oferta"""
        
        # Título
        titulo_elem = oferta.find('a', class_='thread-link')
        if not titulo_elem:
            return None
        
        nome = titulo_elem.get('title', '').strip()
        link_oferta = titulo_elem.get('href', '')
        
        if not nome:
            return None
        
        # Preço
        preco = None
        preco_elem = oferta.find('span', class_='thread-price')
        if preco_elem:
            preco_texto = preco_elem.text.strip()
            preco = self._extrair_preco(preco_texto)
        
        # Imagem
        imagem_url = 'https://via.placeholder.com/800x1000'
        img_elem = oferta.find('img', class_='thread-image')
        if img_elem:
            imagem_url = img_elem.get('src', '') or img_elem.get('data-src', '')
        
        # Loja/Plataforma
        loja_elem = oferta.find('span', class_='thread-merchant')
        loja = loja_elem.text.strip() if loja_elem else 'Desconhecido'
        
        # Detectar plataforma e criar links
        links = self._criar_links(link_oferta, loja)
        
        # Categoria
        categoria = self._detectar_categoria(nome)
        
        # Descrição
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
    
    def _criar_links(self, link_oferta: str, loja: str) -> Dict:
        """Cria objeto de links baseado na loja"""
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
        elif 'magalu' in loja_lower or 'magazine' in loja_lower:
            links['amazon'] = link_oferta  # Pode criar campo customizado
        else:
            # Link genérico - coloca na Amazon por padrão
            links['amazon'] = link_oferta
        
        return links
    
    def _detectar_categoria(self, nome: str) -> str:
        """Detecta categoria baseado no nome"""
        nome_lower = nome.lower()
        
        # Gaming
        if any(palavra in nome_lower for palavra in ['mouse', 'teclado', 'headset', 'gamer', 'gaming', 'rgb', 'mecânico']):
            return 'Gaming'
        
        # Streaming
        if any(palavra in nome_lower for palavra in ['webcam', 'microfone', 'ring light', 'iluminação']):
            return 'Streaming'
        
        # Home Office
        if any(palavra in nome_lower for palavra in ['cadeira', 'mesa', 'suporte', 'ergonômico']):
            return 'Home Office'
        
        # Setup
        if any(palavra in nome_lower for palavra in ['monitor', 'ssd', 'hd', 'memória', 'processador', 'placa']):
            return 'Setup'
        
        return 'Setup'  # Padrão
    
    def _extrair_preco(self, texto: str) -> float:
        """Extrai preço de um texto"""
        try:
            # Remove tudo exceto números, vírgula e ponto
            numeros = re.findall(r'[\d.,]+', texto)
            if numeros:
                preco_str = numeros[0]
                # Normalizar formato brasileiro (1.234,56 -> 1234.56)
                preco_str = preco_str.replace('.', '').replace(',', '.')
                return float(preco_str)
        except:
            pass
        return None


# Teste do scraper
if __name__ == '__main__':
    scraper = PelandoScraper()
    promocoes = scraper.buscar_promocoes_quentes(limite=5)
    
    print('\n' + '='*60)
    print('📊 RESULTADO')
    print('='*60)
    
    for i, promo in enumerate(promocoes, 1):
        print(f'\n{i}. {promo["name"]}')
        print(f'   Categoria: {promo["category"]}')
        if promo.get('price'):
            print(f'   Preço: R$ {promo["price"]:.2f}')
        print(f'   Links: {", ".join(promo["links"].keys())}')
