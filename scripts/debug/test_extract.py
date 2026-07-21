import requests
from bs4 import BeautifulSoup
import re
import json

url = 'https://www.mercadolivre.com.br/social/pp20250311151339?matt_word=jotashopcases&matt_tool=57548960&forceInApp=true&ref=BJ3eLbcEEtbddDEsKnZfrnWwQwOOK1ZUjSqqplSVhbg4Lio0JWXANNzrTdGC32WO30MsUtF7IWw6BWpqorUFNwKd5VGXvQiHyd9L6Mb4iKGkajejD8fZ%2BelCM7QbaUh%2B33wsqxF7Jk6Z0ILmrKe1mQFib%2BsnpLPUOYFO4GocgnZr27lTzipaHApMBut18sHN4ARrWQ8QfF8eWCfaHg%3D%3D'

headers = {'User-Agent': 'Mozilla/5.0'}
r = requests.get(url, headers=headers)
soup = BeautifulSoup(r.text, 'html.parser')

match = re.search(r'__PRELOADED_STATE__\s*=\s*(\{.*?\});', r.text)
if match:
    data = json.loads(match.group(1))
    items = data.get('initialState', {}).get('components', {}).get('items', [])
    if items:
        print('Permalink:', items[0].get('permalink'))
    else:
        print('State string length:', len(str(data)))
else:
    print('No PRELOADED STATE')
    
for a in soup.find_all('a', href=re.compile(r'MLB-?\d+')):
    print('Found MLB link:', a['href'])
