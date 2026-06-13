export const SYSTEM_PROMPT = `Você é o redator do canal de ofertas "Ftech Ofertas". Seu trabalho é
transformar dados de produtos em promoção em mensagens curtas, divertidas
e informais — como se fosse um amigo mandando um achado no grupo, NUNCA
como um anúncio publicitário tradicional.

REGRAS DE TOM:
- Use humor, gírias, expressões do dia a dia brasileiro, memes leves.
- Pode usar emojis, mas sem exagero (2-4 por mensagem).
- Evite palavras tipo "promoção imperdível", "oferta exclusiva",
  "aproveite agora" — isso soa vendedor e mata a credibilidade.
- A pessoa precisa ler e pensar "rapaz, vou comprar" sem perceber que
  é "marketing".
- Pode brincar com o próprio produto, com o preço, com a urgência, de
  forma natural (tipo zoando a própria carteira).
- Mensagens curtas: 2 a 4 linhas no máximo.
- Sempre inclua: nome do produto, preço atual, e se houver desconto
  real, mencione de forma natural.
- Termine com o link de forma discreta, sem call-to-action forçado.

FORMATO DE SAÍDA OBRIGATÓRIO (APENAS JSON VÁLIDO):
{
  "texto": "mensagem formatada pronta pra postar",
  "score": numero de 0 a 10 (ex: 8.5)
}

EXEMPLOS DE TOM:
"esse fone aqui tava R$199, foi pra R$129 e eu já tô achando
desculpa pra comprar mesmo já tendo 3 em casa 🎧
[link]"

"carregador de R$45 que carrega o celular mais rápido que
você decide o que vai comer hj
[link]"

"mochila boa, com avaliação boa, preço justo. eu sei, sem
graça, mas tinha que avisar
[link]"

Crie variações — não repita as mesmas piadas/estruturas toda vez.`;

export async function processProductWithAI(productName: string, price: number, originalPrice?: number | null, category?: string) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.warn("⚠️ OPENROUTER_API_KEY não configurada. IA ignorada.");
    return { texto: null, score: null };
  }

  let prompt = `Analise esta oferta:\nProduto: ${productName}\nPreço Atual: R$ ${price}`;
  if (originalPrice) prompt += `\nPreço Original (Sem desconto): R$ ${originalPrice}`;
  if (category) prompt += `\nCategoria: ${category}`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        response_format: { type: "json_object" },
        max_tokens: 1000,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt }
        ]
      })
    });

    if (!response.ok) {
      console.error(`Erro na API OpenRouter (HTTP ${response.status}):`, await response.text());
      return { texto: null, score: null };
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || "";
    const cleanContent = content.replace(/```json/g, "").replace(/```/g, "").trim();
    
    const parsed = JSON.parse(cleanContent);
    return {
      texto: parsed.texto || null,
      score: typeof parsed.score === 'number' ? parsed.score : null
    };
  } catch (error) {
    console.error("Erro ao chamar IA:", error);
    return { texto: null, score: null };
  }
}

export async function enhanceProductImage(imageUrl: string, category: string, productName: string): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.warn("⚠️ OPENROUTER_API_KEY não configurada. Enhance ignorado.");
    return null;
  }

  // Se a imagem for um placeholder, evitamos gastar créditos.
  if (imageUrl.includes('placeholder')) {
    return null;
  }

  const prompt = `Por favor, remova o fundo da imagem original deste produto ("${productName}", Categoria: ${category}) e substitua por um fundo limpo, moderno e atraente (estilo e-commerce premium) que combine perfeitamente com o produto. Retorne APENAS a URL da imagem gerada.`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image-preview", // Mudado a pedido do usuário
        modalities: ["image", "text"],
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: imageUrl } }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      console.error(`Erro no Enhance Image (HTTP ${response.status}):`, await response.text());
      return null;
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || "";
    
    // O modelo pode retornar um markdown ![alt](url) ou apenas a URL
    const urlMatch = content.match(/https?:\/\/[^\s)\]]+/);
    if (urlMatch && urlMatch[0]) {
      return urlMatch[0]; // Retorna a URL da imagem melhorada
    }

    // Se ele retornou Base64 markdown
    const base64Match = content.match(/data:image\/[a-zA-Z]*;base64,[^\s)\]]+/);
    if (base64Match && base64Match[0]) {
       return base64Match[0];
    }

    console.warn("Nenhuma URL ou Base64 válido encontrado na resposta do Enhance:", content);
    return null;

  } catch (error) {
    console.error("Erro fatal ao tentar melhorar imagem via OpenRouter:", error);
    return null;
  }
}
