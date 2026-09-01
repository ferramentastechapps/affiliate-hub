#!/usr/bin/env python3
"""
Telegram Group Monitor — Monitora grupo externo de cupons em tempo real.

Usa Telethon (conta de usuário) para escutar mensagens do grupo alvo e
publicar automaticamente no nosso grupo de promoções com links de afiliado.

SETUP (primeira vez na VPS):
    pip install telethon
    python telegram_group_monitor.py --setup

Isso vai pedir número de telefone + código SMS para autenticar a conta.
A sessão fica salva em bot/monitor_session.session e não precisa refazer.
"""

import asyncio
import re
import os
import sys
import json
import hashlib
import time
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

# ─── Telethon ───────────────────────────────────────────────────────────────
try:
    from telethon import TelegramClient, events
    from telethon.tl.types import Message
except ImportError:
    print("❌ Telethon não instalado! Execute: pip install telethon")
    sys.exit(1)

# ─── Configuração local ──────────────────────────────────────────────────────
from config import (
    TELEGRAM_BOT_TOKEN,
    TELEGRAM_PROMO_GROUP_ID,
    AFFILIATE_HUB_URL,
    AFFILIATE_HUB_API_KEY,
)
from affiliate_hub_api import AffiliateHubAPI
from scrapers import PromotionScraper
from telegram_bot import TelegramNotifier

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [Monitor] %(levelname)s %(message)s',
    handlers=[logging.StreamHandler()]
)
log = logging.getLogger(__name__)

# ─── Constantes ──────────────────────────────────────────────────────────────
# ID do grupo alvo
TARGET_GROUP_ID = -1001520983865

# Arquivo de sessão Telethon
SESSION_FILE = Path(__file__).parent / 'monitor_session'

# Arquivo de deduplicação (evita repostar a mesma oferta)
DEDUP_FILE = Path(__file__).parent / 'monitor_dedup.json'

# Tempo mínimo entre publicações do mesmo produto (1 hora)
COOLDOWN_SEGUNDOS = 3600

# Variáveis de ambiente para Telethon API
# Crie em https://my.telegram.org/apps
TELEGRAM_API_ID = int(os.getenv('TELEGRAM_API_ID', '0'))
TELEGRAM_API_HASH = os.getenv('TELEGRAM_API_HASH', '')

# ─── Plataformas suportadas ──────────────────────────────────────────────────
PLATFORM_PATTERNS = {
    'amazon': [r'amazon\.com\.br', r'amzn\.to', r'a\.co/[a-zA-Z0-9]'],
    'mercadoLivre': [r'mercadolivre\.com\.br', r'mercadolibre\.com', r'meli\.la'],
    'shopee': [r'shopee\.com\.br', r'shope\.ee'],
    'aliexpress': [r'aliexpress\.com', r's\.click\.aliexpress'],
    'magalu': [
        r'magazineluiza\.com\.br', r'magalu\.com\.br',
        r'magazinevoce\.com\.br', r'influenciadormagalu\.com\.br',
    ],
    'kabum': [r'kabum\.com\.br'],
    'tiktok': [r'tiktok\.com.*shop', r'vm\.tiktok\.com'],
    'netshoes': [r'netshoes\.com\.br'],
}

# Padrões para detectar cupons no texto
COUPON_PATTERNS = [
    r'(?:cupom|código|coupon|code|promo)[:\s]+([A-Z0-9_-]{4,20})',
    r'use\s+([A-Z0-9_-]{4,20})\s+(?:e ganhe|para|e receba|no checkout)',
    r'🎫\s*([A-Z0-9_-]{4,20})',
    r'🏷️?\s*([A-Z0-9_-]{4,20})',
    r'\b([A-Z]{3,}[0-9]{1,4})\b.*?(?:\d+%?\s*off|\d+%?\s*desc)',
    r'código[:\s]*\*?([A-Z0-9_-]{4,20})\*?',
]

