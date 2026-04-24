"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Tag } from "@phosphor-icons/react";
import { PlatformModal } from "./PlatformModal";

const CATEGORIES = [
  { key: "gaming", label: "Gaming", icon: "🎮" },
  { key: "setup", label: "Setup", icon: "🖥️" },
  { key: "home-office", label: "Home Office", icon: "💼" },
  { key: "streaming", label: "Streaming", icon: "🎥" },
  { key: "smartphones-tv", label: "Smartphones e TV", icon: "📱" },
  { key: "bebes-criancas", label: "Bebês e Crianças", icon: "👶" },
];

type Product = {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  price?: number;
  description?: string;
  coupons?: { id: string; code: string; discount: string; platform: string }[];
  links: Record<string, string | undefined>;
  createdAt?: string;
};

function getSimulatedDiscount(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return 15 + (Math.abs(hash) % 45);
}

export function CategoriesSection() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (!activeCategory) return;
    setLoading(true);
    setProducts([]);

    fetch("/api/products")
      .then(r => r.json())
      .then((data: any[]) => {
        if (!Array.isArray(data)) return;
        
        const filtered = data.filter(p => {
          const category = p.category?.toLowerCase().replace(/\s+/g, '-') || '';
          return category === activeCategory;
        });

        setProducts(filtered.map(p => ({
          id: p.id,
          name: p.name,
          category: p.category,
          imageUrl: p.imageUrl,
          price: p.price,
          description: p.description,
          coupons: p.coupons || [],
          createdAt: p.createdAt,
          links: {
            amazon: p.links?.amazon,
            mercadoLivre: p.links?.mercadoLivre,
            shopee: p.links?.shopee,
            aliexpress: p.links?.aliexpress,
            tiktok: p.links?.tiktok,
          }
        })));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeCategory]);

  const activeCategoryInfo = CATEGORIES.find(c => c.key === activeCategory);

  return (
    <section className="w-full max-w-[1400px] mx-auto px-4 md:px-8 py-6">
      {/* Título */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-accent/20 to-purple-500/20">
            <Tag size={24} weight="fill" className="text-accent" />
          </div>
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-white mb-2">
              Categorias
            </h2>
            <p className="text-zinc-400 text-sm">Explore produtos por categoria</p>
          </div>
        </div>
      </div>

      {/* Cards de categorias */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {CATEGORIES.map((category) => (
          <button
            key={category.key}
            onClick={() => setActiveCategory(activeCategory === category.key ? null : category.key)}
            className={`flex items-center gap-2 px-4 py-3 rounded-2xl border transition-all duration-200 whitespace-nowrap shrink-0 min-h-[48px] ${
              activeCategory === category.key
                ? "bg-accent/15 border-accent/50 shadow-lg shadow-accent/10"
                : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
            }`}
          >
            <span className="text-2xl">{category.icon}</span>
            <span className={`text-sm font-semibold ${
              activeCategory === category.key ? "text-white" : "text-zinc-300"
            }`}>
              {category.label}
            </span>
            {activeCategory === category.key && (
              <X size={14} weight="bold" className="text-zinc-400 ml-1" />
            )}
          </button>
        ))}
      </div>

      {/* Produtos da categoria selecionada */}
      <AnimatePresence>
        {activeCategory && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="mt-6">
              {/* Header da seção */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-semibold tracking-tight text-white mb-2 flex items-center gap-3">
                    <span className="text-3xl">{activeCategoryInfo?.icon}</span>
                    {activeCategoryInfo?.label}
                  </h2>
                  <p className="text-zinc-400 text-sm">Produtos desta categoria</p>
                </div>
              </div>

              {/* Loading */}
              {loading && (
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="h-52 bg-zinc-900/50 rounded-2xl animate-pulse" />
                  ))}
                </div>
              )}

              {/* Sem produtos */}
              {!loading && products.length === 0 && (
                <div className="text-center py-10 text-zinc-500">
                  <p className="text-sm">Nenhum produto nesta categoria ainda.</p>
                </div>
              )}

              {/* Carrossel horizontal em mobile, grid em desktop */}
              {!loading && products.length > 0 && (
                <div className="flex lg:grid lg:grid-cols-4 gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide lg:overflow-visible">
                  {products.map((product, index) => {
                    const discount = getSimulatedDiscount(product.id);
                    const price = product.price || 0;
                    const originalPrice = price > 0 ? price / (1 - discount / 100) : 0;

                    let mainPlatformText = "Link";
                    let mainPlatformLogo = "https://www.google.com/s2/favicons?domain=amazon.com&sz=64";
                    if (product.links?.amazon) { mainPlatformText = "Amazon"; mainPlatformLogo = "https://www.google.com/s2/favicons?domain=amazon.com.br&sz=64"; }
                    else if (product.links?.mercadoLivre) { mainPlatformText = "Mercado Livre"; mainPlatformLogo = "https://www.google.com/s2/favicons?domain=mercadolivre.com.br&sz=64"; }
                    else if (product.links?.shopee) { mainPlatformText = "Shopee"; mainPlatformLogo = "https://www.google.com/s2/favicons?domain=shopee.com.br&sz=64"; }
                    else if (product.links?.aliexpress) { mainPlatformText = "AliExpress"; mainPlatformLogo = "https://www.google.com/s2/favicons?domain=aliexpress.com&sz=64"; }
                    else if (product.links?.tiktok) { mainPlatformText = "TikTok Shop"; mainPlatformLogo = "https://www.google.com/s2/favicons?domain=tiktok.com&sz=64"; }

                    return (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1, type: "spring", stiffness: 80 }}
                        onClick={() => setSelectedProduct(product)}
                        className="group cursor-pointer bg-zinc-900/80 backdrop-blur-sm border border-zinc-800/80 hover:border-accent/50 rounded-3xl p-5 flex flex-col relative transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_-10px_var(--accent)] min-w-[280px] sm:min-w-[320px] lg:min-w-0 snap-start"
                      >
                        {/* Badge Desconto */}
                        <div className="absolute top-4 right-4 z-10 bg-gradient-to-br from-red-500 to-rose-600 text-white font-black text-sm px-3 py-1.5 rounded-xl border border-white/20 shadow-lg">
                          -{discount}%
                        </div>

                        {/* Imagem */}
                        <div className="w-full aspect-[3/4] bg-zinc-900 rounded-2xl mb-5 relative overflow-hidden flex items-center justify-center">
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                          {/* Store badge */}
                          <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-md rounded-[14px] shadow-[0_4px_12px_rgba(0,0,0,0.15)] px-3 py-1.5 border border-zinc-200 flex items-center gap-1.5">
                            <img src={mainPlatformLogo} alt={mainPlatformText} className="w-4 h-4 rounded-full object-contain" />
                            <span className="text-[10px] font-black text-zinc-900 uppercase tracking-widest">{mainPlatformText}</span>
                          </div>
                          {/* Badge cupom */}
                          {product.coupons && product.coupons.length > 0 && (
                            <div className="absolute top-3 left-3 bg-accent text-white text-[10px] font-bold px-2 py-1 rounded-lg">
                              🎟️ CUPOM
                            </div>
                          )}
                        </div>

                        {/* Conteúdo */}
                        <div className="flex flex-col flex-grow">
                          <span className="text-[10px] font-normal tracking-wide text-zinc-500 uppercase mb-2 line-clamp-1 block">
                            {product.category}
                          </span>
                          <h3 className="text-white font-bold text-base sm:text-lg leading-snug line-clamp-2 mb-4">
                            {product.name}
                          </h3>
                          <div className="mt-auto pt-2 border-t border-zinc-800/50 flex flex-col">
                            {price > 0 ? (
                              <>
                                <span className="text-zinc-500 text-xs line-through font-normal mb-0.5">
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(originalPrice)}
                                </span>
                                <span className="text-xl font-bold text-white tracking-tight">
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price)}
                                </span>
                              </>
                            ) : (
                              <span className="text-lg font-bold text-accent">Ver oferta</span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <PlatformModal
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        product={selectedProduct}
      />
    </section>
  );
}
