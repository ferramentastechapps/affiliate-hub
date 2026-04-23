"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "@phosphor-icons/react";
import { PlatformModal } from "./PlatformModal";

const STORES = [
  { key: "amazon",       label: "Amazon",        domain: "amazon.com.br",        linkKey: "amazon" },
  { key: "mercadolivre", label: "Mercado Livre",  domain: "mercadolivre.com.br",  linkKey: "mercadoLivre" },
  { key: "shopee",       label: "Shopee",         domain: "shopee.com.br",        linkKey: "shopee" },
  { key: "aliexpress",   label: "AliExpress",     domain: "aliexpress.com",       linkKey: "aliexpress" },
  { key: "tiktok",       label: "TikTok Shop",    domain: "tiktok.com",           linkKey: "tiktok" },
  { key: "kabum",        label: "KaBuM",          domain: "kabum.com.br",         linkKey: "amazon" },
  { key: "magalu",       label: "Magalu",         domain: "magazineluiza.com.br", linkKey: "amazon" },
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

export function StoreFilter() {
  const [activeStore, setActiveStore] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (!activeStore) return;
    setLoading(true);
    setProducts([]);

    fetch("/api/products")
      .then(r => r.json())
      .then((data: any[]) => {
        if (!Array.isArray(data)) return;
        const store = STORES.find(s => s.key === activeStore);
        if (!store) return;

        const filtered = data.filter(p => {
          const links = p.links || {};
          // Filtra pelo linkKey da loja selecionada
          return !!links[store.linkKey];
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
  }, [activeStore]);

  const activeStoreInfo = STORES.find(s => s.key === activeStore);

  return (
    <section className="w-full max-w-[1400px] mx-auto px-4 md:px-8 py-6">
      {/* Título */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-white mb-2">
            Compre nas suas lojas favoritas
          </h2>
          <p className="text-zinc-400 text-sm">Selecione uma loja para ver as ofertas disponíveis</p>
        </div>
      </div>

      {/* Ícones das lojas */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {STORES.map((store) => (
          <button
            key={store.key}
            onClick={() => setActiveStore(activeStore === store.key ? null : store.key)}
            className={`flex items-center gap-2 px-4 py-3 rounded-2xl border transition-all duration-200 whitespace-nowrap shrink-0 min-h-[48px] ${
              activeStore === store.key
                ? "bg-accent/15 border-accent/50 shadow-lg shadow-accent/10"
                : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center overflow-hidden shrink-0 p-1">
              <img
                src={`https://www.google.com/s2/favicons?domain=${store.domain}&sz=64`}
                alt={store.label}
                className="w-full h-full object-contain mix-blend-multiply"
              />
            </div>
            <span className={`text-sm font-semibold ${
              activeStore === store.key ? "text-white" : "text-zinc-300"
            }`}>
              {store.label}
            </span>
            {activeStore === store.key && (
              <X size={14} weight="bold" className="text-zinc-400 ml-1" />
            )}
          </button>
        ))}
      </div>

      {/* Produtos da loja selecionada */}
      <AnimatePresence>
        {activeStore && (
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
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center p-1 shadow shrink-0">
                      <img
                        src={`https://www.google.com/s2/favicons?domain=${activeStoreInfo?.domain}&sz=64`}
                        alt={activeStoreInfo?.label}
                        className="w-full h-full object-contain mix-blend-multiply"
                      />
                    </div>
                    Ofertas na {activeStoreInfo?.label}
                  </h2>
                  <p className="text-zinc-400 text-sm">Produtos disponíveis nesta loja</p>
                </div>
              </div>

              {/* Loading */}
              {loading && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="h-52 bg-zinc-900/50 rounded-2xl animate-pulse" />
                  ))}
                </div>
              )}

              {/* Sem produtos */}
              {!loading && products.length === 0 && (
                <div className="text-center py-10 text-zinc-500">
                  <p className="text-sm">Nenhum produto desta loja ainda.</p>
                </div>
              )}

      {/* Grid de produtos */}
              {!loading && products.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
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

                    return (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1, type: "spring", stiffness: 80 }}
                        onClick={() => setSelectedProduct(product)}
                        className="group cursor-pointer bg-zinc-900/80 backdrop-blur-sm border border-zinc-800/80 hover:border-accent/50 rounded-3xl p-5 flex flex-col relative transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_-10px_var(--accent)]"
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
