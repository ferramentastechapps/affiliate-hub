"use client";

import React, { useState } from "react";
import { Package } from "@phosphor-icons/react";
import { StoreLogo } from "./StoreLogos";

interface ProductImageProps {
  src?: string | null;
  enhancedSrc?: string | null;
  alt: string;
  store?: string | null;
  category?: string | null;
  className?: string;
  containerClassName?: string;
}

export function ProductImage({
  src,
  enhancedSrc,
  alt,
  store,
  category,
  className = "w-full h-full object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-105",
  containerClassName = "w-full h-full flex items-center justify-center relative overflow-hidden",
}: ProductImageProps) {
  const [useEnhanced, setUseEnhanced] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Verifica se uma URL é válida e não é o placeholder antigo/feio
  const isGoodUrl = (url?: string | null): boolean => {
    if (!url) return false;
    const trimmed = url.trim().toLowerCase();
    if (trimmed === "" || trimmed === "/placeholder.webp" || trimmed.includes("unavailable")) {
      return false;
    }
    return true;
  };

  // Determina qual imagem tentar primeiro
  const primaryValid = isGoodUrl(src);
  const enhancedValid = isGoodUrl(enhancedSrc);

  const initialUrl = primaryValid ? src! : enhancedValid ? enhancedSrc! : null;
  const currentUrl = !useEnhanced ? initialUrl : enhancedValid ? enhancedSrc! : null;

  const handleImageError = () => {
    // Se a primária falhou e temos enhanced válida que ainda não tentamos
    if (!useEnhanced && enhancedValid && enhancedSrc !== initialUrl) {
      setUseEnhanced(true);
    } else {
      setHasError(true);
    }
  };

  // Se não temos imagem válida ou se deu erro em ambas
  if (!currentUrl || hasError) {
    return (
      <div
        className={`${containerClassName} bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-950 flex flex-col items-center justify-center p-3 text-center border border-white/5 select-none`}
      >
        <div className="relative mb-2 flex items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner">
            {store ? (
              <StoreLogo store={store} className="w-7 h-7" />
            ) : (
              <Package size={28} weight="duotone" className="text-blue-400" />
            )}
          </div>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 line-clamp-1 px-1">
          {category || "Oferta"}
        </span>
        <span className="text-[9px] text-zinc-500 font-medium">Economizei</span>
      </div>
    );
  }

  return (
    <div className={containerClassName}>
      <img
        src={currentUrl}
        alt={alt}
        className={className}
        loading="lazy"
        onError={handleImageError}
      />
    </div>
  );
}
