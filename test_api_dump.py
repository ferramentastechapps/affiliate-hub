import sys
import os
import json
sys.path.append('bot')
from scrapers import PromotionScraper
from affiliate_hub_api import AffiliateHubAPI

api = AffiliateHubAPI()
scraper = PromotionScraper()
resultados = scraper.buscar_todas_promocoes()
produtos = resultados['produtos']

for p in produtos:
    print('Tentando enviar:', p['name'])
    res = api.adicionar_produto(p)
    if res and res.get('success'):
        print('Sucesso!')
    else:
        print('Falhou!')
        print(json.dumps(p, indent=2, ensure_ascii=False))
