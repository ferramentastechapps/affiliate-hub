#!/usr/bin/env python3
"""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔔 ENVIAR NOTIFICAÇÃO PUSH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Envia notificação push para todos os usuários inscritos quando um novo
produto é aprovado.

USO:
    python send_push_notification.py <product_id>
    
EXEMPLO:
    python send_push_notification.py clxyz123abc
"""

import os
import sys
import requests
from dotenv import load_dotenv

# Carrega variáveis de ambiente
load_dotenv()

API_URL = os.getenv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000")
API_SECRET_KEY = os.getenv("API_SECRET_KEY")


def send_push_notification(product_id: str):
    """
    Envia notificação push para todos os inscritos sobre um novo produto.
    
    Args:
        product_id: ID do produto aprovado
    """
    if not API_SECRET_KEY:
        print("❌ API_SECRET_KEY não configurada no .env")
        return False
    
    # Busca informações do produto
    try:
        response = requests.get(f"{API_URL}/api/products/{product_id}")
        response.raise_for_status()
        product = response.json()
    except Exception as e:
        print(f"❌ Erro ao buscar produto: {e}")
        return False
    
    # Prepara a notificação
    title = "🔥 Nova promoção disponível!"
    body = f"{product['name']} por R$ {product['price']:.2f}"
    
    if product.get('originalPrice'):
        discount = ((product['originalPrice'] - product['price']) / product['originalPrice']) * 100
        body += f" ({discount:.0f}% OFF)"
    
    payload = {
        "title": title,
        "body": body,
        "icon": product.get("imageUrl", "/icons/icon-192x192.png"),
        "url": f"/?product={product_id}",
        "productId": product_id,
    }
    
    # Envia a notificação
    try:
        response = requests.post(
            f"{API_URL}/api/push/send",
            json=payload,
            headers={
                "Content-Type": "application/json",
                "x-api-key": API_SECRET_KEY,
            },
        )
        response.raise_for_status()
        result = response.json()
        
        print(f"✅ Notificação enviada com sucesso!")
        print(f"   📊 Enviadas: {result['sent']}")
        print(f"   ❌ Falhas: {result['failed']}")
        print(f"   📱 Total de inscritos: {result['total']}")
        
        return True
    except Exception as e:
        print(f"❌ Erro ao enviar notificação: {e}")
        return False


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("❌ Uso: python send_push_notification.py <product_id>")
        sys.exit(1)
    
    product_id = sys.argv[1]
    success = send_push_notification(product_id)
    sys.exit(0 if success else 1)
