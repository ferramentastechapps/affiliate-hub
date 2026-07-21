import json
import re

with open('promobit_data.json', 'r', encoding='utf-8') as f:
    content = f.read()
    
# Extract JSON
match = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', content)
if match:
    data = json.loads(match.group(1))
    offers = data.get('props', {}).get('pageProps', {}).get('serverOffers', {}).get('offers', [])
    for o in offers[:10]:
        print(f"\nTitle: {o.get('offerTitle')}")
        # Search for any key containing 'coupon'
        for k, v in o.items():
            if 'coup' in k.lower():
                print(f"  {k}: {v}")
