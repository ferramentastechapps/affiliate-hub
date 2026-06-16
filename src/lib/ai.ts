import { GoogleGenerativeAI } from '@google/generative-ai';
import sharp from 'sharp';

export const SYSTEM_PROMPT = `Você é o redator de um canal de ofertas no Telegram com linguagem casual e bem-humorada, estilo grupo de amigos brasileiros. Seu trabalho é criar duas coisas:

1. Um TÍTULO curto (3 a 6 palavras) em CAIXA ALTA com humor relacionado ao produto — funciona como gancho antes do nome do produto. Deve ser engraçado, direto, e fazer a pessoa querer ler o resto.

2. Um SUBTÍTULO opcional (1 linha) em caixa baixa para complementar o humor quando fizer sentido. Se não agregar, deixar null.

REGRAS DO TÍTULO:
- Sempre em CAIXA ALTA
- Máximo 6 palavras
- Relacionado ao produto de forma criativa ou cômica
- Nunca use "OFERTA", "PROMOÇÃO", "IMPERDÍVEL", "EXCLUSIVO" — soa como propaganda
- Pode ser uma situação, um comportamento humano, um meme, uma observação irônica sobre o produto
- Varie o estilo — não repita a mesma estrutura

EXEMPLOS DE TÍTULO por categoria:
- Barbeador: "VAI FICAR MAIS LISO ainda"
- Meias: "MEIA PORÇÃO 2 conto cada" (pode ter número)
- Aparador de pelos: "LISIN LISIN"
- Whey protein: "1KG NO SACO 💪"
- Celular barato: "CELULAR NO PRECIN 📱"
- Air fryer: "FRITAR SEM CULPA (mentem)"
- Fone bluetooth: "IGNORAR GERAL COM ESTILO"
- Hidratante: "NESSE FRIO É NECESSIDADE"
- Tênis: "OS PÉS MERECEM"
- Smartwatch: "RELÓGIO DE RICO POR POUCO"
- Produto sem graça: "TÁ, MAS TÁ BARATO"

CRITÉRIOS DE SCORE:
- 9-10: desconto acima de 35% + produto conhecido
- 7-8: desconto entre 20-35% ou boa avaliação
- 5-6: desconto abaixo de 20% ou sem histórico
- abaixo de 5: preço normal sem desconto relevante

FORMATO DE SAÍDA — responda APENAS com JSON válido, sem markdown, sem explicação, sem texto fora do objeto:
{
  "titulo": "TÍTULO EM CAIXA ALTA",
  "subtitulo": "complemento em caixa baixa ou null",
  "score": 0-10
}

Nunca mencione que o produto vai ficar numa gaveta ou variações disso. Nunca repita a mesma estrutura de piada duas vezes seguidas — varie a cada mensagem.`;

/**
 * Extrai o tempo sugerido de retry de uma mensagem de erro do Gemini.
 * Se não for especificado, retorna um padrão de 10 segundos.
 */
function extractRetryDelay(errorMessage: string): number {
  const match = errorMessage.match(/retry\s+in\s+(\d+)\s*s/i) ||
                errorMessage.match(/retry\s+in\s+(\d+)\s*seconds/i) ||
                errorMessage.match(/retry\s+after\s+(\d+)\s*s/i) ||
                errorMessage.match(/retry\s+after\s+(\d+)\s*seconds/i) ||
                errorMessage.match(/after\s+(\d+)\s*s/i);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  return 10; // Padrão: 10 segundos
}

/**
 * Executa a chamada para o NVIDIA NIM com o modelo minimaxai/minimax-m3 como fallback.
 */
export async function processProductWithNvidia(
  promptText: string
): Promise<{
  titulo: string | null;
  subtitulo: string | null;
  score: number | null;
  rawJson: string | null;
} | null> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    console.warn('[AI-NVIDIA] NVIDIA_API_KEY não configurada no ambiente.');
    return null;
  }

  // Garante que o cabeçalho Authorization tenha o prefixo "Bearer " sem duplicar
  let authHeader = apiKey.trim();
  if (!authHeader.startsWith('Bearer ')) {
    authHeader = `Bearer ${authHeader}`;
  }

  try {
    console.log(`[AI-NVIDIA] Acionando fallback do NVIDIA NIM (minimaxai/minimax-m3)...`);
    
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'minimaxai/minimax-m3',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: promptText }
        ],
        max_tokens: 512,
        temperature: 0.7,
        top_p: 0.9,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AI-NVIDIA] NVIDIA NIM falhou com status ${response.status}: ${errorText}`);
      return null;
    }

    const data = await response.json();
    const responseText = data.choices?.[0]?.message?.content;
    if (!responseText) {
      console.warn('[AI-NVIDIA] Resposta vazia da NVIDIA NIM.');
      return null;
    }

    const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(cleanedText);

    return {
      titulo: parsedData.titulo || null,
      subtitulo: parsedData.subtitulo || null,
      score: parsedData.score !== undefined ? Number(parsedData.score) : null,
      rawJson: JSON.stringify(parsedData),
    };
  } catch (error: any) {
    console.error('[AI-NVIDIA] Erro durante o processamento do NVIDIA NIM:', error.message || error);
    return null;
  }
}

export async function processProductWithAI(
  productName: string,
  price: number,
  originalPrice?: number | null,
  category?: string
): Promise<{
  titulo: string | null;
  subtitulo: string | null;
  score: number | null;
  rawJson: string | null;
}> {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.warn('[AI] OPENROUTER_API_KEY não configurada no ambiente.');
      return { titulo: null, subtitulo: null, score: null, rawJson: null };
    }

    const promptText = `Nome do produto: ${productName}
