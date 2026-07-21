"use client";

import { useMemo } from "react";
import { ArrowSquareOut, Crown } from "@phosphor-icons/react";

type ProductLink = {
  platform: string;
  sourceUrl?: string | null;
  affiliateUrl?: string | null;
  generatedAffiliateUrl?: string | null;
};

type LegacyLinks = {
  amazon?: string | null;
  mercadoLivre?: string | null;
  shopee?: string | null;
  aliexpress?: string | null;
  tiktok?: string | null;
  netshoes?: string | null;
  magalu?: string | null;
  kabum?: string | null;
};

type Props = {
  productLinks?: ProductLink[];
  legacyLinks?: LegacyLinks | null;
  currentPrice?: number | null;
  onLinkClick?: (platform: string, url: string) => void;
};

const PLATFORM_META: Record<string, { label: string; logo: string; color: string }> = {
  amazon:       { label: "Amazon",       logo: "https://www.google.com/s2/favicons?domain=amazon.com.br&sz=64",         color: "#ff9900" },
  mercadoLivre: { label: "Mercado Livre",logo: "https://www.google.com/s2/favicons?domain=mercadolivre.com.br&sz=64",   color: "#3483FA" },
  shopee:       { label: "Shopee",       logo: "https://www.google.com/s2/favicons?domain=shopee.com.br&sz=64",         color: "#ee4d2d" },
  aliexpress:   { label: "AliExpress",   logo: "https://www.google.com/s2/favicons?domain=aliexpress.com&sz=64",        color: "#e43225" },
  tiktok:       { label: "TikTok Shop",  logo: "https://www.google.com/s2/favicons?domain=tiktok.com&sz=64",            color: "#010101" },
  magalu:       { label: "Magalu",       logo: "https://www.google.com/s2/favicons?domain=magazineluiza.com.br&sz=64",  color: "#0086ff" },
  kabum:        { label: "KaBuM",        logo: "https://www.google.com/s2/favicons?domain=kabum.com.br&sz=64",          color: "#0d47a1" },
  netshoes:     { label: "Netshoes",     logo: "https://www.google.com/s2/favicons?domain=netshoes.com.br&sz=64",       color: "#5c2a9d" },
};

export function PriceComparator({ productLinks = [], legacyLinks, currentPrice, onLinkClick }: Props) {
  // Constrói lista de plataformas disponíveis, preferindo productLinks (mais completo)
  const platforms = useMemo(() => {
    const result: { platform: string; url: string; label: string; logo: string; color: string }[] = [];
    const seen = new Set<string>();

    // Adiciona de productLinks primeiro
    for (const pl of productLinks) {
      const url = pl.generatedAffiliateUrl || pl.affiliateUrl || pl.sourceUrl;
      if (url && !seen.has(pl.platform)) {
        seen.add(pl.platform);
        const meta = PLATFORM_META[pl.platform] || {
          label: pl.platform,
          logo: `https://www.google.com/s2/favicons?domain=${pl.platform}.com&sz=64`,
          color: "#ff334b",
        };
        result.push({ platform: pl.platform, url, ...meta });
      }
    }

    // Fallback para links legados
    if (legacyLinks) {
      const legacyMap: Record<string, string | null | undefined> = legacyLinks as any;
      for (const [key, url] of Object.entries(legacyMap)) {
        if (url && !seen.has(key)) {
          seen.add(key);
          const meta = PLATFORM_META[key] || {
            label: key,
            logo: `https://www.google.com/s2/favicons?domain=${key}.com&sz=64`,
            color: "#ff334b",
          };
          result.push({ platform: key, url, ...meta });
        }
      }
    }

    return result;
  }, [productLinks, legacyLinks]);

  // Só exibe se houver pelo menos 2 plataformas disponíveis
  if (platforms.length < 2) return null;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  return (
    <div className="mt-8 bg-white/5 border border-white/5 rounded-3xl p-6 shadow-xl backdrop-blur-md">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2.5 bg-accent/20 text-accent rounded-2xl">
          <Crown size={22} weight="bold" />
        </div>
        <div>
          <h4 className="text-base font-bold text-white leading-tight">Comparar nas lojas</h4>
          <p className="text-xs text-zinc-400">Este produto está disponível em {platforms.length} lojas</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {platforms.map((p, i) => {
          const isBest = i === 0; // A primeira entrada é considerada a mais relevante
          return (
            <a
              key={p.platform}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onLinkClick?.(p.platform, p.url)}
              className={`flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border transition-all hover:scale-[1.01] active:scale-[0.99] ${
                isBest
                  ? "border-accent/40 bg-accent/10 shadow-[0_4px_16px_rgba(217,70,239,0.12)]"
                  : "border-white/5 bg-white/3 hover:bg-white/8"
              }`}
            >
              <div className="flex items-center gap-3">
                <img
                  src={p.logo}
                  alt={p.label}
                  className="w-7 h-7 rounded-lg object-contain bg-white p-0.5"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <div>
                  <span className="text-sm font-bold text-white">{p.label}</span>
                  {isBest && (
                    <span className="ml-2 text-[9px] font-black text-accent uppercase tracking-wider bg-accent/20 px-1.5 py-0.5 rounded-full">
                      Principal
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {currentPrice && i === 0 && (
                  <span className="text-sm font-black text-white">
                    {formatCurrency(currentPrice)}
                  </span>
                )}
                <ArrowSquareOut size={16} className="text-zinc-400 shrink-0" />
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
