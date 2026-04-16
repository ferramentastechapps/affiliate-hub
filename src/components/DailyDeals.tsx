"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Product } from "./ProductCard";
import { PlatformModal } from "./PlatformModal";
import { ArrowUpRight, Clock } from "@phosphor-icons/react";

// Helper for deterministic discount simulation based on string ID
function getSimulatedDiscount(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return 15 + (Math.abs(hash) % 45); // between 15% and 60%
}

function getTimeAgo(dateString?: string | Date) {
  if (!dateString) return "há pouco tempo";
  
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return `agora mesmo`;
  if (diffInMinutes < 60) return `há ${diffInMinutes} min`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `há ${diffInHours} ${diffInHours === 1 ? 'h' : 'h'}`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `há ${diffInDays} ${diffInDays === 1 ? 'dia' : 'dias'}`;
}

export function DailyDeals() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [allProducts, setAllProducts] = useState<(Product & { createdAt?: string })[]>([]);
  const [products, setProducts] = useState<(Product & { createdAt?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      
      if (data && data.length > 0) {
        const parsedProducts = data.map((p: any) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          imageUrl: p.imageUrl,
          price: p.price,
          createdAt: p.createdAt,
          links: {
            amazon: p.links?.amazon,
            mercadoLivre: p.links?.mercadoLivre,
            shopee: p.links?.shopee,
            aliexpress: p.links?.aliexpress,
            tiktok: p.links?.tiktok,
          }
        }));
        setAllProducts(parsedProducts);
        setProducts(parsedProducts.slice(0, 4));
      }
    } catch (error) {
      console.error("Erro ao buscar promoções:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="w-full flex gap-4 overflow-hidden px-4 md:px-8 py-8 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-[380px] w-full md:w-[320px] bg-zinc-900/50 rounded-3xl" />
        ))}
      </div>
    );
  }

  if (allProducts.length === 0) {
    return null; // Não renderizar se não houver promoções
  }

  const displayProducts = showAll ? allProducts : products;

  return (
    <section className="w-full max-w-[1400px] mx-auto px-4 md:px-8 mb-16 relative">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-white mb-2 flex items-center gap-3">
            Promoções do dia
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          </h2>
          <p className="text-zinc-400 text-sm">As ofertas mais quentes adicionadas recentemente</p>
        </div>
        {allProducts.length > 4 && (
          <button 
            onClick={() => setShowAll(!showAll)}
            className="flex text-sm font-medium text-accent hover:text-white transition-colors items-center gap-1 bg-accent/10 px-4 py-2 rounded-full hover:bg-accent/20"
          >
            {showAll ? "Esconder" : "Ver todas"} <ArrowUpRight weight="bold" className={showAll ? "rotate-180 transition-transform" : "transition-transform"} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {displayProducts.map((product, index) => {
          const discount = getSimulatedDiscount(product.id);
          // original price calculation
          const price = product.price || 0;
          const originalPrice = price > 0 ? price / (1 - discount / 100) : 0;

          // Extrair a plataforma principal
          let mainPlatformText = "Link";
          if (product.links?.amazon) mainPlatformText = "Amazon";
          else if (product.links?.mercadoLivre) mainPlatformText = "Mercado Livre";
          else if (product.links?.shopee) mainPlatformText = "Shopee";
          else if (product.links?.aliexpress) mainPlatformText = "AliExpress";

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
              <div className="absolute top-4 right-4 z-10 bg-gradient-to-br from-red-500 to-rose-600 text-white font-black text-sm px-3 py-1.5 rounded-xl border border-white/20 shadow-lg flex items-center gap-1">
                -{discount}%
              </div>

              {/* Time Ago */}
              <div className="flex items-center gap-1 text-xs text-zinc-400 font-medium mb-4">
                <Clock size={14} />
                {getTimeAgo(product.createdAt)}
              </div>

              {/* Imagem (Area com bg branco para destacar produtos como no mockup) */}
              <div className="w-full aspect-square bg-zinc-100 rounded-2xl mb-5 relative overflow-hidden flex items-center justify-center p-4">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110 mix-blend-multiply"
                  style={{ filter: "drop-shadow(0px 10px 15px rgba(0,0,0,0.1))" }}
                />
                
                {/* Store mini logo/badge floating on image */}
                <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-md rounded-full shadow-md px-3 py-1.5 border border-zinc-200 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-zinc-800 uppercase tracking-wider">
                    {mainPlatformText}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="flex flex-col flex-grow">
                <span className="text-[11px] font-mono font-medium tracking-wider text-accent/80 uppercase mb-2 line-clamp-1 block">
                  {product.category}
                </span>
                <h3 className="text-white font-medium text-[15px] leading-snug line-clamp-2 mb-4 group-hover:text-accent/90 transition-colors">
                  {product.name}
                </h3>

                <div className="mt-auto pt-2 border-t border-zinc-800/50 flex flex-col">
                  {price > 0 ? (
                    <>
                      <span className="text-zinc-500 text-xs line-through font-medium mb-0.5">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(originalPrice)}
                      </span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-bold text-white tracking-tight">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="text-lg font-bold text-accent">Ver oferta</div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <PlatformModal 
        isOpen={!!selectedProduct} 
        onClose={() => setSelectedProduct(null)}
        productName={selectedProduct?.name || ""}
        links={selectedProduct?.links || {}}
      />
    </section>
  );
}
