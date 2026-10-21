#!/usr/bin/env python3
"""
Módulo de integração com a API v5 do Pinterest
Publica produtos automaticamente em uma pasta (board) do Pinterest
"""

import os
import re
import time
import base64
import requests
from config import (
    PINTEREST_ENABLED,
    PINTEREST_ACCESS_TOKEN,
    PINTEREST_APP_ID,
    PINTEREST_APP_SECRET,
    PINTEREST_REFRESH_TOKEN,
    PINTEREST_BOARD_ID,
    PINTEREST_LINK_TYPE,
)


def _limpar_html(texto: str) -> str:
    if not texto:
        return ""
    limpo = re.sub(r"<.*?>", "", str(texto))
    return limpo.strip()


class PinterestNotifier:
    """Gerencia publicação de Pins via Pinterest API v5"""

    def __init__(self):
        self.enabled = PINTEREST_ENABLED
        self.board_id = PINTEREST_BOARD_ID
        self.app_id = PINTEREST_APP_ID
        self.app_secret = PINTEREST_APP_SECRET
        self.refresh_token = PINTEREST_REFRESH_TOKEN
        self.access_token = PINTEREST_ACCESS_TOKEN
        self.token_expiry = 0
        self.api_base = "https://api.pinterest.com/v5"

    def _obter_auth_headers(self) -> dict | None:
        token = self._garantir_token_valido()
        if not token:
            return None
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

    def _garantir_token_valido(self) -> str | None:
        # Se token estático configurado e sem dados para refresh, usa ele direto
        if self.access_token and (not self.app_id or not self.refresh_token):
            return self.access_token

        # Se já temos um access_token em memória que não expirou, usa ele
        if self.access_token and time.time() < (self.token_expiry - 60):
            return self.access_token

        # Se temos credenciais de refresh, atualiza o access token
        if self.app_id and self.app_secret and self.refresh_token:
            if self._renovar_token():
                return self.access_token

        return self.access_token

    def _renovar_token(self) -> bool:
        """Renova o access_token usando o refresh_token via OAuth v5"""
        try:
            auth_str = f"{self.app_id}:{self.app_secret}"
            b64_auth = base64.b64encode(auth_str.encode("utf-8")).decode("utf-8")

            headers = {
                "Authorization": f"Basic {b64_auth}",
                "Content-Type": "application/x-www-form-urlencoded",
            }
            data = {
                "grant_type": "refresh_token",
                "refresh_token": self.refresh_token,
            }

            resp = requests.post(f"{self.api_base}/oauth/token", headers=headers, data=data, timeout=15)
            if resp.status_code == 200:
                payload = resp.json()
                self.access_token = payload.get("access_token")
                expires_in = payload.get("expires_in", 2592000)
                self.token_expiry = time.time() + int(expires_in)
                print("🔑 Token do Pinterest renovado com sucesso!")
                return True
            else:
                print(f"❌ Falha ao renovar token do Pinterest ({resp.status_code}): {resp.text}")
        except Exception as e:
            print(f"❌ Erro ao renovar token do Pinterest: {e}")
        return False

    def listar_boards(self) -> list[dict]:
        """Lista as pastas (boards) da conta para facilitar configuração do board_id"""
        headers = self._obter_auth_headers()
        if not headers:
            print("⚠️ Sem credenciais válidas do Pinterest.")
            return []

        try:
            resp = requests.get(f"{self.api_base}/boards", headers=headers, timeout=15)
            if resp.status_code == 200:
                items = resp.json().get("items", [])
                return [{"id": b.get("id"), "name": b.get("name")} for b in items]
            print(f"⚠️ Erro ao listar boards ({resp.status_code}): {resp.text}")
        except Exception as e:
            print(f"❌ Erro ao listar boards do Pinterest: {e}")
        return []

    def criar_pin(
        self,
        titulo: str,
        descricao: str,
        link: str,
        imagem_url: str,
        board_id: str | None = None,
        alt_text: str | None = None,
    ) -> dict | None:
        """Cria um Pin na API v5 do Pinterest"""
        destino_board = board_id or self.board_id
        if not destino_board:
            print("⚠️ PINTEREST_BOARD_ID não configurado. Pulando criação de Pin.")
            return None

        if not imagem_url or not imagem_url.startswith("http"):
            print(f"⚠️ URL de imagem inválida para Pinterest: {imagem_url}")
            return None

        headers = self._obter_auth_headers()
        if not headers:
            print("⚠️ Pinterest sem token válido.")
            return None

        payload = {
            "board_id": destino_board,
            "title": titulo[:100],
            "description": descricao[:800],
            "link": link,
            "media_source": {
                "source_type": "image_url",
                "url": imagem_url,
            },
        }
        if alt_text:
            payload["alt_text"] = alt_text[:500]

        # Tentar enviar (com retry único se 401 token expired)
        for tentativa in range(2):
            try:
                resp = requests.post(f"{self.api_base}/pins", headers=headers, json=payload, timeout=20)
                if resp.status_code in (200, 201):
                    pin_data = resp.json()
                    pin_id = pin_data.get("id")
                    print(f"📌 Pin publicado com sucesso! ID: {pin_id} | Link: https://www.pinterest.com/pin/{pin_id}/")
                    return pin_data
                elif resp.status_code == 401 and tentativa == 0 and self.refresh_token:
                    print("🔄 Token expirado no Pinterest, renovando e tentando novamente...")
                    if self._renovar_token():
                        headers = self._obter_auth_headers()
                        continue
                print(f"❌ Erro ao criar Pin no Pinterest ({resp.status_code}): {resp.text}")
                break
            except Exception as e:
                print(f"❌ Exceção ao publicar Pin no Pinterest: {e}")
                break
        return None

    def postar_produto(
        self,
        produto: dict,
        affiliate_link: str,
        link_site: str,
        foto_url: str,
    ) -> dict | None:
        """Formata e envia um produto para o Pinterest"""
        if not self.enabled:
            return None

        if not self.board_id:
            print("⚠️ Pinterest habilitado mas PINTEREST_BOARD_ID não configurado.")
            return None

        nome = produto.get("name") or "Achadinho em Promoção"
        preco = produto.get("price") or 0.0
        preco_original = produto.get("originalPrice")
        loja = produto.get("storeName") or ""
        categoria = produto.get("category") or "Geral"

        # 1. Definir link (direto de afiliado ou site)
        if PINTEREST_LINK_TYPE == "site":
            link_final = link_site or affiliate_link
        else:
            link_final = affiliate_link or link_site

        if not link_final:
            print("⚠️ Produto sem link para o Pinterest.")
            return None

        # 2. Título (máx 100 caracteres)
        # Prioriza título curto da IA se disponível
        titulo_ia = ""
        ai_analysis = produto.get("aiAnalysis")
        if isinstance(ai_analysis, dict):
            titulo_ia = ai_analysis.get("titulo") or ""

        if titulo_ia:
            titulo = f"🔥 {titulo_ia} - {nome}"
        else:
            titulo = f"🔥 {nome}"
        titulo = _limpar_html(titulo)[:100]

        # 3. Descrição com preço, desconto e tags (máx 800 caracteres)
        linhas_desc = []
        linhas_desc.append(f"📦 {_limpar_html(nome)}")

        try:
            preco_float = float(preco)
            linhas_desc.append(f"💰 Por apenas R$ {preco_float:.2f}!")
        except Exception:
            pass

        if preco_original:
            try:
                orig_float = float(preco_original)
                if orig_float > float(preco):
                    desc_perc = (1 - float(preco) / orig_float) * 100
                    linhas_desc.append(f"💸 De R$ {orig_float:.2f} por R$ {preco_float:.2f} ({desc_perc:.0f}% OFF)")
            except Exception:
                pass

        if loja:
            linhas_desc.append(f"🏪 Loja: {loja}")

        # Hashtags para SEO do Pinterest
        cat_slug = re.sub(r"[^a-zA-Z0-9]", "", categoria.lower())
        loja_slug = re.sub(r"[^a-zA-Z0-9]", "", loja.lower()) if loja else ""
        tags = ["#achadinhos", "#promocao", "#ofertas", "#compras", "#desconto"]
        if cat_slug:
            tags.append(f"#{cat_slug}")
        if loja_slug:
            tags.append(f"#{loja_slug}")

        linhas_desc.append("")
        linhas_desc.append(" ".join(tags))

        descricao = "\n".join(linhas_desc)[:800]

        # 4. Criar Pin
        return self.criar_pin(
            titulo=titulo,
            descricao=descricao,
            link=link_final,
            imagem_url=foto_url,
            alt_text=f"Promoção de {nome[:100]}",
        )


if __name__ == "__main__":
    import sys

    bot = PinterestNotifier()
    print(f"Pinterest Enabled: {bot.enabled}")
    print(f"Board ID: {bot.board_id}")
    print(f"Link Type: {PINTEREST_LINK_TYPE}")

    if "--boards" in sys.argv or "-b" in sys.argv:
        print("🔍 Consultando pastas (boards)...")
        boards = bot.listar_boards()
        if boards:
            print("\n📋 Pastas encontradas:")
            for b in boards:
                print(f" - {b['name']}: ID = {b['id']}")
        else:
            print("Nenhuma pasta retornada.")
    else:
        print("\nPara listar suas pastas do Pinterest:")
        print("  python pinterest_bot.py --boards")
