import asyncio
import io
import requests as _requests
from telegram import Bot, InputFile
from telegram.error import RetryAfter
from telegram.constants import ParseMode
from config import TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, AFFILIATE_HUB_URL


def _baixar_imagem_bytes(url: str, timeout: int = 15) -> bytes | None:
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
                return resp.content
    except Exception as e:
        print(f'⚠️ Falha ao baixar imagem ({url[:60]}): {e}')
    return None


class TelegramNotifier:
    """Envia notificações para o Telegram"""
    
    def __init__(self):
        self.bot = Bot(token=TELEGRAM_BOT_TOKEN)
        self.chat_id = TELEGRAM_CHAT_ID

    async def _send_message_with_retry(self, **kwargs):
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
                        print(f'⚠️ Erro ao enviar foto ({foto_err}), enviando só texto...')
                        await self._send_message_with_retry(
                            chat_id=self.chat_id,
                            text=mensagem,
                            parse_mode=ParseMode.HTML
                        )
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
    
    def _formatar_mensagem_produto(self, produto: dict) -> str:
        """Formata mensagem de produto"""
        preco = f"💰 <b>R$ {produto['price']:.2f}</b>" if produto.get('price') else ""

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
            'kabum':       '🔵 Kabum',
        }

        for chave, label in PLATAFORMA_EMOJIS.items():
            if links.get(chave):
                primeiro_link = links[chave]
                plataforma_nome = label
                break

        # Se não reconheceu a plataforma mas tem storeName, usa ele
        if plataforma_nome == "Desconhecida" and produto.get('storeName'):
            plataforma_nome = f"🛒 {produto['storeName']}"

        link_promobit = ""
        if primeiro_link:
            # Se o link é do Promobit, deixa claro que é para ver a oferta original
            if 'promobit.com.br' in primeiro_link:
                link_promobit = f"🔗 <a href='{primeiro_link}'>👆 Ver oferta no Promobit (pegue o link da loja aqui)</a>"
            else:
                link_promobit = f"🔗 <a href='{primeiro_link}'>Ver promoção original</a>"

        produto_id = produto.get('id', 'N/A')
        descricao_produto = produto.get('description', '')
        
        cupom_msg = ""
        if '🎟️ CUPOM:' in descricao_produto:
            cupom_extraido = descricao_produto.split('🎟️ CUPOM:')[1].split('\n')[0].strip()
            _invalidos = {'NORMAL', 'NONE', 'NULL', 'N/A', 'NA', ''}
            if cupom_extraido.upper() not in _invalidos:
                cupom_msg = f"\n🎟️ Cupom: <code>{cupom_extraido}</code>"

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
🔥 <b>NOVO PRODUTO ENCONTRADO!</b>
⚠️ <b>AGUARDANDO APROVAÇÃO</b>

📦 <b>{produto['name']}</b>
🏷️ {produto['category']}
🏪 Plataforma: <b>{plataforma_nome}</b>
{preco}{cupom_msg}

{link_promobit}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
<b>📋 PARA APROVAR, envie:</b>

{aprovar_msg}

<b>🚫 Para rejeitar:</b>
<code>/rejeitar {produto_id}</code>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🆔 <b>ID do Produto:</b>
<code>{produto_id}</code>
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
🏪 {cupom['platform']}{expira}

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

    async def publicar_no_grupo(self, produto: dict, platform: str, affiliate_link: str, foto_file_id: str = None, custom_caption: str = None):
        """Publica a promoção aprovada no grupo de promoções."""
        from config import TELEGRAM_PROMO_GROUP_ID
        if not TELEGRAM_PROMO_GROUP_ID:
            print('⚠️ TELEGRAM_PROMO_GROUP_ID não configurado — pulando publicação no grupo.')
            return

        nome = produto.get('name', 'Produto')
        preco = produto.get('price')
        preco_original = produto.get('originalPrice')
        
        # Lógica de imagem: foto_file_id > enhancedImageUrl > imageUrl
        from config import AFFILIATE_HUB_URL
        base_url = AFFILIATE_HUB_URL.rstrip('/')
        
        imagem = produto.get('imageUrl')
        enhanced_image = produto.get('enhancedImageUrl')
        
        if enhanced_image:
            if enhanced_image.startswith('/'):
                enhanced_image = f"{base_url}{enhanced_image}"
            imagem = enhanced_image

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

        # Título e Subtítulo da IA
        legenda_top = ""
        if custom_caption:
            legenda_top = custom_caption.strip()
        else:
            ai_analysis_raw = produto.get('aiAnalysis')
            if ai_analysis_raw:
                import json
                try:
                    data = json.loads(ai_analysis_raw)
                    if isinstance(data, dict):
                        titulo = data.get('titulo')
                        subtitulo = data.get('subtitulo')
                        if titulo:
                            legenda_top = f"<b>{titulo.upper()}</b>"
                            if subtitulo:
                                legenda_top += f"\n<i>{subtitulo.lower()}</i>"
                        else:
                            legenda_top = f"<b>{ai_analysis_raw.strip()}</b>"
                    else:
                        legenda_top = f"<b>{ai_analysis_raw.strip()}</b>"
                except Exception:
                    legenda_top = f"<b>{ai_analysis_raw.strip()}</b>"
            else:
                legenda_top = "<b>🔥 ACHADINHO IMPERDÍVEL!</b>"

        # Montar o corpo da mensagem
        linhas = []
        if legenda_top:
            linhas.append(legenda_top)
            linhas.append("")
        
        linhas.append(f"{emoji} {nome}")
        linhas.append("")
        
        # Adicionar nome da loja/plataforma
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
        
        # Detectar a loja com base nos links do produto
        loja_detectada = "🏪 Loja"
        produto_links = produto.get('links', {}) or {}
        for chave, label in PLATAFORMA_EMOJIS.items():
            if produto_links.get(chave):
                loja_detectada = label
                break
        
        linhas.append(f"🏪 Loja: <b>{loja_detectada}</b>")
        linhas.append("")
        
        if preco_txt:
            linhas.append(preco_txt)
        if cupom_msg:
            linhas.append(cupom_msg)
            
        linhas.append("")
        
        # Link para a página do produto no site usando shortId (número)
        short_id = produto.get('shortId')
        print(f'🔍 [DEBUG] shortId do produto: {short_id}')
        print(f'🔍 [DEBUG] ID do produto: {produto.get("id")}')
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
            # Prioridade: foto enviada pelo admin > imageUrl do produto
            foto_para_usar = foto_file_id or imagem
            usar_foto = bool(foto_para_usar and 'placeholder' not in foto_para_usar)
            print(f'📸 foto_file_id (admin): {foto_file_id}')
            print(f'🖼️ imageUrl (produto): {imagem}')
            print(f'✅ foto_para_usar: {foto_para_usar}')
            
            if usar_foto:
                await self._send_photo_with_retry(
                    chat_id=TELEGRAM_PROMO_GROUP_ID,
                    photo=foto_para_usar,
                    caption=mensagem,
                    parse_mode='HTML'
                )
            else:
                await self._send_message_with_retry(
                    chat_id=TELEGRAM_PROMO_GROUP_ID,
                    text=mensagem,
                    parse_mode='HTML'
                )
            print(f'📢 Promoção publicada no grupo: {nome[:50]}')
        except Exception as e:
            print(f'❌ Erro ao publicar no grupo: {e}')