# Palavras que NÃO são cupons (Blacklist expandida de termos comuns)
NAO_CUPOM = {
    'WIFI', 'HDMI', 'USB', 'SSD', 'RAM', 'CPU', 'GPU', 'LED', 'LCD',
    'UHD', 'FHD', 'QHD', 'HDR', 'PS4', 'PS5', 'PS3', 'OLED', 'QLED',
    'AMOLED', 'FULL', 'SMART', 'DUAL', 'QUAD', 'CORE', 'PLUS', 'MINI',
    'ULTRA', 'PRO', 'MAX', 'LITE', 'SLIM', 'TURBO', 'BOOST', 'FAST',
    'SAMSUNG', 'APPLE', 'SONY', 'ASUS', 'INTEL', 'NVIDIA', 'AMD',
    'LENOVO', 'XIAOMI', 'MOTOROLA', 'LOGITECH', 'GALAXY', 'IPHONE',
    'BLACK', 'WHITE', 'FRIDAY', 'GRATIS', 'FREE', 'PROMO', 'OFERTA',
    'CUPOM', 'CUPONS', 'CODIGO', 'CODIGOS', 'DESCONTO', 'DESCONTOS', 'OFF',
    'PIX', 'CARTAO', 'BOLETO', 'LIBERADO', 'LIBERADA', 'LIBERADOS',
    'DISPONIVEL', 'DISPONIVEIS', 'ESPECIAL', 'EXCLUSIVO', 'EXCLUSIVA',
    'EXCLUSIVOS', 'IMPERDIVEL', 'ATIVO', 'ATIVA', 'ATIVOS', 'NOVO', 'NOVA',
    'NOVOS', 'PRIMEIRA', 'COMPRA', 'COMPRAS', 'CLIENTE', 'CLIENTES',
    'SHOPEE', 'MERCADOLIVRE', 'AMAZON', 'ALIEXPRESS', 'MAGALU', 'KABUM',
    'NETSHOES', 'CARTEIRA', 'LINK', 'CANAL', 'DIRETO', 'COPIE', 'COLE',
    'TODOS', 'SELECIONADOS', 'VENDEDOR', 'OFICIAL', 'FRETE', 'PRIME',
    'HOJE', 'AGORA', 'CORRE', 'ATENCAO', 'ALERTA', 'ALERTAS', 'APROVEITE',
    'VALIDO', 'VALIDA', 'VALIDOS', 'PAGINA', 'PRODUTO', 'PRODUTOS',
    'RESGATE', 'ACESSE', 'CONFIRA', 'AJUDANDO', 'DIRETO', 'SEU', 'SUA',
    'AQUI', 'VEJA', 'SHOP', 'PARA', 'COM', 'SEM'
}

LOJA_MAP = {
    'amazon': 'Amazon',
    'mercadoLivre': 'Mercado Livre',
    'shopee': 'Shopee',
    'aliexpress': 'AliExpress',
    'magalu': 'Magalu',
    'kabum': 'KaBuM',
    'tiktok': 'TikTok',
    'netshoes': 'Netshoes',
}


class DeduplicacaoMonitor:
    """Controla deduplicação de mensagens já processadas."""

    def __init__(self):
        self._data: dict = {}
        self._load()

    def _load(self):
        try:
            if DEDUP_FILE.exists():
                with open(DEDUP_FILE, 'r', encoding='utf-8') as f:
                    self._data = json.load(f)
        except Exception:
            self._data = {}

    def _save(self):
        try:
            with open(DEDUP_FILE, 'w', encoding='utf-8') as f:
                json.dump(self._data, f, ensure_ascii=False)
        except Exception as e:
            log.warning(f'Erro ao salvar dedup: {e}')

    def ja_processado(self, chave: str) -> bool:
        if chave not in self._data:
            return False
        ts = self._data[chave]
        return (time.time() - ts) < COOLDOWN_SEGUNDOS

    def marcar(self, chave: str):
        self._data[chave] = time.time()
        # Limpar entradas antigas (> 24h)
        agora = time.time()
        self._data = {k: v for k, v in self._data.items() if agora - v < 86400}
        self._save()


def detectar_plataforma(url: str) -> Optional[str]:
    """Detecta a plataforma a partir da URL."""
    url_lower = url.lower()
    for platform, patterns in PLATFORM_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, url_lower):
                return platform
    return None


def extrair_urls(texto: str) -> list:
    """Extrai todas as URLs de um texto."""
    padrao = r'https?://[^\s\)\]\>\"\']+(?:\?[^\s\)\]\>\"\']*)?'
    urls = re.findall(padrao, texto)
    urls_limpas = []
    for url in urls:
        url = re.sub(r'[.,;:!?\)]+$', '', url)
        if url:
            urls_limpas.append(url)
    return urls_limpas


