import requests
import urllib3
from typing import List, Dict, Optional
from config import AFFILIATE_HUB_URL, AFFILIATE_HUB_API_KEY

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

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
                timeout=10,
                verify=False
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
                timeout=30,
                verify=False
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
                timeout=10,
                verify=False
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
                timeout=30,
                verify=False
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f'❌ Erro ao adicionar cupons em lote: {e}')
            return None

    def atualizar_link_produto(self, produto_id: str, platform: str, link: str) -> Optional[Dict]:
        """Atualiza o link de afiliado de um produto existente via Telegram"""
        try:
            response = requests.patch(
                f'{self.base_url}/api/webhook/products',
                headers=self.headers,
                json={
                    'productId': produto_id,
                    'platform': platform,
                    'link': link
                },
                timeout=15,
                verify=False
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f'❌ Erro ao atualizar link do produto {produto_id}: {e}')
            return None
    
    def aprovar_produto(self, produto_id: str, platform: str, affiliate_link: str) -> Optional[Dict]:
        """Aprova um produto pendente e adiciona o link de afiliado"""
        try:
            print(f'🔄 Enviando requisição de aprovação...')
            print(f'   URL: {self.base_url}/api/webhook/products/approve')
            print(f'   Produto ID: {produto_id}')
            print(f'   Plataforma: {platform}')
            print(f'   Link: {affiliate_link}')
            print(f'   Headers: {self.headers}')
            
            response = requests.post(
                f'{self.base_url}/api/webhook/products/approve',
                headers=self.headers,
                json={
                    'productId': produto_id,
                    'platform': platform,
                    'affiliateLink': affiliate_link
                },
                timeout=15,
                verify=False
            )
            
            print(f'📥 Resposta recebida:')
            print(f'   Status Code: {response.status_code}')
            print(f'   Response Text: {response.text[:500]}')
            
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f'❌ Erro ao aprovar produto {produto_id}: {e}')
            import traceback
            traceback.print_exc()
            return None
    
    def rejeitar_produto(self, produto_id: str) -> Optional[Dict]:
        """Rejeita um produto pendente"""
        try:
            response = requests.post(
                f'{self.base_url}/api/webhook/products/reject',
                headers=self.headers,
                json={
                    'productId': produto_id
                },
                timeout=15,
                verify=False
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f'❌ Erro ao rejeitar produto {produto_id}: {e}')
            return None

