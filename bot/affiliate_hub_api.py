import requests
from typing import List, Dict, Optional
from config import AFFILIATE_HUB_URL, AFFILIATE_HUB_API_KEY


class AffiliateHubAPI:
    """Cliente para API do Affiliate Hub"""
    
    def __init__(self):
        self.base_url = AFFILIATE_HUB_URL.rstrip('/')
        self.headers = {
            'Content-Type': 'application/json',
            'x-api-key': AFFILIATE_HUB_API_KEY
        }
    
    def adicionar_produto(self, produto: Dict) -> Optional[Dict]:
        """Adiciona um produto único"""
        try:
            response = requests.post(
                f'{self.base_url}/api/webhook/products',
                headers=self.headers,
                json=produto,
                timeout=10
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f'❌ Erro ao adicionar produto: {e}')
            return None
    
    def adicionar_produtos_lote(self, produtos: List[Dict]) -> Optional[Dict]:
        """Adiciona múltiplos produtos"""
        try:
            response = requests.put(
                f'{self.base_url}/api/webhook/products',
                headers=self.headers,
                json={'products': produtos},
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f'❌ Erro ao adicionar produtos em lote: {e}')
            return None
    
    def adicionar_cupom(self, cupom: Dict) -> Optional[Dict]:
        """Adiciona um cupom único"""
        try:
            response = requests.post(
                f'{self.base_url}/api/webhook/coupons',
                headers=self.headers,
                json=cupom,
                timeout=10
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f'❌ Erro ao adicionar cupom: {e}')
            return None
    
    def adicionar_cupons_lote(self, cupons: List[Dict]) -> Optional[Dict]:
        """Adiciona múltiplos cupons"""
        try:
            response = requests.put(
                f'{self.base_url}/api/webhook/coupons',
                headers=self.headers,
                json={'coupons': cupons},
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f'❌ Erro ao adicionar cupons em lote: {e}')
            return None