Preço atual: R$ ${price}
${originalPrice ? `Preço original: R$ ${originalPrice}` : ''}
Categoria: ${category || 'Diversos'}`;

    console.log(`[AI] Chamando OpenRouter (google/gemini-2.0-flash-001) para analisar: "${productName}"`);
    
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-lite-preview-02-05:free",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: promptText }
        ],
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AI] Erro no OpenRouter para texto: ${response.status} - ${errorText}`);
      return { titulo: null, subtitulo: null, score: null, rawJson: null };
    }

    const data = await response.json();
    const responseText = data?.choices?.[0]?.message?.content;

    if (!responseText) {
      console.warn('[AI] Resposta vazia recebida do OpenRouter.');
      return { titulo: null, subtitulo: null, score: null, rawJson: null };
    }

    const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(cleanedText);
    
    return {
      titulo: parsedData.titulo || null,
      subtitulo: parsedData.subtitulo || null,
      score: parsedData.score !== undefined ? Number(parsedData.score) : null,
      rawJson: JSON.stringify(parsedData),
    };
  } catch (error: any) {
    console.error('[AI] Erro ao processar produto com OpenRouter:', error.message || error);
    return { titulo: null, subtitulo: null, score: null, rawJson: null };
  }
}

export async function enhanceProductImage(
  _imageUrl: string,
  _category: string,
  _productName: string
): Promise<string | null> {
  const openRouterApiKey = process.env.OPENROUTER_API_KEY;
  if (!openRouterApiKey) {
    console.warn('[AI] OPENROUTER_API_KEY não configurada. Pulando a geração de imagem.');
    return null;
  }

  try {
    console.log(`[AI] Gerando imagem ilustrativa com OpenRouter (Seedream-4.5) para o produto: "${_productName}"`);
    
    // 1. Determinar o cenário baseado na categoria
    let promptContext = 'a professional studio background with soft lighting, minimalist, high quality';
    const catLower = _category.toLowerCase();
    
    if (catLower.includes('esporte') || catLower.includes('suplemento')) {
      promptContext = 'placed in a modern luxury home gym with wooden floor and plants, soft natural lighting';
    } else if (catLower.includes('casa') || catLower.includes('eletrodoméstico')) {
      promptContext = 'placed on a modern clean kitchen counter or living room table, elegant interior design';
    } else if (catLower.includes('informática') || catLower.includes('smartphone') || catLower.includes('tv')) {
      promptContext = 'placed on a clean minimalist wooden desk with modern aesthetics, soft lighting';
    } else if (catLower.includes('moda') || catLower.includes('acessório')) {
      promptContext = 'in a minimal fashion studio with soft lighting, premium look';
    } else if (catLower.includes('beleza') || catLower.includes('saúde')) {
      promptContext = 'on a clean bathroom marble vanity, luxury cosmetics environment';
    } else if (catLower.includes('automotivo')) {
      promptContext = 'on a clean well-lit modern garage floor';
    }

    const finalPrompt = `Professional photorealistic product photography of "${_productName}", ${promptContext}. Focus strictly on the product in the center. Highly detailed, 4k resolution, premium lighting. Avoid any extra text, words, or watermarks.`;

    // 2. Chamar a API do OpenRouter (Text-to-Image)
    const payload = {
      model: "bytedance-seed/seedream-4.5",
      prompt: finalPrompt
    };

    const response = await fetch("https://openrouter.ai/api/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openRouterApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AI] Erro na API do OpenRouter: ${response.status} - ${errorText}`);
      return null;
    }

    const data = await response.json();
    const generatedUrl = data?.data?.[0]?.url;
    
    if (!generatedUrl) {
      console.error(`[AI] OpenRouter não retornou a URL da imagem. Resposta:`, JSON.stringify(data));
      return null;
    }

    // 3. Baixar a imagem gerada
    const imgResponse = await fetch(generatedUrl);
    if (!imgResponse.ok) {
      console.error(`[AI] Falha ao baixar a imagem gerada do OpenRouter: ${imgResponse.status}`);
      return null;
    }
    const arrayBuffer = await imgResponse.arrayBuffer();

    // 4. Pós-processamento com Sharp para garantir o formato 3:4 exato
    const resizedBuffer = await sharp(Buffer.from(arrayBuffer))
      .resize({ 
        width: 900, 
        height: 1200, 
        fit: 'cover' // Corta sutilmente as sobras laterais para forçar o aspecto 3x4
      })
      .jpeg({ quality: 90 })
      .toBuffer();

    const base64 = resizedBuffer.toString('base64');
    console.log(`[AI] Imagem gerada e redimensionada com sucesso via OpenRouter!`);
    
    return `data:image/jpeg;base64,${base64}`;

  } catch (error) {
    console.error('[AI] Erro ao gerar imagem com OpenRouter:', error);
    return null;
  }
}


