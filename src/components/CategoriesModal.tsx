"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Tag,
  DeviceMobile,
  GameController,
  House,
  TShirt,
  Baby,
  Sparkle,
  Barbell,
  ShoppingCart,
  BookOpen,
  Wrench,
  Car,
  PawPrint,
  Airplane,
  Package
} from "@phosphor-icons/react";
import { PlatformModal } from "./PlatformModal";

const CATEGORIES = [
  { key: "smartphones-tv", label: "Smartphones e TV", icon: DeviceMobile },
  { key: "games", label: "Informática e Games", icon: GameController },
  { key: "casa", label: "Casa e Eletrodomésticos", icon: House },
  { key: "moda", label: "Moda e Acessórios", icon: TShirt },
  { key: "bebes", label: "Bebês e Crianças", icon: Baby },
  { key: "saude", label: "Saúde e Beleza", icon: Sparkle },
  { key: "esporte", label: "Esporte e Suplementos", icon: Barbell },
  { key: "supermercado", label: "Supermercado e Delivery", icon: ShoppingCart },
  { key: "livros", label: "Livros, eBooks e eReaders", icon: BookOpen },
  { key: "ferramentas", label: "Ferramentas e Jardim", icon: Wrench },
  { key: "automotivo", label: "Automotivo", icon: Car },
  { key: "pet", label: "Pet", icon: PawPrint },
  { key: "viagem", label: "Viagem", icon: Airplane },
  { key: "diversos", label: "Diversos", icon: Package }
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
};



export function CategoriesModal() {
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

    fetch("/api/products")
      .then((r) => r.json())
      .then((data: any[]) => {
        if (!Array.isArray(data)) return;

        const activeCatObj = CATEGORIES.find((c) => c.key === activeCategory);
        const filtered = data.filter((p) => {
          return p.category === activeCatObj?.label;
        });

        setProducts(
          filtered.map((p) => ({
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

                {/* Categories Grid Selector */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
                  {CATEGORIES.map((category) => (
                    <button
                      key={category.key}
                      onClick={() =>
                        setActiveCategory(
                          activeCategory === category.key ? null : category.key
                        )
                      }
                      className={`flex items-center gap-4 px-5 py-4 rounded-[20px] transition-all duration-300 text-left border ${
                        activeCategory === category.key
                          ? "btn-3d text-white border-transparent"
                          : "bg-black/20 border-white/10 hover:bg-white/10"
                      }`}
                    >
                      <div className={`p-2 rounded-xl transition-all duration-300 ${
                        activeCategory === category.key
                          ? "text-white"
                          : "bg-white/5 text-zinc-400"
                      }`}>
                        <category.icon size={24} weight={activeCategory === category.key ? "fill" : "duotone"} />
                      </div>
                      <span
                        className={`text-sm sm:text-base font-bold transition-colors duration-300 ${
                          activeCategory === category.key
                            ? "text-white"
                            : "text-zinc-300"
                        }`}
                      >
                        {category.label}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Products section inside Modal */}
                <AnimatePresence mode="wait">
                  {activeCategory ? (
                    <motion.div
                      key={activeCategory}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-white/5 pt-6 mt-6"
                    >
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="text-xl sm:text-2xl font-semibold tracking-tight text-white mb-1 flex items-center gap-3">
                            {activeCategoryInfo && (
                              <div className="p-2 rounded-xl bg-accent/20 text-accent">
                                <activeCategoryInfo.icon size={26} weight="fill" />
                              </div>
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
                          {[1, 2, 3].map((i) => (
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
                                onClick={() => setSelectedProduct(product)}
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
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-center py-20 text-zinc-500 border border-dashed border-white/5 rounded-[2rem] flex flex-col items-center justify-center mt-6"
                    >
                      <Tag size={40} className="text-zinc-600 mb-3" />
                      <p className="text-sm font-medium">
                        Selecione uma categoria acima para explorar as ofertas
                      </p>
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
