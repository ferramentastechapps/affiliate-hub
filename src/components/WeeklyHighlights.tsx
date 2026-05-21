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
              whileHover={{ y: -4, scale: 1.01 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="cursor-pointer bg-zinc-900/30 backdrop-blur-md border border-zinc-800/80 hover:border-zinc-700/80 rounded-[24px] p-5 flex items-center justify-between gap-4 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(37,99,235,0.05)]"
            >
              {/* Informações (Esquerda) */}
              <div className="flex flex-col flex-1 min-w-0">
                {/* Desconto */}
                <div className="bg-red-500/10 text-red-500 border border-red-500/20 text-xs font-bold px-2.5 py-1 rounded-xl w-fit mb-3">
                  -{discount}%
                </div>

                {/* Título do Produto */}
                <h3 className="text-white font-bold text-sm leading-snug line-clamp-2 mb-3">
                  {product.name}
                </h3>

                {/* Preços */}
                <div className="flex flex-col mt-auto">
                  {price > 0 && (
                    <span className="text-zinc-500 text-xs line-through mb-0.5">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(originalPrice)}
                    </span>
                  )}
                  <span className="text-base font-extrabold text-white tracking-tight">
                    {price > 0
                      ? new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(price)
                      : "Ver oferta"}
                  </span>
                </div>
              </div>

              {/* Imagem (Direita) */}
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-zinc-950 shrink-0 relative">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Dots de navegação simulados */}
      <div className="flex justify-center gap-1.5 mt-6">
        {[0, 1, 2].map((i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === currentIndex ? "w-6 bg-zinc-600" : "w-1.5 bg-zinc-800"
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
