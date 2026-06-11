"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, Calendar } from "@phosphor-icons/react";
import { PlatformModal } from "./PlatformModal";
import {
  AmazonLogo,
  MercadoLivreLogo,
  ShopeeLogo,
  AliExpressLogo,
  TikTokShopLogo,
  KaBuMLogo,
  MagaluLogo,
} from "./StoreLogos";

const STORES = [
  { key: "amazon",       label: "Amazon",        domain: "amazon.com.br",        linkKey: "amazon",       color: "#ff9900", bgGlow: "rgba(255, 153, 0, 0.12)" },
  { key: "mercadolivre", label: "Mercado Livre",  domain: "mercadolivre.com.br",  linkKey: "mercadoLivre",  color: "#ffe600", bgGlow: "rgba(255, 230, 0, 0.12)" },
  { key: "shopee",       label: "Shopee",         domain: "shopee.com.br",        linkKey: "shopee",       color: "#ff5722", bgGlow: "rgba(255, 87, 34, 0.12)" },
  { key: "aliexpress",   label: "AliExpress",     domain: "aliexpress.com",       linkKey: "aliexpress",   color: "#e62e04", bgGlow: "rgba(230, 46, 4, 0.12)" },
  { key: "tiktok",       label: "TikTok Shop",    domain: "tiktok.com",           linkKey: "tiktok",       color: "#00f2fe", bgGlow: "rgba(0, 242, 254, 0.12)" },
  { key: "kabum",        label: "KaBuM",          domain: "kabum.com.br",         linkKey: "kabum",        color: "#0060ff", bgGlow: "rgba(0, 96, 255, 0.12)" },
  { key: "magalu",       label: "Magalu",         domain: "magazineluiza.com.br", linkKey: "magalu",       color: "#0086ff", bgGlow: "rgba(0, 134, 255, 0.12)" },
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
  if (!dateString) return "há pouco";
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return `agora`;
  if (diffInMinutes < 60) return `${diffInMinutes}m`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d`;
}

export function StoreFilter() {
  const [activeStore, setActiveStore] = useState<string | null>(null);
  const [hoveredStore, setHoveredStore] = useState<string | null>(null);
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
    <section className="w-full max-w-[1400px] mx-auto px-3 md:px-8 py-2 mb-3">
      {/* Título */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm md:text-base font-bold tracking-tight text-white">
          Featured Stores
        </h2>
        {activeStore && (
          <button
            onClick={() => setActiveStore(null)}
            className="flex text-xs font-semibold text-zinc-400 hover:text-white transition-colors items-center gap-1 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-full hover:bg-white/10"
          >
            Limpar Filtro
            <X size={12} weight="bold" />
          </button>
        )}
      </div>

      {/* ── MOBILE: Scroll horizontal de chips ── */}
      <div className="flex md:hidden gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide snap-x snap-mandatory">
        {STORES.map((store) => {
          const isActive = activeStore === store.key;
          const LogoComponent = {
            amazon: AmazonLogo,
            mercadolivre: MercadoLivreLogo,
            shopee: ShopeeLogo,
            aliexpress: AliExpressLogo,
            tiktok: TikTokShopLogo,
            kabum: KaBuMLogo,
            magalu: MagaluLogo,
          }[store.key] || (() => null);

          return (
            <button
              key={store.key}
              onClick={() => setActiveStore(isActive ? null : store.key)}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl shrink-0 snap-start transition-all duration-200 active:scale-95 border"
              style={{
                borderColor: store.color,
                background: "linear-gradient(180deg, #F3F4F6 0%, #D1D5DB 100%)",
                boxShadow: isActive 
                  ? `0 0 14px ${store.color}80, inset 0 0 6px ${store.color}20` 
                  : `0 0 8px ${store.color}25`,
                transform: isActive ? "scale(1.02)" : "scale(1)",
              }}
            >
              <div className="w-5 h-5 flex items-center justify-center shrink-0">
                <LogoComponent className="w-5 h-5 object-contain" />
              </div>
              <span
                className="text-[11px] font-bold tracking-wide transition-colors"
                style={{ color: store.key === "mercadolivre" ? "#2D3277" : "#111827" }}
              >
                {store.key === "mercadolivre" ? "mercado livre" : store.key === "kabum" ? "KaBuMI" : store.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── DESKTOP: Grid de cards ── */}
      <div className="hidden md:grid grid-cols-2 min-[480px]:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5 mb-4">
        {STORES.map((store) => {
          const isActive = activeStore === store.key;
          const LogoComponent = {
            amazon: AmazonLogo,
            mercadolivre: MercadoLivreLogo,
            shopee: ShopeeLogo,
            aliexpress: AliExpressLogo,
            tiktok: TikTokShopLogo,
            kabum: KaBuMLogo,
            magalu: MagaluLogo,
          }[store.key] || (() => null);

          return (
            <button
              key={store.key}
              onClick={() => setActiveStore(isActive ? null : store.key)}
              onMouseEnter={() => setHoveredStore(store.key)}
              onMouseLeave={() => setHoveredStore(null)}
              className="flex flex-col items-center justify-between p-2.5 rounded-xl transition-all duration-300 relative overflow-hidden group cursor-pointer h-[86px] border-[2px]"
              style={{
                borderColor: store.color,
                background: "linear-gradient(180deg, #F9FAFB 0%, #D1D5DB 100%)",
                boxShadow: isActive || hoveredStore === store.key
                  ? `0 0 18px ${store.color}80, inset 0 0 8px ${store.color}20`
                  : `0 0 10px ${store.color}35`,
                transform: isActive ? "scale(1.02)" : "scale(1)",
              }}
            >
              {/* Logo Area */}
              <div className="flex-1 w-full flex items-center justify-center p-2 min-h-0">
                {store.key === "mercadolivre" ? (
                  <img
                    src="/mercado livre.png"
                    alt={store.label}
                    className="w-full h-full max-h-[70px] max-w-[85%] object-contain transition-transform duration-300 group-hover:scale-105 shrink-0"
                  />
                ) : (
                  <LogoComponent className="w-full h-full max-h-[70px] max-w-[85%] object-contain transition-transform duration-300 group-hover:scale-105 shrink-0" />
                )}
              </div>
              
              {/* Label Area */}
              <div className="w-full flex items-center justify-center min-h-[24px]">
                {store.key === "mercadolivre" ? (
                  <span className="leading-[1.1] block font-bold text-[10.5px] text-[#2D3277] text-center select-none">
                    mercado<br />livre
                  </span>
                ) : store.key === "kabum" ? (
                  <span className="text-[10.5px] font-bold text-[#111827] text-center select-none">
                    KaBuMI
                  </span>
                ) : (
                  <span className="text-[10.5px] font-bold text-[#111827] text-center select-none">
                    {store.label}
                  </span>
                )}
              </div>

              {isActive && (
                <div className="absolute top-1.5 right-1.5 text-zinc-500 hover:text-zinc-800 transition-colors bg-white/60 p-0.5 rounded-full border border-zinc-300">
                  <X size={8} weight="bold" />
                </div>
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
            <div className="mt-8 pt-8 border-t border-white/[0.04]">
              {/* Header da seção expandida */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center p-2 shadow-lg shrink-0">
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${activeStoreInfo?.domain}&sz=128`}
                    alt={activeStoreInfo?.label}
                    className="w-full h-full object-contain mix-blend-multiply"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    Ofertas na {activeStoreInfo?.label}
                  </h3>
                  <p className="text-zinc-500 text-xs mt-0.5">Promoções de afiliados verificadas nesta loja</p>
                </div>
              </div>

              {/* Loading */}
              {loading && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="aspect-[4/5] bg-zinc-900/50 rounded-3xl animate-pulse" />
                  ))}
                </div>
              )}

              {/* Sem produtos */}
              {!loading && products.length === 0 && (
                <div className="text-center py-12 rounded-[20px] bg-card border border-border-custom text-zinc-500">
                  <p className="text-sm font-semibold">Nenhuma promoção encontrada nesta loja no momento.</p>
                  <p className="text-xs text-zinc-600 mt-1">Fique ligado! Atualizamos ofertas a todo instante.</p>
                </div>
              )}

              {/* Grid de produtos */}
              {!loading && products.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                  {products.map((product, index) => {
                    const discount = getSimulatedDiscount(product.id);
                    const price = product.price || 0;
                    const originalPrice = price > 0 ? price / (1 - discount / 100) : 0;

                    let mainPlatformText = activeStoreInfo?.label || "Oferta";
                    let mainPlatformLogo = `https://www.google.com/s2/favicons?domain=${activeStoreInfo?.domain}&sz=128`;

                    return (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05, type: "spring", stiffness: 100 }}
                        onClick={() => setSelectedProduct(product)}
                        className="group cursor-pointer bg-card border border-border-custom rounded-[20px] overflow-hidden flex flex-col relative transition-all duration-300 hover:-translate-y-1 hover:border-zinc-700/80"
                      >
                        {/* Imagem Container Wrapper (No overflow-hidden to allow badge to overlap) */}
                        <div className="w-full aspect-square relative">
                          {/* Imagem Container (With overflow-hidden for image hover scale zoom) */}
                          <div className="w-full h-full bg-zinc-900/30 flex items-center justify-center relative overflow-hidden border-b border-white/[0.04]">
                            <div className="absolute top-3.5 left-3.5 right-3.5 flex justify-between items-center z-10">
                              <span className="bg-[#ff334b] text-white font-bold text-[12px] px-2 py-0.5 rounded-[6px]">
                                -{discount}%
                              </span>
                              <span className="bg-white/15 text-white text-[11px] font-semibold px-2 py-0.5 rounded-[6px] flex items-center gap-1">
                                <Clock size={12} weight="bold" />
                                {getTimeAgo(product.createdAt)}
                              </span>
                            </div>

                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          </div>

                          {/* Overlapping Brand Badge */}
                          <div 
                            className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full shadow-md text-[10px] font-bold tracking-wide uppercase border flex items-center gap-1.5 z-20"
                            style={{
                              backgroundColor: activeStoreInfo?.color || "#ff334b",
                              borderColor: "rgba(255,255,255,0.1)",
                              color: activeStoreInfo?.key === "mercadolivre" ? "#000000" : "#ffffff"
                            }}
                          >
                            <img src={mainPlatformLogo} alt="" className="w-3 h-3 object-contain rounded-full" />
                            <span>{mainPlatformText}</span>
                          </div>
                        </div>

                        {/* Deal Body */}
                        <div className="p-4 pt-5 flex flex-col flex-1">
                          <span className="text-[10px] font-bold text-[#8e92a4] uppercase tracking-wider mb-1">
                            {product.category || "Oferta"}
                          </span>

                          <h3 className="text-sm font-bold text-white mb-2 line-clamp-2 leading-snug min-h-[38px] group-hover:text-[#ff334b] transition-colors">
                            {product.name}
                          </h3>

                          <div className="mt-auto flex flex-col">
                            {price > 0 ? (
                              <>
                                <span className="text-[12px] text-[#8e92a4] line-through leading-none mb-1">
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(originalPrice)}
                                </span>
                                <span className="text-base font-black text-[#ff334b]">
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price)}
                                </span>
                              </>
                            ) : (
                              <span className="text-sm font-bold text-[#ff334b]">Ver detalhes</span>
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
