#!/usr/bin/env python3
"""
Script de diagnostico completo do bot de promocoes.
Execute este script no servidor para identificar por que o bot parou de postar.

Uso:
    python diagnostico_bot.py
"""

import sys
import os
import time
import json
import requests
from datetime import datetime

try:
    from config import (
        AFFILIATE_HUB_URL, AFFILIATE_HUB_API_KEY, TELEGRAM_BOT_TOKEN,
        TELEGRAM_CHAT_ID, TELEGRAM_PROMO_GROUP_ID, GEMINI_API_KEY,
        SEARCH_INTERVAL_MINUTES, MIN_QUALITY_SCORE, DEBUG_FILTROS
    )
except Exception as e:
    print(f'ERRO ao importar config.py: {e}')
    sys.exit(1)

LINHA = '=' * 65


def check(nome, ok, detalhe=''):
    ico = '[OK]' if ok else '[ERRO]'
    txt = f'  {ico}  {nome}'
    if detalhe:
        txt += f'\n       -> {detalhe}'
    print(txt)
    return ok


def separador(titulo):
    print(f'\n{LINHA}')
    print(f'  >> {titulo}')
    print(LINHA)


separador('CONFIGURACOES')
check('AFFILIATE_HUB_URL', bool(AFFILIATE_HUB_URL), AFFILIATE_HUB_URL)
check('AFFILIATE_HUB_API_KEY', bool(AFFILIATE_HUB_API_KEY),
      '***' + AFFILIATE_HUB_API_KEY[-8:] if AFFILIATE_HUB_API_KEY else 'NAO CONFIGURADA')
check('TELEGRAM_BOT_TOKEN', bool(TELEGRAM_BOT_TOKEN),
      '***' + TELEGRAM_BOT_TOKEN[-8:] if TELEGRAM_BOT_TOKEN else 'NAO CONFIGURADO')
check('TELEGRAM_CHAT_ID', bool(TELEGRAM_CHAT_ID), str(TELEGRAM_CHAT_ID))
check('TELEGRAM_PROMO_GROUP_ID', bool(TELEGRAM_PROMO_GROUP_ID), str(TELEGRAM_PROMO_GROUP_ID))
check('GEMINI_API_KEY', bool(GEMINI_API_KEY and GEMINI_API_KEY != 'sua_chave_aqui'),
      '***' + GEMINI_API_KEY[-8:] if GEMINI_API_KEY else 'NAO CONFIGURADA')
print(f'\n  [INFO] Busca a cada {SEARCH_INTERVAL_MINUTES} min | Score minimo: {MIN_QUALITY_SCORE} | Debug: {DEBUG_FILTROS}')

separador('CONECTIVIDADE - API DO SITE')
try:
    resp = requests.get(f'{AFFILIATE_HUB_URL}/api/products?limit=1',
                        headers={'x-api-key': AFFILIATE_HUB_API_KEY}, timeout=10)
    check('Site acessivel', resp.status_code == 200, f'HTTP {resp.status_code} -> {AFFILIATE_HUB_URL}')
    if resp.status_code == 200:
        data = resp.json()
        print(f'  [INFO] Total de produtos no banco: {data.get("total", 0)}')
except requests.exceptions.ConnectionError:
    check('Site acessivel', False, f'Nao foi possivel conectar em {AFFILIATE_HUB_URL}')
except Exception as e:
    check('Site acessivel', False, str(e))

separador('PRODUTOS PENDENTES NO BANCO')
try:
    resp = requests.get(
        f'{AFFILIATE_HUB_URL}/api/products?status=pending&limit=5',
        headers={'x-api-key': AFFILIATE_HUB_API_KEY}, timeout=10
    )
    if resp.status_code == 200:
        data = resp.json()
        pendentes = data.get('total', 0)
        check('Endpoint de pendentes OK', True, f'{pendentes} produto(s) pendentes')
        if pendentes > 0:
            for p in data.get('products', [])[:3]:
                print(f'       * [{p.get("id", "?")}] {p.get("name", "?")[:60]}')
    else:
        check('Endpoint de pendentes OK', False, f'HTTP {resp.status_code}')
