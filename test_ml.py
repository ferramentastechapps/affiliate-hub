import sys
import json
sys.path.append('bot')
from scraper_ml import MercadoLivreAPIScraper

s = MercadoLivreAPIScraper()
prods = s.buscar_promocoes_mercadolivre(limite_por_categoria=3)
print(f'Encontrados: {len(prods)}')
for p in prods[:3]:
    print(f"- {p['name'][:60]} | R$ {p['price']:.2f} | {p['links']['mercadoLivre'][:60]}...")
