"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, Calendar } from "@phosphor-icons/react";
import { PlatformModal } from "./PlatformModal";

const STORES = [
  { key: "amazon",       label: "Amazon",        domain: "amazon.com.br",        linkKey: "amazon",       color: "from-blue-600 to-cyan-500",       glowColor: "rgba(37,99,235,0.45)" },
  { key: "mercadolivre", label: "Mercado Livre",  domain: "mercadolivre.com.br",  linkKey: "mercadoLivre",  color: "from-yellow-500 to-amber-400",    glowColor: "rgba(234,179,8,0.45)" },
  { key: "shopee",       label: "Shopee",         domain: "shopee.com.br",        linkKey: "shopee",       color: "from-orange-500 to-red-500",      glowColor: "rgba(249,115,22,0.45)" },
  { key: "aliexpress",   label: "AliExpress",     domain: "aliexpress.com",       linkKey: "aliexpress",   color: "from-red-600 to-orange-500",      glowColor: "rgba(220,38,38,0.45)" },
  { key: "tiktok",       label: "TikTok Shop",    domain: "tiktok.com",           linkKey: "tiktok",       color: "from-zinc-800 to-zinc-950",       glowColor: "rgba(255,255,255,0.2)" },
  { key: "kabum",        label: "KaBuM",          domain: "kabum.com.br",         linkKey: "kabum",        color: "from-blue-700 to-sky-500",        glowColor: "rgba(0,102,204,0.45)" },
  { key: "magalu",       label: "Magalu",         domain: "magazineluiza.com.br", linkKey: "magalu",       color: "from-blue-500 to-pink-500",       glowColor: "rgba(0,134,255,0.45)" },
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

function getTimeAgo(dateString?: string | Date) {
  if (!dateString) return "há pouco tempo";
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return `agora mesmo`;
  if (diffInMinutes < 60) return `há ${diffInMinutes} min`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `há ${diffInHours} h`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `há ${diffInDays} ${diffInDays === 1 ? 'dia' : 'dias'}`;
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
            magalu: p.links?.magalu,
            kabum: p.links?.kabum,
          }
        })));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeStore]);

  const activeStoreInfo = STORES.find(s => s.key === activeStore);

  return (
    <section className="w-full max-w-[1400px] mx-auto px-4 md:px-8 py-6 mb-8">
      {/* Título */}
      <div className="flex flex-col mb-6">
        <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white mb-2">
          Compre nas suas lojas favoritas
        </h2>
        <p className="text-zinc-400 text-sm">Selecione uma loja para ver as ofertas disponíveis</p>
      </div>

      {/* Grid horizontal de Lojas com visual de cards brilhantes */}
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide pt-2 snap-x snap-mandatory">
        {STORES.map((store) => {
          const isActive = activeStore === store.key;
          return (
            <button
              key={store.key}
              onClick={() => setActiveStore(isActive ? null : store.key)}
              style={{
                boxShadow: isActive ? `0 0 25px ${store.glowColor}` : "none"
              }}
              className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl border transition-all duration-300 whitespace-nowrap shrink-0 min-h-[56px] relative overflow-hidden group snap-start cursor-pointer ${
                isActive
                  ? "bg-zinc-900 border-zinc-700/80"
                  : "bg-zinc-950/60 border-zinc-900/80 hover:border-zinc-800 hover:bg-zinc-900/50"
              }`}
            >
              {/* Hover background gradient glow */}
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300 bg-gradient-to-r ${store.color}`} />
              
              {/* Circular Store Icon Container */}
              <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center overflow-hidden shrink-0 p-1.5 shadow-md transition-transform duration-300 group-hover:scale-105">
                <img
                  src={`https://www.google.com/s2/favicons?domain=${store.domain}&sz=64`}
                  alt={store.label}
                  className="w-full h-full object-contain mix-blend-multiply"
                />
              </div>
              
              <div className="flex flex-col items-start min-w-0">
                <span className={`text-sm font-bold tracking-tight transition-colors ${
                  isActive ? "text-white" : "text-zinc-300 group-hover:text-white"
                }`}>
                  {store.label}
                </span>
                <span className="text-[10px] text-zinc-500 font-medium tracking-wide">
                  {store.domain}
                </span>
              </div>

              {isActive && (
                <X size={14} weight="bold" className="text-zinc-400 hover:text-white transition-colors ml-2 z-10" />
              )}
            </button>
          );
        })}
      </div>

      {/* Painel expansível de Ofertas por Loja */}
      <AnimatePresence>
        {activeStore && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
            className="overflow-hidden"
          >
            <div className="mt-8 pt-6 border-t border-zinc-900">
              {/* Header da seção expandida */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center p-2 shadow-lg shrink-0">
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${activeStoreInfo?.domain}&sz=64`}
                      alt={activeStoreInfo?.label}
                      className="w-full h-full object-contain mix-blend-multiply"
                    />
                  </div>
                  <div>
                    <h3 className="text-xl md:text-2xl font-black text-white">
                      Ofertas na {activeStoreInfo?.label}
                    </h3>
                    <p className="text-zinc-400 text-xs mt-0.5">Veja todas as promoções de afiliados verificadas nesta loja</p>
                  </div>
                </div>
              </div>

              {/* Loading */}
              {loading && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-72 bg-zinc-900/50 rounded-3xl animate-pulse" />
                  ))}
                </div>
              )}

              {/* Sem produtos */}
              {!loading && products.length === 0 && (
                <div className="text-center py-12 rounded-3xl bg-zinc-950/40 border border-zinc-900 text-zinc-500">
                  <p className="text-sm font-semibold">Nenhuma promoção encontrada nesta loja no momento.</p>
                  <p className="text-xs text-zinc-600 mt-1">Fique ligado! Atualizamos ofertas a todo instante.</p>
                </div>
              )}

              {/* Grid de produtos */}
              {!loading && products.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  {products.map((product, index) => {
                    const discount = getSimulatedDiscount(product.id);
                    const price = product.price || 0;
                    const originalPrice = price > 0 ? price / (1 - discount / 100) : 0;

                    let mainPlatformText = activeStoreInfo?.label || "Oferta";
                    let mainPlatformLogo = `https://www.google.com/s2/favicons?domain=${activeStoreInfo?.domain}&sz=64`;

                    return (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05, type: "spring", stiffness: 100 }}
                        onClick={() => setSelectedProduct(product)}
                        className="group cursor-pointer bg-zinc-950/60 backdrop-blur-sm border border-zinc-900 hover:border-zinc-700/80 rounded-3xl p-4 flex flex-col relative transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_12px_30px_-10px_rgba(0,0,0,0.6)]"
                      >
                        {/* Tag Desconto */}
                        <div className="absolute top-3 right-3 z-10 bg-red-600 text-white font-black text-[11px] px-2.5 py-1 rounded-xl shadow-lg border border-red-500/10">
                          -{discount}%
                        </div>

                        {/* Tempo Atrás */}
                        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-bold mb-3">
                          <Clock size={12} className="text-zinc-600" />
                          {getTimeAgo(product.createdAt)}
                        </div>

                        {/* Imagem Premium Vertical */}
                        <div className="w-full aspect-[3/4] bg-zinc-900/80 rounded-2xl mb-4 relative overflow-hidden flex items-center justify-center border border-zinc-900">
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                          />
                          
                          {/* Store Favicon floating badge */}
                          <div className="absolute bottom-2.5 right-2.5 bg-white/95 backdrop-blur-md rounded-[12px] shadow-[0_4px_12px_rgba(0,0,0,0.2)] px-2.5 py-1 border border-zinc-200/50 flex items-center gap-1.5">
                            <img src={mainPlatformLogo} alt={mainPlatformText} className="w-3.5 h-3.5 rounded-full object-contain" />
                            <span className="text-[9px] font-black text-zinc-900 uppercase tracking-wider">{mainPlatformText}</span>
                          </div>

                          {/* Badge cupom */}
                          {product.coupons && product.coupons.length > 0 && (
                            <div className="absolute top-2.5 left-2.5 bg-blue-600 text-white text-[9px] font-black px-2 py-0.5 rounded-lg tracking-wide uppercase">
                              CUPOM
                            </div>
                          )}
                        </div>

                        {/* Detalhes do Produto */}
                        <div className="flex flex-col flex-grow">
                          <span className="text-[9px] font-bold tracking-widest text-zinc-500 uppercase mb-1.5 block">
                            {product.category}
                          </span>
                          
                          <h4 className="text-white font-bold text-sm leading-snug line-clamp-2 mb-3 group-hover:text-blue-400 transition-colors">
                            {product.name}
                          </h4>
                          
                          <div className="mt-auto pt-2.5 border-t border-zinc-900/80 flex flex-col">
                            {price > 0 ? (
                              <>
                                <span className="text-zinc-500 text-[10px] line-through font-medium mb-0.5">
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(originalPrice)}
                                </span>
                                <span className="text-base font-extrabold text-white tracking-tight">
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price)}
                                </span>
                              </>
                            ) : (
                              <span className="text-sm font-bold text-blue-400">Ver detalhes</span>
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
