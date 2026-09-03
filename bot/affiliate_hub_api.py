import requests
import urllib3
import json
import hmac
import hashlib
from typing import List, Dict, Optional
from config import AFFILIATE_HUB_URL, AFFILIATE_HUB_API_KEY, WEBHOOK_SECRET

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

class AffiliateHubAPI:
    """Cliente resiliente para API do Affiliate Hub com fallback para localhost"""
    
    def __init__(self):
        self.base_url = AFFILIATE_HUB_URL.rstrip('/')
        self.fallback_url = 'http://127.0.0.1:3005'
        self.headers = {
            'Content-Type': 'application/json',
            'x-api-key': AFFILIATE_HUB_API_KEY
        }
        
    def _get_headers_with_signature(self, payload: dict) -> tuple:
        """Retorna os cabeçalhos com assinatura HMAC e o payload em bytes"""
        headers = self.headers.copy()
        payload_bytes = json.dumps(payload, separators=(',', ':'), sort_keys=True, ensure_ascii=False).encode('utf-8')
        
        if WEBHOOK_SECRET:
            sig = hmac.new(WEBHOOK_SECRET.encode('utf-8'), payload_bytes, hashlib.sha256).hexdigest()
            headers['x-webhook-signature'] = sig
            
        return headers, payload_bytes

    def _request(self, method: str, path: str, headers: dict = None, data: bytes = None, timeout: int = 30) -> requests.Response:
        """Faz a requisição para a URL principal e, se falhar por rede/timeout, tenta o fallback local"""
        req_headers = headers if headers is not None else self.headers.copy()
        url = f"{self.base_url}{path}"
        try:
            return requests.request(method, url, headers=req_headers, data=data, timeout=timeout, verify=False)
        except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as e:
            if self.base_url != self.fallback_url:
                fallback_url = f"{self.fallback_url}{path}"
                print(f"⚠️ [API] Timeout/falha em {url}. Tentando fallback local: {fallback_url}")
                return requests.request(method, fallback_url, headers=req_headers, data=data, timeout=timeout, verify=False)
            raise e

    def adicionar_produto(self, produto: Dict) -> Optional[Dict]:
        """Adiciona um produto único"""
        try:
            headers, payload_bytes = self._get_headers_with_signature(produto)
            response = self._request(
                'POST',
                '/api/webhook/products',
                headers=headers,
                data=payload_bytes,
                timeout=45
            )
            print(f'   [API] Status: {response.status_code} | Body: {response.text[:300]}')
            response.raise_for_status()
            data = response.json()
            print(f'   [API] ID retornado: {data.get("product", {}).get("id", "NÃO ENCONTRADO")}')
            return data
        except requests.exceptions.HTTPError as e:
            status = e.response.status_code if e.response else 0
            print(f'❌ Erro HTTP ao adicionar produto: {e} | Resposta: {e.response.text[:300] if e.response else "sem resposta"}')
            try:
                from alertas import alerta_api_hub_falhou
                alerta_api_hub_falhou(status_code=status, endpoint='/api/webhook/products')
            except Exception:
                pass
            return None
        except Exception as e:
            print(f'❌ Erro ao adicionar produto: {e}')
            try:
                from alertas import alerta_crash_fatal
                alerta_crash_fatal(e, contexto='adicionar_produto')
            except Exception:
                pass
            return None
    
    def adicionar_produtos_lote(self, produtos: List[Dict]) -> Optional[Dict]:
        """Adiciona múltiplos produtos"""
        try:
            headers, payload_bytes = self._get_headers_with_signature({'products': produtos})
            response = self._request(
                'PUT',
                '/api/webhook/products',
                headers=headers,
                data=payload_bytes,
                timeout=60
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as e:
            status = e.response.status_code if e.response else 0
            print(f'❌ Erro HTTP ao adicionar lote: {e}')
            try:
                from alertas import alerta_api_hub_falhou
                alerta_api_hub_falhou(status_code=status, endpoint='PUT /api/webhook/products')
            except Exception:
                pass
            return None
        except Exception as e:
            print(f'❌ Erro ao adicionar produtos em lote: {e}')
            return None
    
    def adicionar_cupom(self, cupom: Dict) -> Optional[Dict]:
        """Adiciona um cupom único"""
        try:
            headers, payload_bytes = self._get_headers_with_signature(cupom)
            response = self._request(
                'POST',
                '/api/webhook/coupons',
                headers=headers,
                data=payload_bytes,
                timeout=45
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f'❌ Erro ao adicionar cupom: {e}')
            return None
    
    def adicionar_cupons_lote(self, cupons: List[Dict]) -> Optional[Dict]:
        """Adiciona múltiplos cupons"""
        try:
            headers, payload_bytes = self._get_headers_with_signature({'coupons': cupons})
            response = self._request(
                'PUT',
                '/api/webhook/coupons',
                headers=headers,
                data=payload_bytes,
                timeout=45
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f'❌ Erro ao adicionar cupons em lote: {e}')
            return None

    def atualizar_link_produto(self, produto_id: str, platform: str, link: str) -> Optional[Dict]:
        """Atualiza o link de afiliado de um produto existente via Telegram"""
        try:
            payload = {
                'productId': produto_id,
                'platform': platform,
                'link': link
            }
            headers, payload_bytes = self._get_headers_with_signature(payload)
            response = self._request(
                'PATCH',
                '/api/webhook/products',
                headers=headers,
                data=payload_bytes,
                timeout=45
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f'❌ Erro ao atualizar link do produto {produto_id}: {e}')
            return None

    def adicionar_produto_direto(self, produto: Dict) -> Optional[Dict]:
        """
        Adiciona um produto diretamente (já aprovado)
        Usado para produtos do TikTok e outros adicionados manualmente
        """
        try:
            headers, payload_bytes = self._get_headers_with_signature(produto)
            response = self._request(
                'POST',
                '/api/webhook/products',
                headers=headers,
                data=payload_bytes,
                timeout=45
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f'❌ Erro ao adicionar produto direto: {e}')
            return None
    
    def aprovar_produto(self, produto_id: str, platform: str = None, affiliate_link: str = None, image_url: str = None) -> Optional[Dict]:
        """Aprova um produto pendente e adiciona o link de afiliado"""
        try:
            print(f'🔄 Enviando requisição de aprovação...')
            print(f'   Produto ID: {produto_id}')
            print(f'   Plataforma: {platform}')
            print(f'   Link: {affiliate_link}')
            
            payload = {
                'productId': produto_id
            }
            if platform:
                payload['platform'] = platform
            if affiliate_link:
                payload['affiliateLink'] = affiliate_link
            if image_url:
                payload['imageUrl'] = image_url
                print(f'   ImageUrl: {image_url}')
            
            headers, payload_bytes = self._get_headers_with_signature(payload)
            
            response = self._request(
                'POST',
                '/api/webhook/products/approve',
                headers=headers,
                data=payload_bytes,
                timeout=45
            )
            
            print(f'📥 Resposta recebida: {response.status_code} | {response.text[:300]}')
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
            payload = {
                'productId': produto_id
            }
            headers, payload_bytes = self._get_headers_with_signature(payload)
            response = self._request(
                'POST',
                '/api/webhook/products/reject',
                headers=headers,
                data=payload_bytes,
                timeout=45
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f'❌ Erro ao rejeitar produto {produto_id}: {e}')
            return None

    def buscar_produto(self, produto_id: str) -> Optional[Dict]:
        """Busca um produto pelo ID para obter dados atualizados"""
        try:
            headers = self.headers.copy()
            if WEBHOOK_SECRET:
                headers['x-webhook-secret'] = WEBHOOK_SECRET
            response = self._request(
                'GET',
                f'/api/webhook/products/{produto_id}',
                headers=headers,
                timeout=20
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f'❌ Erro ao buscar produto {produto_id}: {e}')
            return None

    def atualizar_produto_imagem(self, produto_id: str, image_url: str) -> Optional[Dict]:
        """Atualiza a imagem de um produto existente via webhook"""
        try:
            payload = {
                'imageUrl': image_url
            }
            headers, payload_bytes = self._get_headers_with_signature(payload)
            response = self._request(
                'PUT',
                f'/api/webhook/products/{produto_id}',
                headers=headers,
                data=payload_bytes,
                timeout=20
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f'❌ Erro ao atualizar imagem do produto {produto_id}: {e}')
            return None