def extrair_detalhes_cupom(texto: str, platform: str = 'Shopee') -> dict:
    """Extrai de forma ultra-precisa código, desconto e regras do cupom."""
    texto_limpo = texto.strip()
    linhas = [l.strip() for l in texto_limpo.split('\n') if l.strip()]

    codigo = None

    # Prioridade 1: Linha com emoji de ticket/cupom seguida EXATAMENTE por 1 palavra (ex: "🎟️ OFERTA20AF")
    for linha in linhas:
        if any(em in linha for em in ['🎟️', '🎟', '🏷️', '🏷', '🎫', '🔖']):
            linha_sem_emoji = re.sub(r'[^\w\d\s_-]', '', linha).strip()
            palavras = linha_sem_emoji.split()
            if len(palavras) == 1:
                p_up = palavras[0].upper()
                if 3 <= len(p_up) <= 25 and p_up not in NAO_CUPOM:
                    codigo = p_up
                    break
            elif len(palavras) == 2:
                for p in palavras:
                    p_up = p.upper()
                    if 3 <= len(p_up) <= 25 and p_up not in NAO_CUPOM:
                        codigo = p_up
                        break
            if codigo:
                break

    # Prioridade 2: Padrão explícito "cupom: CODIGO" ou "código: CODIGO"
    if not codigo:
        matches = re.findall(r'(?:cupom|c[oó]digo|coupon|code)\s*[:= ]\s*([A-Z0-9_-]{3,25})', texto_limpo, re.IGNORECASE)
        for m in matches:
            m_up = m.upper().strip()
            if m_up not in NAO_CUPOM and len(m_up) >= 3:
                codigo = m_up
                break

    # Prioridade 3: Linha isolada contendo palavra com letras E números (ex: "OFERTA20AF", "MELI20")
    if not codigo:
        for linha in linhas:
            linha_pura = re.sub(r'[^\w\d_-]', '', linha).strip()
            if ' ' not in linha_pura:
                up = linha_pura.upper()
                if 4 <= len(up) <= 25 and up not in NAO_CUPOM and any(ch.isdigit() for ch in up):
                    codigo = up
                    break

    # Extrair valor do desconto (R$ XX OFF ou XX% OFF)
    desconto = None
    match_desc = re.search(r'(R\$\s*[\d.,]+\s*OFF|\d+\s*%\s*OFF|R\$\s*[\d.,]+\s*(?:de\s+)?desconto|\d+\s*%\s*(?:de\s+)?desconto|frete\s+gr[aá]tis)', texto_limpo, re.IGNORECASE)
    if match_desc:
        desconto = match_desc.group(1).strip().upper()
        desconto = re.sub(r'\s+', ' ', desconto)
        if not desconto.endswith('OFF') and 'DESCONTO' not in desconto and 'GRÁTIS' not in desconto and 'GRATIS' not in desconto:
            desconto = f"{desconto} OFF"
    elif codigo:
        match_rs = re.search(r'R\$\s*([\d.,]+)', texto_limpo)
        if match_rs:
            desconto = f"R$ {match_rs.group(1)} OFF"

    # Extrair regras / valor mínimo
    regras = None
    min_val = None
    match_min = re.search(r'(acima\s+de\s+R\$\s*[\d.,]+|a\s+partir\s+de\s+R\$\s*[\d.,]+|m[ií]nimo\s+(?:de\s+)?R\$\s*[\d.,]+|em\s+compras\s+acima\s+de\s+R\$\s*[\d.,]+)', texto_limpo, re.IGNORECASE)
    if match_min:
        regras = match_min.group(1).strip().capitalize()
        val_match = re.search(r'R\$\s*([\d.,]+)', regras, re.IGNORECASE)
        if val_match:
            try:
                min_val = float(val_match.group(1).replace('.', '').replace(',', '.'))
            except Exception:
                pass
    elif re.search(r'exclusivo\s+(?:no\s+)?app', texto_limpo, re.IGNORECASE):
        regras = "Exclusivo no App"
    elif re.search(r'membros\s+prime', texto_limpo, re.IGNORECASE):
        regras = "Exclusivo Membros Prime"
    elif re.search(r'produtos\s+selecionados', texto_limpo, re.IGNORECASE):
        regras = "Produtos Selecionados"

    is_coupon_post = bool(codigo or 'CUPOM' in texto_limpo.upper())

    return {
        'codigo': codigo,
        'desconto': desconto or 'Desconto Especial',
        'regras': regras,
        'min_val': min_val,
        'is_coupon_post': is_coupon_post
    }


