#!/usr/bin/env python3
"""
Telegram Listener - Escuta comandos de aprovação/rejeição de produtos
"""

import re
import asyncio
from telegram import Update
from telegram.ext import ApplicationBuilder, MessageHandler, CommandHandler, filters, ContextTypes
from config import TELEGRAM_BOT_TOKEN, TELEGRAM_PROMO_GROUP_ID, GEMINI_API_KEY, OPENROUTER_API_KEY
from affiliate_hub_api import AffiliateHubAPI
from telegram_bot import TelegramNotifier
from metadata_utils import enriquecer_produto

notifier = TelegramNotifier()
api = AffiliateHubAPI()

def infer_platform_from_url(url: str) -> str:
    """Descobre qual mercado o link pertence baseado na URL."""
    url_lower = url.lower() if url else ''
    
    if 'amazon' in url_lower or 'amzn.to' in url_lower:
        return 'amazon'
    if 'shopee' in url_lower or 'shope.ee' in url_lower:
        return 'shopee'
    if 'aliexpress' in url_lower or 's.click.aliexpress' in url_lower or 'a.aliexpress' in url_lower:
        return 'aliexpress'
    if 'mercadolivre' in url_lower or 'mercadofree' in url_lower or 'mercadolibre' in url_lower or 'meli.la' in url_lower:
        return 'mercadoLivre'
    if 'tiktok' in url_lower:
        return 'tiktok'
    if 'netshoes' in url_lower:
        return 'netshoes'
    if 'magazineluiza' in url_lower or 'magalu' in url_lower or 'magazinevoce' in url_lower or 'influenciadormagalu' in url_lower:
        return 'magalu'
    if 'kabum' in url_lower:
        return 'kabum'
        
    return 'amazon' # Default fallback

async def publicar_no_grupo(context, produto: dict, platform: str, affiliate_link: str, foto_file_id: str = None, custom_caption: str = None):
    """Publica a promoção aprovada no grupo de promoções."""
    await notifier.publicar_no_grupo(produto, platform, affiliate_link, foto_file_id, custom_caption)

