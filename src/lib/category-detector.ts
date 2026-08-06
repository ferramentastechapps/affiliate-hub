/**
 * Utilitário de Detecção Inteligente de Categorias
 * Mapeia palavras-chave e nomes de produtos para as categorias oficiais do sistema.
 */

export const CATEGORY_MAP: Record<string, string[]> = {
  "Casa e Eletrodomésticos": [
    // Cozinha & Panelas
    "panela", "panelas", "conjunto de panelas", "jogo de panelas", "frigideira", "caçarola", "fervedor", 
    "assadeira", "fôrma", "pote", "potes", "faqueiro", "talheres", "talher", "copo", "copos", "taça", "taças", 
    "prato", "pratos", "jarra", "garrafa térmica", "abridor", "utensílio", "utensílios", "cozinha",
    "brinox", "tramontina", "rochedo", "le creuset", "polishop", "invicta", "ceraflame", "marmorizado", "indução",
    // Eletrodomésticos & Eletroportáteis
    "air fryer", "airfryer", "fritadeira", "geladeira", "refrigerador", "freezer", "lavadora", "máquina de lavar", 
    "lava e seca", "tanquinho", "micro-ondas", "microondas", "aspirador", "aspirador de pó", "roomba", "ar-condicionado", 
    "ar condicionado", "split", "ventilador", "circulador", "batedeira", "liquidificador", "multiprocessador", 
    "cafeteira", "nespresso", "dolce gusto", "expresso", "tosteira", "torradeira", "grill", "sanduicheira", "cooktop", 
    "fogão", "forno", "forno elétrico", "purificador", "bebedouro", "passadeira", "ferro de passar",
    // Marcas de Eletro
    "mondial", "arno", "britânia", "britania", "philco", "oster", "electrolux", "consul", "brastemp", "walita", 
    "kitchenaid", "midea", "fischer", "suggar", "mueller", "dako", "mueller",
    // Casa, Móveis & Decoração
    "sofá", "sofa", "poltrona", "mesa", "cadeira", "cama", "colchão", "colchao", "travesseiro", "lençol", 
    "edredom", "toalha", "armário", "guarda-roupa", "estante", "rack", "escrivaninha", "lâmpada", "lustre", 
    "luminária", "tapete", "cortina", "quadro", "organizador"
  ],

  "Smartphones e TV": [
    "smartphone", "celular", "iphone", "galaxy", "xiaomi", "motorola", "redmi", "poco", "realme", "asus", "zenfone",
    "tv", "smart tv", "televisão", "televisor", "led", "oled", "qled", "neo qled", "nanocell", "roku tv", "fire tv",
    "câmera", "camera", "gopro", "webcam", "filmadora", "drone",
    "tablet", "ipad", "galaxy tab"
  ],

  "Informática e Games": [
    "notebook", "laptop", "macbook", "pc", "desktop", "computador", "all in one",
    "monitor", "display", "teclado", "mouse", "mousepad", "headset", "microfone", "webcam",
    "ssd", "hd", "memória", "ram", "pendrive", "placa de vídeo", "rtx", "gtx", "radeon", "processador", "ryzen", "intel",
    "playstation", "ps5", "ps4", "xbox", "xbox series", "nintendo", "switch", "console", "controle", "joystick", "game", "jogo",
    "fone", "fones", "headphone", "earphone", "earbud", "airpod", "airpods", "galaxy buds", "redmi airdots",
    "caixa de som", "speaker", "bluetooth speaker", "jbl", "soundbar", "alexa", "echo dot",
    "smartwatch", "relógio inteligente", "apple watch", "galaxy watch", "mi band", "amazfit"
  ],

  "Moda e Acessórios": [
    "tênis", "tenis", "sapato", "calçado", "bota", "sandália", "chinelo", "sapatilha", "mocassim",
    "nike", "adidas", "mizuno", "olympikus", "asics", "puma", "under armour", "skechers", "filas",
    "camiseta", "camisa", "blusa", "moletom", "calça", "calca", "short", "bermuda", "vestido", "saia", "jaqueta", "casaco", "roupa",
    "bolsa", "mochila", "carteira", "cinto", "óculos", "oculos", "relojo", "relógio", "joia", "brinco", "colar"
  ],

  "Saúde e Beleza": [
    "perfume", "fragrância", "colônia", "eau de parfum", "eau de toilette",
    "maquiagem", "base", "batom", "rímel", "máscara de cílios", "corretivo", "pó compacto",
    "creme", "protetor solar", "sérum", "hidratação", "anti-idade", "skincare", "la roche", "vichy", "cerave", "nivea",
    "shampoo", "condicionador", "máscara capilar", "cabelo", "lola cosmetics", "truss", "kérastase",
    "secador", "chapinha", "prancha", "modelador", "escova secadora", "barbeador", "aparador de pelos"
  ],

  "Esporte e Suplementos": [
    "whey", "whey protein", "creatina", "suplemento", "albumina", "bcaa", "pré-treino", "pre treino", "multivitamínico", "integralmedica", "max titanium", "growth",
    "bicicleta", "bike", "capacete ciclista", "halteres", "peso", "anilha", "esteira", "bicicleta ergométrica", "elástico", "bola", "chuteira"
  ],

  "Bebês e Crianças": [
    "bebê", "bebe", "fralda", "pampers", "huggies", "carrinho de bebê", "berço", "cadeirinha", "mamadeira", "chupeta",
    "brinquedo", "lego", "boneca", "carrinho", "jogos infantis"
  ],

  "Supermercado e Delivery": [
    "chocolate", "doce", "bala", "bombom", "biscoito", "bolacha", "snack",
    "café", "chá", "suco", "refrigerante", "água",
    "cerveja", "vinho", "whisky", "vodka", "gin", "bebida",
    "sabão em pó", "amaciante", "detergente", "papel higiênico", "limpeza"
  ],

  "Ferramentas e Jardim": [
    "furadeira", "parafusadeira", "martelo", "alicate", "chave de fenda", "serra", "trena", "makita", "bosch", "dewalt",
    "lavadora de alta pressão", "jardim", "mangueira", "cortador de grama"
  ],

  "Automotivo": [
    "pneu", "pneus", "bateria", "óleo", "oleo", "som automotivo", "central multimídia", "carro", "moto", "capacete"
  ],

  "Pet": [
    "ração", "racao", "pet", "cachorro", "gato", "petisco", "tapete higiênico", "areia sanitária", "coleira"
  ],

  "Livros, eBooks e eReaders": [
    "livro", "livros", "kindle", "e-reader", "ebook", "hq", "manga", "mangá"
  ],

  "Viagem": [
    "mala", "malas", "bagagem", "mochila de viagem", "organizador de mala"
  ]
};

