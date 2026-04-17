import urllib.request
import json
import re

req = urllib.request.Request(
    'https://www.promobit.com.br/', 
    headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
)
with urllib.request.urlopen(req) as response:
    html = response.read().decode('utf-8')

match = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', html)
if match:
    data = json.loads(match.group(1))
    offers = data.get('props', {}).get('pageProps', {}).get('serverOffers', {}).get('offers', [])
    for o in offers[:10]:
        print(f"\nTitle: {o.get('offerTitle')}")
        # Search for any key containing 'coupon'
        for k, v in o.items():
            if 'coup' in k.lower():
                print(f"  {k}: {v}")