async def handle_foto_com_legenda(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Intercepta fotos com legenda e redireciona para /aprovar ou /tiktok se necessário."""
    caption = update.message.caption or ''
    print(f'📸 Foto recebida com legenda: {caption}')
    
    if caption.strip().startswith('/aprovar'):
        await handle_aprovar_command(update, context)
    elif caption.strip().startswith('/tiktok'):
        # Popula context.args a partir da legenda
        partes = caption.split()
        context.args = partes[1:]
        await handle_tiktok_command(update, context)
    else:
        print(f'📸 Foto com legenda recebida (não é comando), tentando processar como promo...')
        await handle_forwarded_or_text_promo(update, context)

async def handle_aprovar_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Comando: /aprovar [id] [link_afiliado]
    Aprova um produto pendente e adiciona o link de afiliado.
    Aceita foto junto com o comando (envie a foto com /aprovar como legenda).
    Tolerante: encontra o link http em qualquer posição dos argumentos.
    """
    print(f'🔍 DEBUG - handle_aprovar_command chamado')
    print(f'   update.message: {update.message}')
    print(f'   update.message.photo: {update.message.photo if update.message else None}')
    print(f'   update.message.caption: {update.message.caption if update.message else None}')
    print(f'   update.message.text: {update.message.text if update.message else None}')
    print(f'   context.args: {context.args}')
    
    # Quando vem como legenda de foto, context.args pode estar vazio — parsear manualmente
    args = context.args or []
    if not args and update.message and update.message.caption:
        partes = update.message.caption.split()
        args = partes[1:]  # remove o "/aprovar"
        print(f'   Args extraídos da caption: {args}')

    print(f'🔍 DEBUG - Comando /aprovar recebido')
    print(f'   Args finais: {args}')

    if not args:
        await update.message.reply_text(
            "❌ Uso incorreto!\n\n"
            "✅ Formatos aceitos:\n"
            "• Auto-gerar link de afiliado: <code>/aprovar [ID]</code>\n"
            "• Especificar link manual: <code>/aprovar [ID] [LINK_AFILIADO]</code>\n\n"
            "Exemplo:\n"
            "<code>/aprovar clxyz123</code>",
            parse_mode='HTML'
        )
        return

    # Procura o link (começa com http) em qualquer posição
    affiliate_link = next((arg for arg in args if arg.startswith('http')), None)
    # O ID é o primeiro argumento que NÃO é um link
    produto_id = next((arg for arg in args if not arg.startswith('http')), None)

    # O que sobrar é a legenda customizada
    outros_args = [arg for arg in args if arg != affiliate_link and arg != produto_id]
    custom_caption = " ".join(outros_args) if outros_args else None

    print(f'   ID extraído: {produto_id}')
    print(f'   Link extraído: {affiliate_link}')
    print(f'   Legenda extraída: {custom_caption}')

    if not produto_id:
        await update.message.reply_text("❌ ID do produto não encontrado no comando.")
        return

    # Captura foto enviada junto com o comando (como legenda da foto)
    foto_file_id = None
    foto_url_publica = None
    if update.message and update.message.photo:
        # Pega a maior resolução disponível
        foto_file_id = update.message.photo[-1].file_id
        print(f'📸 Foto personalizada recebida para produto {produto_id}')
        print(f'   File ID: {foto_file_id}')
        
        # Obter URL pública da foto via Telegram
        try:
            foto_file = await context.bot.get_file(foto_file_id)
            foto_url_publica = foto_file.file_path
            print(f'   URL pública: {foto_url_publica}')
        except Exception as e:
            print(f'⚠️ Erro ao obter URL da foto: {e}')

    # Detectar plataforma
    platform = infer_platform_from_url(affiliate_link) if affiliate_link else None
    print(f'   Plataforma detectada: {platform}')

    msg_status = await update.message.reply_text("⏳ Aprovando produto...")

    # Chamar API de aprovação
    print(f'🔄 Chamando API de aprovação...')
    resultado = api.aprovar_produto(produto_id, platform, affiliate_link, foto_url_publica)
    
    print(f'📥 Resposta da API:')
    print(f'   Resultado: {resultado}')

    if resultado and resultado.get('success'):
        # Obter dados resolvidos pelo servidor
        final_platform = resultado.get('platform')
        final_affiliate_link = resultado.get('affiliateLink')
        
        # Publicar no grupo de promoções
        produto_info = resultado.get('product', {})
        print(f'✅ Produto aprovado com sucesso!')
        print(f'   Publicando no grupo com link: {final_affiliate_link}')
        
        await publicar_no_grupo(context, produto_info, final_platform, final_affiliate_link, foto_file_id, custom_caption)

        # Verificar se cupom foi salvo no banco
        cupom_info = resultado.get('coupon')
        cupom_msg = f"\n🎫 Cupom salvo no banco de dados!" if cupom_info else ""
        foto_msg = "\n📸 Foto personalizada usada!" if foto_file_id else ""
        origem_msg = "\n✨ Link gerado automaticamente!" if not affiliate_link else "\n🔗 Usado link manual fornecido."

        await msg_status.edit_text(
            f"✅ <b>Produto Aprovado com Sucesso!</b>\n\n"
            f"🆔 ID: <code>{produto_id}</code>\n"
            f"🏪 Plataforma: <b>{final_platform}</b>\n"
            f"🔗 Link: {final_affiliate_link}\n\n"
            f"✅ Promoção publicada no grupo!"
            + origem_msg + cupom_msg + foto_msg,
            parse_mode='HTML'
        )
    else:
        erro_msg = resultado.get('error') if resultado else "Erro na comunicação com a API."
        # Tenta pegar details do erro do Next.js
        if resultado and resultado.get('details'):
            erro_msg += f"\n\n💡 {resultado.get('details')}"
        print(f'❌ Erro ao aprovar: {erro_msg}')
        await msg_status.edit_text(f"❌ Falha ao aprovar: {erro_msg}")

async def handle_rejeitar_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Comando: /rejeitar [id]
    Rejeita um produto pendente
    """
    if not context.args or len(context.args) < 1:
        await update.message.reply_text(
            "❌ Uso incorreto!\n\n"
            "✅ Formato correto:\n"
            "<code>/rejeitar [ID]</code>\n\n"
            "Exemplo:\n"
            "<code>/rejeitar clxyz123</code>",
            parse_mode='HTML'
        )
        return
    
    produto_id = context.args[0]
    
    msg_status = await update.message.reply_text("⏳ Rejeitando produto...")
    
    # Chamar API de rejeição
    resultado = api.rejeitar_produto(produto_id)
    
    if resultado and resultado.get('success'):
        await msg_status.edit_text(
            f"❌ <b>Produto Rejeitado</b>\n\n"
            f"🆔 ID: <code>{produto_id}</code>\n\n"
            f"O produto não aparecerá no site.",
            parse_mode='HTML'
        )
    else:
        erro_msg = resultado.get('error') if resultado else "Erro na comunicação com a API."
        await msg_status.edit_text(f"❌ Falha ao rejeitar: {erro_msg}")

async def handle_forwarded_or_text_promo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Processa textos (encaminhados ou não) que contenham link para cadastrar como pendente"""
    text = update.message.text or update.message.caption or ""
    
    # Se for uma resposta a uma mensagem (o handle_reply cuida disso)
    if update.message.reply_to_message:
        reply_text = update.message.reply_to_message.text or update.message.reply_to_message.caption or ""
        if "ID_DO_PRODUTO:" in reply_text or "🆔 ID:" in reply_text:
            # Deixa o handle_reply normal processar
            return await handle_reply(update, context)
            
    # Ignorar se for comando explícito
    if text.strip().startswith('/'):
        return

    # Verificar se tem link
    import re
    if 'http' not in text.lower():
        return
        
    msg_status = await update.message.reply_text("⏳ Analisando oferta encaminhada...")
    
    import json
    import requests
    
    try:
        if not OPENROUTER_API_KEY:
            await msg_status.edit_text(
                "❌ <b>OPENROUTER_API_KEY não configurada</b>\n\n"
                "Para processar produtos encaminhados, você precisa configurar a chave da API OpenRouter no arquivo .env:\n\n"
                "<code>OPENROUTER_API_KEY=sk-or-v1-...</code>\n\n"
                "🔗 Obtenha sua chave em: https://openrouter.ai/keys",
                parse_mode='HTML'
            )
            return

        print(f"🤖 Enviando texto para OpenRouter AI extrair dados...")
        print(f"   Texto: {text[:200]}...")

        prompt = (
            f"Extraia as informações desta promoção de afiliado. Pode ser uma mensagem mal formatada ou de WhatsApp:\n\n"
            f"{text}\n\n"
            f"Responda APENAS em um JSON válido com estas exatas chaves:\n"
            f"- name: Nome do produto bem descritivo, sem emojis e sem preço (string)\n"
            f"- price: Preço final do produto apenas em número (number ou null se não achar. ex: 199.90)\n"
            f"- link: URL completa para compra do produto (string)\n"
            f"- coupon: Código do cupom de desconto (string ou null se não houver)\n"
            f"Não use marcações markdown (```json), retorne puramente o objeto JSON."
        )
        
        # Async request run in executor
        loop = asyncio.get_event_loop()
        
        def call_openrouter():
            response = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "meta-llama/llama-3.1-8b-instruct:free",
                    "messages": [
                        {"role": "user", "content": prompt}
                    ],
                    "response_format": {"type": "json_object"}
                },
                timeout=30
            )
            if response.status_code != 200:
                raise Exception(f"OpenRouter API error: {response.status_code} - {response.text}")
            return response.json().get("choices", [{}])[0].get("message", {}).get("content", "{}")

        response_text = await loop.run_in_executor(None, call_openrouter)
        
        print(f"✅ Resposta da AI recebida: {response_text[:200]}...")
        
        texto_limpo = response_text.replace('```json', '').replace('```', '').strip()
        dados = json.loads(texto_limpo)
        
        print(f"📦 Dados extraídos: {dados}")
        
        nome = dados.get('name') or 'Produto Encontrado'
        preco = dados.get('price')
        link = dados.get('link')
        cupom = dados.get('coupon')
        
        if not link:
            await msg_status.edit_text(
                "❌ <b>Link não encontrado</b>\n\n"
                "Não consegui extrair um link válido dessa mensagem.\n\n"
                "💡 Certifique-se de que a mensagem contém um link de produto válido.",
                parse_mode='HTML'
            )
            return
            
        await msg_status.edit_text("⏳ Buscando mais informações sobre o produto...")
            
        # Tentar raspar os dados da página se faltar nome, preço ou imagem (quando não houver foto enviada)
        scraped_data = {}
        try:
            print(f"🔍 Tentando fazer scraping do link: {link}")
            scrape_resp = requests.post("http://127.0.0.1:3005/api/scrape", json={"url": link}, timeout=60)
            if scrape_resp.status_code == 200:
                scraped_data = scrape_resp.json()
                print(f"✅ Scraped fallback: {scraped_data}")
            else:
                print(f"⚠️ Scraper retornou status {scrape_resp.status_code}")
        except requests.exceptions.Timeout:
            print(f"⚠️ Timeout no scraper de fallback (60s)")
        except requests.exceptions.ConnectionError:
            print(f"⚠️ Erro de conexão no scraper - verifique se o Next.js está rodando na porta 3005")
        except Exception as e:
            print(f"⚠️ Erro no scraper de fallback: {e}")

        # Pegar a foto original se a mensagem tiver foto, senão usa a do scraper
        foto_url = None
        if update.message.photo:
            foto_file = await context.bot.get_file(update.message.photo[-1].file_id)
            foto_url = foto_file.file_path
            print(f"📸 Foto da mensagem capturada: {foto_url}")
        elif scraped_data.get('imageUrl') and 'placeholder' not in scraped_data.get('imageUrl'):
            foto_url = scraped_data.get('imageUrl')
            print(f"📸 Foto do scraper: {foto_url}")

        # Se o Gemini não achou nome ou preço, usa o do scraper
        if nome == 'Produto Encontrado' and scraped_data.get('name'):
            nome = scraped_data.get('name')
            print(f"📝 Nome atualizado do scraper: {nome}")
        if not preco and scraped_data.get('price'):
            preco = scraped_data.get('price')
            print(f"💰 Preço atualizado do scraper: R$ {preco}")
            
        # Determinar categoria
        from config import CATEGORY_KEYWORDS
        categoria = 'Diversos'
        nome_lower = nome.lower()
        for cat, keywords in CATEGORY_KEYWORDS.items():
            if any(k in nome_lower for k in keywords):
                categoria = cat
                break
        
        print(f"📂 Categoria detectada: {categoria}")
                
        platform = infer_platform_from_url(link)
        print(f"🏪 Plataforma detectada: {platform}")
        
        descricao = f"Oferta encaminhada de grupos"
        if cupom:
            descricao += f"\n🎟️ CUPOM: {cupom}"
            print(f"🎟️ Cupom detectado: {cupom}")
            
        produto_data = {
            'name': nome,
            'category': categoria,
            'description': descricao,
            'imageUrl': foto_url or '/placeholder.webp',
            'price': preco,
            'originalPrice': None,
            'links': {
                platform: link
            },
            'storeName': platform.capitalize()
        }
        
        produto_data = enriquecer_produto(produto_data)
        
        print(f"📦 Enviando produto encaminhado para API: {produto_data}")
        resultado = api.adicionar_produto(produto_data)
        
        if resultado and resultado.get('success'):
            produto_id = resultado.get('product', {}).get('id', 'N/A')
            produto_data['id'] = produto_id
            
            print(f"✅ Produto adicionado com sucesso! ID: {produto_id}")
            
            # Notifica os administradores para aprovação usando o notifier padrão
            try:
                notifier = TelegramNotifier()
                await notifier.enviar_produto(produto_data)
                print(f"📱 Notificação de aprovação enviada!")
            except Exception as e:
                print(f"⚠️ Erro ao enviar notificação de aprovação: {e}")
                
            await msg_status.edit_text(
                f"✅ <b>Oferta capturada com sucesso!</b>\n\n"
                f"📦 {nome[:100]}\n"
                f"💰 Preço: R$ {preco if preco else 'N/A'}\n"
                f"📂 Categoria: {categoria}\n"
                f"🏪 Plataforma: {platform.capitalize()}\n\n"
                f"🆔 ID: <code>{produto_id}</code>\n\n"
                f"O produto foi enviado como <b>Pendente</b> para aprovação.\n"
                f"Use <code>/aprovar {produto_id}</code> para publicar!",
                parse_mode='HTML'
            )
        else:
            erro = resultado.get('error', 'Erro desconhecido') if resultado else "Sem resposta da API"
            print(f"❌ Falha ao salvar produto: {erro}")
            await msg_status.edit_text(
                f"❌ <b>Falha ao salvar a promoção</b>\n\n"
                f"Erro: {erro}\n\n"
                f"💡 Verifique se o servidor Next.js está rodando e a API está acessível.",
                parse_mode='HTML'
            )
            
    except json.JSONDecodeError as e:
        print(f"❌ Erro de JSON ao processar mensagem encaminhada: {e}")
        print(f"   Resposta recebida: {response_text if 'response_text' in locals() else 'N/A'}")
        await msg_status.edit_text(
            "❌ <b>Erro ao processar resposta da AI</b>\n\n"
            "A resposta da inteligência artificial não está em formato JSON válido.\n\n"
            "💡 Tente reformatar a mensagem ou enviar apenas o link do produto.",
            parse_mode='HTML'
        )
    except requests.exceptions.Timeout:
        print(f"❌ Timeout ao chamar OpenRouter API")
        await msg_status.edit_text(
            "❌ <b>Timeout ao processar</b>\n\n"
            "A API demorou muito para responder (>30s).\n\n"
            "💡 Tente novamente em alguns instantes.",
            parse_mode='HTML'
        )
    except requests.exceptions.RequestException as e:
        print(f"❌ Erro de rede ao chamar OpenRouter API: {e}")
        await msg_status.edit_text(
            "❌ <b>Erro de conexão com a AI</b>\n\n"
            f"Não foi possível conectar com o OpenRouter.\n\n"
            f"Erro: {str(e)[:100]}",
            parse_mode='HTML'
        )
    except Exception as e:
        print(f"❌ Erro inesperado ao processar mensagem encaminhada: {e}")
        import traceback
        traceback.print_exc()
        await msg_status.edit_text(
            "❌ <b>Erro inesperado</b>\n\n"
            f"Ocorreu um erro ao processar a mensagem.\n\n"
            f"Erro: {str(e)[:150]}\n\n"
            "💡 Verifique os logs do bot para mais detalhes.",
            parse_mode='HTML'
        )

