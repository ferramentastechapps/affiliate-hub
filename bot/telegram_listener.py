#!/usr/bin/env python3
"""
Telegram Listener - Escuta comandos de aprovação/rejeição de produtos
"""

import re
import asyncio
from telegram import Update
from telegram.ext import ApplicationBuilder, MessageHandler, CommandHandler, filters, ContextTypes
from config import TELEGRAM_BOT_TOKEN
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
    if 'mercadolivre' in url_lower or 'mercadofree' in url_lower or 'mercadolibre' in url_lower:
        return 'mercadoLivre'
    if 'tiktok' in url_lower:
        return 'tiktok'
        
    return 'amazon' # Default fallback

async def handle_aprovar_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Comando: /aprovar [id] [link_afiliado]
    Aprova um produto pendente e adiciona o link de afiliado.
    Tolerante: encontra o link http em qualquer posição dos argumentos.
    """
    if not context.args or len(context.args) < 2:
        await update.message.reply_text(
            "❌ Uso incorreto!\n\n"
            "✅ Formato correto:\n"
            "<code>/aprovar [ID] [LINK_AFILIADO]</code>\n\n"
            "Exemplo:\n"
            "<code>/aprovar clxyz123 https://amzn.to/abc123</code>",
            parse_mode='HTML'
        )
        return

    # Procura o link (começa com http) em qualquer posição
    affiliate_link = next((arg for arg in context.args if arg.startswith('http')), None)
    # O ID é o primeiro argumento que NÃO é um link
    produto_id = next((arg for arg in context.args if not arg.startswith('http')), None)

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

    # Detectar plataforma
    platform = infer_platform_from_url(affiliate_link)

    msg_status = await update.message.reply_text("⏳ Aprovando produto e atualizando link...")

    # Chamar API de aprovação
    resultado = api.aprovar_produto(produto_id, platform, affiliate_link)

    if resultado and resultado.get('success'):
        await msg_status.edit_text(
            f"✅ <b>Produto Aprovado com Sucesso!</b>\n\n"
            f"🆔 ID: <code>{produto_id}</code>\n"
            f"🏪 Plataforma: <b>{platform}</b>\n"
            f"🔗 Link atualizado\n\n"
            f"O produto agora está visível no site!",
            parse_mode='HTML'
        )
    else:
        erro_msg = resultado.get('error') if resultado else "Erro na comunicação com a API."
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

    # Comandos
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
