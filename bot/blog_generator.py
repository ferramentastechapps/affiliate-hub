#!/usr/bin/env python3
"""
blog_generator.py - Robô Diário de Criação e Fila de Publicação do Blog (SEO/GEO)
Horários de Brasília (BRT):
  - 08:00: Gera post matinal (Notícias & Tendências) e aguarda aprovação no painel.
  - 09:00: Publica post aprovado da fila no site.
  - 18:00: Gera post da tarde (Comparativos & Guias) e aguarda aprovação no painel.
  - 19:00: Publica post aprovado da fila no site.

Também permite publicação manual imediata a qualquer momento pelo painel admin ou CLI.
"""

import os
import sys
import time
import logging
import argparse
import html
import requests
from datetime import datetime, timezone, timedelta
from pathlib import Path

# Horário de Brasília (UTC-3)
BRT = timezone(timedelta(hours=-3))

def get_now_brt() -> datetime:
    return datetime.now(BRT)

# Configuração de diretórios
SCRIPT_DIR = Path(__file__).parent
BASE_DIR   = SCRIPT_DIR.parent
LOGS_DIR   = BASE_DIR / "logs"
LOGS_DIR.mkdir(exist_ok=True)
STATE_FILE = LOGS_DIR / "blog_bot_state.json"

def load_bot_state() -> dict:
    if STATE_FILE.exists():
        try:
            import json
            return json.loads(STATE_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"last_gen_slot": "", "last_pub_slot": ""}

def save_bot_state(new_values: dict):
    """Salva estado do robô atomicamente prevenindo corrupção de arquivo"""
    try:
        import json
        state = load_bot_state()
        state.update(new_values)
        tmp_file = STATE_FILE.with_suffix(".tmp")
        tmp_file.write_text(json.dumps(state, indent=2), encoding="utf-8")
        tmp_file.replace(STATE_FILE)
    except Exception as e:
        log.warning(f"Erro ao salvar estado do robô: {e}")

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

# Horários canônicos (Brasília)
GENERATE_HOURS = [8, 18]   # 08h e 18h: Geração para aprovação
PUBLISH_HOURS  = [9, 19]   # 09h e 19h: Publicação da fila de aprovados

def send_telegram_alert(message: str):
    """Envia notificação sobre geração ou publicação para o Telegram do admin"""
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

