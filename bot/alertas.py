"""
alertas.py - Sistema centralizado de alertas via Telegram para o admin.

Envia mensagens para o TELEGRAM_CHAT_ID (chat privado de aprovação) quando
ocorrem erros críticos no scraper, IA, listener ou deduplicação.

Rate-limit: no máximo 1 alerta por tipo de erro a cada 30 minutos,
para evitar spam em caso de falha persistente.
"""

import html
import requests
import time
import traceback
from typing import Optional
from config import TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID

_last_alert: dict = {}
COOLDOWN_SEGUNDOS = 30 * 60  # 30 minutos de cooldown por tipo de alerta


def _pode_enviar(chave: str) -> bool:
    agora = time.time()
    ultimo = _last_alert.get(chave, 0)
    if agora - ultimo >= COOLDOWN_SEGUNDOS:
        _last_alert[chave] = agora
        return True
    return False


def _enviar(mensagem: str) -> bool:
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        print("⚠️ [Alertas] TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID não configurado -- alerta não enviado.")
        return False
    try:
        resp = requests.post(
            f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
            json={
                "chat_id": TELEGRAM_CHAT_ID,
                "text": mensagem,
                "parse_mode": "HTML",
                "disable_web_page_preview": True,
            },
            timeout=10,
        )
        if resp.status_code == 200:
            print("📨 [Alertas] Alerta enviado ao Telegram com sucesso.")
            return True
        else:
            print(f"⚠️ [Alertas] Falha ao enviar alerta: {resp.status_code} - {resp.text[:100]}")
            return False
    except Exception as e:
        print(f"⚠️ [Alertas] Exceção ao enviar alerta: {e}")
        return False


def alerta_scraper_zerado(fonte: str, detalhes: str = "") -> None:
    chave = f"scraper_zerado_{fonte}"
    if not _pode_enviar(chave):
        return
    msg = (
        f"⚠️ <b>[Alerta] Scraper Zerado</b>\n\n"
        f"📦 Fonte: <code>{html.escape(fonte)}</code> retornou <b>0 itens</b>.\n"
        f"Motivo provável: Bloqueio (403/Cloudflare) ou seletor HTML alterado."
    )
    if detalhes:
        msg += f"\n<i>Detalhes: {html.escape(detalhes[:200])}</i>"
    _enviar(msg)


def alerta_scraper_erro(fonte: str, erro: Exception) -> None:
    chave = f"scraper_erro_{fonte}"
    if not _pode_enviar(chave):
        return
    msg = (
        f"❌ <b>[Alerta] Erro no Scraper</b>\n\n"
        f"📦 Fonte: <code>{html.escape(fonte)}</code>\n"
        f"🚨 Erro: <code>{html.escape(type(erro).__name__)}: {html.escape(str(erro)[:200])}</code>"
    )
    _enviar(msg)


def alerta_ia_falhou(modelo: str, status_code: int, detalhe: str = "") -> None:
    chave = f"ia_falhou_{modelo}"
    if not _pode_enviar(chave):
        return
    motivo = "Modelo desativado/404" if status_code == 404 else f"HTTP {status_code}"
    msg = (
        f"🤖 <b>[Alerta] Falha na IA de Avaliação</b>\n\n"
        f"🧠 Modelo: <code>{html.escape(modelo)}</code>\n"
        f"🚨 Status: <b>{motivo}</b>"
    )
    if detalhe:
        msg += f"\n<i>{html.escape(detalhe[:200])}</i>"
    msg += "\n\n<i>⚠️ A qualidade e geração de legendas podem estar temporariamente afetadas.</i>"
    _enviar(msg)


def alerta_dedup_saturado(total: int, novos: int) -> None:
    chave = "dedup_saturado"
    if not _pode_enviar(chave):
        return
    msg = (
        f"🔁 <b>[Alerta] Deduplicação 100% Saturada</b>\n\n"
        f"Encontrados <b>{total} produtos</b>, mas <b>0 novos</b> para processar.\n"
        f"O cache local pode estar saturado ou as fontes não estão trazendo promoções novas."
    )
    _enviar(msg)


def alerta_crash_fatal(erro: Exception, contexto: str = "main") -> None:
    chave = f"crash_{contexto}"
    if not _pode_enviar(chave):
        return
    tb = html.escape(traceback.format_exc()[-500:])
    msg = (
        f"💥 <b>[CRÍTICO] Crash no Bot</b>\n\n"
        f"📍 Contexto: <code>{html.escape(contexto)}</code>\n"
        f"🚨 Erro: <code>{html.escape(type(erro).__name__)}: {html.escape(str(erro)[:180])}</code>\n\n"
        f"<pre>{tb}</pre>"
    )
    _enviar(msg)


def alerta_telegram_conflito(detalhes: str = "") -> None:
    chave = "telegram_conflito"
    if not _pode_enviar(chave):
        return
    msg = (
        f"⚠️ <b>[Alerta] Conflito de Instância no Telegram</b>\n\n"
        f"Houve duplicidade de polling no bot (Conflict: terminated by other getUpdates).\n"
        f"O sistema aplicou backoff automático para restabelecer a conexão."
    )
    if detalhes:
        msg += f"\n<i>{html.escape(detalhes[:200])}</i>"
    _enviar(msg)


def alerta_api_hub_falhou(status_code: int, endpoint: str) -> None:
    chave = f"api_hub_{endpoint}"
    if not _pode_enviar(chave):
        return
    msg = (
        f"🌐 <b>[Alerta] API Affiliate Hub Indisponível</b>\n\n"
        f"🔗 Endpoint: <code>{html.escape(endpoint)}</code>\n"
        f"🚨 Status HTTP: <b>{status_code}</b>\n\n"
        f"<i>Verifique se o Next.js está rodando ou se a API Key é válida.</i>"
    )
    _enviar(msg)


def alerta_ciclo_resumo(total_encontrados: int, novos: int, fontes_com_erro: list, fontes_zeradas: list) -> None:
    tem_problema = (len(fontes_com_erro) > 0 or len(fontes_zeradas) > 5) and novos == 0
    if not tem_problema:
        return
    chave = "ciclo_resumo_problema"
    if not _pode_enviar(chave):
        return
    linhas = ["📊 <b>[Resumo de Ciclo com Anomalias]</b>\n"]
    linhas.append(f"📦 Total Encontrados: <b>{total_encontrados}</b> | ✨ Novos: <b>{novos}</b>")
    if fontes_com_erro:
        linhas.append(f"❌ Fontes com erro: <code>{html.escape(', '.join(fontes_com_erro))}</code>")
    if fontes_zeradas:
        linhas.append(f"⚠️ Fontes zeradas: <code>{html.escape(', '.join(fontes_zeradas))}</code>")
    _enviar("\n".join(linhas))