def extrair_preco(texto: str) -> Optional[float]:
    """Extrai primeiro preço R$ do texto."""
    match = re.search(r'R\$\s*([\d.,]+)', texto)
    if match:
        valor = match.group(1).replace('.', '').replace(',', '.')
        try:
            return float(valor)
        except ValueError:
            pass
    return None


def extrair_desconto(texto: str) -> Optional[int]:
    """Extrai percentual de desconto do texto."""
    match = re.search(r'(\d+)\s*%\s*(?:off|desc|de desconto)', texto, re.IGNORECASE)
    if match:
        return int(match.group(1))
    return None


def gerar_nome_produto(texto: str, platform: str) -> str:
    """Gera um nome descritivo para o produto a partir da mensagem."""
    nome = re.sub(r'https?://\S+', '', texto)
    nome = re.sub(
        r'[🔥💥🎯🎁🎀🎫🏷️👇👆✅❌⚡🚀💰💳🛒🛍️📢🔔🎉🎊🏆🥇]+', ' ', nome
    )
    nome = re.sub(r'\s+', ' ', nome).strip()
    if len(nome) > 150:
        nome = nome[:147] + '...'
    if not nome or len(nome) < 5:
        nome = f'Promoção {LOJA_MAP.get(platform, platform.title())}'
    return nome


