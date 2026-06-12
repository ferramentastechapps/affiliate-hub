import requests
from bs4 import BeautifulSoup
import re

url = "https://pechinchou.com.br/oferta/moletom-canguru-estampado-cristao-design-jesus-ele-nos-amou"
headers = {'User-Agent': 'Mozilla/5.0'}
r = requests.get(url, headers=headers)
soup = BeautifulSoup(r.text, 'html.parser')

print("Searching for MLB in text...")
for match in set(re.findall(r'MLB-?\d+', r.text)):
    print("Found:", match)
    
print("Searching for mercadolivre.com in text...")
for match in set(re.findall(r'https://[^"\']*mercadolivre[^"\']*', r.text)):
    print("Found ML link:", match)
