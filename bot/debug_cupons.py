#!/usr/bin/env python3
"""
Script de diagnóstico para ver os campos disponíveis no Promobit e Promobyte
"""
import requests
import json
from bs4 import BeautifulSoup

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
}

print('=' * 60)
print('🔍 DIAGNÓSTICO DE CUPONS')
print('=' * 60)

# ── Promobit ──────────────────────────────────────────────────
print('\n📌 PROMOBIT - campos disponíveis na primeira oferta:')
try:
    r = requests.get('https://www.promobit.com.br/', headers=headers, timeout=15)
    soup = BeautifulSoup(r.content, 'html.parser')
    script = soup.find('script', id='__NEXT_DATA__')
    if script:
        data = json.loads(script.string)
        offers = data.get('props', {}).get('pageProps', {}).get('serverOffers', {}).get('offers', [])
        if offers:
            offer = offers[0]
            print(f'  Título: {offer.get("offerTitle", "N/A")[:60]}')
            print(f'  Todos os campos: {list(offer.keys())}')
            # Campos que podem conter cupom
            for key in offer.keys():
                val = offer[key]
                if isinstance(val, str) and len(val) < 50 and val:
                    print(f'  {key}: {val}')
            print(f'\n  Primeiras 3 ofertas com cupom:')
            count = 0
            for o in offers:
                for key in o.keys():
                    val = o.get(key, '')
                    if isinstance(val, str) and 3 < len(val) < 30:
                        val_upper = val.upper()
                        # Heurística: parece código de cupom
                        if val_upper == val and val.replace('-','').replace('_','').isalnum():
                            print(f'    [{o.get("offerTitle","")[:40]}] {key}: {val}')
                            count += 1
                            break
                if count >= 3:
                    break
except Exception as e:
    print(f'  Erro: {e}')

# ── Promobyte ─────────────────────────────────────────────────
print('\n📌 PROMOBYTE - cupons detectados:')
try:
    r = requests.get('https://promobyte.site/promocoes-do-dia', headers=headers, timeout=15)
    soup = BeautifulSoup(r.content, 'html.parser')
    cards = soup.select('a[href*="/p/"]')
    import re
    count = 0
    for card in cards[:30]:
        texto = card.get_text(separator=' ', strip=True)
        # Procurar padrão de cupom: palavra em maiúsculas com números
        cupons = re.findall(r'\b([A-Z][A-Z0-9]{3,14})\b', texto)
        ignorar = {'WIFI', 'HDMI', 'AMOLED', 'QLED', 'OLED', 'FULL', 'SMART',
                   'SAMSUNG', 'APPLE', 'SONY', 'ASUS', 'INTEL', 'NVIDIA', 'AMD',
                   'EPSON', 'PHILIPS', 'LENOVO', 'XIAOMI', 'MOTOROLA', 'LOGITECH'}
        for c in cupons:
            if c not in ignorar and any(ch.isdigit() for ch in c):
                nome_match = re.split(r'há\s+\d+\s*[mh]', texto)
                nome = re.sub(r'^-?\d+%\s*', '', nome_match[0].strip())[:50] if nome_match else '?'
                print(f'  Cupom: {c} | Produto: {nome}')
                count += 1
                break
    if count == 0:
        print('  Nenhum cupom com número encontrado. Mostrando palavras maiúsculas:')
        for card in cards[:5]:
            texto = card.get_text(separator=' ', strip=True)
            palavras = re.findall(r'\b([A-Z]{4,15})\b', texto)
            if palavras:
                print(f'  Palavras: {palavras[:5]}')
except Exception as e:
    print(f'  Erro: {e}')

# ── Promobit cupons page ──────────────────────────────────────
print('\n📌 PROMOBIT CUPONS - campos disponíveis:')
try:
    r = requests.get('https://www.promobit.com.br/cupons', headers=headers, timeout=15)
    soup = BeautifulSoup(r.content, 'html.parser')
    script = soup.find('script', id='__NEXT_DATA__')
    if script:
        data = json.loads(script.string)
        coupons = data.get('props', {}).get('pageProps', {}).get('serverCoupons', {}).get('coupons', [])
        print(f'  Total de cupons: {len(coupons)}')
        if coupons:
            c = coupons[0]
            print(f'  Campos: {list(c.keys())}')
            for key, val in c.items():
                if isinstance(val, (str, int, float)) and val:
                    print(f'  {key}: {val}')
except Exception as e:
    print(f'  Erro: {e}')

print('\n✅ Diagnóstico concluído!')
