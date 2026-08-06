"use client";

import React from "react";
import { ShieldCheck, TrendDown, Flame, Warning } from "@phosphor-icons/react";

interface PriceBadgeProps {
  currentPrice: number;
  originalPrice?: number | null;
  lowestPriceIn90Days?: number | null;
  averagePrice?: number | null;
  className?: string;
}

export function PriceBadge({
  currentPrice,
  originalPrice,
  lowestPriceIn90Days,
  averagePrice,
  className = "",
}: PriceBadgeProps) {
  if (!currentPrice || currentPrice <= 0) return null;

  // 1. Caso seja o menor preço dos últimos 90 dias (ou histórico)
  if (lowestPriceIn90Days && currentPrice <= lowestPriceIn90Days * 1.01) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-black text-[10px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-sm ${className}`}
        title="Este é o menor preço registrado nos últimos 90 dias!"
      >
        <ShieldCheck size={12} weight="fill" className="text-emerald-400 shrink-0" />
        <span>MENOR PREÇO (90D)</span>
      </span>
    );
  }

  // 2. Caso o preço esteja abaixo da média recente
  if (averagePrice && currentPrice < averagePrice * 0.9) {
    const savings = Math.round(((averagePrice - currentPrice) / averagePrice) * 100);
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] bg-teal-500/15 border border-teal-500/30 text-teal-300 ${className}`}
        title={`Preço ${savings}% abaixo da média de mercado`}
      >
        <TrendDown size={12} weight="bold" className="text-teal-300 shrink-0" />
        <span>{savings}% ABAIXO DA MÉDIA</span>
      </span>
    );
  }

  // 3. Caso tenha um grande desconto vs originalPrice
  if (originalPrice && originalPrice > currentPrice) {
    const discount = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
    if (discount >= 30) {
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-black text-[10px] bg-rose-500/15 border border-rose-500/30 text-rose-400 ${className}`}
        >
          <Flame size={12} weight="fill" className="text-rose-400 shrink-0" />
          <span>-{discount}% OFF</span>
        </span>
      );
    }
  }

  return null;
}
