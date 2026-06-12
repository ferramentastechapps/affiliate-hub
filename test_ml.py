import requests
from bs4 import BeautifulSoup
import sys
import json

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'}
r = requests.get('https://www.mercadolivre.com.br/ofertas', headers=headers)
soup = BeautifulSoup(r.text, 'html.parser')
items = soup.select('.promotion-item')
print('Encontrados:', len(items))
for item in items[:5]:
    title = item.select_one('.promotion-item__title')
    price = item.select_one('.promotion-item__price span.andes-money-amount__fraction')
    link = item.select_one('a.promotion-item__link-container')
    print('- ', title.text if title else 'Sem titulo')
    print('  R$', price.text if price else '0')
    print('  Link:', link['href'] if link else '')
