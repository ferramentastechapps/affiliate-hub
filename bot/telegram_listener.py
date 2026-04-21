#!/usr/bin/env python3
"""
Telegram Listener - Escuta comandos de aprovação/rejeição de produtos
"""

import re
import asyncio
from telegram import Update
from telegram.ext import ApplicationBuilder, MessageHandler, CommandHandler, filters, ContextTypes
from config import TELEGRAM_BOT_TOKEN, TELEGRAM_PROMO_GROUP_ID, GEMINI_API_KEY
from affiliate_hub_api import AffiliateHubAPI

# Inicializa o cliente da API para comunicar com o Next.js
api = AffiliateHubAPI()

def infer_platform_from_url(url: str) -> str:
    """Descobre qual mercado o link pertence baseado na URL."""
    url_lower = url.lower()
    
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
    if 'magazineluiza' in url_lower or 'magalu' in url_lower:
        return 'magalu'
    if 'kabum' in url_lower:
        return 'kabum'
        
    return 'amazon' # Default fallback

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

async def publicar_no_grupo(context, produto: dict, platform: str, affiliate_link: str, foto_file_id: str = None):
    """Publica a promoção aprovada no grupo de promoções."""
    if not TELEGRAM_PROMO_GROUP_ID:
        print('⚠️ TELEGRAM_PROMO_GROUP_ID não configurado — pulando publicação no grupo.')
        return

    nome = produto.get('name', 'Produto')
    preco = produto.get('price')
    imagem = produto.get('imageUrl')
    categoria = produto.get('category', 'Setup')
    plataforma_label = PLATAFORMA_EMOJIS.get(platform, '🛒 ' + platform)

    legenda_engracada = "🔥 ACHADINHO IMPERDÍVEL!"
    
    import google.generativeai as genai
    if GEMINI_API_KEY:
        try:
            genai.configure(api_key=GEMINI_API_KEY)
            model = genai.GenerativeModel('gemini-2.0-flash')
            prompt = (
                f"Você é dono de um canal de achadinhos e utilidades. "
                f"Crie UMA FRASE muito curta (máximo 1 linha), engraçada, irreverente e chamativa em CAIXA ALTA "
                f"para anunciar a venda deste produto: '{nome}'. "
                f"Exemplos do estilo que eu quero: 'MEU ÚNICO CARDIO NESSE FERIADO', 'PRA NÃO BRIGAR MAIS COM A ESPOSA', "
                f"'SUA CASA CLAMAVA POR ESSE MIMO', 'O ESTAGIÁRIO ERROU O PREÇO DE NOVO'. "
                f"Seja criativo e focado no uso diário do produto. Retorne APENAS a frase, sem aspas, sem hashtag e sem enrolação."
            )
            response = await model.generate_content_async(prompt)
            if response and response.text:
                legenda_engracada = response.text.strip().replace('"', '').replace('*', '')
        except Exception as e:
            print(f"⚠️ Gemini indisponível, usando legenda padrão: {e}")

    preco_txt = f"💰 <b>R$ {float(preco):.2f}</b>" if preco else ""
    
    descricao_prod = produto.get('description', '')
    cupom_msg = ""
    if '🎟️ CUPOM:' in descricao_prod:
        cupom_extraido = descricao_prod.split('🎟️ CUPOM:')[1].strip()
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
        print(f'📸 foto_file_id (admin): {foto_file_id}')
        print(f'🖼️ imageUrl (produto): {imagem}')
        print(f'✅ foto_para_usar: {foto_para_usar}')
        if foto_para_usar:
            await context.bot.send_photo(
                chat_id=TELEGRAM_PROMO_GROUP_ID,
                photo=foto_para_usar,
                caption=mensagem,
                parse_mode='HTML'
            )
        else:
            await context.bot.send_message(
                chat_id=TELEGRAM_PROMO_GROUP_ID,
                text=mensagem,
                parse_mode='HTML'
            )
        print(f'📢 Promoção publicada no grupo: {nome[:50]}')
    except Exception as e:
        print(f'❌ Erro ao publicar no grupo: {e}')

