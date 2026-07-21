import requests
from bs4 import BeautifulSoup
import re

url = 'https://meli.la/1HHuDD7' # The casaco de inverno
headers = {'User-Agent': 'Mozilla/5.0'}
r = requests.get(url, headers=headers)
soup = BeautifulSoup(r.text, 'html.parser')

print("All a hrefs with mercadolivre:")
for a in soup.find_all('a', href=True):
    href = a['href']
    if 'mercadolivre.com.br' in href and 'MLB' in href:
        print(href)
