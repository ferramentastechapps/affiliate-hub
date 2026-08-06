/**
 * Algoritmo de cálculo de temperatura da oferta (Hotness Score / °🔥)
 * Inspiração: Pelando, Pepper.com, Slickdeals
 */

export interface ProductTemperatureInput {
  price: number | null;
  originalPrice: number | null;
  likesCount?: number;
  dislikesCount?: number;
  clicksCount?: number;
  hasCoupon?: boolean;
  isLowestPriceEver?: boolean;
  createdAt?: string | Date;
}

export interface DealTemperatureResult {
  temperature: number; // Temperatura em graus (ex: 450)
  formattedTemperature: string; // "450°"
  label: string; // "Normal", "Quente", "Pegando Fogo", "Super Oferta"
  gradientClass: string; // Classe CSS do gradiente
  textColorClass: string; // Classe CSS da cor do texto
  badgeBgClass: string; // Classe de fundo do badge
}

export function calculateDealTemperature(product: ProductTemperatureInput): DealTemperatureResult {
  const price = product.price || 0;
  const originalPrice = product.originalPrice || 0;
  const likes = product.likesCount || 0;
  const dislikes = product.dislikesCount || 0;
  const clicks = product.clicksCount || 0;

  // Base inicial: 100°
  let temp = 100;

  // 1. Fator Desconto %
  if (originalPrice > price && price > 0) {
    const discountPercent = ((originalPrice - price) / originalPrice) * 100;
    // Até 80% adicionais dependendo do desconto (ex: 50% de desconto adiciona 250°)
    temp += discountPercent * 5;
  }

  // 2. Fator Votação da Comunidade (Likes / Dislikes)
  const netVotes = likes - (dislikes * 1.5);
  temp += netVotes * 30;

  // 3. Fator Popularidade/Cliques
  temp += Math.min(clicks * 2, 200);

  // 4. Bônus por Cupom e Menor Preço Histórico
  if (product.hasCoupon) {
    temp += 75;
  }
  if (product.isLowestPriceEver) {
    temp += 150;
  }

  // 5. Decaimento Temporal (ofertas mais recentes começam mais quentes)
  if (product.createdAt) {
    const createdDate = new Date(product.createdAt);
    const hoursOld = Math.max(0, (Date.now() - createdDate.getTime()) / (1000 * 60 * 60));
    if (hoursOld > 72) {
      temp = temp * 0.7; // Ofertas de mais de 3 dias perdem calor
    }
  }

  // Arredondar e definir limite mínimo de 30°
  const finalTemp = Math.max(30, Math.round(temp));

  // Definir categorização e estilos de acordo com a temperatura
  if (finalTemp >= 500) {
    return {
      temperature: finalTemp,
      formattedTemperature: `+${finalTemp}°`,
      label: "PEGANDO FOGO",
      gradientClass: "from-amber-500 via-rose-500 to-red-600",
      textColorClass: "text-rose-400",
      badgeBgClass: "bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-red-600/20 border-rose-500/40 text-rose-300"
    };
  } else if (finalTemp >= 250) {
    return {
      temperature: finalTemp,
      formattedTemperature: `+${finalTemp}°`,
      label: "SUPER OFERTA",
      gradientClass: "from-amber-400 to-orange-500",
      textColorClass: "text-amber-400",
      badgeBgClass: "bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500/40 text-amber-300"
    };
  } else if (finalTemp >= 120) {
    return {
      temperature: finalTemp,
      formattedTemperature: `+${finalTemp}°`,
      label: "OFERTA QUENTE",
      gradientClass: "from-emerald-400 to-teal-500",
      textColorClass: "text-emerald-400",
      badgeBgClass: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
    };
  } else {
    return {
      temperature: finalTemp,
      formattedTemperature: `${finalTemp}°`,
      label: "OFERTA",
      gradientClass: "from-zinc-400 to-zinc-500",
      textColorClass: "text-zinc-400",
      badgeBgClass: "bg-zinc-800/60 border-zinc-700/50 text-zinc-300"
    };
  }
}
