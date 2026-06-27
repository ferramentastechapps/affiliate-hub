export interface NotificationPreferences {
  all?: boolean;
  couponsOnly?: boolean;
  categories?: string[];
  customInterests?: string[]; // Interesses personalizados em formato de palavras-chave
}

export interface Subscriber {
  endpoint: string;
  preferences?: any; // Pode ser JSON vindo do Prisma
}

/**
 * Normaliza uma string removendo caixa alta e acentuações (ex: "Tênis Nike" -> "tenis nike").
 */
function normalizeString(str: string): string {
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Valida se uma palavra-chave está presente no nome do produto de forma segura:
 * - Se a palavra-chave contém espaços (ex: "iphone 15 pro"), faz uma verificação de substring comum.
 * - Se for uma palavra única (ex: "fone"), divide o produto por tokens não-alfanuméricos e busca correspondência exata.
 * - Evita falso positivo como "fone" dando correspondência em "iphone".
 */
export function matchKeyword(productName: string, keyword: string): boolean {
  if (!productName || !keyword) return false;
  
  const normProduct = normalizeString(productName);
  const normKeyword = normalizeString(keyword);

  // Se a palavra-chave contém múltiplas palavras, faz check de substring
  if (normKeyword.includes(' ')) {
    return normProduct.includes(normKeyword);
  }

  // Se for palavra única, dividimos por qualquer caractere não-alfanumérico e fazemos a comparação exata
  const tokens = normProduct.split(/[^a-z0-9]+/);
  return tokens.includes(normKeyword);
}

/**
 * Filtra a lista de assinantes com base em suas preferências e nos critérios da oferta.
 * 
 * Ordem completa e sequencial de regras:
 * 1. Regra 1: Sem preferências definidas (legado) -> Recebe sempre.
 * 2. Regra 2: All (all === true) -> Recebe sempre (override absoluto sobre cupons e categorias).
 * 3. Regra 3 (Alerta de Palavras-Chave): tem prioridade sobre couponsOnly (Regra 4) de forma intencional.
 *    Um interesse explícito por palavra-chave é um sinal mais forte que a preferência geral de "só cupons" —
 *    se o usuário diz que quer saber de "iphone", ele recebe o alerta mesmo sem cupom associado.
 * 4. Regra 4: Coupons Only (couponsOnly === true) -> Só recebe se for cupom (hasCoupon === true).
 * 5. Regra 5: Categorias Específicas -> Verifica se a categoria do produto está no array de categorias do assinante.
 * 6. Regra 6: Fallback Geral (Disparos manuais/alertas sem produto/categoria/cupom) ->
 *    Recebe se não tiver restrição exclusiva de cupons (couponsOnly !== true).
 */
export function filterSubscribers<T extends Subscriber>(
  subscriptions: T[],
  criteria: { category?: string; categories?: string[]; productName?: string; hasCoupon?: boolean }
): T[] {
  const { category, categories, productName, hasCoupon } = criteria;

  return subscriptions.filter((sub) => {
    // Regra 1: Sem preferências definidas (legado) -> Recebe sempre.
    if (!sub.preferences) {
      return true;
    }

    const prefs = sub.preferences as NotificationPreferences;

    // Regra 2: All (all === true) -> Recebe sempre (override absoluto).
    if (prefs.all) {
      return true;
    }

    // Regra 3 (Alerta de Palavras-Chave): tem prioridade sobre couponsOnly (Regra 4) de forma intencional.
    // Um interesse explícito por palavra-chave é um sinal mais forte que a preferência geral de "só cupons" —
    // se o usuário diz que quer saber de "iphone", ele recebe o alerta mesmo sem cupom associado.
    if (productName && prefs.customInterests && Array.isArray(prefs.customInterests)) {
      const hasKeywordMatch = prefs.customInterests.some((interest) =>
        matchKeyword(productName, interest)
      );
      if (hasKeywordMatch) {
        return true;
      }
    }

    // Regra 4: Coupons Only (couponsOnly === true) -> Só recebe se for cupom (hasCoupon === true).
    if (prefs.couponsOnly) {
      return !!hasCoupon;
    }

    // Regra 5: Categorias Específicas -> Verifica se a categoria está no array de categorias do assinante.
    if (prefs.categories && Array.isArray(prefs.categories)) {
      if (category && prefs.categories.includes(category)) {
        return true;
      }
      if (categories && Array.isArray(categories) && categories.some(cat => prefs.categories!.includes(cat))) {
        return true;
      }
    }

    // Regra 6: Fallback Geral (Disparos sem categoria, lista de categorias ou cupom associados) ->
    // Recebe sempre se o assinante não tiver restrição exclusiva de cupons.
    if (!category && (!categories || categories.length === 0) && !hasCoupon) {
      return !prefs.couponsOnly;
    }

    return false;
  });
}
