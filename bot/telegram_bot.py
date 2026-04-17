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
            
            # Enviar foto com legenda
            if produto.get('imageUrl'):
                await self.bot.send_photo(
                    chat_id=self.chat_id,
                    photo=produto['imageUrl'],
                    caption=mensagem,
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
        
        # Link do Promobit para consulta
        link_promobit = ""
        links = produto.get('links', {})
        
        # Pegar o primeiro link disponível como referência do Promobit
        primeiro_link = None
        for plataforma in ['amazon', 'mercadoLivre', 'shopee', 'aliexpress', 'tiktok']:
            if links.get(plataforma):
                primeiro_link = links[plataforma]
                break
        
        if primeiro_link:
            link_promobit = f"🔗 <a href='{primeiro_link}'>Ver no Promobit</a>"
        
        mensagem = f"""
🔥 <b>NOVO PRODUTO ENCONTRADO!</b>
⚠️ <b>AGUARDANDO APROVAÇÃO</b>

📦 <b>{produto['name']}</b>
🏷️ {produto['category']}
{preco}

{link_promobit}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
<b>📋 PARA APROVAR:</b>

1️⃣ Gere seu link de afiliado
2️⃣ Use o comando:

<code>/aprovar {produto.get('id', 'ID')} [SEU_LINK]</code>

<b>Exemplo:</b>
<code>/aprovar {produto.get('id', 'ID')} https://amzn.to/abc123</code>

<b>🚫 Para rejeitar:</b>
<code>/rejeitar {produto.get('id', 'ID')}</code>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
<i>ID_DO_PRODUTO: {produto.get('id', 'N/A')}</i>
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
