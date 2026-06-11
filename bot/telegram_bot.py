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
        from config import TELEGRAM_PROMO_GROUP_ID, GEMINI_API_KEY
        if not TELEGRAM_PROMO_GROUP_ID:
            print('⚠️ TELEGRAM_PROMO_GROUP_ID não configurado — pulando publicação no grupo.')
            return

        nome = produto.get('name', 'Produto')
        preco = produto.get('price')
        imagem = produto.get('imageUrl')
        
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
        plataforma_label = PLATAFORMA_EMOJIS.get(platform, '🛒 ' + platform)

        legenda_engracada = "🔥 ACHADINHO IMPERDÍVEL!"
        
        from pathlib import Path
        arquivo_legendas = Path(__file__).parent / 'legendas_salvas.txt'
        
        if custom_caption:
            legenda_engracada = custom_caption.strip()
            # Salva para aprender
            try:
                with open(arquivo_legendas, 'a', encoding='utf-8') as f:
                    f.write(legenda_engracada + '\n')
                # Manter apenas as últimas 50
                with open(arquivo_legendas, 'r', encoding='utf-8') as f:
                    linhas = f.readlines()
                if len(linhas) > 50:
                    with open(arquivo_legendas, 'w', encoding='utf-8') as f:
                        f.writelines(linhas[-50:])
            except Exception as e:
                print(f"Erro ao salvar legenda: {e}")
        else:
            import google.generativeai as genai
            import random
            
            # Lê exemplos salvos
            exemplos_salvos = ""
            try:
                if arquivo_legendas.exists():
                    with open(arquivo_legendas, 'r', encoding='utf-8') as f:
                        linhas = [l.strip() for l in f.readlines() if l.strip()]
                    if linhas:
                        amostra = random.sample(linhas, min(5, len(linhas)))
                        exemplos_salvos = "Exemplos reais de legendas que eu já criei (siga ESSE MESMO ESTILO E VIBE):\n- " + "\n- ".join(amostra)
            except Exception as e:
                print(f"Erro ao ler legendas salvas: {e}")
                
            if not exemplos_salvos:
                exemplos_salvos = (
                    "Exemplos do estilo que eu quero:\n"
                    "- 'MEU ÚNICO CARDIO NESSE FERIADO'\n"
                    "- 'PRA NÃO BRIGAR MAIS COM A ESPOSA'\n"
                    "- 'SUA CASA CLAMAVA POR ESSE MIMO'\n"
                    "- 'O ESTAGIÁRIO ERROU O PREÇO DE NOVO'"
                )

            if GEMINI_API_KEY:
                try:
                    genai.configure(api_key=GEMINI_API_KEY)
                    model = genai.GenerativeModel('gemini-2.5-flash')
                    prompt = (
                        f"Você é dono de um canal de achadinhos e utilidades. "
                        f"Crie UMA FRASE muito curta (máximo 1 linha), engraçada, irreverente e chamativa em CAIXA ALTA "
                        f"para anunciar a venda deste produto: '{nome}'.\n\n"
                        f"{exemplos_salvos}\n\n"
                        f"Seja criativo, NUNCA REPITA OS EXEMPLOS EXATAMENTE. Crie uma frase nova baseada neles, focada no uso diário do produto. Retorne APENAS a frase, sem aspas, sem hashtag e sem enrolação."
                    )
                    response = await asyncio.to_thread(model.generate_content, prompt)
                    if response and response.text:
                        legenda_engracada = response.text.strip().replace('"', '').replace('*', '')
                        print(f"✅ Legenda Gemini gerada: {legenda_engracada}")
                    else:
                        print("⚠️ Gemini retornou resposta vazia, usando legenda padrão")
                except Exception as e:
                    print(f"⚠️ Gemini indisponível, usando legenda padrão: {e}")
            else:
                print("⚠️ GEMINI_API_KEY não configurada, usando legenda padrão")

        preco_original = produto.get('originalPrice')
        if preco_original and preco and float(preco_original) > float(preco):
            preco_txt = f"💰 de <s>R$ {float(preco_original):.2f}</s> por <b>R$ {float(preco):.2f}</b>".replace('.', ',')
        else:
            preco_txt = f"💰 <b>R$ {float(preco):.2f}</b>".replace('.', ',') if preco else ""
        
        descricao_prod = produto.get('description', '')
        cupom_msg = ""
        if '🎟️ CUPOM:' in descricao_prod:
            cupom_extraido = descricao_prod.split('🎟️ CUPOM:')[1].split('\n')[0].strip()
            _invalidos = {'NORMAL', 'NONE', 'NULL', 'N/A', 'NA', ''}
            if cupom_extraido.upper() not in _invalidos:
                cupom_msg = f"🎟️ Cupom: <code>{cupom_extraido}</code>\n"

        mensagem = (
            f"{legenda_engracada}\n\n"
            f"📦 <b>{nome}</b>\n"
            f"🏪 {plataforma_label}\n"
            f"{preco_txt}\n"
            f"{cupom_msg}\n"
            f"🔗 <a href='{affiliate_link}'>👉 CLIQUE AQUI PARA COMPRAR</a>"
        )

        try:
            # Prioridade: foto enviada pelo admin > imageUrl do produto
            foto_para_usar = foto_file_id or imagem
            usar_foto = bool(foto_para_usar and 'placeholder' not in foto_para_usar)
            print(f'📸 foto_file_id (admin): {foto_file_id}')
            print(f'🖼️ imageUrl (produto): {imagem}')
            print(f'✅ foto_para_usar: {foto_para_usar}')
            
            if usar_foto:
                await self.bot.send_photo(
                    chat_id=TELEGRAM_PROMO_GROUP_ID,
                    photo=foto_para_usar,
                    caption=mensagem,
                    parse_mode='HTML'
                )
            else:
                await self.bot.send_message(
                    chat_id=TELEGRAM_PROMO_GROUP_ID,
                    text=mensagem,
                    parse_mode='HTML'
                )
            print(f'📢 Promoção publicada no grupo: {nome[:50]}')
        except Exception as e:
            print(f'❌ Erro ao publicar no grupo: {e}')
