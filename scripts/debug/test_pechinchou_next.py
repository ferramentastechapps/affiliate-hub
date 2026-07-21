import requests
from bs4 import BeautifulSoup
import json

url = "https://pechinchou.com.br/oferta/moletom-canguru-estampado-cristao-design-jesus-ele-nos-amou"
headers = {'User-Agent': 'Mozilla/5.0'}
r = requests.get(url, headers=headers)
soup = BeautifulSoup(r.text, 'html.parser')

script = soup.find('script', id='__NEXT_DATA__')
if script:
    data = json.loads(script.string)
    promo = data.get('props', {}).get('pageProps', {}).get('promo', {})
    print("long_url:", promo.get('long_url'))
    print("short_url:", promo.get('short_url'))
    print("id:", promo.get('id'))
    print("external_id:", promo.get('external_id'))