class TelegramGroupMonitor:
    """Monitor de grupo Telegram que converte promos em links de afiliado."""

    def __init__(self):
        self.api = AffiliateHubAPI()
        self.scraper = PromotionScraper()
        self.notifier = TelegramNotifier()
        self.dedup = DeduplicacaoMonitor()

        if not TELEGRAM_API_ID or not TELEGRAM_API_HASH:
            log.error('❌ TELEGRAM_API_ID e TELEGRAM_API_HASH não configurados!')
            log.error('   Adicione ao .env e ao .env.local:')
            log.error('   TELEGRAM_API_ID=<seu_api_id>')
            log.error('   TELEGRAM_API_HASH=<seu_api_hash>')
            log.error('   Obtenha em: https://my.telegram.org/apps')
            sys.exit(1)

        self.client = TelegramClient(
            str(SESSION_FILE),
            TELEGRAM_API_ID,
            TELEGRAM_API_HASH,
        )

    async def processar_mensagem(self, msg_text: str, msg_id: int):
        """Processa uma mensagem do grupo alvo."""
        if not msg_text:
            return

        log.info(f'📨 Nova mensagem #{msg_id}: {msg_text[:100]}')

        # Extrair URLs
        urls = extrair_urls(msg_text)
        if not urls:
            log.info('   ⏭️  Sem URLs — ignorando')
            return

        # Filtrar apenas URLs de plataformas conhecidas
        urls_validas = []
        for url in urls:
            platform = detectar_plataforma(url)
            if platform:
                urls_validas.append((url, platform))

        if not urls_validas:
            log.info('   ⏭️  URLs não são de plataformas suportadas — ignorando')
            return

        # Pegar a primeira URL válida
        url_original, platform = urls_validas[0]
        log.info(f'   🎯 Plataforma: {platform} | URL: {url_original[:60]}')

        # Deduplicação por URL
        chave_dedup = hashlib.md5(url_original.encode()).hexdigest()
        if self.dedup.ja_processado(chave_dedup):
            log.info('   ♻️  Já processado recentemente — ignorando')
            return

        # Resolver URL encurtada se necessário
        try:
            url_resolvida = self.scraper._resolver_url_intermediaria(url_original)
            if url_resolvida != url_original:
                log.info(f'   🔗 URL resolvida: {url_resolvida[:60]}')
                nova_plataforma = detectar_plataforma(url_resolvida)
                if nova_plataforma:
                    platform = nova_plataforma
        except Exception:
            url_resolvida = url_original

        loja = LOJA_MAP.get(platform, 'Amazon')
        links = self.scraper._criar_links(url_resolvida, loja)

        # Extrair plataforma / id
        try:
            platform_type, platform_id = self.scraper.extrair_platform_id(url_resolvida)
        except Exception:
            platform_type, platform_id = platform, None

        # Análise de Cupom
        detalhes_cupom = extrair_detalhes_cupom(msg_text, platform)

        if detalhes_cupom['is_coupon_post'] and detalhes_cupom['codigo']:
            # 🎟️ É UM CUPOM DE DESCONTO DIRETO
            log.info(f"   🎟️ Detectado como CUPOM: Código {detalhes_cupom['codigo']} | {detalhes_cupom['desconto']}")
            
            nome_cupom = f"Cupom {loja} {detalhes_cupom['desconto']}"
            descricao_cupom = f"🎟️ CUPOM: {detalhes_cupom['codigo']}\n💰 Desconto: {detalhes_cupom['desconto']}"
            if detalhes_cupom['regras']:
                descricao_cupom += f"\n📌 Condição: {detalhes_cupom['regras']}"

            produto = {
                'name': nome_cupom,
                'category': 'Cupons de Desconto',
                'description': descricao_cupom,
                'imageUrl': '/placeholder.webp',
                'price': detalhes_cupom['min_val'] or 0,
                'links': links,
                'storeName': loja,
                'source': 'telegram_monitor',
                'externalId': f'tgmon_cupom_{msg_id}',
                'platformType': platform_type or platform,
                'platformId': platform_id or str(msg_id),
                'autoApprove': True,
                'isCoupon': True,
                'couponCode': detalhes_cupom['codigo'],
                'discount': detalhes_cupom['desconto'],
                'minPurchaseValue': detalhes_cupom['min_val'],
                'rules': detalhes_cupom['regras'],
            }
        else:
            # 📦 É UM PRODUTO CONVENCIONAL
            preco = extrair_preco(msg_text)
            desconto = extrair_desconto(msg_text)
            nome = gerar_nome_produto(msg_text, platform)

            descricao_partes = [f'📢 Oferta capturada do grupo de cupons — {loja}']
            if desconto:
                descricao_partes.append(f'🔥 {desconto}% OFF')
            if detalhes_cupom['codigo']:
                descricao_partes.append(f"🎟️ CUPOM: {detalhes_cupom['codigo']}")
            descricao = '\n'.join(descricao_partes)

            try:
                categoria = self.scraper._detectar_categoria(nome)
            except Exception:
                categoria = 'Diversos'

            produto = {
                'name': nome,
                'category': categoria,
                'description': descricao,
                'imageUrl': '/placeholder.webp',
                'price': preco,
                'links': links,
                'storeName': loja,
                'source': 'telegram_monitor',
                'externalId': f'tgmon_{msg_id}',
                'platformType': platform_type or platform,
                'platformId': platform_id or str(msg_id),
                'autoApprove': True,
            }
            if detalhes_cupom['codigo']:
                produto['couponCode'] = detalhes_cupom['codigo']
            if desconto:
                produto['discountPercent'] = desconto

        # Enviar para a API do Affiliate Hub
        try:
            resultado = self.api.adicionar_produto(produto)
            if resultado and resultado.get('success'):
                produto_criado = resultado.get('product', {})
                produto_id = produto_criado.get('id')
                log.info(f'   ✅ Produto adicionado! ID: {produto_id}')

                # Se for cupom interceptado, o webhook social já fez a publicação elegante
                if resultado.get('isCoupon') or produto.get('isCoupon'):
                    log.info('   🎉 Cupom publicado nas redes sociais com layout profissional!')
                else:
                    # Publicar produto convencional no grupo de promoções
                    await self._publicar_no_grupo(produto_criado, platform, links, detalhes_cupom.get('codigo'))

                # Marcar como processado
                self.dedup.marcar(chave_dedup)
            else:
                if resultado and resultado.get('duplicate'):
                    log.info('   ♻️  Produto já existe no sistema — ignorando')
                    self.dedup.marcar(chave_dedup)
                else:
                    erro = resultado.get('error') if resultado else 'Sem resposta'
                    log.warning(f'   ⚠️  Falha ao adicionar produto: {erro}')
        except Exception as e:
            log.error(f'   ❌ Erro ao processar produto: {e}')
            import traceback
            traceback.print_exc()

    async def _publicar_no_grupo(
        self,
        produto: dict,
        platform: str,
        links: dict,
        cupom: Optional[str]
    ):
        """Publica a promoção no grupo de promoções com link de afiliado."""
        try:
            affiliate_link = (
                produto.get('affiliateLink') or
                links.get(platform) or
                next(iter(links.values()), None)
            )

            if not affiliate_link:
                log.warning('   ⚠️  Sem link de afiliado para publicar')
                return

            await self.notifier.publicar_no_grupo(produto, platform, affiliate_link)
            log.info(f'   📢 Publicado no grupo! Link: {affiliate_link[:60]}')
        except Exception as e:
            log.error(f'   ❌ Erro ao publicar no grupo: {e}')
            import traceback
            traceback.print_exc()

    async def iniciar(self):
        """Inicia o monitor do grupo."""
        log.info('🚀 Iniciando Telegram Group Monitor...')
        log.info(f'   Monitorando grupo: {TARGET_GROUP_ID}')
        log.info(f'   Publicando em: {TELEGRAM_PROMO_GROUP_ID}')

        await self.client.start()
        log.info('✅ Conta Telegram autenticada!')

        # Verificar acesso ao grupo alvo
        try:
            entity = await self.client.get_entity(TARGET_GROUP_ID)
            log.info(f'✅ Acesso ao grupo: {getattr(entity, "title", "?")}')
        except Exception as e:
            log.error(f'❌ Sem acesso ao grupo {TARGET_GROUP_ID}: {e}')
            log.error('   Certifique-se de que sua conta está no grupo!')
            return

        # Registrar handler de novas mensagens
        @self.client.on(events.NewMessage(chats=[TARGET_GROUP_ID]))
        async def handler(event):
            try:
                msg = event.message
                texto = msg.message or ''
                if len(texto) < 10:
                    return
                await self.processar_mensagem(texto, msg.id)
            except Exception as e:
                log.error(f'Erro no handler: {e}')

        log.info('👂 Escutando novas mensagens em tempo real...')
        await self.client.run_until_disconnected()


