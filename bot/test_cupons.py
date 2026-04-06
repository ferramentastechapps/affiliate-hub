import requests
from bs4 import BeautifulSoup

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

response = requests.get('https://www.pelando.com.br/cupons', headers=headers)
print("Status:", response.status_code)
if response.status_code == 200:
    soup = BeautifulSoup(response.content, 'html.parser')
    for coupon in soup.find_all('article', limit=5):
        print(coupon.text[:100])
