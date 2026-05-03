import asyncio
from telegram import Bot
from telegram.constants import ParseMode
from config import TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, AFFILIATE_HUB_URL


class TelegramNotifier:
    """Envia notificações para o Telegram"""
    
    def __init__(self):
        self.bot = Bot(token=TELEGRAM_BOT_TOKEN)
        self.chat_id = TELEGRAM_CHAT_ID
    
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
                        await self.bot.send_photo(
                            chat_id=self.chat_id,
                            photo=imagem,
                        )
                    except Exception as foto_err:
                        print(f'⚠️ Erro ao enviar foto, continuando sem ela: {foto_err}')
                    await self.bot.send_message(
                        chat_id=self.chat_id,
                        text=mensagem,
                        parse_mode=ParseMode.HTML
                    )
                else:
                    try:
                        await self.bot.send_photo(
                            chat_id=self.chat_id,
                            photo=imagem,
                            caption=mensagem,
                            parse_mode=ParseMode.HTML
                        )
                    except Exception as foto_err:
                        print(f'⚠️ Erro ao enviar foto ({foto_err}), enviando só texto...')
                        await self.bot.send_message(
                            chat_id=self.chat_id,
                            text=mensagem,
                            parse_mode=ParseMode.HTML
                        )
            else:
                await self.bot.send_message(
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
            
            await self.bot.send_message(
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
            
            await self.bot.send_message(
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
            
            mensagem = f"""
🚨🔥 <b>ALERTA DE SUPER OFERTA!</b> 🔥🚨
⭐⭐⭐⭐⭐ SCORE: {score}/100

📦 <b>{produto['name'][:150]}</b>

💰 <b>R$ {produto.get('price', 0):.2f}</b>
"""
            
            if produto.get('originalPrice'):
                desconto = (1 - produto['price'] / produto['originalPrice']) * 100
                mensagem += f"💸 De: <s>R$ {produto['originalPrice']:.2f}</s> | <b>{desconto:.0f}% OFF</b>\n"
            
            mensagem += f"""
🏪 <b>{produto.get('storeName', 'Loja')}</b>

⚡ <b>CORRE! Esta é uma das melhores ofertas encontradas!</b>

🆔 ID: <code>{produto.get('id', 'N/A')}</code>
"""
            
            await self.bot.send_message(
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
            plataforma_nome = f"🛒 {produto['storeName']}"

        link_promobit = ""
        if primeiro_link:
            # Se o link é do Promobit, deixa claro que é para ver a oferta original
            if 'promobit.com.br' in primeiro_link or 'pelando.com.br' in primeiro_link or 'promobyte' in primeiro_link:
                link_promobit = f"🔗 <a href='{primeiro_link}'>👆 Ver oferta completa (pegue o link da loja aqui)</a>"
            else:
                link_promobit = f"🔗 <a href='{primeiro_link}'>🛒 COMPRAR AGORA</a>"

        produto_id = produto.get('id', 'N/A')
        descricao_produto = produto.get('description', '')
        
        cupom_msg = ""
        if '🎟️ CUPOM:' in descricao_produto:
            cupom_extraido = descricao_produto.split('🎟️ CUPOM:')[1].split('\n')[0].strip()
            _invalidos = {'NORMAL', 'NONE', 'NULL', 'N/A', 'NA', ''}
            if cupom_extraido.upper() not in _invalidos:
                cupom_msg = f"\n🎟️ <b>CUPOM:</b> <code>{cupom_extraido}</code>"

        # Score visual
        score_visual = "⭐" * min(5, score // 20)
        
        mensagem = f"""
{emoji_qualidade}
⚠️ <b>AGUARDANDO APROVAÇÃO</b>

📦 <b>{produto['name'][:150]}</b>

🏷️ {produto['category']}
🏪 <b>{plataforma_nome}</b>
{preco_texto}{desconto_texto}{cupom_msg}{urgencia}

📊 Qualidade: {score_visual} ({score}/100)

{link_promobit}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
<b>📋 PARA APROVAR, envie:</b>

<code>/aprovar {produto_id} [SEU_LINK]</code>

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
        elif tipo == 'produto_urgente':
            loop.run_until_complete(self.enviar_produto_urgente(dados))
        elif tipo == 'cupom':
            loop.run_until_complete(self.enviar_cupom(dados))
        elif tipo == 'resumo':
            loop.run_until_complete(self.enviar_resumo(dados['produtos'], dados['cupons']))
