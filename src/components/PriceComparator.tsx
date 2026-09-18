"use client";

import { useMemo, useState, useEffect } from "react";
import { ArrowSquareOut, Crown, Sparkle } from "@phosphor-icons/react";
import { StoreLogo } from "./StoreLogos";

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
  productId?: string;
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

const BRL_FORMATTER = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
function formatCurrency(val: number) {
  return BRL_FORMATTER.format(val);
}

interface PlatformItem {
  platform: string;
  url: string;
  label: string;
  logo: string;
  color?: string;
  price?: number;
  originalPrice?: number | null;
  isLowest?: boolean;
}

interface PlatformPriceRowProps {
  platform: PlatformItem;
  onLinkClick?: (platform: string, url: string) => void;
}

function PlatformPriceRow({ platform: p, onLinkClick }: PlatformPriceRowProps) {
  const isBest = !!p.isLowest;
  return (
    <a
      href={p.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => onLinkClick?.(p.platform, p.url)}
      className={`flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border transition-all hover:scale-[1.01] active:scale-[0.99] group ${
        isBest
          ? "border-emerald-500/40 bg-emerald-950/20 shadow-[0_4px_16px_rgba(16,185,129,0.12)] hover:border-emerald-500/60"
          : "border-white/5 bg-white/3 hover:bg-white/8"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-white p-0.5 shrink-0 flex items-center justify-center">
          <StoreLogo store={p.platform} className="w-6 h-6 rounded-md object-contain" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">{p.label}</span>
            {isBest && (
              <span className="text-[10px] font-black text-emerald-300 uppercase tracking-wider bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                🏆 MAIS BARATO
              </span>
            )}
          </div>
          <span className="text-[11px] text-zinc-400 group-hover:text-zinc-300 transition-colors">
            Frete & condições no site da loja
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {p.price && p.price > 0 ? (
          <div className="flex flex-col items-end">
            <span className={`text-sm font-black ${isBest ? "text-emerald-400" : "text-white"}`}>
              {formatCurrency(p.price)}
            </span>
            {p.originalPrice && p.originalPrice > p.price && (
              <span className="text-[11px] text-zinc-500 line-through">
                {formatCurrency(p.originalPrice)}
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs font-semibold text-zinc-400">Ver preço</span>
        )}
        <div className={`p-1.5 rounded-lg ${isBest ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-zinc-400 group-hover:text-white"}`}>
          <ArrowSquareOut size={16} weight="bold" className="shrink-0" />
        </div>
      </div>
    </a>
  );
}

export function PriceComparator({ productId, productLinks = [], legacyLinks, currentPrice, onLinkClick }: Props) {
  const [apiPrices, setApiPrices] = useState<Array<{
    platform: string;
    label: string;
    logo: string;
    url: string;
    price: number;
    originalPrice?: number | null;
    isLowest: boolean;
  }> | null>(null);

  useEffect(() => {
    if (!productId) return;
    let isMounted = true;
    fetch(`/api/products/${productId}/platform-prices`)
      .then(res => res.json())
      .then(data => {
        if (isMounted && data.success && Array.isArray(data.prices)) {
          setApiPrices(data.prices);
        }
      })
      .catch(err => console.error("Erro ao carregar comparador de preços:", err));

    return () => {
      isMounted = false;
    };
  }, [productId]);

  // Fallback quando não há dados da API
  const platforms = useMemo(() => {
    if (apiPrices && apiPrices.length > 0) {
      return apiPrices;
    }

    const result: { platform: string; url: string; label: string; logo: string; color?: string; price?: number; originalPrice?: number | null; isLowest?: boolean }[] = [];
    const seen = new Set<string>();

    for (const pl of productLinks) {
      const url = pl.generatedAffiliateUrl || pl.affiliateUrl || pl.sourceUrl;
      if (url && !seen.has(pl.platform)) {
        seen.add(pl.platform);
        const meta = PLATFORM_META[pl.platform] || {
          label: pl.platform,
          logo: `https://www.google.com/s2/favicons?domain=${pl.platform}.com&sz=64`,
          color: "#ff334b",
        };
        result.push({ platform: pl.platform, url, ...meta, price: currentPrice || undefined, isLowest: result.length === 0 });
      }
    }

    if (legacyLinks) {
      const legacyMap: Record<string, string | null | undefined> = legacyLinks as any;
      for (const [key, url] of Object.entries(legacyMap)) {
        if (!PLATFORM_META[key]) continue;
        if (url && !seen.has(key)) {
          seen.add(key);
          const meta = PLATFORM_META[key];
          result.push({ platform: key, url, ...meta, price: currentPrice || undefined, isLowest: result.length === 0 });
        }
      }
    }

    return result;
  }, [productLinks, legacyLinks, apiPrices, currentPrice]);

  if (platforms.length < 2) return null;

  return (
    <div className="mt-8 bg-white/5 border border-white/5 rounded-3xl p-6 shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-accent/20 text-accent rounded-2xl">
            <Crown size={22} weight="bold" />
          </div>
          <div>
            <h4 className="text-base font-bold text-white leading-tight">Comparar Preço nas Lojas</h4>
            <p className="text-xs text-zinc-400">Preço atualizado em tempo real nas maiores lojas</p>
          </div>
        </div>
        <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full flex items-center gap-1">
          <Sparkle size={13} weight="fill" /> {platforms.length} lojas
        </span>
      </div>

      <div className="flex flex-col gap-2.5">
        {platforms.map((p) => (
          <PlatformPriceRow
            key={p.platform}
            platform={p}
            onLinkClick={onLinkClick}
          />
        ))}
      </div>
    </div>
  );
}
