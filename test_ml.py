import requests
import re

url = 'https://www.mercadolivre.com.br/social/pp20250311151339/lists'
r = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'})
links = re.findall(r'href="(https://produto\.mercadolivre\.com\.br/[^"]+)"', r.text)
print("First link:", links[0] if links else 'None')
