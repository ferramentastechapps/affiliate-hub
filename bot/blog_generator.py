#!/usr/bin/env python3
"""
blog_generator.py - Robô Diário de Criação de Postagens para Blog e SEO/GEO
Executa automaticamente todo dia às 18h (horário de Brasília).
Pesquisa notícias, comparativos e publica um artigo otimizado no site.
Pode ser executado com '--now' para rodar um teste imediato.
"""

import os
import sys
import time
import logging
import argparse
import requests
from datetime import datetime
from pathlib import Path

# Configuração de diretórios
SCRIPT_DIR = Path(__file__).parent
BASE_DIR   = SCRIPT_DIR.parent
(BASE_DIR / "logs").mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(BASE_DIR / "logs" / "blog_generator.log", encoding="utf-8"),
    ]
)
log = logging.getLogger("blog_generator")

def load_env():
    # 1. Carrega raiz .env
    root_env = BASE_DIR / ".env"
    if root_env.exists():
        for line in root_env.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

    # 2. Carrega bot/.env
    bot_env = SCRIPT_DIR / ".env"
    if bot_env.exists():
        for line in bot_env.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                os.environ[k.strip()] = v.strip().strip('"').strip("'")

load_env()

API_BASE         = os.getenv("AFFILIATE_HUB_URL", "http://127.0.0.1:3005")
_site_url        = os.getenv('NEXT_PUBLIC_SITE_URL') or os.getenv('PUBLIC_SITE_URL') or os.getenv('SITE_URL') or "https://economizei.ftech-apps.com.br"
if any(h in _site_url for h in ['127.0.0.1', 'localhost', '0.0.0.0']):
    _site_url = "https://economizei.ftech-apps.com.br"
PUBLIC_SITE_URL  = _site_url.rstrip('/')
API_KEY          = os.getenv("AFFILIATE_HUB_API_KEY", "")
BOT_TOKEN        = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")
TARGET_HOUR      = int(os.getenv("BLOG_POST_HOUR", "18")) # Padrão: 18h

def send_telegram_alert(message: str):
    """Envia notificação sobre o novo post publicado para o Telegram do admin"""
    if not BOT_TOKEN or not TELEGRAM_CHAT_ID:
        log.warning("Telegram Bot Token ou Chat ID não configurado para alertas.")
        return

    try:
        url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
        payload = {
            "chat_id": TELEGRAM_CHAT_ID,
            "text": message,
            "parse_mode": "HTML",
            "disable_web_page_preview": False
        }
        resp = requests.post(url, json=payload, timeout=10)
        if resp.status_code == 200:
            log.info("Notificação Telegram enviada com sucesso!")
        else:
            log.warning(f"Telegram retornou erro {resp.status_code}: {resp.text}")
    except Exception as e:
        log.error(f"Erro ao enviar notificação Telegram: {e}")

def trigger_blog_generation() -> bool:
    """Dispara a geração de artigo no endpoint do Next.js com retentativas automáticas"""
    log.info("Iniciando geração de novo artigo de blog via API...")
    url = f"{API_BASE.rstrip('/')}/api/blog/generate"
    headers = {
        "Content-Type": "application/json",
    }
    if API_KEY:
        headers["x-api-key"] = API_KEY

    max_attempts = 3
    for attempt in range(1, max_attempts + 1):
        try:
            log.info(f"Tentativa {attempt}/{max_attempts} chamando {url}...")
            resp = requests.post(url, headers=headers, json={"source": "bot_scheduler"}, timeout=120)

            if resp.status_code == 200:
                data = resp.json()
                post = data.get("post", {})
                title = post.get("title", "Novo Artigo")
                slug  = post.get("slug", "")
                post_url = f"{PUBLIC_SITE_URL}/blog/{slug}"
                log.info(f"Artigo gerado com sucesso! Título: '{title}' | URL: {post_url}")

                # Notifica admin
                msg = (
                    f"📝 <b>NOVO POST PUBLICADO NO BLOG!</b>\n\n"
                    f"<b>Título:</b> {title}\n"
                    f"<b>Categoria:</b> {post.get('category', 'Geral')}\n"
                    f"<b>Link:</b> <a href=\"{post_url}\">{post_url}</a>\n\n"
                    f"🤖 <i>Artigo gerado automaticamente às 18h com foco em SEO e GEO (IA).</i>"
                )
                send_telegram_alert(msg)
                return True
            elif resp.status_code == 429:
                log.warning(f"Rate-limit atingido na API: {resp.text}")
                return False
            else:
                log.error(f"Falha na API ({resp.status_code}): {resp.text}")
        except Exception as e:
            log.error(f"Erro de conexão na tentativa {attempt}: {e}")

        if attempt < max_attempts:
            time.sleep(10)

    return False

def scheduler_loop():
    """Loop que monitora o relógio e executa às 18:00 todos os dias"""
    log.info(f"=== Robô de Blog Iniciado | Agendado para rodar diariamente às {TARGET_HOUR}h ===")
    last_run_date = ""

    while True:
        try:
            now = datetime.now()
            today_str = now.strftime("%Y-%m-%d")

            # Verifica se atingiu o horário alvo e se ainda não rodou hoje
            if now.hour == TARGET_HOUR and last_run_date != today_str:
                log.info(f"Horário atingido ({now.hour}h)! Disparando rotina diária...")
                success = trigger_blog_generation()
                if success:
                    last_run_date = today_str
                    log.info(f"Ciclo concluído para a data: {today_str}. Próximo ciclo amanhã às {TARGET_HOUR}h.")
                else:
                    log.warning("Tentativa falhou. Tentando novamente em 5 minutos...")
                    time.sleep(300)
                    continue

            # Dorme 30 segundos entre checagens de relógio
            time.sleep(30)
        except KeyboardInterrupt:
            log.info("Robô de blog finalizado pelo usuário.")
            break
        except Exception as e:
            log.error(f"Erro inesperado no loop do robô: {e}")
            time.sleep(60)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Robô de Blog Diário (18h)")
    parser.add_argument("--now", action="store_true", help="Gera uma postagem imediatamente para teste")
    args = parser.parse_args()

    if args.now:
        log.info("Modo de teste imediato (--now) ativado.")
        ok = trigger_blog_generation()
        sys.exit(0 if ok else 1)
    else:
        scheduler_loop()
