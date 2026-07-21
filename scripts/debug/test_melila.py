import requests

url = "https://meli.la/2eHFBFy"
headers = {'User-Agent': 'Mozilla/5.0'}
r = requests.get(url, headers=headers, allow_redirects=True)

print("Final URL:", r.url)
