import os
from dotenv import load_dotenv

load_dotenv()

# Affiliate Hub
AFFILIATE_HUB_URL = os.getenv('AFFILIATE_HUB_URL', 'http://localhost:3000')
AFFILIATE_HUB_API_KEY = os.getenv('AFFILIATE_HUB_API_KEY')

# Telegram
TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
TELEGRAM_CHAT_ID = os.getenv('TELEGRAM_CHAT_ID')         # Chat de aprovação (seu chat privado)
TELEGRAM_PROMO_GROUP_ID = os.getenv('TELEGRAM_PROMO_GROUP_ID')  # Grupo onde publica as promos aprovadas
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

# Configurações de busca
SEARCH_INTERVAL_MINUTES = int(os.getenv('SEARCH_INTERVAL_MINUTES', 30))
MIN_DISCOUNT_PERCENT = int(os.getenv('MIN_DISCOUNT_PERCENT', 20))

# Categorias
CATEGORIES = {
    'mouse': 'Gaming',
    'teclado': 'Gaming',
    'headset': 'Gaming',
    'cadeira': 'Home Office',
    'monitor': 'Setup',
    'webcam': 'Streaming',
    'microfone': 'Streaming',
    'ssd': 'Setup',
    'hd': 'Setup',
}
