// OpenRouter desativado — funções retornam vazio sem chamar a API

export const SYSTEM_PROMPT = ``;

export async function processProductWithAI(
  _productName: string,
  _price: number,
  _originalPrice?: number | null,
  _category?: string
): Promise<{ texto: string | null; score: number | null }> {
  // Desativado: era usado para gerar copy e deal score via OpenRouter
  return { texto: null, score: null };
}

export async function enhanceProductImage(
  _imageUrl: string,
  _category: string,
  _productName: string
): Promise<string | null> {
  // Desativado: era usado para melhorar imagens via OpenRouter (riverflow-v2.5-fast)
  return null;
}
