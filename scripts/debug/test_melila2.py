import requests
from bs4 import BeautifulSoup

url = 'https://meli.la/2ShKmaT'
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
r = requests.get(url, headers=headers, allow_redirects=True)
print('Redirected to:', r.url)
soup = BeautifulSoup(r.text, 'html.parser')

print('Title:', soup.title.string if soup.title else 'No title')
for a in soup.find_all('a', href=True):
    if 'MLB' in a['href']:
        print('Found MLB:', a['href'])
