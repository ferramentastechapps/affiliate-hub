"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ProductCard, type Product } from "@/components/ProductCard";
import { PlatformModal } from "@/components/PlatformModal";

export function ProductGridStatic({ products, title, subtitle }: { products: Product[], title: string, subtitle?: string }) {
  const router = useRouter();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  if (products.length === 0) {
    return (
      <div className="text-center py-20 text-zinc-400">
        <h3 className="text-xl font-medium mb-2">Nenhum produto encontrado</h3>
        <p>Ainda não há ofertas ativas para esta pesquisa.</p>
      </div>
    );
  }

  return (
    <section className="w-full max-w-[1400px] mx-auto px-4 md:px-8 pb-32 pt-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white mb-2 flex items-center gap-3">
            {title}
          </h1>
          {subtitle && <p className="text-zinc-400 text-sm max-w-2xl">{subtitle}</p>}
        </div>
      </div>

      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full"
        variants={{
          hidden: { opacity: 0 },
          show: { opacity: 1, transition: { staggerChildren: 0.1 } }
        }}
        initial="hidden"
        animate="show"
      >
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onClick={(product) => router.push(`/produto/${product.shortId || product.id}`)}
          />
        ))}
      </motion.div>

      <PlatformModal
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        product={selectedProduct}
        onSelectRelated={setSelectedProduct}
      />
    </section>
  );
}