except Exception as e:
    check('Endpoint de pendentes OK', False, str(e))

separador('TELEGRAM - BOT E GRUPOS')
try:
    resp = requests.get(f'https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getMe', timeout=10)
    if resp.status_code == 200:
        bot_info = resp.json().get('result', {})
        check('Token do bot valido', True, f'@{bot_info.get("username")} - {bot_info.get("first_name")}')
    else:
        check('Token do bot valido', False, f'HTTP {resp.status_code}: {resp.text[:100]}')
except Exception as e:
    check('Token do bot valido', False, str(e))

try:
    resp = requests.get(
        f'https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getChat',
        params={'chat_id': TELEGRAM_CHAT_ID}, timeout=10
    )
    if resp.status_code == 200:
        chat_info = resp.json().get('result', {})
        nome_chat = chat_info.get('title') or chat_info.get('username') or chat_info.get('first_name')
        check('Chat de aprovacao acessivel', True, f'{chat_info.get("type")} - {nome_chat}')
    else:
        check('Chat de aprovacao acessivel', False, resp.json().get('description', resp.text[:80]))
except Exception as e:
    check('Chat de aprovacao acessivel', False, str(e))

if TELEGRAM_PROMO_GROUP_ID:
    try:
        resp = requests.get(
            f'https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getChat',
            params={'chat_id': TELEGRAM_PROMO_GROUP_ID}, timeout=10
        )
        if resp.status_code == 200:
            chat_info = resp.json().get('result', {})
            check('Grupo de promocoes acessivel', True, f'{chat_info.get("type")} - {chat_info.get("title")}')
        else:
            check('Grupo de promocoes acessivel', False, resp.json().get('description', resp.text[:80]))
    except Exception as e:
        check('Grupo de promocoes acessivel', False, str(e))
else:
    check('Grupo de promocoes configurado', False, 'TELEGRAM_PROMO_GROUP_ID nao definido no .env!')

separador('GEMINI API')
if GEMINI_API_KEY and GEMINI_API_KEY != 'sua_chave_aqui':
    try:
        url = f'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}'
        body = {'contents': [{'parts': [{'text': 'Responda apenas: OK'}]}],
                'generationConfig': {'responseMimeType': 'application/json'}}
        resp = requests.post(url, json=body, timeout=20)
        if resp.status_code == 200:
            check('Gemini API funcionando', True, 'gemini-2.0-flash OK')
        elif resp.status_code == 429:
            check('Gemini API - COTA ESGOTADA', False, 'HTTP 429: Rate limit/quota exceeded!')
        elif resp.status_code in (401, 403):
            check('Gemini API - CHAVE INVALIDA', False, f'HTTP {resp.status_code}')
        else:
            check('Gemini API', False, f'HTTP {resp.status_code}: {resp.text[:100]}')
    except Exception as e:
        check('Gemini API', False, str(e))
else:
    check('Gemini API configurada', False, 'GEMINI_API_KEY nao definida')

separador('SCRAPERS - TESTANDO FONTES (pode demorar 30s)')
try:
    from scrapers import PromotionScraper
    scraper = PromotionScraper()
    fontes = [
        ('Promobit', scraper.buscar_promocoes_pelando),
        ('Promobyte', scraper.buscar_promocoes_promobyte),
        ('Hardmob', scraper.buscar_promocoes_hardmob_fixed),
        ('Zoom', scraper.buscar_promocoes_zoom),
    ]
    total_produtos = 0
    for nome_fonte, func in fontes:
        try:
            t0 = time.time()
            prods = func()
            elapsed = time.time() - t0
            check(f'Fonte {nome_fonte}', len(prods) > 0, f'{len(prods)} produto(s) em {elapsed:.1f}s')
            total_produtos += len(prods)
        except Exception as e:
            check(f'Fonte {nome_fonte}', False, str(e)[:80])
    print(f'\n  [INFO] Total de produtos encontrados nas fontes testadas: {total_produtos}')
    if total_produtos == 0:
        print('  [ATENCAO] Nenhuma fonte retornou produtos!')
        print('  Os sites podem ter mudado layout ou estao bloqueando o scraper.')
