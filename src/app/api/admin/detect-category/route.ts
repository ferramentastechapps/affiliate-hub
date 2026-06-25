import { NextRequest, NextResponse } from "next/server";

// Mapas de palavras-chave para categorias
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Smartphones": ["smartphone", "celular", "iphone", "galaxy", "xiaomi", "motorola", "redmi", "poco"],
  "Smart TVs": ["tv", "smart tv", "televisão", "televisor", "led", "oled", "qled"],
  "Fones de Ouvido": ["fone", "headphone", "earphone", "earbud", "airpod", "headset"],
  "Caixas de Som": ["caixa de som", "speaker", "bluetooth speaker", "jbl", "soundbar"],
  "Smartwatches": ["smartwatch", "relógio inteligente", "apple watch", "galaxy watch"],
  "Câmeras": ["câmera", "camera", "gopro", "webcam", "filmadora"],
  "Tablets": ["tablet", "ipad"],
  "Notebooks": ["notebook", "laptop", "macbook"],
  "PCs e Desktops": ["pc", "desktop", "computador"],
  "Monitores": ["monitor", "display"],
  "Periféricos": ["teclado", "mouse", "mousepad", "webcam", "microfone"],
  "SSD, HDs e Memória": ["ssd", "hd", "memória", "ram", "pendrive"],
  "Consoles e Games": ["playstation", "xbox", "nintendo", "switch", "ps5", "ps4", "console", "controle", "joystick", "jogo"],
  "Air Fryers": ["air fryer", "airfryer", "fritadeira"],
  "Cafeteiras": ["cafeteira", "nespresso", "expresso"],
  "Geladeiras e Freezers": ["geladeira", "refrigerador", "freezer"],
  "Lavadoras": ["lavadora", "máquina de lavar"],
  "Micro-ondas": ["micro-ondas", "microondas"],
  "Aspiradores": ["aspirador", "roomba", "aspirador de pó"],
  "Ar Condicionado": ["ar condicionado", "ar-condicionado", "split"],
  "Tênis e Calçados": ["tênis", "sapato", "calçado", "bota", "sandália", "chinelo", "nike", "adidas", "mizuno", "olympikus"],
  "Roupas e Moda": ["camiseta", "camisa", "blusa", "calça", "short", "vestido", "jaqueta", "casaco", "roupa"],
  "Bolsas e Acessórios": ["bolsa", "mochila", "carteira", "cinto", "óculos"],
  "Perfumes": ["perfume", "fragrância", "colônia", "eau de parfum"],
  "Maquiagem e Pele": ["maquiagem", "base", "batom", "máscara", "creme", "protetor solar", "sérum"],
  "Shampoo e Cabelo": ["shampoo", "condicionador", "máscara capilar", "cabelo"],
  "Whey e Suplementos": ["whey", "protein", "creatina", "suplemento", "albumina", "bcaa"],
  "Bicicletas e Esporte": ["bicicleta", "bike", "halteres", "esteira", "prancha"],
  "Chocolates e Doces": ["chocolate", "doce", "bala", "bombom"],
  "Café e Bebidas": ["café", "chá", "bebida"],
  "Cervejas e Vinhos": ["cerveja", "vinho", "whisky", "vodka"],
  "Livros e eReaders": ["livro", "kindle", "e-reader", "ebook"],
  "Bebês e Crianças": ["bebê", "fralda", "carrinho", "berço", "brinquedo"],
  "Pet": ["ração", "pet", "cachorro", "gato", "animal"],
  "Ferramentas": ["furadeira", "parafusadeira", "martelo", "ferramenta"],
  "Automotivo": ["pneu", "bateria", "óleo", "carro", "moto"],
  "Viagem": ["mala", "bagagem", "viagem"],
};

function detectCategoryFromText(text: string): string {
  const normalizedText = text.toLowerCase().trim();
  
  // Procura por palavras-chave em cada categoria
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (normalizedText.includes(keyword.toLowerCase())) {
        return category;
      }
    }
  }
  
  return "Diversos";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productName, description = "", url = "" } = body;

    if (!productName) {
      return NextResponse.json({ error: "Nome do produto é obrigatório" }, { status: 400 });
    }

    // Concatena todos os textos disponíveis para análise
    const fullText = `${productName} ${description} ${url}`;
    
    // Detecta a categoria
    const detectedCategory = detectCategoryFromText(fullText);

    return NextResponse.json({ 
      category: detectedCategory,
      confidence: detectedCategory === "Diversos" ? "low" : "high"
    });
  } catch (error) {
    console.error("Erro ao detectar categoria:", error);
    return NextResponse.json({ error: "Erro interno ao detectar categoria" }, { status: 500 });
  }
}
