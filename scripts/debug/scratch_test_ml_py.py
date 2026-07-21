import requests

url = "https://www.mercadolivre.com.br/tenis-adidas-masculino-ih9526/up/MLBU3938273469?pdp_filters=item_id%3AMLB6722221764"
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

try:
    r = requests.get(url, headers=headers, timeout=10)
    print("Status:", r.status_code)
    print("HTML length:", len(r.text))
    print("Snippet:", r.text[:500])
except Exception as e:
    print("Error:", e)
