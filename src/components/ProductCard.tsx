"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, Heart } from "@phosphor-icons/react";
import Image from "next/image";
import { useState, useEffect } from "react";
import { ProductLinks } from "@/types/product";

export type Product = {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  enhancedImageUrl?: string | null;
  storeName?: string | null;
  price?: number;
  description?: string;
  coupons?: { id: string; code: string; discount: string; platform: string }[];
  links: ProductLinks;
  shortId?: number;
};

type ProductCardProps = {
  product: Product;
  onClick: (product: Product) => void;
};

const CARD_FALLBACK_IMAGE = "/placeholder.webp";

function isUsableImageUrl(url?: string | null): boolean {
  return Boolean(url && url !== CARD_FALLBACK_IMAGE && !url.includes("unavailable"));
}

function resolveProductCardImage(
  imageUrl: string,
  enhancedImageUrl?: string | null,
  hasError = false
): string {
  if (hasError) return CARD_FALLBACK_IMAGE;
  if (isUsableImageUrl(imageUrl)) return imageUrl;
  if (isUsableImageUrl(enhancedImageUrl)) return enhancedImageUrl!;
  return CARD_FALLBACK_IMAGE;
}

export function ProductCard({ product, onClick }: ProductCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);

  const displaySrc = resolveProductCardImage(product.imageUrl, product.enhancedImageUrl, imageError);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("economizei_favorites");
      if (stored) {
        const ids: string[] = JSON.parse(stored);
        if (ids.includes(product.id)) setIsFavorited(true);
      }
    } catch {}
  }, [product.id]);

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextState = !isFavorited;
    setIsFavorited(nextState);

    try {
      const stored = localStorage.getItem("economizei_favorites");
      let ids: string[] = stored ? JSON.parse(stored) : [];
      if (nextState) {
        if (!ids.includes(product.id)) ids.push(product.id);
      } else {
        ids = ids.filter(id => id !== product.id);
      }
      localStorage.setItem("economizei_favorites", JSON.stringify(ids));
      window.dispatchEvent(new CustomEvent("favorites-updated", { detail: { count: ids.length } }));

      // Sincroniza com servidor em segundo plano
      fetch("/api/favorites", {
        method: nextState ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id }),
      }).catch(() => {});
    } catch {}
  };

  return (
    <motion.div
      layoutId={`card-${product.id}`}
      variants={{
        hidden: { opacity: 0, y: 30 },
        show: { 
          opacity: 1, 
          y: 0, 
          transition: { type: "spring", stiffness: 100, damping: 20 } 
        }
      }}
      whileHover={{ scale: 0.98 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => onClick(product)}
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-[2.5rem] bg-zinc-900 border border-zinc-800 transition-all hover:border-accent hover:shadow-[0_0_40px_-15px_var(--accent)]"
    >
      {/* Aspect Ratio Container for Masonry effect */}
      <div className="relative aspect-[4/5] w-full bg-white overflow-hidden shrink-0 rounded-t-[2.4rem]">
        {/* Favorite button */}
        <button
          onClick={handleToggleFavorite}
          title={isFavorited ? "Remover dos favoritos" : "Salvar nos favoritos"}
          className={`absolute top-4 right-4 z-10 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md border transition-all ${
            isFavorited
              ? "bg-rose-500/30 text-rose-400 border-rose-500/50 shadow-md scale-105"
              : "bg-black/40 text-white/70 border-white/10 hover:text-white hover:bg-black/60"
          }`}
        >
          <Heart size={18} weight={isFavorited ? "fill" : "bold"} />
        </button>

        {/* Next.js Image com otimização automática */}
        <Image
          src={displaySrc}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-contain p-5 transition-transform duration-700 ease-out group-hover:scale-105"
          onError={() => setImageError(true)}
          priority={false}
          quality={85}
        />
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent opacity-80 transition-opacity group-hover:opacity-60" />
      </div>

      <div className="absolute bottom-0 left-0 w-full p-6 pt-12 flex items-end justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-mono text-accent/80 tracking-widest uppercase">
            {product.category}
          </span>
          <h3 className="text-xl font-semibold tracking-tight text-white leading-tight">
            {product.name}
          </h3>
        </div>
        
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white transition-transform duration-500 group-hover:bg-accent group-hover:-translate-y-1">
          <ArrowUpRight size={20} weight="bold" />
        </div>
      </div>
    </motion.div>
  );
}
