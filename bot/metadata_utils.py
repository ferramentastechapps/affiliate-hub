"""
Bot Python — utilitários de metadados
Extrai subcategoria, marca e modelo do título do produto de forma automática.
"""

import re
from typing import Optional

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# MAPEAMENTO DE SUBCATEGORIAS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SUBCATEGORY_KEYWORDS: dict[str, list[str]] = {
    # Smartphones e TV
    'Smartphones':    ['iphone', 'samsung galaxy', 'xiaomi', 'motorola moto', 'poco', 'redmi', 'oneplus', 'smartphone', 'celular', 'android phone'],
    'Tablets':        ['ipad', 'tablet', 'kindle fire', 'galaxy tab'],
    'Smart TVs':      ['smart tv', 'qled', 'oled tv', 'neo qled', '4k tv', 'televisão', 'televisao'],
    'Fones de Ouvido':['airpods', 'fone de ouvido', 'headphone', 'earbuds', 'tws', 'headset wireless', 'fone bluetooth'],
    'Caixas de Som':  ['caixa de som', 'soundbar', 'alto-falante', 'speaker bluetooth', 'jbl', 'bose speaker'],
    'Smartwatches':   ['smartwatch', 'apple watch', 'galaxy watch', 'relógio inteligente', 'relogio inteligente'],
    'Câmeras':        ['câmera digital', 'camera digital', 'mirrorless', 'dslr', 'action cam', 'gopro', 'webcam'],

    # Informática e Games
    'Notebooks':      ['notebook', 'laptop', 'macbook', 'ultrabook', 'chromebook'],
    'Desktops':       ['desktop', 'computador', 'pc gamer', 'mini pc'],
    'Monitores':      ['monitor', 'tela led', 'display gamer'],
    'Teclados':       ['teclado', 'keyboard', 'teclado mecânico', 'teclado mecanico'],
    'Mouses':         ['mouse', 'mouse gamer', 'mouse sem fio'],
    'SSDs e HDs':     ['ssd', 'hd externo', 'pendrive', 'memória usb', 'memoria usb', 'disco rígido', 'nvme'],
    'Memória RAM':    ['memória ram', 'memoria ram', 'ddr4', 'ddr5'],
    'Placas de Vídeo':['placa de vídeo', 'placa de video', 'gpu', 'rtx', 'radeon', 'geforce'],
    'Consoles':       ['playstation', 'ps5', 'ps4', 'xbox series', 'nintendo switch'],
    'Jogos':          ['jogo ', 'game ', 'fifa ', 'call of duty', 'gta', 'minecraft'],

    # Casa e Eletrodomésticos
    'Geladeiras':     ['geladeira', 'refrigerador', 'frigobar'],
    'Fogões':         ['fogão', 'fogao', 'cooktop', 'forno'],
    'Micro-ondas':    ['micro-ondas', 'microondas', 'forno micro'],
    'Air Fryers':     ['air fryer', 'fritadeira elétrica', 'fritadeira eletrica'],
    'Aspiradores':    ['aspirador', 'robô aspirador', 'robo aspirador', 'roomba'],
    'Cafeteiras':     ['cafeteira', 'nespresso', 'dolce gusto', 'expresso'],
    'Lavadoras':      ['lavadora', 'máquina de lavar', 'maquina de lavar', 'lava e seca'],
    'Ar Condicionado':['ar condicionado', 'split', 'janeleiro', 'inverter'],

    # Moda e Acessórios
    'Tênis':          ['tênis', 'tenis', 'sneaker', 'nike', 'adidas', 'puma', 'vans', 'converse'],
    'Óculos':         ['óculos', 'oculos', 'ray-ban', 'oakley', 'óculos de sol'],
    'Relógios':       ['relógio', 'relogio', 'casio', 'orient', 'seiko'],
    'Bolsas':         ['bolsa', 'mochila', 'carteira', 'pochete'],

    # Saúde e Beleza
    'Maquiagem':      ['batom', 'base maquiagem', 'blush', 'contorno', 'paleta de sombra'],
    'Cuidados com a Pele': ['hidratante', 'sérum', 'serum facial', 'protetor solar'],
    'Shampoo e Condicionador': ['shampoo', 'condicionador', 'máscara capilar', 'mascara capilar'],
    'Perfumes':       ['perfume', 'eau de parfum', 'colônia', 'colonia', 'deo parfum'],

    # Esporte e Suplementos
    'Whey Protein':   ['whey protein', 'whey isolado', 'proteína', 'proteina'],
    'Creatina':       ['creatina', 'creatine'],
    'BCAA':           ['bcaa', 'aminoácido', 'aminoacido'],
    'Bicicletas':     ['bicicleta', 'bike', 'mountain bike', 'speed'],

    # Supermercado e Delivery
    'Chocolates':     ['chocolate', 'bombom', 'kit kat', 'bis '],
    'Café':           ['café', 'cafe ', 'nescafé', 'pilão', 'melitta'],
    'Cervejas':       ['cerveja', 'beer', 'heineken', 'skol', 'brahma', 'corona'],
    'Vinhos':         ['vinho', 'wine', 'rosé', 'espumante', 'prosecco'],
}

