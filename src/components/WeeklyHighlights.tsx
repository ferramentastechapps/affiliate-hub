"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { PlatformModal } from "./PlatformModal";
import { Clock } from "@phosphor-icons/react";

type Product = {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  price?: number;
  originalPrice?: number;
  description?: string;
  coupons?: { id: string; code: string; discount: string; platform: string }[];
  links: Record<string, string | undefined>;
  createdAt?: string;
};

// Deterministic discount based on ID


export function WeeklyHighlights() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          // Select products with highest discounts or simply first 3
          const formatted = data.map((p: any) => ({
            id: p.id,
            name: p.name,
            category: p.category,
            imageUrl: p.imageUrl,
            price: p.price,
            originalPrice: p.originalPrice,
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
            },
          }));
          setProducts(formatted.slice(0, 3));
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="w-full max-w-[1400px] mx-auto px-4 md:px-8 py-3 mb-4">
        <div className="h-5 w-40 bg-zinc-900 rounded-lg animate-pulse mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-zinc-900/50 rounded-[20px] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) return null;

  return (
    <section className="w-full max-w-[1400px] mx-auto px-3 md:px-8 py-2 mb-3">
      {/* Cabeçalho Seção */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm md:text-lg font-black tracking-tight text-white">
          Destaques da Semana
        </h2>
        <a 
          href="#ofertas" 
          className="flex text-[11px] font-bold text-zinc-400 hover:text-white transition-all duration-200 items-center gap-1 bg-white/5 border border-white/5 hover:border-white/10 px-3.5 py-1.5 rounded-full hover:bg-white/10"
        >
          Ver todos
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-70">
            <path d="M6 12L10 8L6 4" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </a>
      </div>

      {/* Grid de Destaques (Scrollable on mobile) */}
      <div className="flex md:grid md:grid-cols-3 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 gap-4 scrollbar-hide snap-x snap-mandatory">
        {products.map((product) => {
          const price = product.price || 0;
          const originalPrice = product.originalPrice || 0;
          const discount = (originalPrice > price && price > 0)
            ? Math.round(((originalPrice - price) / originalPrice) * 100)
            : 0;

          return (
            <motion.div
              key={product.id}
              onClick={() => setSelectedProduct(product)}
              whileHover={{ y: -3 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="group cursor-pointer bg-card hover:bg-[#161722] border border-white/5 hover:border-white/10 rounded-2xl p-4 relative flex items-center justify-between overflow-hidden select-none transition-all duration-300 h-32 shadow-lg hover:shadow-black/40 w-[260px] shrink-0 md:w-auto snap-start"
            >
              {/* Radial gradient background based on index */}
              <div
                className="absolute inset-0 z-0 opacity-80 transition-opacity duration-300 group-hover:opacity-100"
                style={{
                  background:
                    products.indexOf(product) === 0
                      ? "radial-gradient(circle at 75% 30%, #501015 0%, #12141c 100%)"
                      : products.indexOf(product) === 1
                      ? "radial-gradient(circle at 75% 30%, #1b3a24 0%, #12141c 100%)"
                      : "radial-gradient(circle at 75% 30%, #102e50 0%, #12141c 100%)",
                }}
              />

              {/* Left Column (Text & Price info) */}
              <div className="relative z-10 flex flex-col justify-between h-full flex-1 pr-4">
                {/* Discount Badge */}
                {discount > 0 && (
                  <div className="flex items-center gap-1.5 self-start">
                    <span className="bg-[#ff334b] text-white text-[11px] font-extrabold px-2 py-0.5 rounded-[6px] uppercase tracking-wider flex items-center gap-1">
                      -{discount}%
                    </span>
                  </div>
                )}
                
                {/* Product Title */}
                <h3 className="text-white font-bold text-sm sm:text-base leading-snug line-clamp-2 mt-2 mb-2 group-hover:text-[#ff334b] transition-colors">
                  {product.name}
                </h3>

                {/* Price Tag */}
                <div className="flex flex-col mt-auto">
                  {price > 0 && discount > 0 && (
                    <span className="text-[11px] text-[#8e92a4] line-through leading-none mb-1">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(originalPrice)}
                    </span>
                  )}
                  <span className="text-base sm:text-lg font-black text-[#ff334b] transition-colors">
                    {price > 0
                      ? new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                      }).format(price)
                      : "Ver oferta"}
                  </span>
                </div>
              </div>

              {/* Right Column (Image Container) */}
              <div className="relative z-10 w-32 h-32 shrink-0 overflow-hidden flex items-center justify-center bg-white rounded-2xl p-1 transition-all duration-300 group-hover:scale-105 shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/placeholder.webp";
                  }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Dots de navegação simulados estilo mockup */}
      <div className="flex justify-center gap-2 mt-3">
        {[0, 1, 2].map((i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === currentIndex ? "w-6 bg-white" : "w-2 bg-white/20"
            }`}
            aria-label={`Página ${i + 1}`}
          />
        ))}
      </div>

      <PlatformModal
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        product={selectedProduct}
      />
    </section>
  );
}