def trigger_blog_generation(topic_type: str = "auto") -> bool:
    """Dispara a geração de artigo no endpoint do Next.js (cria como rascunho pendente de aprovação)"""
    log.info(f"Iniciando geração de artigo de blog (foco: {topic_type})...")
    url = f"{API_BASE.rstrip('/')}/api/blog/generate"
    headers = {
        "Content-Type": "application/json",
    }
    if API_KEY:
        headers["x-api-key"] = API_KEY

    payload = {
        "source": "bot_scheduler",
        "topicType": topic_type,
    }

    max_attempts = 3
    for attempt in range(1, max_attempts + 1):
        try:
            log.info(f"Tentativa {attempt}/{max_attempts} chamando {url}...")
            resp = requests.post(url, headers=headers, json=payload, timeout=120)

            if resp.status_code == 200:
                data = resp.json()
                post = data.get("post", {})
                title = post.get("title", "Novo Artigo")
                slug  = post.get("slug", "")
                category = post.get("category", "Comparativos")
                admin_url = f"{PUBLIC_SITE_URL}/admin/blog"
                post_preview_url = f"{PUBLIC_SITE_URL}/blog/{slug}"
                log.info(f"Artigo gerado com sucesso! Título: '{title}' (Aguardando Aprovação)")

                now_brt = get_now_brt()
                hour_str = now_brt.strftime("%H:%M")
                next_pub_hour = "09:00" if now_brt.hour < 12 else "19:00"

                safe_title = html.escape(str(title))
                safe_cat = html.escape(str(category))

                # Notifica admin sobre novo post gerado aguardando aprovação
                msg = (
                    f"📝 <b>ROBÔ DO BLOG ({hour_str} BRT) — NOVO POST GERADO!</b>\n\n"
                    f"<b>Título:</b> {safe_title}\n"
                    f"<b>Categoria:</b> {safe_cat}\n"
                    f"<b>Status:</b> ⏳ Aguardando sua aprovação\n\n"
                    f"👉 <a href=\"{admin_url}\">Clique aqui para Aprovar no Painel</a>\n\n"
                    f"ℹ️ <i>Quando você aprovar, o artigo vai para a fila e será postado às {next_pub_hour} (ou você pode clicar em 'Postar Manualmente' para publicar na hora).</i>"
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

    now_brt = get_now_brt()
    send_telegram_alert(
        f"⚠️ <b>ALERTA ROBÔ DO BLOG:</b> Falha ao gerar o artigo automático das {now_brt.strftime('%H:%M')} BRT após {max_attempts} tentativas. Verifique a API do Gemini."
    )
    return False

def trigger_publish_queue() -> bool:
    """Verifica e publica o próximo post aprovado na fila (horários 09h e 19h) com retentativas"""
    log.info("Verificando fila de posts aprovados para publicação...")
    url = f"{API_BASE.rstrip('/')}/api/blog/queue/publish"
    headers = {
        "Content-Type": "application/json",
    }
    if API_KEY:
        headers["x-api-key"] = API_KEY

    max_attempts = 2
    for attempt in range(1, max_attempts + 1):
        try:
            resp = requests.post(url, headers=headers, json={}, timeout=60)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("published"):
                    post = data.get("post", {})
                    title = post.get("title", "Novo Post")
                    slug = post.get("slug", "")
                    post_url = f"{PUBLIC_SITE_URL}/blog/{slug}"
                    remaining = data.get("remainingQueued", 0)

                    log.info(f"Post da fila publicado com sucesso! '{title}' | Link: {post_url} (Restantes na fila: {remaining})")

                    now_brt = get_now_brt()
                    safe_title = html.escape(str(title))
                    safe_cat = html.escape(str(post.get('category', 'Geral')))
                    msg = (
                        f"🚀 <b>POST PUBLICADO NO BLOG ({now_brt.strftime('%H:%M')} BRT)!</b>\n\n"
                        f"<b>Título:</b> {safe_title}\n"
                        f"<b>Categoria:</b> {safe_cat}\n"
                        f"<b>Link:</b> <a href=\"{post_url}\">{post_url}</a>\n\n"
                        f"✅ <i>Artigo aprovado previamente publicado automaticamente da fila!</i>"
                    )
                    send_telegram_alert(msg)
                    return True
                else:
                    log.info(f"Fila vazia: {data.get('message', 'Nenhum post aprovado aguardando na fila.')}")
                    return False
            else:
                log.error(f"Erro ao publicar da fila ({resp.status_code}): {resp.text}")
        except Exception as e:
            log.error(f"Erro de conexão ao publicar fila na tentativa {attempt}: {e}")

        if attempt < max_attempts:
            time.sleep(5)

    return False

def check_queue_status():
    """Consulta situação atual de rascunhos e fila"""
    url = f"{API_BASE.rstrip('/')}/api/blog/queue/publish"
    try:
        resp = requests.get(url, timeout=15)
        if resp.status_code == 200:
            data = resp.json()
            print("\n=== STATUS DO BLOG ECONOMIZEI ===")
            print(f"Posts Aguardando Aprovação (Rascunhos): {data.get('draftCount', 0)}")
            print(f"Posts na Fila de Publicação:           {data.get('queuedCount', 0)}")
            print(f"Posts Publicados no Total:             {data.get('publishedCount', 0)}")
            next_post = data.get("nextInQueue")
            if next_post:
                print(f"Próximo da fila: '{next_post.get('title')}' ({next_post.get('category')})")
            print("==================================\n")
        else:
            print(f"Erro na API: {resp.status_code} {resp.text}")
    except Exception as e:
        print(f"Erro ao consultar status: {e}")

def scheduler_loop():
    """Loop contínuo com precisão de horário de Brasília (UTC-3)"""
    log.info(f"=== Robô de Blog Iniciado (Horário de Brasília) ===")
    log.info(f"⏰ Gerações agendadas: {GENERATE_HOURS}h (08:00 e 18:00) -> Aguarda Aprovação")
    log.info(f"🚀 Publicações da fila: {PUBLISH_HOURS}h (09:00 e 19:00) -> Publica no Site")

    state = load_bot_state()
    last_gen_slot = state.get("last_gen_slot", "")
    last_pub_slot = state.get("last_pub_slot", "")

    while True:
        try:
            now = get_now_brt()
            today_str = now.strftime("%Y-%m-%d")
            current_hour = now.hour
            current_minute = now.minute

            # 1. Checagem de Geração (08h e 18h)
            if current_hour in GENERATE_HOURS:
                slot_key = f"{today_str}_{current_hour:02d}"
                if last_gen_slot != slot_key:
                    topic = "news" if current_hour == 8 else "comparison"
                    log.info(f"Horário de geração atingido ({current_hour:02d}:00 BRT)! Disparando post focado em '{topic}'...")
                    success = trigger_blog_generation(topic_type=topic)
                    if success:
                        last_gen_slot = slot_key
                        save_bot_state({"last_gen_slot": last_gen_slot})
                        log.info(f"Geração das {current_hour:02d}h concluída. Post aguardando aprovação no painel.")
                    else:
                        log.warning(f"Tentativa de geração das {current_hour:02d}h falhou. Tentando novamente em 3 minutos...")
                        time.sleep(180)
                        continue

            # 2. Checagem de Publicação da Fila (09h e 19h)
            if current_hour in PUBLISH_HOURS:
                slot_key = f"{today_str}_{current_hour:02d}"
                if last_pub_slot != slot_key:
                    log.info(f"Horário de publicação atingido ({current_hour:02d}:00 BRT)! Checando fila de aprovados...")
                    trigger_publish_queue()
                    last_pub_slot = slot_key
                    save_bot_state({"last_pub_slot": last_pub_slot})

            # Aguarda 30 segundos até a próxima checagem de relógio
            time.sleep(30)
        except KeyboardInterrupt:
            log.info("Robô de blog finalizado pelo usuário.")
            break
        except Exception as e:
            log.error(f"Erro inesperado no loop do robô: {e}")
            time.sleep(60)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Robô de Blog Diário e Fila de Publicação")
    parser.add_argument("--now", "--generate", action="store_true", help="Gera um artigo imediatamente (como rascunho para aprovação)")
    parser.add_argument("--type", choices=["news", "comparison", "auto"], default="auto", help="Foco temático da geração")
    parser.add_argument("--publish", action="store_true", help="Publica o próximo artigo aprovado da fila imediatamente")
    parser.add_argument("--status", action="store_true", help="Exibe contagens da fila e rascunhos")
    args = parser.parse_args()

    if args.status:
        check_queue_status()
    elif args.now:
        log.info(f"Disparando geração imediata (tipo: {args.type})...")
        ok = trigger_blog_generation(topic_type=args.type)
        sys.exit(0 if ok else 1)
    elif args.publish:
        log.info("Disparando publicação imediata da fila...")
        ok = trigger_publish_queue()
        sys.exit(0 if ok else 1)
    else:
        scheduler_loop()