# Mapeamento de brand → subcategoria padrão
BRAND_DEFAULTS: dict[str, str] = {
    'apple':    'Smartphones',
    'samsung':  'Smartphones',
    'xiaomi':   'Smartphones',
    'motorola': 'Smartphones',
    'realme':   'Smartphones',
    'oppo':     'Smartphones',
    'oneplus':  'Smartphones',
    'poco':     'Smartphones',
    'dell':     'Notebooks',
    'lenovo':   'Notebooks',
    'hp':       'Notebooks',
    'asus':     'Notebooks',
    'acer':     'Notebooks',
    'lg':       'Smart TVs',
    'sony':     'Smart TVs',
    'tcl':      'Smart TVs',
    'philips':  'Smart TVs',
    'nike':     'Tênis',
    'adidas':   'Tênis',
    'puma':     'Tênis',
    'vans':     'Tênis',
}

# Marcas conhecidas para extração do título (ordem importa: mais longas primeiro)
KNOWN_BRANDS: list[str] = [
    'Apple', 'Samsung', 'Xiaomi', 'Motorola', 'Realme', 'OPPO', 'OnePlus', 'POCO', 'Redmi',
    'Dell', 'Lenovo', 'HP', 'Asus', 'Acer', 'LG', 'Sony', 'TCL', 'Philips', 'Panasonic',
    'JBL', 'Bose', 'Sony', 'Multilaser', 'Intelbras',
    'Nike', 'Adidas', 'Puma', 'Vans', 'Converse', 'Fila', 'Under Armour', 'Mizuno', 'Asics',
    'Electrolux', 'Braun', 'Philco', 'Consul', 'Whirlpool', 'Midea', 'Mondial',
    'Nespresso', 'Dolce Gusto', 'Tramontina', 'Arno',
    'Ray-Ban', 'Oakley', 'Casio', 'Orient', 'Seiko', 'Festina',
    'Nestlé', 'Nescafé', 'Heineken', 'Skol', 'Brahma', 'Corona', 'Stella Artois',
]


def _normalizar(texto: str) -> str:
    """Normaliza texto para comparação."""
    import unicodedata
    nfkd = unicodedata.normalize('NFKD', texto.lower())
    return ''.join(c for c in nfkd if not unicodedata.combining(c))


def extrair_subcategoria(titulo: str, categoria: str) -> Optional[str]:
    """
    Tenta detectar a subcategoria do produto com base no título e categoria.
    Retorna None se não conseguir identificar.
    """
    titulo_norm = _normalizar(titulo)

    for subcat, keywords in SUBCATEGORY_KEYWORDS.items():
        for kw in keywords:
            if _normalizar(kw) in titulo_norm:
                return subcat

    return None


