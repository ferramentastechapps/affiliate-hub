"use client";

import { motion } from "framer-motion";
import { ArrowUpRight } from "@phosphor-icons/react";
import Image from "next/image";
import { useState } from "react";
import { ProductLinks } from "./PlatformModal";

export type Product = {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  price?: number;
  description?: string;
  coupons?: { id: string; code: string; discount: string; platform: string }[];
  links: ProductLinks;
};

type ProductCardProps = {
  product: Product;
  onClick: (product: Product) => void;
};

export function ProductCard({ product, onClick }: ProductCardProps) {
  const [imageError, setImageError] = useState(false);
  const fallbackImage = "https://via.placeholder.com/800x1000/18181b/71717a?text=Imagem+Indisponível";

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
      <div className="relative aspect-[4/5] w-full bg-zinc-950 overflow-hidden">
        {/* Next.js Image com otimização automática */}
        <Image
          src={imageError ? fallbackImage : product.imageUrl}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105 opacity-80 group-hover:opacity-100"
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
