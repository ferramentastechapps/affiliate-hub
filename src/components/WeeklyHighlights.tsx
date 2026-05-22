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
  description?: string;
  coupons?: { id: string; code: string; discount: string; platform: string }[];
  links: Record<string, string | undefined>;
  createdAt?: string;
};

// Deterministic discount based on ID
function getSimulatedDiscount(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return 15 + (Math.abs(hash) % 45);
}

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
      <div className="w-full max-w-[1400px] mx-auto px-4 md:px-8 py-6 mb-12">
        <div className="h-6 w-48 bg-zinc-900 rounded-lg animate-pulse mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 bg-zinc-900/50 rounded-[24px] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) return null;

  return (
    <section className="w-full max-w-[1400px] mx-auto px-4 md:px-8 py-6 mb-12">
      {/* Cabeçalho Seção */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          Destaques da Semana
        </h2>
      </div>

      {/* Grid de Destaques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {products.map((product) => {
          const discount = getSimulatedDiscount(product.id);
          const price = product.price || 0;
          const originalPrice = price > 0 ? price / (1 - discount / 100) : 0;

          return (
            <motion.div
              key={product.id}
              onClick={() => setSelectedProduct(product)}
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="group cursor-pointer bg-card border border-border-custom rounded-[20px] relative aspect-video flex flex-col justify-end p-6 overflow-hidden select-none"
            >
              {/* Radial gradient background based on index */}
              <div
                className="absolute inset-0 z-0 transition-transform duration-500 group-hover:scale-105"
                style={{
                  background:
                    products.indexOf(product) === 0
                      ? "radial-gradient(circle at 80% 20%, rgba(255, 51, 75, 0.25) 0%, #12141c 100%)"
                      : products.indexOf(product) === 1
                      ? "radial-gradient(circle at 80% 20%, rgba(40, 167, 69, 0.25) 0%, #12141c 100%)"
                      : "radial-gradient(circle at 80% 20%, rgba(0, 96, 255, 0.25) 0%, #12141c 100%)",
                }}
              />

              {/* Floating Image */}
              <img
                src={product.imageUrl}
                alt=""
                className="absolute right-6 top-6 w-24 h-24 z-1 opacity-70 object-contain group-hover:scale-110 group-hover:opacity-90 transition-all duration-500"
              />

              {/* Card Overlay for readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#090a0f]/95 via-[#090a0f]/40 to-transparent z-2" />

              {/* Card Content */}
              <div className="relative z-3 flex flex-col pointer-events-none">
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-[#ff334b] text-white font-bold text-[12px] px-2 py-0.5 rounded-[6px]">
                    -{discount}%
                  </span>
                </div>
                
                <h3 className="text-white font-semibold text-sm md:text-base leading-snug line-clamp-2 mb-2 max-w-[70%]">
                  {product.name}
                </h3>

                <div className="flex items-baseline gap-2 mt-1">
                  {price > 0 && (
                    <span className="text-[12px] text-[#8e92a4] line-through">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(originalPrice)}
                    </span>
                  )}
                  <span className="text-lg font-extrabold text-white">
                    {price > 0
                      ? new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(price)
                      : "Ver oferta"}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Dots de navegação simulados estilo mockup */}
      <div className="flex justify-center gap-2 mt-6">
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