/**
 * Normaliza o nome da categoria vinda de scrapers ou agregadores para as categorias oficiais.
 */
export function normalizeCategoryName(rawCategory?: string | null): string | null {
  if (!rawCategory) return null;
  const lower = rawCategory.toLowerCase().trim();

  // Mapeamentos diretos
  if (lower.includes("panela") || lower.includes("cozinha") || lower.includes("casa") || lower.includes("eletro")) return "Casa e Eletrodomésticos";
  if (lower.includes("smart") || lower.includes("tv") || lower.includes("celular") || lower.includes("telefonia")) return "Smartphones e TV";
  if (lower.includes("informática") || lower.includes("informatica") || lower.includes("game") || lower.includes("pc")) return "Informática e Games";
  if (lower.includes("moda") || lower.includes("vestuário") || lower.includes("calçado")) return "Moda e Acessórios";
  if (lower.includes("bebê") || lower.includes("bebe") || lower.includes("infantil") || lower.includes("brinquedo")) return "Bebês e Crianças";
  if (lower.includes("beleza") || lower.includes("saúde") || lower.includes("perfumaria")) return "Saúde e Beleza";
  if (lower.includes("esporte") || lower.includes("suplemento") || lower.includes("fitness")) return "Esporte e Suplementos";
  if (lower.includes("supermercado") || lower.includes("alimento") || lower.includes("bebida")) return "Supermercado e Delivery";
  if (lower.includes("livro") || lower.includes("ebook")) return "Livros, eBooks e eReaders";
  if (lower.includes("ferramenta") || lower.includes("jardim")) return "Ferramentas e Jardim";
  if (lower.includes("auto") || lower.includes("pneu")) return "Automotivo";
  if (lower.includes("pet")) return "Pet";
  if (lower.includes("viagem") || lower.includes("mala")) return "Viagem";

  return null;
}

/**
 * Detecta a categoria mais precisa analisando o nome do produto, descrição e categoria bruta.
 */
export function detectSmartCategory(productName: string, description?: string, rawCategory?: string): string {
  // 1. Tentar normalizar se a categoria bruta for válida e não-genérica
  if (rawCategory && rawCategory.toLowerCase() !== "diversos" && rawCategory.toLowerCase() !== "outros") {
    const normalized = normalizeCategoryName(rawCategory);
    if (normalized) return normalized;
  }

  // 2. Analisar o texto completo (Nome do produto tem peso priorizado)
  const textToAnalyze = `${productName} ${description || ""}`.toLowerCase().trim();

  // Testar primeiro correspondências exatas/fortes no Nome do Produto
  for (const [officialCategory, keywords] of Object.entries(CATEGORY_MAP)) {
    for (const keyword of keywords) {
      // Regex com bordas para evitar falso positivo em palavras curtas
      const regex = new RegExp(`\\b${keyword}\\b`, "i");
      if (regex.test(textToAnalyze) || textToAnalyze.includes(keyword)) {
        return officialCategory;
      }
    }
  }

  // 3. Se nada bateu, tentar normalizar a categoria bruta se existia
  const fallbackNormalized = normalizeCategoryName(rawCategory);
  if (fallbackNormalized) return fallbackNormalized;

  return "Diversos";
}
