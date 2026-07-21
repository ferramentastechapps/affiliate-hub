import requests, warnings
warnings.filterwarnings('ignore')

API_KEY = 'f6c684a41738ecbc7a95d875fcd93db0b8c30e80df6b5fc09bdfd41d0e651598'
BASE = 'http://127.0.0.1:3005'

# Ver logs do approve com produto real
pid = 'cmqb6leis000muhngxttx6q43'

# Primeiro buscar o produto para ver a description
r = requests.get(f'{BASE}/api/products', headers={'x-api-key': API_KEY})
import json
products = r.json() if r.status_code == 200 else {}

# Filtrar o produto específico
if isinstance(products, list):
    for p in products:
        if p.get('id') == pid:
            print('PRODUTO:', json.dumps(p, indent=2, ensure_ascii=False)[:800])
            break
elif isinstance(products, dict) and 'products' in products:
    for p in products['products']:
        if p.get('id') == pid:
            print('PRODUTO:', json.dumps(p, indent=2, ensure_ascii=False)[:800])
            break
else:
    print('Status:', r.status_code, str(r.text)[:300])