async def setup_interativo():
    """Modo interativo para autenticar a conta pela primeira vez."""
    print('\n🔐 SETUP — Autenticação da conta Telegram\n')
    print('Você precisará do número de telefone da sua conta Telegram.')
    print('Um código SMS ou via app será enviado para confirmar.\n')

    if not TELEGRAM_API_ID or not TELEGRAM_API_HASH:
        print('❌ Configure TELEGRAM_API_ID e TELEGRAM_API_HASH no .env primeiro!')
        print('   Obtenha em: https://my.telegram.org/apps')
        return

    client = TelegramClient(str(SESSION_FILE), TELEGRAM_API_ID, TELEGRAM_API_HASH)
    await client.start()
    print('\n✅ Autenticação concluída! Sessão salva em monitor_session.session')
    print('   Agora pode rodar: python telegram_group_monitor.py')
    await client.disconnect()


async def main():
    if '--setup' in sys.argv:
        await setup_interativo()
        return

    if '--test' in sys.argv:
        # Modo de teste: simula uma mensagem sem conectar ao Telegram
        log.info('🧪 Modo de teste...')
        # Instanciar sem Telethon para testar a lógica de extração
        cupom = extrair_cupom('Amazon 🔥 Fone JBL Tune 510BT por R$ 149,90 — 40% OFF! Cupom: FONE20')
        preco = extrair_preco('Amazon 🔥 Fone JBL Tune 510BT por R$ 149,90 — 40% OFF!')
        urls = extrair_urls('https://amzn.to/3xyz123 confira essa oferta')
        log.info(f'Cupom detectado: {cupom}')
        log.info(f'Preço detectado: {preco}')
        log.info(f'URLs detectadas: {urls}')
        log.info(f'Plataforma: {detectar_plataforma(urls[0]) if urls else None}')
        return

    monitor = TelegramGroupMonitor()
    await monitor.iniciar()


if __name__ == '__main__':
    asyncio.run(main())
