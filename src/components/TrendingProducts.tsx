"use client";

import { useEffect, useState, useRef } from "react";
import { Flame, ArrowRight } from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ProductImage } from "./ProductImage";
import { StoreLogo, detectStoreKey } from "./StoreLogos";

const RANK_BADGES = [
  { bg: "bg-amber-400", text: "text-zinc-950" },
  { bg: "bg-zinc-300",  text: "text-zinc-900" },
  { bg: "bg-amber-600", text: "text-white" },
];

export function TrendingProducts() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/products/trending")
      .then((r) => r.json())
      .then((d) => {
        if (d.products && Array.isArray(d.products)) setProducts(d.products);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (!loading && products.length === 0) return null;

  const fmt = (v?: number | null) =>
    v && v > 0
      ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)
      : "Ver oferta";

  return (
    <section className="w-full max-w-[1400px] mx-auto px-3 md:px-8 pt-3 pb-1">
      {/* Section header */}
      <div className="flex items-center justify-between mb-2.5 px-1">
        <div className="flex items-center gap-1.5">
          <Flame size={18} weight="fill" className="text-[#ff334b]" />
          <h2 className="text-[15px] font-bold text-white tracking-tight">Em Alta</h2>
          <span className="text-[11px] font-medium text-[#8e92a4] ml-0.5">mais buscados</span>
        </div>
        <button
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent("change-filter", { detail: { filter: "emAlta" } })
            )
          }
          className="flex items-center gap-1 text-[12px] font-medium text-[#8e92a4] hover:text-white transition-colors"
        >
          Ver todos <ArrowRight size={13} />
        </button>
      </div>

      {/* Horizontal scroll list */}
      <div
        ref={scrollRef}
        className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-2 -mx-3 px-3 md:mx-0 md:px-0"
      >
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex-none w-[138px] h-[190px] skeleton rounded-xl"
              />
            ))
          : products.slice(0, 10).map((product, index) => {
              const storeKey = detectStoreKey(product);
              const rankBadge = RANK_BADGES[index] || null;
              const discount =
                product.originalPrice &&
                product.price &&
                product.originalPrice > product.price
                  ? Math.round(
                      ((product.originalPrice - product.price) / product.originalPrice) * 100
                    )
                  : 0;

              return (
                <motion.button
                  key={product.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() =>
                    router.push(`/produto/${product.shortId || product.id}`)
                  }
                  className="flex-none w-[136px] flex flex-col bg-[#0e1018] border border-white/[0.07] rounded-xl overflow-hidden cursor-pointer hover:border-white/[0.14] hover:bg-[#13151f] active:scale-[0.97] transition-all duration-150 text-left group shadow-sm"
                >
                  {/* Image area */}
                  <div className="relative w-full h-[106px] bg-white flex items-center justify-center overflow-hidden p-2">
                    <ProductImage
                      src={product.imageUrl}
                      enhancedSrc={product.enhancedImageUrl}
                      alt={product.name}
                      store={storeKey}
                      category={product.category}
                      className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                      containerClassName="w-full h-full flex items-center justify-center"
                    />

                    {/* Rank pill */}
                    {rankBadge && (
                      <span
                        className={`absolute top-1.5 left-1.5 w-[22px] h-[22px] rounded-full ${rankBadge.bg} ${rankBadge.text} text-[10.5px] font-black flex items-center justify-center shadow-md`}
                      >
                        {index + 1}
                      </span>
                    )}

                    {/* Discount badge */}
                    {discount > 0 && (
                      <span className="absolute top-1.5 right-1.5 bg-[#ff334b] text-white text-[9.5px] font-black px-1.5 py-0.5 rounded leading-none shadow-sm">
                        -{discount}%
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex flex-col gap-1 p-2 flex-1 justify-between">
                    {/* Store */}
                    <div className="flex items-center gap-1">
                      <StoreLogo
                        store={storeKey}
                        className="w-3.5 h-3.5 rounded-sm shrink-0"
                      />
                      <span className="text-[10px] text-[#8e92a4] truncate font-medium">
                        {product.storeName || storeKey}
                      </span>
                    </div>

                    {/* Name */}
                    <p className="text-[11.5px] font-medium text-[#e2e4e9] leading-tight line-clamp-2 group-hover:text-white transition-colors">
                      {product.name}
                    </p>

                    {/* Price */}
                    <p className="text-[13px] font-bold text-[#ff334b] mt-1">
                      {fmt(product.price)}
                    </p>
                  </div>
                </motion.button>
              );
            })}
      </div>
    </section>
  );
}
