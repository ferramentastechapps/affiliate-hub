import asyncio
import io
import requests as _requests
from telegram import Bot, InputFile
from telegram.error import RetryAfter
from telegram.constants import ParseMode
from config import TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, AFFILIATE_HUB_URL

import re

def html_to_whatsapp_md(text: str) -> str:
    if not text:
        return ""
    # Substituições básicas de HTML para Markdown do WhatsApp
    text = re.sub(r'<b>(.*?)</b>', r'*\1*', text, flags=re.IGNORECASE)
    text = re.sub(r'<i>(.*?)</i>', r'_\1_', text, flags=re.IGNORECASE)
    text = re.sub(r'<s>(.*?)</s>', r'~\1~', text, flags=re.IGNORECASE)
    text = re.sub(r'<code>(.*?)</code>', r'```\1```', text, flags=re.IGNORECASE)
    text = re.sub(r'<a href=["\']?(.*?)["\']?>(.*?)</a>', r'\2', text, flags=re.IGNORECASE)
    text = re.sub(r'<.*?>', '', text) # remove any remaining HTML tags
    return text

def _baixar_imagem_bytes(url: str, timeout: int = 30) -> bytes | None:
    """
    Baixa a imagem da URL e retorna os bytes.
    Usa headers de browser para evitar bloqueio por CDNs de ML, Amazon, Shopee.
    Retorna None se falhar.
    """
    if not url or 'placeholder' in url:
        return None
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9',
            'Referer': 'https://www.google.com/',
        }
        resp = _requests.get(url, headers=headers, timeout=timeout, stream=True)
        if resp.status_code == 200:
            content_type = resp.headers.get('Content-Type', '')
            # Só aceita imagens
            if 'image' in content_type or url.lower().split('?')[0].endswith(('.jpg', '.jpeg', '.png', '.webp', '.gif')):
                # Limitar tamanho máximo da imagem para evitar timeout (5MB)
                content = resp.content
                if len(content) > 5 * 1024 * 1024:  # 5MB
                    print(f'⚠️ Imagem muito grande ({len(content)//1024//1024}MB), usando URL direta')
                    return None
                return content
    except Exception as e:
        print(f'⚠️ Falha ao baixar imagem ({url[:60]}): {e}')
    return None


