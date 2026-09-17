"use client";

import React, { useState } from "react";
import { Package, Tag } from "@phosphor-icons/react";
import { StoreLogo, detectStoreKey } from "./StoreLogos";

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
  className = "w-full h-full object-contain transition-transform duration-300 group-hover:scale-105",
  containerClassName = "w-full h-full flex items-center justify-center relative overflow-hidden",
}: ProductImageProps) {
  const [useEnhanced, setUseEnhanced] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Normaliza e limpa URL
  const sanitizeUrl = (url?: string | null): string | null => {
    if (!url) return null;
    let trimmed = url.trim();
    if (trimmed === "" || trimmed === "/placeholder.webp" || trimmed.includes("unavailable")) {
      return null;
    }
    // Suporte a URLs com protocolo relativo //
    if (trimmed.startsWith("//")) {
      trimmed = "https:" + trimmed;
    }
    // Forçar https se for http de CDNs conhecidas
    if (trimmed.startsWith("http://")) {
      trimmed = trimmed.replace("http://", "https://");
    }
    return trimmed;
  };

  const primaryUrl = sanitizeUrl(src);
  const enhancedUrl = sanitizeUrl(enhancedSrc);

  const initialUrl = primaryUrl || enhancedUrl;
  const currentUrl = !useEnhanced ? initialUrl : (enhancedUrl || initialUrl);

  const handleImageError = () => {
    // Se a imagem primária falhou e temos enhanced disponível, tenta a enhanced
    if (!useEnhanced && enhancedUrl && enhancedUrl !== initialUrl) {
      setUseEnhanced(true);
    } else {
      setHasError(true);
    }
  };

  // Se não temos imagem válida ou se ambas falharam
  if (!currentUrl || hasError) {
    const storeKey = detectStoreKey(store);
    return (
      <div
        className={`${containerClassName} bg-zinc-900/60 flex flex-col items-center justify-center p-2 text-center select-none`}
      >
        <div className="w-8 h-8 rounded-xl bg-white/[0.08] border border-white/10 flex items-center justify-center mb-1">
          {store ? (
            <StoreLogo store={storeKey} className="w-5 h-5 rounded-md object-contain" />
          ) : (
            <Tag size={16} weight="duotone" className="text-white/60" />
          )}
        </div>
        <span className="text-[9px] font-semibold text-zinc-400 line-clamp-1 max-w-[80px]">
          {category || "Oferta"}
        </span>
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
        decoding="async"
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
        onError={handleImageError}
      />
    </div>
  );
}
