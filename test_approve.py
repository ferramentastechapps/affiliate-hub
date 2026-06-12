import requests, warnings
warnings.filterwarnings('ignore')

# Testar com produto real de ML
product_id = 'cmqb6lics000ouhng7fm451tk'

r = requests.post(
    'http://127.0.0.1:3005/api/webhook/products/approve',
    json={'productId': product_id},
    headers={'x-api-key': 'f6c684a41738ecbc7a95d875fcd93db0b8c30e80df6b5fc09bdfd41d0e651598'}
)
print(r.status_code, r.text[:800])