class TelegramNotifier:
    """Envia notificações para o Telegram"""
    
    def __init__(self):
        self.bot = Bot(token=TELEGRAM_BOT_TOKEN)
        self.chat_id = TELEGRAM_CHAT_ID

    async def _send_message_with_retry(self, **kwargs):
        if 'disable_web_page_preview' not in kwargs:
            kwargs['disable_web_page_preview'] = True
        while True:
            try:
                res = await self.bot.send_message(**kwargs)
                await asyncio.sleep(3)
                return res
            except RetryAfter as e:
                print(f"⏳ Flood control. Aguardando {e.retry_after}s...")
                await asyncio.sleep(e.retry_after + 1)

    async def _send_photo_with_retry(self, **kwargs):
        """Envia foto via URL ou bytes. Tenta baixar em bytes primeiro para melhor qualidade."""
        photo = kwargs.get('photo')
        # Se photo é uma string (URL), tenta baixar os bytes para evitar
        # a dupla compressão que o Telegram aplica a URLs externas.
        if isinstance(photo, str):
            img_bytes = _baixar_imagem_bytes(photo)
            if img_bytes:
                # Detectar extensão para nomear o arquivo corretamente
                ext = 'jpg'
                url_clean = photo.lower().split('?')[0]
                for _ext in ('webp', 'png', 'gif', 'jpeg', 'jpg'):
                    if url_clean.endswith(_ext):
                        ext = _ext
                        break
                kwargs = dict(kwargs)  # copiar para não mutar original
                kwargs['photo'] = InputFile(io.BytesIO(img_bytes), filename=f'produto.{ext}')
                print(f'📥 Imagem baixada ({len(img_bytes)//1024}KB) — enviando em alta qualidade')
            else:
                print(f'⚠️ Não foi possível baixar imagem, usando URL direta (qualidade reduzida)')

        while True:
            try:
                res = await self.bot.send_photo(**kwargs)
                await asyncio.sleep(3)
                return res
            except RetryAfter as e:
                print(f"⏳ Flood control. Aguardando {e.retry_after}s...")
                await asyncio.sleep(e.retry_after + 1)

    async def _send_document_with_retry(self, **kwargs):
        """Envia imagem como DOCUMENTO (sem compressão) para preservar qualidade original."""
        document = kwargs.get('document')
        # Se document é uma string (URL), baixa os bytes
        if isinstance(document, str):
            img_bytes = _baixar_imagem_bytes(document)
            if img_bytes:
                # Detectar extensão para nomear o arquivo corretamente
                ext = 'jpg'
                url_clean = document.lower().split('?')[0]
                for _ext in ('webp', 'png', 'gif', 'jpeg', 'jpg'):
                    if url_clean.endswith(_ext):
                        ext = _ext
                        break
                kwargs = dict(kwargs)  # copiar para não mutar original
                kwargs['document'] = InputFile(io.BytesIO(img_bytes), filename=f'produto.{ext}')
                print(f'📥 Imagem baixada ({len(img_bytes)//1024}KB) — enviando como documento SEM compressão')
            else:
                print(f'⚠️ Não foi possível baixar imagem, usando URL direta')
                # Fallback: tentar enviar URL direta como documento (Telegram pode não suportar)
                return None

        while True:
            try:
                res = await self.bot.send_document(**kwargs)
                await asyncio.sleep(3)
                return res
            except RetryAfter as e:
                print(f"⏳ Flood control. Aguardando {e.retry_after}s...")
                await asyncio.sleep(e.retry_after + 1)

    async def enviar_produto(self, produto: dict):
        """Envia notificação de produto para o Telegram"""
        try:
            # Formatar mensagem
            mensagem = self._formatar_mensagem_produto(produto)
            print(f'📝 Mensagem formatada ({len(mensagem)} chars): {mensagem[:100]}...')

            imagem = produto.get('imageUrl', '')
            # Placeholder não funciona como foto — envia só texto
            usar_foto = bool(imagem and 'placeholder' not in imagem)

            if usar_foto:
                # caption tem limite de 1024 chars no Telegram
                if len(mensagem) > 1024:
                    # Envia foto sem legenda e depois o texto completo
                    try:
                        await self._send_photo_with_retry(
                            chat_id=self.chat_id,
                            photo=imagem,
                        )
                    except Exception as foto_err:
                        print(f'⚠️ Erro ao enviar foto, continuando sem ela: {foto_err}')
                    await self._send_message_with_retry(
                        chat_id=self.chat_id,
                        text=mensagem,
                        parse_mode=ParseMode.HTML
                    )
                else:
                    try:
                        await self._send_photo_with_retry(
                            chat_id=self.chat_id,
                            photo=imagem,
                            caption=mensagem,
                            parse_mode=ParseMode.HTML
                        )
                    except Exception as foto_err:
                        print(f'⚠️ Erro ao enviar foto ({foto_err}). Não enviando fallback de texto para evitar duplicidade (o Telegram costuma processar a foto mesmo com timeout).')
            else:
                await self._send_message_with_retry(
                    chat_id=self.chat_id,
                    text=mensagem,
                    parse_mode=ParseMode.HTML
                )
            
            print(f'✅ Produto enviado para Telegram: {produto["name"]}')
            
        except Exception as e:
            print(f'❌ Erro ao enviar para Telegram: {e}')
            import traceback
            traceback.print_exc()
    
    async def enviar_cupom(self, cupom: dict):
        """Envia notificação de cupom para o Telegram"""
        try:
            mensagem = self._formatar_mensagem_cupom(cupom)
            
            await self._send_message_with_retry(
                chat_id=self.chat_id,
                text=mensagem,
                parse_mode=ParseMode.HTML
            )
            
            print(f'✅ Cupom enviado para Telegram: {cupom["code"]}')
            
        except Exception as e:
            print(f'❌ Erro ao enviar cupom para Telegram: {e}')
    
    async def enviar_resumo(self, produtos_count: int, cupons_count: int):
        """Envia resumo da busca"""
        try:
            mensagem = f"""
🤖 <b>Busca de Promoções Concluída</b>

📦 Produtos encontrados: {produtos_count}
🎫 Cupons encontrados: {cupons_count}

🌐 Ver todos: {AFFILIATE_HUB_URL}
"""
            
            await self._send_message_with_retry(
                chat_id=self.chat_id,
                text=mensagem.strip(),
                parse_mode=ParseMode.HTML
            )
            
        except Exception as e:
            print(f'❌ Erro ao enviar resumo: {e}')
    
    async def enviar_produto_urgente(self, produto: dict):
        """Envia produto com score alto como URGENTE"""
        try:
            score = produto.get('qualityScore', 0)
            
            # Detectar loja
            PLATAFORMA_EMOJIS = {
                'amazon':      '🟠 Amazon',
                'mercadoLivre':'🟡 Mercado Livre',
                'shopee':      '🟠 Shopee',
                'aliexpress':  '🔴 AliExpress',
                'tiktok':      '⚫ TikTok Shop',
                'netshoes':    '🟣 Netshoes',
                'magalu':      '🔵 Magalu',
                'kabum':       '🔵 Kabum',
            }
            loja_detectada = None
            produto_links = produto.get('links', {}) or {}
            for chave, label in PLATAFORMA_EMOJIS.items():
                if produto_links.get(chave):
                    loja_detectada = label
                    break
            
            if not loja_detectada and produto.get('storeName'):
                store_name_lower = produto['storeName'].lower()
                if 'amazon' in store_name_lower:
                    loja_detectada = '🟠 Amazon'
                elif 'mercado' in store_name_lower:
                    loja_detectada = '🟡 Mercado Livre'
                elif 'shopee' in store_name_lower:
                    loja_detectada = '🟠 Shopee'
                elif 'aliexpress' in store_name_lower:
                    loja_detectada = '🔴 AliExpress'
                elif 'tiktok' in store_name_lower:
                    loja_detectada = '⚫ TikTok Shop'
                elif 'netshoes' in store_name_lower:
                    loja_detectada = '🟣 Netshoes'
                elif 'magalu' in store_name_lower or 'magazine' in store_name_lower:
                    loja_detectada = '🔵 Magalu'
                elif 'kabum' in store_name_lower:
                    loja_detectada = '🔵 Kabum'
                else:
                    loja_detectada = produto['storeName']

            loja_txt = f"\n<b>{loja_detectada}</b>\n" if loja_detectada else ""

            mensagem = f"""
🚨🔥 <b>ALERTA DE SUPER OFERTA!</b> 🔥🚨
⭐⭐⭐⭐⭐ SCORE: {score}/100

📦 <b>{produto['name'][:150]}</b>
{loja_txt}
💰 <b>R$ {produto.get('price', 0):.2f}</b>
"""
            
            if produto.get('originalPrice'):
                desconto = (1 - produto['price'] / produto['originalPrice']) * 100
                mensagem += f"💸 De: <s>R$ {produto['originalPrice']:.2f}</s> | <b>{desconto:.0f}% OFF</b>\n"
            
            mensagem += f"""
⚡ <b>CORRE! Esta é uma das melhores ofertas encontradas!</b>

🆔 ID: <code>{produto.get('id', 'N/A')}</code>
"""
            
            await self._send_message_with_retry(
                chat_id=self.chat_id,
                text=mensagem.strip(),
                parse_mode=ParseMode.HTML
            )
            
            print(f'🚨 Produto URGENTE enviado: {produto["name"]}')
            
        except Exception as e:
            print(f'❌ Erro ao enviar produto urgente: {e}')
    
    def _formatar_mensagem_produto(self, produto: dict) -> str:
        """Formata mensagem de produto com score de qualidade"""
        
        # Score de qualidade
        score = produto.get('qualityScore', 0)
        
        # Emoji baseado no score
        if score >= 70:
            emoji_qualidade = "🔥🔥🔥 SUPER OFERTA"
            urgencia = "\n⚡ <b>CORRE! Promoção TOP</b>"
        elif score >= 50:
            emoji_qualidade = "🔥🔥 OFERTA BOA"
            urgencia = "\n✨ <b>Vale a pena conferir!</b>"
        else:
            emoji_qualidade = "🔥 OFERTA"
            urgencia = ""
        
        # Preço e desconto
        preco_texto = ""
        desconto_texto = ""
        
        if produto.get('price'):
            preco_texto = f"💰 <b>R$ {produto['price']:.2f}</b>"
            
            if produto.get('originalPrice'):
                try:
                    desconto_perc = (1 - produto['price'] / produto['originalPrice']) * 100
                    preco_original = produto['originalPrice']
                    desconto_texto = f"\n💸 De: <s>R$ {preco_original:.2f}</s> | <b>{desconto_perc:.0f}% OFF</b>"
                except:
                    pass

        # Detectar plataforma de origem e montar link
        links = produto.get('links', {})
        plataforma_nome = "Desconhecida"
        primeiro_link = None

        PLATAFORMA_EMOJIS = {
            'amazon':      '🟠 Amazon',
            'mercadoLivre':'🟡 Mercado Livre',
            'shopee':      '🟠 Shopee',
            'aliexpress':  '🔴 AliExpress',
            'tiktok':      '⚫ TikTok Shop',
            'netshoes':    '🟣 Netshoes',
            'magalu':      '🔵 Magalu',
            'kabum':       '🔵 KaBuM',
        }

        for chave, label in PLATAFORMA_EMOJIS.items():
            if links.get(chave):
                primeiro_link = links[chave]
                plataforma_nome = label
                break

        # Se não reconheceu a plataforma mas tem storeName, usa ele
        if plataforma_nome == "Desconhecida" and produto.get('storeName'):
            store_name_lower = produto['storeName'].lower()
            if 'amazon' in store_name_lower:
                plataforma_nome = '🟠 Amazon'
            elif 'mercado' in store_name_lower:
                plataforma_nome = '🟡 Mercado Livre'
            elif 'shopee' in store_name_lower:
                plataforma_nome = '🟠 Shopee'
            elif 'aliexpress' in store_name_lower:
                plataforma_nome = '🔴 AliExpress'
            elif 'tiktok' in store_name_lower:
                plataforma_nome = '⚫ TikTok Shop'
            elif 'netshoes' in store_name_lower:
                plataforma_nome = '🟣 Netshoes'
            elif 'magalu' in store_name_lower or 'magazine' in store_name_lower:
                plataforma_nome = '🔵 Magalu'
            elif 'kabum' in store_name_lower:
                plataforma_nome = '🔵 KaBuM'
            else:
                plataforma_nome = produto['storeName']

        plataforma_linha = f"{plataforma_nome}\n" if plataforma_nome != "Desconhecida" else ""

        link_promobit = ""
        if primeiro_link:
            # Se o link é do Promobit, deixa claro que é para ver a oferta original
            if 'promobit.com.br' in primeiro_link or 'pelando.com.br' in primeiro_link or 'promobyte' in primeiro_link:
                link_promobit = f"🔗 <a href='{primeiro_link}'>👆 Ver oferta completa (pegue o link da loja aqui)</a>"
            else:
                link_promobit = f"🔗 <a href='{primeiro_link}'>🛒 COMPRAR AGORA</a>"

        produto_id = produto.get('id', 'N/A')
        descricao_produto = produto.get('description', '') or ''
        
        cupom_msg = ""
        if '🎟️ CUPOM:' in descricao_produto:
            cupom_extraido = descricao_produto.split('🎟️ CUPOM:')[1].split('\n')[0].strip()
            _invalidos = {'NORMAL', 'NONE', 'NULL', 'N/A', 'NA', ''}
            if cupom_extraido.upper() not in _invalidos:
                cupom_msg = f"\n🎟️ <code>{cupom_extraido}</code>"

        # Badge Programe e Poupe (mantido)
        prime_msg = ""
        desc_lower = descricao_produto.lower()
        _eh_amazon = (
            links.get('amazon')
            or 'amazon' in (produto.get('storeName') or '').lower()
            or 'programe e poupe' in desc_lower
        )
        if _eh_amazon:
            badges = []
            if 'programe e poupe' in desc_lower or 'subscribe' in desc_lower:
                badges.append("🔄 <b>Programe e Poupe</b>")
            if badges:
                prime_msg = "\n" + "\n".join(badges)

        # Score visual
        score_visual = "⭐" * min(5, score // 20)

        # Verificar se existe configuração de afiliados para a plataforma do produto
        tem_autogeracao = False
        mapeamento_envs = {
            'amazon': ['AMAZON_TAG', 'AMAZON_TEMPLATE'],
            'mercadoLivre': ['MERCADOLIVRE_TEMPLATE', 'MERCADOLIVRE_TAG'],
            'shopee': ['SHOPEE_TEMPLATE', 'SHOPEE_TAG'],
            'aliexpress': ['ALIEXPRESS_TEMPLATE', 'ALIEXPRESS_TAG'],
            'tiktok': ['TIKTOK_TEMPLATE', 'TIKTOK_TAG'],
            'netshoes': ['NETSHOES_TEMPLATE', 'NETSHOES_TAG'],
            'magalu': ['MAGALU_SHOP', 'MAGALU_TEMPLATE'],
            'kabum': ['KABUM_TEMPLATE', 'KABUM_TAG'],
        }
        
        plataforma_slug = None
        for chave in mapeamento_envs.keys():
            if links.get(chave):
                plataforma_slug = chave
                break
        
        import os
        if plataforma_slug and plataforma_slug in mapeamento_envs:
            envs = mapeamento_envs[plataforma_slug]
            tem_autogeracao = any(os.getenv(env) for env in envs)
            
        if tem_autogeracao:
            aprovar_msg = f"<code>/aprovar {produto_id}</code>\n💡 <i>(Link de afiliado será gerado automaticamente!)</i>"
        else:
            aprovar_msg = f"<code>/aprovar {produto_id} [SEU_LINK]</code>\n⚠️ <i>(Configurações de afiliado ausentes no .env. Envie o link manualmente ou configure o .env.)</i>"
        mensagem = f"""
{emoji_qualidade}
⚠️ <b>AGUARDANDO APROVAÇÃO</b>

📦 <b>{produto['name'][:150]}</b>
{prime_msg}
🏷️ {produto['category']}
{plataforma_linha}{preco_texto}{desconto_texto}{cupom_msg}{urgencia}

📊 Qualidade: {score_visual} ({score}/100)

{link_promobit}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
<b>📋 PARA APROVAR, envie:</b>

{aprovar_msg}

<b>🚫 Para rejeitar:</b>
<code>/rejeitar {produto_id}</code>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🆔 <b>ID:</b> <code>{produto_id}</code>
"""

        return mensagem.strip()

    
    def _formatar_mensagem_cupom(self, cupom: dict) -> str:
        """Formata mensagem de cupom"""
        expira = ""
        if cupom.get('expiresAt'):
            expira = f"\n⏰ Expira em: {cupom['expiresAt'][:10]}"
        
        mensagem = f"""
🎫 <b>NOVO CUPOM!</b>

💳 <code>{cupom['code']}</code>
📝 {cupom['description']}
💰 {cupom['discount']}
🏷️ {cupom['platform']}{expira}

🌐 Ver mais: {AFFILIATE_HUB_URL}
"""
        
        return mensagem.strip()
    
    def enviar_sync(self, tipo: str, dados: dict):
        """Wrapper síncrono para enviar mensagens"""
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
        if loop.is_closed():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

        # python-telegram-bot v20 envia sem problemas assim:
        if tipo == 'produto':
            loop.run_until_complete(self.enviar_produto(dados))
        elif tipo == 'produto_urgente':
            loop.run_until_complete(self.enviar_produto_urgente(dados))
        elif tipo == 'cupom':
            loop.run_until_complete(self.enviar_cupom(dados))
        elif tipo == 'resumo':
            loop.run_until_complete(self.enviar_resumo(dados['produtos'], dados['cupons']))
        elif tipo == 'publicar_grupo':
            loop.run_until_complete(self.publicar_no_grupo(
                dados['produto'],
                dados['platform'],
                dados['affiliate_link'],
                dados.get('foto_file_id'),
                dados.get('custom_caption')
            ))
        elif tipo == 'publicar_cupom_grupo':
            loop.run_until_complete(self.publicar_cupom_grupo(dados))

    async def publicar_no_grupo(self, produto: dict, platform: str, affiliate_link: str, foto_file_id: str = None, custom_caption: str = None):
        """Publica a promoção aprovada no grupo de promoções."""
        from config import TELEGRAM_PROMO_GROUP_ID
        if not TELEGRAM_PROMO_GROUP_ID:
            print('⚠️ TELEGRAM_PROMO_GROUP_ID não configurado — pulando publicação no grupo.')
            return

        nome = produto.get('name', 'Produto')
        preco = produto.get('price')
        preco_original = produto.get('originalPrice')
        
        from config import AFFILIATE_HUB_URL
        base_url = AFFILIATE_HUB_URL.rstrip('/')
        
        enhanced = produto.get('enhancedImageUrl', '')
        
        # Prioridade de foto para o grupo:
        # 1. foto_file_id (admin enviou via /aprovar com foto)
        # 2. enhancedImageUrl (lifestyle gerada por IA ou enviada pelo admin)
        foto_para_grupo = foto_file_id or (enhanced if enhanced and 'placeholder' not in enhanced else None)

        if not foto_para_grupo:
            print(f'⛔ [BLOQUEADO] Produto sem foto lifestyle — não publicando no grupo: {nome}')
            return  # Sai sem publicar
            
        if isinstance(foto_para_grupo, str) and foto_para_grupo.startswith('/'):
            foto_para_grupo = f"{base_url}{foto_para_grupo}"

        # Emoji por categoria
        categoria_nome = produto.get('category', 'Diversos')
        CATEGORY_EMOJIS = {
            'Smartphones e TV': '📱',
            'Informática e Games': '💻',
            'Casa e Eletrodomésticos': '🏠',
            'Moda e Acessórios': '👟',
            'Saúde e Beleza': '💆',
            'Esporte e Suplementos': '💪',
            'Supermercado e Delivery': '🛒',
            'Bebês e Crianças': '👶',
            'Livros, eBooks e eReaders': '📚',
            'Ferramentas e Jardim': '🔧',
            'Automotivo': '🚗',
            'Pet': '🐾',
            'Viagem': '✈️',
            'Diversos': '🔖',
        }
        emoji = CATEGORY_EMOJIS.get(categoria_nome, '🔖')

        # Formatação de preços
        def format_br_currency(val):
            try:
                return f"{float(val):.2f}".replace('.', ',')
            except Exception:
                return str(val)

        if preco_original and preco and float(preco_original) > float(preco):
            preco_txt = f"🔥 DE R$ <s>{format_br_currency(preco_original)}</s> | POR R$ <b>{format_br_currency(preco)}</b>"
        else:
            preco_txt = f"🔥 POR R$ <b>{format_br_currency(preco)}</b>" if preco else ""

        # Cupom: Só se existir na descrição do produto
        descricao_prod = produto.get('description', '') or ''
        cupom_msg = ""
        if '🎟️ CUPOM:' in descricao_prod:
            cupom_extraido = descricao_prod.split('🎟️ CUPOM:')[1].split('\n')[0].strip()
            _invalidos = {'NORMAL', 'NONE', 'NULL', 'N/A', 'NA', ''}
            if cupom_extraido.upper() not in _invalidos:
                cupom_msg = f"🎟️ CUPOM: <code>{cupom_extraido}</code>"

        # Extrair regras e condições da descrição (antes do cupom se houver)
        import re
        condicoes_msg = ""
        desc_sem_cupom = descricao_prod.split('🎟️ CUPOM:')[0].strip()
        # Limpar texto padrão do scraper
        desc_sem_cupom = re.sub(r'Oferta na loja[^\n]+no[^\n]+', '', desc_sem_cupom, flags=re.IGNORECASE).strip()
        
        if desc_sem_cupom and desc_sem_cupom != 'Oferta encaminhada de grupos':
            if 'prime' in desc_sem_cupom.lower():
                condicoes_msg = f"💎 <i>Exclusivo Membros Prime</i>"
            else:
                condicoes_msg = f"↪️ <i>{desc_sem_cupom}</i>"

        # Título e Subtítulo da IA
        legenda_top = ""
        if custom_caption:
            legenda_top = custom_caption.strip()
        else:
            # 1. Tentar pegar legenda do aiAnalysis existente (caso já tenha sido gerada antes)
            titulo = None
            subtitulo = None
            analise = None
            
            ai_analysis_raw = produto.get('aiAnalysis')
            if ai_analysis_raw:
                import json
                try:
                    data = json.loads(ai_analysis_raw)
                    if isinstance(data, dict):
                        titulo = data.get('titulo')
                        subtitulo = data.get('subtitulo')
                        analise = data.get('analise') or data.get('critique')
                except Exception:
                    pass
            
            # 2. Se não tem título, solicita geração just-in-time
            if not titulo and produto.get('id'):
                print(f"🤖 Gerando legenda just-in-time para o produto {produto.get('id')}...")
                try:
                    import os
                    api_key = os.getenv('API_SECRET_KEY') or ''
                    base_url = AFFILIATE_HUB_URL.rstrip('/')
                    headers = {'x-api-key': api_key}
                    
                    resp = _requests.post(
                        f"{base_url}/api/products/{produto.get('id')}/generate-caption", 
                        headers=headers, 
                        timeout=30
                    )
                    
                    if resp.status_code == 200:
                        resp_data = resp.json()
                        titulo = resp_data.get('caption')
                        print(f"✅ Legenda gerada com sucesso!")
                    else:
                        print(f"⚠️ Erro ao gerar legenda. Status: {resp.status_code} - {resp.text}")
                except Exception as e:
                    print(f"❌ Falha de comunicação na geração da legenda: {e}")
                    
            # 3. Montar legenda_top
            if titulo:
                legenda_top = f"<b>{titulo.upper()}</b>"
                if subtitulo:
                    legenda_top += f"\n<i>{subtitulo.lower()}</i>"
            elif analise:
                legenda_top = f"<b>🔥 AVALIAÇÃO DA IA:</b>\n<i>{analise}</i>"
            else:
                legenda_top = "<b>🔥 ACHADINHO IMPERDÍVEL!</b>"

        # Montar o corpo da mensagem
        linhas = []
        if legenda_top:
            linhas.append(legenda_top)
            linhas.append("")
        
        linhas.append(f"{emoji} {nome}")
        linhas.append("")
        
        # Adicionar nome da loja/plataforma (apenas a bolinha e o nome)
        PLATAFORMA_EMOJIS = {
            'amazon':      '🟠 Amazon',
            'mercadoLivre':'🟡 Mercado Livre',
            'shopee':      '🟠 Shopee',
            'aliexpress':  '🔴 AliExpress',
            'tiktok':      '⚫ TikTok Shop',
            'netshoes':    '🟣 Netshoes',
            'magalu':      '🔵 Magalu',
            'kabum':       '🔵 Kabum',
        }
        
        loja_detectada = None
        if platform and platform in PLATAFORMA_EMOJIS:
            loja_detectada = PLATAFORMA_EMOJIS[platform]
        
        if not loja_detectada:
            produto_links = produto.get('links', {}) or {}
            for chave, label in PLATAFORMA_EMOJIS.items():
                if produto_links.get(chave):
                    loja_detectada = label
                    break
        
        if not loja_detectada and produto.get('storeName'):
            store_name_lower = produto['storeName'].lower()
            if 'amazon' in store_name_lower:
                loja_detectada = '🟠 Amazon'
            elif 'mercado' in store_name_lower:
                loja_detectada = '🟡 Mercado Livre'
            elif 'shopee' in store_name_lower:
                loja_detectada = '🟠 Shopee'
            elif 'aliexpress' in store_name_lower:
                loja_detectada = '🔴 AliExpress'
            elif 'tiktok' in store_name_lower:
                loja_detectada = '⚫ TikTok Shop'
            elif 'netshoes' in store_name_lower:
                loja_detectada = '🟣 Netshoes'
            elif 'magalu' in store_name_lower or 'magazine' in store_name_lower:
                loja_detectada = '🔵 Magalu'
            elif 'kabum' in store_name_lower:
                loja_detectada = '🔵 Kabum'
            else:
                loja_detectada = produto['storeName']
                
        if loja_detectada:
            linhas.append(f"<b>{loja_detectada}</b>")
            linhas.append("")
        
        if preco_txt:
            linhas.append(preco_txt)
        if condicoes_msg:
            linhas.append(condicoes_msg)
        if cupom_msg:
            linhas.append(cupom_msg)
            
        linhas.append("")
        
        # Link para a página do produto no site usando shortId (número)
        short_id = produto.get('shortId')
        print(f'🔍 [DEBUG] shortId do produto: {short_id}')
        print(f'🔍 [DEBUG] ID do produto: {produto.get("id")}')
        
        coupon_link = produto.get('couponLink')
        if coupon_link:
            if short_id:
                link_produto = f"{base_url}/produto/{short_id}"
                linhas.append(f"🔗 Ver no site: {link_produto}")
                linhas.append("")
            elif produto.get('id'):
                link_produto = f"{base_url}/produto/{produto.get('id')}"
                linhas.append(f"🔗 Ver no site: {link_produto}")
                linhas.append("")
            linhas.append(f"🎟️ Resgate o cupom antes: {coupon_link}")
            linhas.append(f"🛒 Depois acesse o produto: {affiliate_link}")
        else:
            if short_id:
                link_produto = f"{base_url}/produto/{short_id}"
                print(f'✅ [DEBUG] Link CURTO gerado: {link_produto}')
                linhas.append(f"🔗 {link_produto}")
            else:
                # Fallback para o ID longo caso shortId não exista
                produto_id = produto.get('id')
                if produto_id:
                    link_produto = f"{base_url}/produto/{produto_id}"
                    print(f'⚠️ [DEBUG] Link LONGO gerado (shortId ausente): {link_produto}')
                    linhas.append(f"🔗 {link_produto}")
                else:
                    print(f'❌ [DEBUG] Sem ID, usando affiliate_link')
                    linhas.append(f"🔗 {affiliate_link}")
        
        mensagem = "\n".join(linhas)

        try:
            print(f'📢 Publicando com foto lifestyle: {link_produto if "link_produto" in locals() else "?"}')
            
            foto_para_usar = foto_para_grupo
            usar_foto = True
            
            if usar_foto:
                try:
                    await self._send_photo_with_retry(
                        chat_id=TELEGRAM_PROMO_GROUP_ID,
                        photo=foto_para_usar,
                        caption=mensagem,
                        parse_mode='HTML'
                    )
                except Exception as photo_err:
                    print(f'⚠️ Erro ao enviar foto (tentando enviar apenas texto): {photo_err}')
                    await self._send_message_with_retry(
                        chat_id=TELEGRAM_PROMO_GROUP_ID,
                        text=mensagem,
                        parse_mode='HTML'
                    )
            else:
                await self._send_message_with_retry(
                    chat_id=TELEGRAM_PROMO_GROUP_ID,
                    text=mensagem,
                    parse_mode='HTML'
                )
            print(f'📢 Promoção publicada no grupo: {nome[:50]}')
            
            # --- INTEGRAÇÃO WHATSAPP ---
            import requests
            import os
            import re
            
            whatsapp_url = os.getenv('WHATSAPP_API_URL', 'http://localhost:3006/send')
            
            w_text = mensagem
            w_text = re.sub(r'<b>(.*?)</b>', r'*\1*', w_text, flags=re.IGNORECASE)
            w_text = re.sub(r'<i>(.*?)</i>', r'_\1_', w_text, flags=re.IGNORECASE)
            w_text = re.sub(r'<s>(.*?)</s>', r'~\1~', w_text, flags=re.IGNORECASE)
            w_text = re.sub(r'<code>(.*?)</code>', r'```\1```', w_text, flags=re.IGNORECASE)
            w_text = re.sub(r'<a href=["\']?(.*?)["\']?>(.*?)</a>', r'\2', w_text, flags=re.IGNORECASE)
            whatsapp_text = re.sub(r'<.*?>', '', w_text)
            
            score_wpp = produto.get('qualityScore') or 0
            
            try:
                # Add image URL to the message so whatsapp-engine could potentially use it
                foto_img = foto_para_grupo if foto_para_grupo and 'placeholder' not in foto_para_grupo else None
                
                # Se for um File ID do Telegram, converter para URL real para o WhatsApp baixar
                if foto_img and not foto_img.startswith('http') and not foto_img.startswith('/'):
                    try:
                        from config import TELEGRAM_BOT_TOKEN
                        tg_file = await self.bot.get_file(foto_img)
                        foto_img = f"https://api.telegram.org/file/bot{TELEGRAM_BOT_TOKEN}/{tg_file.file_path}"
                    except Exception as e:
                        print(f'⚠️ Erro ao obter URL da imagem do Telegram para o WhatsApp: {e}')
                        foto_img = None

                payload = {
                    'message': whatsapp_text,
                    'score': score_wpp,
                    'imageUrl': foto_img if foto_img and 'placeholder' not in foto_img else None
                }
                requests.post(whatsapp_url, json=payload, timeout=5)
                print(f'✅ Enviado para fila do WhatsApp (Score: {score_wpp})')
            except Exception as wpp_err:
                print(f'⚠️ Aviso: Erro ao enviar para WhatsApp Engine: {wpp_err}')
            # --------------------------

        except Exception as e:
            print(f'❌ Erro ao publicar no grupo: {e}')

    async def publicar_cupom_grupo(self, cupom: dict):
        """Publica o cupom diretamente no grupo de promoções."""
        from config import TELEGRAM_PROMO_GROUP_ID, AFFILIATE_HUB_URL
        if not TELEGRAM_PROMO_GROUP_ID:
            print('⚠️ TELEGRAM_PROMO_GROUP_ID não configurado — pulando publicação de cupom no grupo.')
            return
            
        expira = ""
        if cupom.get('expiresAt'):
            expira = f"\n⏰ Expira em: {cupom['expiresAt'][:10]}"
        
        base_url = AFFILIATE_HUB_URL.rstrip('/')
        link_cupom = f"{base_url}/cupons"
            
        mensagem = f"""
🎫 <b>CUPOM RELÂMPAGO!</b>

🏷️ <b>{cupom.get('platform', '')}</b>
📝 {cupom.get('description', '')}
💰 <b>{cupom.get('discount', '')}</b>

💳 Use o cupom: <code>{cupom.get('code')}</code>{expira}

🔗 <a href="{link_cupom}">Ver todos os cupons no site</a>
"""
        try:
            await self._send_message_with_retry(
                chat_id=TELEGRAM_PROMO_GROUP_ID,
                text=mensagem.strip(),
                parse_mode='HTML'
            )
            print(f'📢 Cupom publicado no grupo: {cupom["code"]}')
        except Exception as e:
            print(f'❌ Erro ao publicar cupom no grupo: {e}')

