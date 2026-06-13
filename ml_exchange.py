import requests
import json

APP_ID = '4572794376119987'
CLIENT_SECRET = 'U4ON3vGw1jM70iPhm8Z0CwhHM0borgl4'
CODE = 'TG-6a2c603eca01e70001823f0d-1985590821'
REDIRECT_URI = 'https://google.com'

url = 'https://api.mercadolibre.com/oauth/token'
data = {
    'grant_type': 'authorization_code',
    'client_id': APP_ID,
    'client_secret': CLIENT_SECRET,
    'code': CODE,
    'redirect_uri': REDIRECT_URI
}

r = requests.post(url, data=data)
print("Status:", r.status_code)
try:
    print(json.dumps(r.json(), indent=2))
except Exception:
    print(r.text)