except Exception as e:
    check('Scrapers carregados', False, str(e))

separador('ESTADO DO BOT (bot_state.json)')
state_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'bot_state.json')
if os.path.exists(state_path):
    try:
        with open(state_path, 'r', encoding='utf-8') as f:
            state = json.load(f)
        produtos_enviados = state.get('produtos', [])
        fila_grupo = state.get('fila_grupo', [])
        ultimo_envio = state.get('ultimo_envio_grupo', 0)
        ultimo_envio_txt = (datetime.fromtimestamp(ultimo_envio).strftime('%Y-%m-%d %H:%M:%S')
                            if ultimo_envio else 'Nunca')
        check('Arquivo bot_state.json existe', True)
        print(f'  [INFO] Produtos ja enviados (cache): {len(produtos_enviados)}')
        print(f'  [INFO] Itens na fila do grupo: {len(fila_grupo)}')
        print(f'  [INFO] Ultimo envio ao grupo: {ultimo_envio_txt}')
        if len(produtos_enviados) > 500:
            print(f'\n  [ALERTA] Cache com {len(produtos_enviados)} produtos!')
            print('  Isso pode estar causando o bot a ver todos como "ja enviados".')
            print('  Solucao: apagar bot_state.json')
        if fila_grupo:
            for item in fila_grupo[:3]:
                p = item.get('produto', {})
                print(f'       -> Na fila: [{p.get("id", "?")}] {p.get("name", "?")[:50]}')
        else:
            print('  [AVISO] Fila do grupo esta vazia! Nenhum produto sera publicado no proximo ciclo.')
    except Exception as e:
        check('Leitura do bot_state.json', False, str(e))
else:
    print('  [INFO] bot_state.json nao encontrado (bot ainda nao executou ou foi limpo)')

separador('RESUMO E PROXIMOS PASSOS')
print(f"""
  Causas mais comuns de o bot parar de postar:

  1. [GEMINI COTA]  Gemini retornou 429 (quota esgotada).
     Solucao: aguardar reset (24h) ou configurar OpenRouter no .env.

  2. [CACHE CHEIO]  bot_state.json marcando todos como "ja enviados".
     Solucao: apagar bot_state.json
       del bot_state.json  (Windows)
       rm bot_state.json   (Linux)

  3. [SCORE BAIXO]  Produtos com score abaixo de MIN_QUALITY_SCORE={MIN_QUALITY_SCORE}.
     Solucao: editar .env: MIN_QUALITY_SCORE=10
     Ou testar com: DEBUG_FILTROS=true python main.py --once

  4. [SCRAPER]      Sites mudaram layout ou bloquearam o bot.
     Veja os resultados acima para identificar quais fontes falharam.

  5. [PROCESSO]     O processo do bot crashou silenciosamente.
     Solucao: reiniciar o bot com: python main.py

  6. [FLOOD]        Telegram bloqueou por flood control.
     Solucao: aguardar alguns minutos e reiniciar o bot.

  ----------------------------------------------------------------
  COMANDOS UTEIS:

  Testar uma busca completa:
    python main.py --once

  Reiniciar o cache de produtos enviados (Windows):
    del bot_state.json

  Testar scrapers individualmente:
    python -c "from scrapers import PromotionScraper; s=PromotionScraper(); r=s.buscar_promocoes_pelando(); print(len(r), 'produtos')"
  ----------------------------------------------------------------
""")
