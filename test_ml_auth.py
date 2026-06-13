import requests

APP_ID = '4572794376119987'
CLIENT_SECRET = 'U4ON3vGw1jM70iPhm8Z0CwhHM0borgl4'

def test_auth():
    url = 'https://api.mercadolibre.com/oauth/token'
    data = {
        'grant_type': 'client_credentials',
        'client_id': APP_ID,
        'client_secret': CLIENT_SECRET
    }
    r = requests.post(url, data=data)
    print("Auth response:", r.status_code, r.text)
    
    if r.status_code == 200:
        token = r.json().get('access_token')
        print("Token obtained:", token)
        
        # Test a search
        search_url = 'https://api.mercadolibre.com/sites/MLB/search'
        headers = {'Authorization': f'Bearer {token}'}
        params = {'category': 'MLB1798', 'limit': 2}
        sr = requests.get(search_url, headers=headers, params=params)
        print("Search response:", sr.status_code, str(sr.text)[:200])

test_auth()
