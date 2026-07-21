import sys
import json
sys.path.append('bot')
from scraper_ml import MercadoLivreAPIScraper

s = MercadoLivreAPIScraper()
r = s._request('GET', 'https://api.mercadolibre.com/items/MLB4620021666')
print(r.status_code)
print(r.text)