async def handle_foto_com_legenda(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Intercepta fotos com legenda e redireciona para /aprovar se necessário."""
    caption = update.message.caption or ''
    print(f'📸 Foto recebida com legenda: {caption}')
    
    if caption.strip().startswith('/aprovar'):
        await handle_aprovar_command(update, context)
    else:
        print(f'📸 Foto com legenda ignorada (não é /aprovar): {caption[:50]}')

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

    if len(args) < 2:
        await update.message.reply_text(
            "❌ Uso incorreto!\n\n"
            "✅ Formato correto:\n"
            "<code>/aprovar [ID] [LINK_AFILIADO]</code>\n\n"
            "📸 Para enviar foto personalizada:\n"
            "Envie a foto com a legenda: <code>/aprovar [ID] [LINK]</code>\n\n"
            "Exemplo:\n"
            "<code>/aprovar clxyz123 https://amzn.to/abc123</code>",
            parse_mode='HTML'
        )
        return

    # Procura o link (começa com http) em qualquer posição
    affiliate_link = next((arg for arg in args if arg.startswith('http')), None)
    # O ID é o primeiro argumento que NÃO é um link
    produto_id = next((arg for arg in args if not arg.startswith('http')), None)

    print(f'   ID extraído: {produto_id}')
    print(f'   Link extraído: {affiliate_link}')

    if not affiliate_link:
        await update.message.reply_text(
            "❌ Nenhum link encontrado!\n\n"
            "✅ Formato correto:\n"
            "<code>/aprovar [ID] [LINK_AFILIADO]</code>\n\n"
            "Exemplo:\n"
            "<code>/aprovar clxyz123 https://amzn.to/abc123</code>",
            parse_mode='HTML'
        )
        return

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
    platform = infer_platform_from_url(affiliate_link)
    print(f'   Plataforma detectada: {platform}')

    msg_status = await update.message.reply_text("⏳ Aprovando produto e atualizando link...")

    # Chamar API de aprovação
    print(f'🔄 Chamando API de aprovação...')
    resultado = api.aprovar_produto(produto_id, platform, affiliate_link, foto_url_publica)
    
    print(f'📥 Resposta da API:')
    print(f'   Resultado: {resultado}')

    if resultado and resultado.get('success'):
        # Publicar no grupo de promoções
        produto_info = resultado.get('product', {})
        print(f'✅ Produto aprovado com sucesso!')
        print(f'   Publicando no grupo...')
        
        await publicar_no_grupo(context, produto_info, platform, affiliate_link, foto_file_id)

        # Verificar se cupom foi salvo no banco
        cupom_info = resultado.get('coupon')
        cupom_msg = f"\n🎫 Cupom salvo no banco de dados!" if cupom_info else ""
        foto_msg = "\n📸 Foto personalizada usada!" if foto_file_id else ""

        await msg_status.edit_text(
            f"✅ <b>Produto Aprovado com Sucesso!</b>\n\n"
            f"🆔 ID: <code>{produto_id}</code>\n"
            f"🏪 Plataforma: <b>{platform}</b>\n"
            f"🔗 Link atualizado\n\n"
            f"✅ Promoção publicada no grupo!"
            + cupom_msg + foto_msg,
            parse_mode='HTML'
        )
    else:
        erro_msg = resultado.get('error') if resultado else "Erro na comunicação com a API."
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
        
    # Tenta achar o ID do produto na mensagem que está sendo respondida
    match = re.search(r'ID_DO_PRODUTO:\s*([a-zA-Z0-9_-]+)', original_text)
    
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

<b>/help</b>
Mostra esta mensagem de ajuda

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
<b>📋 Fluxo de Aprovação:</b>

1️⃣ Robô encontra produto no Promobit
2️⃣ Envia para você com ID_DO_PRODUTO
3️⃣ Você usa /aprovar com SEU link
4️⃣ Produto aparece no site com SEU link

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
    app.add_handler(CommandHandler("help", handle_help_command))
    app.add_handler(CommandHandler("start", handle_help_command))

    # Método legado: responder à mensagem
    app.add_handler(MessageHandler(filters.TEXT & (~filters.COMMAND), handle_reply))
    
    app.add_error_handler(error_handler)

    # Inicia o polling
    app.run_polling()

if __name__ == '__main__':
    try:
        run_listener()
    except KeyboardInterrupt:
        print('\n\n👋 Listener finalizado pelo usuário')
    except Exception as e:
        print(f'\n❌ Erro fatal: {e}')
