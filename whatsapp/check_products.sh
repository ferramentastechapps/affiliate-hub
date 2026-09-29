#!/bin/bash
curl -s 'https://economizei.ftech-apps.com.br/api/products?filter=hot&limit=3&status=active' > /tmp/products.json
python3 << 'EOF'
import json
data = json.load(open('/tmp/products.json'))
if not isinstance(data, list):
    print("Resposta inesperada:", type(data), str(data)[:200])
else:
    for p in data[:3]:
        print("Nome:     ", p.get("name","")[:60])
        print("Preco:    ", p.get("price"))
        print("Original: ", p.get("originalPrice"))
        print("Imagem:   ", str(p.get("imageUrl",""))[:100])
        print("---")
EOF
