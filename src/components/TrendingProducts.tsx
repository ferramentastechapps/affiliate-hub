"use client";

import { useEffect, useState, useRef } from "react";
import { 
  Flame, 
  CaretLeft, 
  CaretRight, 
  Tag, 
  ArrowRight, 
  Lightning,
  Sparkle
} from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ProductImage } from "./ProductImage";
import { StoreLogo, detectStoreKey } from "./StoreLogos";

export function TrendingProducts() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/products/trending")
      .then(res => res.json())
      .then(data => {
        if (data.products && Array.isArray(data.products)) {
          setProducts(data.products);
        }
      })
      .catch(err => console.error("Erro ao buscar produtos em alta:", err))
      .finally(() => setLoading(false));
  }, []);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const { scrollLeft, clientWidth } = scrollContainerRef.current;
      const scrollAmount = clientWidth * 0.75;
      scrollContainerRef.current.scrollTo({
        left: direction === "left" ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: "smooth",
      });
    }
  };

  if (!loading && products.length === 0) return null;

  const formatCurrency = (val?: number | null) => {
    if (!val || val <= 0) return "Consultar loja";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
  };

  const getRankStyle = (index: number) => {
    switch (index) {
      case 0:
        return {
          badge: "bg-gradient-to-r from-amber-400 to-yellow-500 text-zinc-950 shadow-[0_0_15px_rgba(245,158,11,0.5)]",
          border: "border-amber-400/40",
          label: "1º Lugar",
        };
      case 1:
        return {
          badge: "bg-gradient-to-r from-slate-200 to-zinc-300 text-zinc-950 shadow-[0_0_12px_rgba(226,232,240,0.4)]",
          border: "border-slate-300/30",
          label: "2º Lugar",
        };
      case 2:
        return {
          badge: "bg-gradient-to-r from-amber-700 to-amber-600 text-white shadow-[0_0_10px_rgba(180,83,9,0.3)]",
          border: "border-amber-700/30",
          label: "3º Lugar",
        };
      default:
        return {
          badge: "bg-white/10 text-zinc-300 border border-white/10",
          border: "border-white/5",
          label: `${index + 1}º Lugar`,
        };
    }
  };

  return (
    <section className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mb-12">
      {/* Header da Seção */}
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-rose-500 mb-1">
            <span className="p-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center animate-pulse">
              <Flame size={20} weight="fill" />
            </span>
            <span className="text-xs font-black uppercase tracking-widest text-rose-400">
              Ranking de Tendências
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            Produtos em Alta
            <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full hidden sm:inline-block">
              Mais Clicados
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
            Os produtos mais buscados e aproveitados pela comunidade agora
          </p>
        </div>

        {/* Controles de Navegação Desktop */}
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={() => scroll("left")}
            className="w-10 h-10 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-all shadow-md active:scale-95"
            aria-label="Rolar para esquerda"
          >
            <CaretLeft size={20} weight="bold" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="w-10 h-10 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-all shadow-md active:scale-95"
            aria-label="Rolar para direita"
          >
            <CaretRight size={20} weight="bold" />
          </button>
        </div>
      </div>

      {/* Carrossel Horizontal */}
      {loading ? (
        <div className="flex gap-4 overflow-x-hidden pb-4">
          {[1, 2, 3, 4, 5].map((n) => (
            <div
              key={n}
              className="w-64 sm:w-72 shrink-0 h-80 rounded-[2rem] bg-white/5 border border-white/5 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div
          ref={scrollContainerRef}
          className="flex gap-4 sm:gap-5 overflow-x-auto pb-4 pt-1 px-1 scrollbar-none snap-x snap-mandatory scroll-smooth"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {products.map((product, index) => {
            const rank = getRankStyle(index);
            const discount = product.originalPrice && product.price && product.originalPrice > product.price
              ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
              : 0;

            const clickCount = product.clicks || 0;

            return (
              <motion.div
                key={product.id}
                whileHover={{ y: -6, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push(`/produto/${product.shortId || product.id}`)}
                className={`group cursor-pointer shrink-0 w-64 sm:w-72 glass-3d-card rounded-[2rem] overflow-hidden flex flex-col border transition-all snap-start shadow-xl hover:shadow-2xl relative ${rank.border}`}
              >
                {/* Badge de Posição / Rank */}
                <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
                  <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full ${rank.badge}`}>
                    #{index + 1}
                  </span>
                  {clickCount > 0 && (
                    <span className="bg-zinc-950/80 backdrop-blur-md text-amber-400 border border-amber-400/20 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                      <Flame size={12} weight="fill" className="text-amber-500" />
                      {clickCount} cliques
                    </span>
                  )}
                </div>

                {/* Imagem do Produto */}
                <div className="relative aspect-square w-full bg-white p-6 flex items-center justify-center overflow-hidden">
                  <ProductImage
                    src={product.imageUrl}
                    enhancedSrc={product.enhancedImageUrl}
                    alt={product.name}
                    store={detectStoreKey(product)}
                    category={product.category}
                    className="w-full h-full object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-105"
                    containerClassName="w-full h-full flex items-center justify-center relative overflow-hidden"
                  />
                  {discount > 0 && (
                    <span className="absolute bottom-3 right-3 bg-red-600 text-white font-black text-[11px] px-2.5 py-1 rounded-xl shadow-md flex items-center gap-1">
                      <Tag size={12} weight="fill" />
                      -{discount}%
                    </span>
                  )}
                </div>

                {/* Detalhes */}
                <div className="p-4 sm:p-5 flex flex-col flex-1 bg-gradient-to-b from-transparent to-black/30">
                  <span className="text-[10px] font-bold text-accent uppercase tracking-wider mb-1 truncate">
                    {product.category || "Oferta"}
                  </span>
                  <h3 className="text-xs sm:text-sm font-semibold text-zinc-200 line-clamp-2 mb-3 group-hover:text-white transition-colors leading-snug">
                    {product.name}
                  </h3>

                  <div className="mt-auto flex items-end justify-between pt-2 border-t border-white/5">
                    <div>
                      <div className="text-base sm:text-lg font-black text-white leading-tight">
                        {formatCurrency(product.price)}
                      </div>
                      {discount > 0 && (
                        <span className="text-[11px] text-zinc-500 line-through">
                          {formatCurrency(product.originalPrice)}
                        </span>
                      )}
                    </div>

                    <div className="w-8 h-8 rounded-xl bg-accent/10 border border-accent/20 group-hover:bg-accent group-hover:text-white text-accent flex items-center justify-center transition-all duration-300 shrink-0">
                      <ArrowRight size={14} weight="bold" className="group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </section>
  );
}