async def handle_reply(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    MÉTODO LEGADO: Responder à mensagem com link
    Mantido para compatibilidade, mas recomenda-se usar /aprovar
    """
    if not update.message or not update.message.reply_to_message:
        return
        
    original_text = update.message.reply_to_message.text or update.message.reply_to_message.caption
    
    if not original_text:
        return
        
    # Tenta achar o ID do produto na mensagem que está sendo respondida (ambos formatos)
    match = re.search(r'ID_DO_PRODUTO:\s*([a-zA-Z0-9_-]+)', original_text)
    if not match:
        match = re.search(r'🆔\s*ID:\s*([a-zA-Z0-9_-]+)', original_text)
    
    if not match:
        return
        
    produto_id = match.group(1).strip()
    user_reply = update.message.text.strip()
    
    # Validação simples para ver se parece uma URL
    if not user_reply.startswith("http"):
        await update.message.reply_text(
            "⚠️ O texto enviado não parece conter um link válido.\n\n"
            "💡 <b>Dica:</b> Use o comando /aprovar para mais controle:\n"
            f"<code>/aprovar {produto_id} [SEU_LINK]</code>",
            parse_mode='HTML'
        )
        return
        
    platform = infer_platform_from_url(user_reply)
    
    msg_status = await update.message.reply_text("⏳ Aprovando produto e atualizando link...")
    
    # Chama a API de aprovação
    resultado = api.aprovar_produto(produto_id, platform, user_reply)
    
    if resultado and resultado.get('success'):
        await msg_status.edit_text(
            f"✅ <b>Produto Aprovado!</b>\n\n"
            f"🆔 ID: <code>{produto_id}</code>\n"
            f"🏪 Plataforma: <b>{platform}</b>\n\n"
            f"💡 <b>Dica:</b> Use <code>/aprovar</code> para mais controle!",
            parse_mode='HTML'
        )
    else:
        erro_msg = resultado.get('error') if resultado else "Erro na comunicação com a API."
        await msg_status.edit_text(f"❌ Falha ao aprovar: {erro_msg}")

async def handle_tiktok_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Comando: /tiktok [link] [nome] [preço] [categoria]
    Adiciona um produto do TikTok Shop rapidamente
    
    Exemplo:
    /tiktok https://www.tiktok.com/@loja/video/123 Bolsa Feminina 39.90 Moda
    """
    if not context.args or len(context.args) < 4:
        await update.message.reply_text(
            "❌ Uso incorreto!\n\n"
            "✅ Formato correto:\n"
            "<code>/tiktok [LINK] [NOME] [PREÇO] [CATEGORIA]</code>\n\n"
            "📸 Envie a foto com a legenda:\n"
            "<code>/tiktok [LINK] [NOME] [PREÇO] [CATEGORIA]</code>\n\n"
            "Exemplo:\n"
            "<code>/tiktok https://www.tiktok.com/@loja/video/123 Bolsa_Feminina 39.90 moda</code>\n\n"
            "📋 Categorias (use o atalho):\n"
            "• <b>smartphones</b> - Smartphones e TV\n"
            "• <b>informatica</b> - Informática e Games\n"
            "• <b>casa</b> - Casa e Eletrodomésticos\n"
            "• <b>moda</b> - Moda e Acessórios\n"
            "• <b>bebes</b> - Bebês e Crianças\n"
            "• <b>saude</b> - Saúde e Beleza\n"
            "• <b>esporte</b> - Esporte e Suplementos\n"
            "• <b>supermercado</b> - Supermercado e Delivery\n"
            "• <b>livros</b> - Livros, eBooks e eReaders\n"
            "• <b>ferramentas</b> - Ferramentas e Jardim\n"
            "• <b>automotivo</b> - Automotivo\n"
            "• <b>pet</b> - Pet\n"
            "• <b>viagem</b> - Viagem\n"
            "• <b>diversos</b> - Diversos",
            parse_mode='HTML'
        )
        return

    # Extrair argumentos
    link_tiktok = context.args[0]
    nome_produto = ' '.join(context.args[1:-2])  # Tudo entre link e preço
    preco = context.args[-2]
    categoria_curta = context.args[-1]

    # Mapear categoria curta para categoria completa
    categorias_map = {
        'smartphones': 'Smartphones e TV',
        'informatica': 'Informática e Games',
        'casa': 'Casa e Eletrodomésticos',
        'moda': 'Moda e Acessórios',
        'bebes': 'Bebês e Crianças',
        'saude': 'Saúde e Beleza',
        'esporte': 'Esporte e Suplementos',
        'supermercado': 'Supermercado e Delivery',
        'livros': 'Livros, eBooks e eReaders',
        'ferramentas': 'Ferramentas e Jardim',
        'automotivo': 'Automotivo',
        'pet': 'Pet',
        'viagem': 'Viagem',
        'diversos': 'Diversos'
    }
    
    categoria = categorias_map.get(categoria_curta.lower(), 'Diversos')

    # Validar link TikTok
    if 'tiktok.com' not in link_tiktok.lower():
        await update.message.reply_text("❌ O link não parece ser do TikTok!")
        return

    # Validar preço
    try:
        preco_float = float(preco.replace(',', '.'))
    except:
        await update.message.reply_text("❌ Preço inválido! Use formato: 39.90 ou 39,90")
        return

    # Capturar foto se enviada
    foto_url = None
    if update.message and update.message.photo:
        foto_file_id = update.message.photo[-1].file_id
        try:
            foto_file = await context.bot.get_file(foto_file_id)
            foto_url = foto_file.file_path
            print(f'📸 Foto TikTok capturada: {foto_url}')
        except Exception as e:
            print(f'⚠️ Erro ao obter foto: {e}')

    msg_status = await update.message.reply_text("⏳ Adicionando produto do TikTok...")

    # Criar payload do produto
    produto_data = {
        'name': nome_produto,
        'category': categoria,
        'description': f'Oferta exclusiva no TikTok Shop',
        'imageUrl': foto_url or '/placeholder.webp',
        'price': preco_float,
        'status': 'active',  # Status correto para aparecer no site
        'links': {
            'tiktok': link_tiktok
        }
    }

    produto_data = enriquecer_produto(produto_data)

    # Adicionar produto via API
    try:
        resultado = api.adicionar_produto_direto(produto_data)
        
        if resultado and resultado.get('success'):
            produto_info = resultado.get('product', {})
            produto_id = produto_info.get('id', 'N/A')
            
            # Publicar no grupo
            await publicar_no_grupo(context, produto_info, 'tiktok', link_tiktok, 
                                   update.message.photo[-1].file_id if update.message.photo else None)
            
            await msg_status.edit_text(
                f"✅ <b>Produto TikTok Adicionado!</b>\n\n"
                f"🆔 ID: <code>{produto_id}</code>\n"
                f"📦 Nome: {nome_produto}\n"
                f"💰 Preço: R$ {preco_float:.2f}\n"
                f"📂 Categoria: {categoria}\n"
                f"🎵 Plataforma: TikTok Shop\n\n"
                f"✅ Publicado no grupo de promoções!",
                parse_mode='HTML'
            )
        else:
            erro = resultado.get('error', 'Erro desconhecido') if resultado else 'Erro na API'
            await msg_status.edit_text(f"❌ Erro ao adicionar: {erro}")
            
    except Exception as e:
        print(f'❌ Erro ao adicionar produto TikTok: {e}')
        await msg_status.edit_text(f"❌ Erro: {str(e)}")

async def handle_help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Comando de ajuda"""
    help_text = """
🤖 <b>Comandos Disponíveis</b>

<b>/aprovar [ID] [LINK]</b>
Aprova um produto e adiciona seu link de afiliado
Exemplo: <code>/aprovar clxyz123 https://amzn.to/abc</code>

<b>/rejeitar [ID]</b>
Rejeita um produto (não aparecerá no site)
Exemplo: <code>/rejeitar clxyz123</code>

<b>/tiktok [LINK] [NOME] [PREÇO] [CATEGORIA]</b>
Adiciona produto do TikTok Shop rapidamente
Exemplo: <code>/tiktok https://tiktok.com/@loja/video/123 Bolsa_Feminina 39.90 Moda</code>

<b>/help</b>
Mostra esta mensagem de ajuda

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
<b>📋 Fluxo de Aprovação:</b>

1️⃣ Robô encontra produto no Promobit
2️⃣ Envia para você com ID_DO_PRODUTO
3️⃣ Você usa /aprovar com SEU link
4️⃣ Produto aparece no site com SEU link

<b>🎵 TikTok Shop:</b>
Use /tiktok para adicionar produtos rapidamente!
Envie a foto junto com o comando.

<b>🔗 Plataformas Suportadas:</b>
• Amazon (amzn.to, amazon.com.br)
• Shopee (shopee.com.br, shope.ee)
• AliExpress (aliexpress.com)
• Mercado Livre (mercadolivre.com.br)
• TikTok Shop (tiktok.com)
"""
    await update.message.reply_text(help_text, parse_mode='HTML')

async def error_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    print(f'❌ Erro no telegram_listener: {context.error}')

def run_listener():
    """Inicia o listener do Telegram"""
    print("🤖 Telegram Listener Iniciado!")
    print("📋 Comandos disponíveis:")
    print("   /aprovar [ID] [LINK] - Aprovar produto")
    print("   /rejeitar [ID] - Rejeitar produto")
    print("   /help - Ajuda")
    print("="*60)
    
    app = ApplicationBuilder().token(TELEGRAM_BOT_TOKEN).build()

    # IMPORTANTE: Foto com legenda /aprovar DEVE vir ANTES do CommandHandler
    # para capturar fotos com legenda antes de processar como comando de texto
    app.add_handler(MessageHandler(filters.PHOTO & filters.CAPTION, handle_foto_com_legenda))

    # Comandos de texto
    app.add_handler(CommandHandler("aprovar", handle_aprovar_command))
    app.add_handler(CommandHandler("rejeitar", handle_rejeitar_command))
    app.add_handler(CommandHandler("tiktok", handle_tiktok_command))
    app.add_handler(CommandHandler("help", handle_help_command))
    app.add_handler(CommandHandler("start", handle_help_command))

    # Mensagens de texto gerais (Pode ser encaminhado, texto puro ou reply)
    # Se for uma reply "ID_DO_PRODUTO", o handle_forwarded_or_text_promo repassa pro handle_reply.
    app.add_handler(MessageHandler(filters.TEXT & (~filters.COMMAND), handle_forwarded_or_text_promo))
    
    app.add_error_handler(error_handler)

    # Inicia o polling — drop_pending_updates garante que este listener
    # assuma o controle mesmo se outro processo Bot() estava ativo antes
    app.run_polling(drop_pending_updates=True, allowed_updates=Update.ALL_TYPES)

if __name__ == '__main__':
    try:
        run_listener()
    except KeyboardInterrupt:
        print('\n\n👋 Listener finalizado pelo usuário')
    except Exception as e:
        print(f'\n❌ Erro fatal: {e}')
