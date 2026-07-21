import requests
import re

url = 'https://meli.la/1HHuDD7' # Let's use the one that gave MLB109422600064
headers = {'User-Agent': 'Mozilla/5.0'}
r = requests.get(url, headers=headers)
print('All MLBs found:', set(re.findall(r'MLB-?\d+', r.text)))
