"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Tag, CaretLeft } from "@phosphor-icons/react";
import { PlatformModal } from "./PlatformModal";

const CATEGORIES = [
  // Eletrônicos e Tech
  { key: "smartphones", label: "Smartphones", icon: "📱" },
  { key: "smart-tvs", label: "Smart TVs", icon: "📺" },
  { key: "fones-de-ouvido", label: "Fones de Ouvido", icon: "🎧" },
  { key: "caixas-de-som", label: "Caixas de Som", icon: "🔊" },
  { key: "smartwatches", label: "Smartwatches", icon: "⌚" },
  { key: "cameras", label: "Câmeras", icon: "📷" },
  { key: "tablets", label: "Tablets", icon: "🗂️" },
  // Informática e Games
  { key: "notebooks", label: "Notebooks", icon: "💻" },
  { key: "pcs-e-desktops", label: "PCs e Desktops", icon: "🖥️" },
  { key: "monitores", label: "Monitores", icon: "🖱️" },
  { key: "perifericos", label: "Periféricos", icon: "⌨️" },
  { key: "ssd-hds-memoria", label: "SSD, HDs e Memória", icon: "💾" },
  { key: "consoles-e-games", label: "Consoles e Games", icon: "🎮" },
  // Casa e Eletrodomésticos
  { key: "air-fryers", label: "Air Fryers", icon: "🍟" },
  { key: "cafeteiras", label: "Cafeteiras", icon: "☕" },
  { key: "geladeiras", label: "Geladeiras e Freezers", icon: "🧊" },
  { key: "lavadoras", label: "Lavadoras", icon: "🫧" },
  { key: "micro-ondas", label: "Micro-ondas", icon: "📡" },
  { key: "aspiradores", label: "Aspiradores", icon: "🌀" },
  { key: "ar-condicionado", label: "Ar Condicionado", icon: "❄️" },
  // Moda e Acessórios
  { key: "tenis-calcados", label: "Tênis e Calçados", icon: "👟" },
  { key: "roupas-moda", label: "Roupas e Moda", icon: "👕" },
  { key: "bolsas-acessorios", label: "Bolsas e Acessórios", icon: "👜" },
  // Saúde e Beleza
  { key: "perfumes", label: "Perfumes", icon: "🌺" },
  { key: "maquiagem-pele", label: "Maquiagem e Pele", icon: "💄" },
  { key: "shampoo-cabelo", label: "Shampoo e Cabelo", icon: "💆" },
  // Esporte e Suplementos
  { key: "whey-suplementos", label: "Whey e Suplementos", icon: "💪" },
  { key: "bicicletas-esporte", label: "Bicicletas e Esporte", icon: "🚴" },
  // Supermercado
  { key: "chocolates-doces", label: "Chocolates e Doces", icon: "🍫" },
  { key: "cafe-bebidas", label: "Café e Bebidas", icon: "☕" },
  { key: "cervejas-vinhos", label: "Cervejas e Vinhos", icon: "🍺" },
  // Outros
  { key: "livros-ereaders", label: "Livros e eReaders", icon: "📚" },
  { key: "bebes-criancas", label: "Bebês e Crianças", icon: "👶" },
  { key: "pet", label: "Pet", icon: "🐾" },
  { key: "ferramentas", label: "Ferramentas", icon: "🔧" },
  { key: "automotivo", label: "Automotivo", icon: "🚗" },
  { key: "viagem", label: "Viagem", icon: "✈️" },
  { key: "diversos", label: "Diversos", icon: "🔖" },
];

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
  shortId?: number;
};



import { useRouter } from "next/navigation";

