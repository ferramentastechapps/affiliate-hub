"""
Bot Python — utilitários de metadados
Extrai categoria granular, marca e modelo do título do produto de forma automática.
"""

import re
from typing import Optional
from config import CATEGORY_KEYWORDS

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# MAPEAMENTO E EXTRAÇÃO
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Mapeamento de brand → categoria padrão (fallback)
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
    'nike':     'Tênis e Calçados',
    'adidas':   'Tênis e Calçados',
    'puma':     'Tênis e Calçados',
    'vans':     'Tênis e Calçados',
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
    """Normaliza texto para comparação, preservando o 'ç' para evitar colisões (ex: poco vs poço)."""
    if not texto:
        return ""
    import unicodedata
    # Substitui temporariamente ç/Ç por tokens seguros
    texto_temp = texto.replace('ç', '$$C$$').replace('Ç', '$$CC$$')
    nfkd = unicodedata.normalize('NFKD', texto_temp.lower())
    norm = ''.join(c for c in nfkd if not unicodedata.combining(c))
    return norm.replace('$$c$$', 'ç').replace('$$cc$$', 'ç')


def extrair_categoria_granular(titulo: str) -> Optional[str]:
    """
    Tenta detectar a categoria granular do produto com base no título.
    Retorna None se não conseguir identificar.
    """
    titulo_norm = _normalizar(titulo)

    for cat, keywords in CATEGORY_KEYWORDS.items():
        for kw in keywords:
            kw_norm = _normalizar(kw)
            # Usa regex de palavra inteira (\b) para evitar correspondências parciais como "cebola" para "bola"
            if re.search(r'\b' + re.escape(kw_norm) + r'\b', titulo_norm):
                # Se o termo detectado for "jogo", ignorar se for utilidades domésticas, cama, banho ou ferramentas
                if kw_norm == 'jogo':
                    if re.search(r'\bjogo\s+(de|para)\s+(panelas?|toalhas?|banho|cama|lencol|lençol|copos?|pratos?|facas?|chaves?|ferramentas?|soquetes?|brocas?|xicaras?|chicaras?|jantar|cha|chá|sobremesa|tacas|taças|talheres?|lençois|lencois|quarto|cozinha|potes?)', titulo_norm):
                        continue
                return cat

    return None


def extrair_brand(titulo: str) -> Optional[str]:
    """
    Tenta extrair a marca do produto do título.
    Prioriza marcas mais longas para evitar falsos positivos.
    """
    titulo_norm = _normalizar(titulo)

    for brand in sorted(KNOWN_BRANDS, key=len, reverse=True):
        brand_norm = _normalizar(brand)
        # Verifica como palavra isolada
        if re.search(r'\b' + re.escape(brand_norm) + r'\b', titulo_norm):
            return brand

    return None


def extrair_model(titulo: str, brand: Optional[str]) -> Optional[str]:
    """
    Tenta extrair o modelo do produto, removendo a marca e termos genéricos.
    """
    if not brand:
        return None

    # Remover a marca do início do título
    titulo_sem_marca = re.sub(
        r'(?i)\b' + re.escape(brand) + r'\b\s*', '', titulo, count=1
    ).strip()

    # Pegar as primeiras palavras como modelo
    words = titulo_sem_marca.split()
    model_words = []
    for w in words[:6]:
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
    Enriquece um produto com categoria granular, brand e model extraídos do título.
    """
    nome = produto.get('name', '')

    # Tenta descobrir categoria de forma granular pelo título
    cat_granular = extrair_categoria_granular(nome)
    
    # Se não encontrar no título, usa fallback de marca, senão Diversos
    if not cat_granular:
        brand_temp = extrair_brand(nome)
        if brand_temp and brand_temp.lower() in BRAND_DEFAULTS:
            cat_granular = BRAND_DEFAULTS[brand_temp.lower()]
        else:
            cat_granular = 'Diversos'

    # Força a categoria a ser a granular
    produto['category'] = cat_granular
    
    # Como passamos a ter categorias granulares, subcategory fica em branco
    produto['subcategory'] = None

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
        prod = {'name': nome}
        prod = enriquecer_produto(prod)
        print(f'\nNome: {nome[:60]}')
        print(f'  Categoria Granular: {prod.get("category")}')
        print(f'  Brand: {prod.get("brand")}')
        print(f'  Model: {prod.get("model")}')
