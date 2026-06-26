export interface NotificationPreferences {
  all?: boolean;
  couponsOnly?: boolean;
  categories?: string[];
}

export interface Subscriber {
  endpoint: string;
  preferences?: any; // Pode ser JSON vindo do Prisma
}

/**
 * Filtra a lista de assinantes com base em suas preferências e nos critérios da oferta.
 * 
 * Ordem de prioridade / Regras:
 * 1. Sem preferências definidas (legado) -> Recebe sempre.
 * 2. `all: true` -> Recebe sempre (override absoluto sobre couponsOnly e categorias).
 * 3. `couponsOnly: true` -> Só recebe se for cupom (criteria.hasCoupon === true).
 * 4. Se não for 'all' e tiver categoria -> Verifica se a categoria está no array do usuário.
 * 5. Se for notificação geral (sem categoria ou cupom associado) -> Recebe sempre (ex: mensagem administrativa).
 */
export function filterSubscribers<T extends Subscriber>(
  subscriptions: T[],
  criteria: { category?: string; categories?: string[]; hasCoupon?: boolean }
): T[] {
  const { category, categories, hasCoupon } = criteria;

  return subscriptions.filter((sub) => {
    // 1. Sem preferências (legado) -> recebe tudo
    if (!sub.preferences) {
      return true;
    }

    const prefs = sub.preferences as NotificationPreferences;

    // 2. Prioridade absoluta: all = true recebe todas as promoções
    if (prefs.all === true) {
      return true;
    }

    // 3. couponsOnly = true -> só recebe se for cupom
    if (prefs.couponsOnly === true) {
      return !!hasCoupon;
    }

    // 4. all = false + categorias específicas
    if (prefs.categories && Array.isArray(prefs.categories)) {
      if (category && prefs.categories.includes(category)) {
        return true;
      }
      if (categories && Array.isArray(categories) && categories.some(cat => prefs.categories!.includes(cat))) {
        return true;
      }
    }

    // 5. Se for push geral do admin (sem produto/categoria/categorias associados),
    // e o usuário não tiver restrição exclusiva de cupons, recebe.
    if (!category && (!categories || categories.length === 0) && !hasCoupon) {
      return true;
    }

    return false;
  });
}