export function CategoriesModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Sync hash and custom events to open the modal
  useEffect(() => {
    const checkHash = () => {
      if (window.location.hash === "#categorias") {
        setIsOpen(true);
      }
    };

    const handleOpen = () => setIsOpen(true);
    window.addEventListener("open-categories", handleOpen);
    window.addEventListener("hashchange", checkHash);

    // Initial check
    checkHash();

    return () => {
      window.removeEventListener("open-categories", handleOpen);
      window.removeEventListener("hashchange", checkHash);
    };
  }, []);

  // Control body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      if (!selectedProduct) {
        document.body.style.overflow = "unset";
      }
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, selectedProduct]);

  // Load products when a category is selected
  useEffect(() => {
    if (!activeCategory) {
      setProducts([]);
      return;
    }
    setLoading(true);
    setProducts([]);

    const activeCatObj = CATEGORIES.find((c) => c.key === activeCategory);
    const categoryName = activeCatObj?.label || "";

    fetch(`/api/products?category=${encodeURIComponent(categoryName)}`)
      .then((r) => r.json())
      .then((data: any[]) => {
        if (!Array.isArray(data)) return;

        setProducts(
          data.map((p) => ({
            id: p.id,
            shortId: p.shortId,
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
            },
          }))
        );
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeCategory]);

  const handleClose = () => {
    setIsOpen(false);
    setActiveCategory(null);
    // Clear hash cleanly
    if (window.location.hash === "#categorias") {
      window.history.pushState("", document.title, window.location.pathname + window.location.search);
    }
  };

  const activeCategoryInfo = CATEGORIES.find((c) => c.key === activeCategory);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center p-4 min-h-screen"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
              onClick={handleClose}
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{
                scale: 1,
                opacity: 1,
                y: 0,
                transition: { type: "spring", stiffness: 300, damping: 30 },
              }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative w-full max-w-4xl glass-3d-card rounded-[2.5rem] flex flex-col overflow-hidden max-h-[85vh] mx-2 sm:mx-0 z-10"
            >
              {/* Close Button */}
              <button
                onClick={handleClose}
                aria-label="Fechar modal"
                className="absolute top-4 right-4 z-20 p-3 bg-black/40 backdrop-blur-md rounded-full hover:bg-white/20 transition-colors border border-white/10 text-white min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <X size={20} weight="bold" />
              </button>

              <div className="overflow-y-auto hidden-scrollbar flex-1 p-6 sm:p-8 pb-10">
                <AnimatePresence mode="wait">
                  {!activeCategory ? (
                    <motion.div
                      key="categories-view"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col h-full"
                    >
                      {/* Header */}
                      <div className="flex items-center gap-3 mb-8">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-accent/20 to-purple-500/20">
                          <Tag size={24} weight="fill" className="text-accent" />
                        </div>
                        <div>
                          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white mb-1">
                            Categorias
                          </h2>
                          <p className="text-zinc-400 text-sm">
                            Explore produtos por categoria
                          </p>
                        </div>
                      </div>

                      {/* Categories Grid Selector - 2 cols on mobile */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {CATEGORIES.map((category) => (
                          <button
                            key={category.key}
                            onClick={() => setActiveCategory(category.key)}
                            className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-[20px] transition-all duration-300 text-center sm:text-left border bg-black/20 border-white/10 hover:bg-white/10 group"
                          >
                            <div className="p-2 rounded-xl bg-white/5 text-2xl group-hover:bg-accent/10 transition-colors">
                              <span>{category.icon}</span>
                            </div>
                            <span className="text-xs sm:text-sm font-bold leading-tight text-zinc-300 group-hover:text-white transition-colors break-words w-full">
                              {category.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="products-view"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col h-full"
                    >
                      {/* Back Button & Header */}
                      <div className="flex items-center gap-4 mb-8">
                        <button
                          onClick={() => setActiveCategory(null)}
                          className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-zinc-300 hover:text-white border border-white/5 flex-shrink-0"
                        >
                          <CaretLeft size={20} weight="bold" />
                        </button>
                        <div>
                          <h3 className="text-xl sm:text-2xl font-semibold tracking-tight text-white mb-1 flex items-center gap-2">
                            {activeCategoryInfo && (
                              <span className="text-2xl">{activeCategoryInfo.icon}</span>
                            )}
                            {activeCategoryInfo?.label}
                          </h3>
                          <p className="text-zinc-400 text-xs sm:text-sm">
                            Produtos disponíveis nesta categoria
                          </p>
                        </div>
                      </div>

                      {/* Loading */}
                      {loading && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {[1, 2, 3, 4].map((i) => (
                            <div
                              key={i}
                              className="h-48 bg-zinc-900/50 rounded-2xl animate-pulse"
                            />
                          ))}
                        </div>
                      )}

                      {/* No Products */}
                      {!loading && products.length === 0 && (
                        <div className="text-center py-12 text-zinc-500 border border-dashed border-white/5 rounded-2xl">
                          <p className="text-sm">
                            Nenhum produto nesta categoria ainda.
                          </p>
                        </div>
                      )}

                      {/* Products Grid */}
                      {!loading && products.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {products.map((product, index) => {
                            const price = product.price || 0;
                            const originalPrice = product.originalPrice || 0;
                            const discount = (originalPrice > price && price > 0)
                              ? Math.round(((originalPrice - price) / originalPrice) * 100)
                              : 0;

                            let mainPlatformText = "Link";
                            let mainPlatformLogo =
                              "https://www.google.com/s2/favicons?domain=amazon.com&sz=64";
                            if (product.links?.amazon) {
                              mainPlatformText = "Amazon";
                              mainPlatformLogo =
                                "https://www.google.com/s2/favicons?domain=amazon.com.br&sz=64";
                            } else if (product.links?.mercadoLivre) {
                              mainPlatformText = "Mercado Livre";
                              mainPlatformLogo =
                                "https://www.google.com/s2/favicons?domain=mercadolivre.com.br&sz=64";
                            } else if (product.links?.shopee) {
                              mainPlatformText = "Shopee";
                              mainPlatformLogo =
                                "https://www.google.com/s2/favicons?domain=shopee.com.br&sz=64";
                            } else if (product.links?.aliexpress) {
                              mainPlatformText = "AliExpress";
                              mainPlatformLogo =
                                "https://www.google.com/s2/favicons?domain=aliexpress.com&sz=64";
                            } else if (product.links?.tiktok) {
                              mainPlatformText = "TikTok Shop";
                              mainPlatformLogo =
                                "https://www.google.com/s2/favicons?domain=tiktok.com&sz=64";
                            }

                            return (
                              <motion.div
                                key={product.id}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{
                                  delay: index * 0.05,
                                  type: "spring",
                                  stiffness: 100,
                                }}
                                onClick={() => {
                                  handleClose();
                                  router.push(`/produto/${product.shortId || product.id}`);
                                }}
                                className="group cursor-pointer glass-3d-card rounded-[20px] p-4 flex flex-col relative transition-all duration-300"
                              >
                                {/* Badge Desconto */}
                                {discount > 0 && (
                                  <div className="absolute top-2.5 right-2.5 z-10 bg-red-600 text-white font-bold text-[10px] sm:text-xs px-2 py-1 rounded-lg">
                                    -{discount}%
                                  </div>
                                )}

                                <div className="w-full aspect-square bg-black/40 rounded-xl mb-3 relative overflow-hidden flex items-center justify-center">
                                  <img
                                    src={product.imageUrl}
                                    alt={product.name}
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = "/placeholder.webp";
                                    }}
                                  />
                                </div>

                                {/* Content */}
                                <div className="flex flex-col flex-grow">
                                  <h4 className="text-white font-bold text-xs sm:text-sm leading-snug line-clamp-2 mb-2 group-hover:text-accent transition-colors">
                                    {product.name}
                                  </h4>
                                  <div className="mt-auto pt-2 border-t border-zinc-800/50 flex flex-col">
                                    {price > 0 ? (
                                      <>
                                        {discount > 0 && (
                                          <span className="text-zinc-500 text-[10px] line-through font-normal">
                                            {new Intl.NumberFormat("pt-BR", {
                                              style: "currency",
                                              currency: "BRL",
                                            }).format(originalPrice)}
                                          </span>
                                        )}
                                        <span className="text-sm sm:text-base font-bold text-white tracking-tight">
                                          {new Intl.NumberFormat("pt-BR", {
                                            style: "currency",
                                            currency: "BRL",
                                          }).format(price)}
                                        </span>
                                      </>
                                    ) : (
                                      <span className="text-xs font-bold text-accent">
                                        Ver oferta
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product Details Modal inside the portal scope */}
      <PlatformModal
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        product={selectedProduct}
        onSelectRelated={setSelectedProduct}
      />
    </>
  );
}
