import requests, warnings
warnings.filterwarnings('ignore')

API_KEY = 'f6c684a41738ecbc7a95d875fcd93db0b8c30e80df6b5fc09bdfd41d0e651598'
BASE = 'http://127.0.0.1:3005'

# Produto do ML salvo incorretamente na coluna amazon
for pid in ['cmqb6leis000muhngxttx6q43', 'cmqb6kgr8000euhng400nkuid', 'cmqb7ojur000suhng33hod6pn']:
    r = requests.post(
        f'{BASE}/api/webhook/products/approve',
        json={'productId': pid},
        headers={'x-api-key': API_KEY}
    )
    print(f'[{pid[:12]}] {r.status_code}: {r.text[:300]}')
    print()
