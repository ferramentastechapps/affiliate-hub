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
      <p className="text-zinc-400 text-sm font-medium mb-4">
        Compre no site de suas lojas favoritas:
      </p>

      {/* Ícones das lojas */}
      <div className="flex flex-wrap gap-3">
        {STORES.map((store) => (
          <button
            key={store.key}
            onClick={() => setActiveStore(activeStore === store.key ? null : store.key)}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border transition-all duration-200 ${
              activeStore === store.key
                ? "bg-accent/15 border-accent/50 shadow-lg shadow-accent/10"
                : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
            }`}
          >
            <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center overflow-hidden shrink-0 p-0.5">
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
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center p-1 shadow">
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${activeStoreInfo?.domain}&sz=64`}
                    alt={activeStoreInfo?.label}
                    className="w-full h-full object-contain mix-blend-multiply"
                  />
                </div>
                <h3 className="text-white font-bold text-lg">
                  Ofertas na {activeStoreInfo?.label}
                </h3>
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
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  {products.map((product, index) => {
                    const discount = getSimulatedDiscount(product.id);
                    const price = product.price || 0;
                    const originalPrice = price > 0 ? price / (1 - discount / 100) : 0;

                    return (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.04, type: "spring", stiffness: 120 }}
                        onClick={() => setSelectedProduct(product)}
                        className="group cursor-pointer bg-zinc-900/80 border border-zinc-800/80 hover:border-accent/40 rounded-2xl p-3 flex flex-col transition-all hover:-translate-y-1 hover:shadow-[0_6px_20px_-8px_var(--accent)]"
                      >
                        {/* Badge desconto */}
                        <div className="relative w-full aspect-square bg-zinc-100 rounded-xl mb-3 overflow-hidden">
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                          {discount > 0 && (
                            <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-lg">
                              -{discount}%
                            </div>
                          )}
                          {product.coupons && product.coupons.length > 0 && (
                            <div className="absolute bottom-2 left-2 bg-accent text-white text-[9px] font-bold px-2 py-0.5 rounded-lg">
                              🎟️ CUPOM
                            </div>
                          )}
                        </div>

                        <p className="text-white text-xs font-medium line-clamp-2 leading-snug mb-2 group-hover:text-accent/90 transition-colors">
                          {product.name}
                        </p>

                        <div className="mt-auto">
                          {price > 0 ? (
                            <>
                              <span className="text-zinc-600 text-[10px] line-through block">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(originalPrice)}
                              </span>
                              <span className="text-white font-bold text-sm">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price)}
                              </span>
                            </>
                          ) : (
                            <span className="text-accent font-bold text-sm">Ver oferta</span>
                          )}
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
