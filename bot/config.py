import os
from dotenv import load_dotenv
from pathlib import Path

# Carrega o .env da raiz do projeto (um nível acima da pasta bot/)
_root = Path(__file__).parent.parent
load_dotenv(_root / '.env', encoding='utf-8')
load_dotenv(override=True, encoding='utf-8')  # fallback: .env no diretório atual (sobrescreve se houver conflito)

# Affiliate Hub
AFFILIATE_HUB_URL = os.getenv('AFFILIATE_HUB_URL', 'http://localhost:3000')
AFFILIATE_HUB_API_KEY = os.getenv('AFFILIATE_HUB_API_KEY')
WEBHOOK_SECRET = os.getenv('WEBHOOK_SECRET')

# Telegram
TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
TELEGRAM_CHAT_ID = os.getenv('TELEGRAM_CHAT_ID')         # Chat de aprovação (seu chat privado)
TELEGRAM_PROMO_GROUP_ID = os.getenv('TELEGRAM_PROMO_GROUP_ID')  # Grupo onde publica as promos aprovadas
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY')

# Configurações de busca
SEARCH_INTERVAL_MINUTES = int(os.getenv('SEARCH_INTERVAL_MINUTES', 5))
MIN_DISCOUNT_PERCENT = int(os.getenv('MIN_DISCOUNT_PERCENT', 20))
MIN_QUALITY_SCORE = int(os.getenv('MIN_QUALITY_SCORE', 30))  # Score mínimo para enviar promoção
DEBUG_FILTROS = os.getenv('DEBUG_FILTROS', 'false').lower() == 'true'  # Modo debug para ver tudo

# Categorias Granulares (mesmas do site)
CATEGORIES = [
    'Smartphones', 'Smart TVs', 'Fones de Ouvido', 'Caixas de Som', 'Smartwatches', 'Câmeras', 'Tablets',
    'Notebooks', 'PCs e Desktops', 'Monitores', 'Periféricos', 'SSD, HDs e Memória', 'Consoles e Games',
    'Air Fryers', 'Cafeteiras', 'Geladeiras e Freezers', 'Lavadoras', 'Micro-ondas', 'Aspiradores', 'Ar Condicionado',
    'Tênis e Calçados', 'Roupas e Moda', 'Bolsas e Acessórios', 'Perfumes', 'Maquiagem e Pele', 'Shampoo e Cabelo',
    'Whey e Suplementos', 'Bicicletas e Esporte', 'Chocolates e Doces', 'Café e Bebidas', 'Cervejas e Vinhos',
    'Livros e eReaders', 'Bebês e Crianças', 'Pet', 'Ferramentas', 'Automotivo', 'Viagem', 'Diversos'
]

# Mapeamento de palavras-chave para detecção automática (Granular)
CATEGORY_KEYWORDS = {
    'Smartphones': ['smartphone', 'celular', 'iphone', 'galaxy', 'motorola', 'poco', 'xiaomi'],
    'Smart TVs': ['tv', 'televisao', 'televisor', 'smart tv', 'oled', 'qled'],
    'Fones de Ouvido': ['fone', 'earphone', 'headphone', 'headset', 'airpods', 'buds'],
    'Caixas de Som': ['caixa de som', 'speaker', 'jbl', 'soundbar', 'alexa', 'echo dot'],
    'Smartwatches': ['smartwatch', 'apple watch', 'galaxy watch', 'mi band', 'relogio inteligente'],
    'Câmeras': ['camera', 'gopro', 'dslr', 'lente'],
    'Tablets': ['tablet', 'ipad', 'galaxy tab'],
    'Notebooks': ['notebook', 'laptop', 'macbook'],
    'PCs e Desktops': ['computador', 'desktop', 'pc gamer', 'imac'],
    'Monitores': ['monitor', 'tela'],
    'Periféricos': ['teclado', 'mouse', 'mousepad', 'webcam', 'impressora'],
    'SSD, HDs e Memória': ['ssd', 'hd', 'pendrive', 'memoria ram', 'cartao de memoria'],
    'Consoles e Games': ['game', 'console', 'playstation', 'xbox', 'nintendo', 'ps4', 'ps5', 'jogo'],
    'Air Fryers': ['airfryer', 'air fryer', 'fritadeira'],
    'Cafeteiras': ['cafeteira', 'nespresso', 'dolce gusto', 'tres coracoes'],
    'Geladeiras e Freezers': ['geladeira', 'refrigerador', 'freezer', 'frigobar'],
    'Lavadoras': ['lavadora', 'lava e seca', 'tanquinho'],
    'Micro-ondas': ['microondas', 'micro-ondas'],
    'Aspiradores': ['aspirador', 'robo aspirador', 'robô aspirador'],
    'Ar Condicionado': ['ar condicionado', 'ventilador', 'climatizador'],
    'Tênis e Calçados': ['tenis', 'sapato', 'sandalia', 'chinelo', 'bota', 'chuteira'],
    'Roupas e Moda': ['camiseta', 'camisa', 'calca', 'jaqueta', 'casaco', 'vestido', 'bermuda', 'cueca', 'meia'],
    'Bolsas e Acessórios': ['bolsa', 'mochila', 'mala', 'oculos', 'relogio', 'carteira', 'bone', 'cinto'],
    'Perfumes': ['perfume', 'eau de parfum', 'eau de toilette', 'fragrancia', 'colonia'],
    'Maquiagem e Pele': ['maquiagem', 'base', 'batom', 'rimel', 'protetor solar', 'skincare', 'hidratante rosto', 'creme anti-idade'],
    'Shampoo e Cabelo': ['shampoo', 'condicionador', 'mascara capilar', 'secador', 'chapinha', 'creme de pentear', 'progressiva'],
    'Whey e Suplementos': ['whey', 'creatina', 'bcaa', 'pre-treino', 'omega 3', 'vitamina'],
    'Bicicletas e Esporte': ['bicicleta', 'esteira', 'haltere', 'bola', 'raquete', 'kimono', 'barraca'],
    'Chocolates e Doces': ['chocolate', 'bombom', 'biscoito', 'bala', 'nutella'],
    'Café e Bebidas': ['cafe', 'capsula', 'energetico', 'refrigerante', 'suco', 'cha'],
    'Cervejas e Vinhos': ['cerveja', 'vinho', 'vodka', 'gin', 'whisky', 'licor', 'espumante'],
    'Livros e eReaders': ['livro', 'ebook', 'kindle', 'vade mecum', 'box livros'],
    'Bebês e Crianças': ['bebe', 'infantil', 'brinquedo', 'fralda', 'carrinho de bebe', 'chupeta', 'cadeirinha', 'berco', 'leite em po', 'formula infantil'],
    'Pet': ['racao', 'coleira', 'petshop', 'cachorro', 'gato', 'areia', 'tapete higienico', 'arranhador'],
    'Ferramentas': ['furadeira', 'parafusadeira', 'ferramenta', 'mangueira', 'serra', 'trena', 'esmerilhadeira', 'kit ferramentas'],
    'Automotivo': ['pneu', 'carro', 'moto', 'automotivo', 'oleo motor', 'capacete', 'som automotivo', 'bateria moura'],
    'Viagem': ['passagem', 'hotel', 'mala de viagem'],
    'Diversos': [],
}

