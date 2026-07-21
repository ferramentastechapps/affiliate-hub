import requests
url = 'https://mercadolivre.com/sec/2pNsGkD'
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
try:
    r = requests.get(url, headers=headers, timeout=10)
    print('Status:', r.status_code)
    print('Final URL:', r.url)
    print('HTML snippet:', r.text[:500])
except Exception as e:
    print('Error:', e)
