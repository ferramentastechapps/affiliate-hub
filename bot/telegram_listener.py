import re
import asyncio
from telegram import Update
from telegram.ext import ApplicationBuilder, MessageHandler, filters, ContextTypes
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
    if 'mercadolivre' in url_lower or 'mercadofree' in url_lower or 'ml' in url_lower:
        return 'mercadoLivre'
    if 'tiktok' in url_lower:
        return 'tiktok'
        
    return 'amazon' # Default fallback

async def handle_reply(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Função engatilhada sempre que alguém manda uma mensagem para o bot.
    Verifica se é uma Resposta (reply) a uma mensagem anterior do bot contendo a ID do Produto.
    """
    if not update.message or not update.message.reply_to_message:
        return # Não é uma resposta a nada
        
    original_text = update.message.reply_to_message.text or update.message.reply_to_message.caption
    
    if not original_text:
        return
        
    # Tenta achar o ID do produto na mensagem que está sendo respondida
    match = re.search(r'ID_DO_PRODUTO:\s*([a-zA-Z0-9_-]+)', original_text)
    
    if not match:
        await update.message.reply_text("❌ Não encontrei a ID_DO_PRODUTO na mensagem original. Tem certeza que respondeu à mensagem certa?")
        return
        
    produto_id = match.group(1).strip()
    user_reply = update.message.text.strip()
    
    # Validação simples para ver se parece uma URL
    if not user_reply.startswith("http"):
        await update.message.reply_text("⚠️ O texto enviado não parece conter um link válido. Comece com http:// ou https://")
        return
        
    platform = infer_platform_from_url(user_reply)
    
    msg_status = await update.message.reply_text("⏳ Atualizando link de afiliado no banco de dados...")
    
    # Chama a API do Next.js
    resultado = api.atualizar_link_produto(produto_id, platform, user_reply)
    
    if resultado and resultado.get('success'):
        await msg_status.edit_text(f"✅ Link de Afiliado Atualizado com Sucesso!\nPlataforma reconhecida: <b>{platform}</b>\nProduto ID: <code>{produto_id}</code>", parse_mode='HTML')
    else:
        # Se deu erro, exibe o erro retornado pela API ou mensagem genérica
        erro_msg = resultado.get('error') if resultado else "Erro na comunicação com a API."
        await msg_status.edit_text(f"❌ Falha ao atualizar: {erro_msg}")

async def error_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    print(f'❌ Erro no telegram_listener: {context.error}')

def run_listener():
    print("🤖 Listener do Telegram Afiliado Iniciado! Aguardando respostas (replies)...")
    app = ApplicationBuilder().token(TELEGRAM_BOT_TOKEN).build()

    # Ouve QUALQUER mensagem de texto que não seja comando
    app.add_handler(MessageHandler(filters.TEXT & (~filters.COMMAND), handle_reply))
    app.add_error_handler(error_handler)

    # Inicia o Loop principal mantendo vivo para sempre
    app.run_polling()

if __name__ == '__main__':
    run_listener()