def extrair_brand(titulo: str) -> Optional[str]:
    """
    Tenta extrair a marca do produto do título.
    Prioriza marcas mais longas para evitar falsos positivos (ex: 'HP' dentro de 'Shopee').
    """
    titulo_norm = _normalizar(titulo)

    for brand in sorted(KNOWN_BRANDS, key=len, reverse=True):
        brand_norm = _normalizar(brand)
        # Verifica como palavra isolada (evita 'sony' dentro de 'sony headphones' ser pego 2x)
        if re.search(r'\b' + re.escape(brand_norm) + r'\b', titulo_norm):
            return brand

    return None


def extrair_model(titulo: str, brand: Optional[str]) -> Optional[str]:
    """
    Tenta extrair o modelo do produto, removendo a marca e termos genéricos.
    Ex: 'Smartphone Samsung Galaxy S24 Ultra 256GB' → 'Galaxy S24 Ultra'
    """
    if not brand:
        return None

    # Remover a marca do início do título
    titulo_sem_marca = re.sub(
        r'(?i)\b' + re.escape(brand) + r'\b\s*', '', titulo, count=1
    ).strip()

    # Pegar as primeiras 3-5 palavras como modelo (heurística)
    words = titulo_sem_marca.split()
    model_words = []
    for w in words[:6]:
        # Parar em termos genéricos de especificação
        if re.match(r'^\d+(gb|tb|mb|hz|mp|w|pol|"|\')$', w.lower()):
            break
        if w.lower() in {'preto', 'branco', 'azul', 'verde', 'vermelho', 'dourado',
                         'grafite', 'titanio', 'titânio', 'prata', 'roxo', 'rose',
                         'with', 'com', 'e', '&', '+', 'de', 'do', 'da'}:
            break
        model_words.append(w)
        if len(model_words) >= 4:
            break

    model = ' '.join(model_words).strip()
    return model if model and model.lower() != brand.lower() else None


def enriquecer_produto(produto: dict) -> dict:
    """
    Enriquece um produto com subcategoria, brand e model extraídos do título.
    Não sobrescreve valores já preenchidos.
    """
    nome = produto.get('name', '')
    categoria = produto.get('category', '')

    # Só extrai se não estiver preenchido
    if not produto.get('subcategory'):
        produto['subcategory'] = extrair_subcategoria(nome, categoria)

    if not produto.get('brand'):
        produto['brand'] = extrair_brand(nome)

    if not produto.get('model'):
        produto['model'] = extrair_model(nome, produto.get('brand'))

    # Gerar externalId padronizado se tiver platformProductId
    if produto.get('platformProductId') and produto.get('links'):
        plataforma = next(iter(produto['links'].keys()), 'unknown')
        if not produto.get('externalId'):
            produto['externalId'] = f"{plataforma}_{produto['platformProductId']}"

    return produto


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Teste rápido (execute: python3 metadata_utils.py)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
if __name__ == '__main__':
    testes = [
        'Smartphone Samsung Galaxy S24 Ultra 256GB Titânio 12GB RAM',
        'iPhone 15 Pro Max 512GB Natural Titanium Apple',
        'Notebook Dell Inspiron 15 Intel Core i5 16GB 512GB SSD',
        'Air Fryer Mondial 4L Digital AF-40 Família Preta',
        'Tênis Nike Air Max 270 Masculino Preto e Branco',
        'Whey Protein Isolado Growth 1,8kg Baunilha',
        'JBL Flip 6 Caixa de Som Bluetooth Portátil À Prova D\'água',
        'AirPods Pro 2ª Geração com Estojo de Carregamento MagSafe',
    ]

    for nome in testes:
        subcategoria = extrair_subcategoria(nome, '')
        brand = extrair_brand(nome)
        model = extrair_model(nome, brand)
        print(f'\nNome: {nome[:60]}')
        print(f'  Subcategoria: {subcategoria}')
        print(f'  Brand: {brand}')
        print(f'  Model: {model}')
