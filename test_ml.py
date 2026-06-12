import sys
import json
sys.path.append('bot')
from scraper_ml import MercadoLivreAPIScraper

s = MercadoLivreAPIScraper()
r = s._request('GET', 'https://api.mercadolibre.com/sites/MLB/search?category=MLB1798&limit=1')
print(r.status_code)
print(r.text)
