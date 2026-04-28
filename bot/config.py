import os
from dotenv import load_dotenv
from pathlib import Path

# Carrega o .env da raiz do projeto (um nível acima da pasta bot/)
_root = Path(__file__).parent.parent
load_dotenv(_root / '.env')
load_dotenv(override=True)  # fallback: .env no diretório atual (sobrescreve se houver conflito)

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

# Categorias (mesmas do site)
CATEGORIES = [
    'Smartphones e TV',
    'Informática e Games',
    'Casa e Eletrodomésticos',
    'Moda e Acessórios',
    'Bebês e Crianças',
    'Saúde e Beleza',
    'Esporte e Suplementos',
    'Supermercado e Delivery',
    'Livros, eBooks e eReaders',
    'Ferramentas e Jardim',
    'Automotivo',
    'Pet',
    'Viagem',
    'Diversos',
]

# Mapeamento de palavras-chave para categorias (para detecção automática)
CATEGORY_KEYWORDS = {
    'Smartphones e TV': ['smartphone', 'celular', 'iphone', 'tv', 'televisao', 'fone', 'earphone', 'smartwatch'],
    'Informática e Games': ['notebook', 'computador', 'teclado', 'mouse', 'monitor', 'ssd', 'hd', 'game', 'console', 'playstation', 'xbox'],
    'Casa e Eletrodomésticos': ['geladeira', 'fogao', 'microondas', 'airfryer', 'aspirador', 'sofa', 'colchao'],
    'Moda e Acessórios': ['camiseta', 'calca', 'tenis', 'sapato', 'bolsa', 'oculos', 'relogio'],
    'Bebês e Crianças': ['bebe', 'infantil', 'brinquedo', 'fraldas', 'carrinho'],
    'Saúde e Beleza': ['perfume', 'shampoo', 'creme', 'maquiagem', 'protetor solar'],
    'Esporte e Suplementos': ['whey', 'creatina', 'bcaa', 'bicicleta', 'esteira', 'haltere'],
    'Supermercado e Delivery': ['chocolate', 'cafe', 'cerveja', 'vinho', 'arroz', 'leite'],
    'Livros, eBooks e eReaders': ['livro', 'ebook', 'kindle', 'revista'],
    'Ferramentas e Jardim': ['furadeira', 'parafusadeira', 'ferramenta', 'mangueira'],
    'Automotivo': ['pneu', 'carro', 'moto', 'automotivo'],
    'Pet': ['racao', 'coleira', 'petshop', 'cachorro', 'gato'],
    'Viagem': ['passagem', 'hotel', 'mala', 'viagem'],
    'Diversos': [],
}
