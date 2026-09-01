"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Tag, CaretLeft, MagnifyingGlass, Sparkle } from "@phosphor-icons/react";
import { PlatformModal } from "./PlatformModal";
import { Product } from "@/types/product";
import { useRouter } from "next/navigation";

// Lista de categorias com ícones e paletas temáticas
const RAW_CATEGORIES = [
  { key: "air-fryers", label: "Air Fryers", icon: "🍟", gradient: "from-amber-500/20 to-orange-500/10", border: "hover:border-amber-500/40" },
  { key: "ar-condicionado", label: "Ar Condicionado", icon: "❄️", gradient: "from-cyan-500/20 to-blue-500/10", border: "hover:border-cyan-500/40" },
  { key: "aspiradores", label: "Aspiradores", icon: "🌀", gradient: "from-sky-500/20 to-indigo-500/10", border: "hover:border-sky-500/40" },
  { key: "automotivo", label: "Automotivo", icon: "🚗", gradient: "from-red-500/20 to-rose-500/10", border: "hover:border-red-500/40" },
  { key: "bebes-criancas", label: "Bebês e Crianças", icon: "👶", gradient: "from-pink-500/20 to-rose-500/10", border: "hover:border-pink-500/40" },
  { key: "bicicletas-esporte", label: "Bicicletas e Esporte", icon: "🚴", gradient: "from-emerald-500/20 to-teal-500/10", border: "hover:border-emerald-500/40" },
  { key: "bolsas-acessorios", label: "Bolsas e Acessórios", icon: "👜", gradient: "from-purple-500/20 to-fuchsia-500/10", border: "hover:border-purple-500/40" },
  { key: "cafe-bebidas", label: "Café e Bebidas", icon: "☕", gradient: "from-amber-600/20 to-orange-600/10", border: "hover:border-amber-600/40" },
  { key: "cafeteiras", label: "Cafeteiras", icon: "☕", gradient: "from-yellow-600/20 to-amber-600/10", border: "hover:border-yellow-600/40" },
  { key: "caixas-de-som", label: "Caixas de Som", icon: "🔊", gradient: "from-violet-500/20 to-purple-500/10", border: "hover:border-violet-500/40" },
  { key: "cameras", label: "Câmeras", icon: "📷", gradient: "from-blue-500/20 to-indigo-500/10", border: "hover:border-blue-500/40" },
  { key: "cervejas-vinhos", label: "Cervejas e Vinhos", icon: "🍺", gradient: "from-amber-500/20 to-yellow-500/10", border: "hover:border-amber-500/40" },
  { key: "chocolates-doces", label: "Chocolates e Doces", icon: "🍫", gradient: "from-amber-700/20 to-yellow-600/10", border: "hover:border-amber-700/40" },
  { key: "consoles-e-games", label: "Consoles e Games", icon: "🎮", gradient: "from-purple-600/20 to-indigo-600/10", border: "hover:border-purple-600/40" },
  { key: "diversos", label: "Diversos", icon: "🔖", gradient: "from-zinc-500/20 to-zinc-600/10", border: "hover:border-zinc-500/40" },
  { key: "ferramentas", label: "Ferramentas", icon: "🔧", gradient: "from-orange-500/20 to-amber-500/10", border: "hover:border-orange-500/40" },
  { key: "fones-de-ouvido", label: "Fones de Ouvido", icon: "🎧", gradient: "from-indigo-500/20 to-blue-500/10", border: "hover:border-indigo-500/40" },
  { key: "geladeiras", label: "Geladeiras e Freezers", icon: "🧊", gradient: "from-cyan-500/20 to-sky-500/10", border: "hover:border-cyan-500/40" },
  { key: "lavadoras", label: "Lavadoras", icon: "🫧", gradient: "from-teal-500/20 to-cyan-500/10", border: "hover:border-teal-500/40" },
  { key: "livros-ereaders", label: "Livros e eReaders", icon: "📚", gradient: "from-amber-500/20 to-orange-500/10", border: "hover:border-amber-500/40" },
  { key: "maquiagem-pele", label: "Maquiagem e Pele", icon: "💄", gradient: "from-pink-500/20 to-rose-500/10", border: "hover:border-pink-500/40" },
  { key: "micro-ondas", label: "Micro-ondas", icon: "📡", gradient: "from-blue-500/20 to-cyan-500/10", border: "hover:border-blue-500/40" },
  { key: "monitores", label: "Monitores", icon: "🖥️", gradient: "from-blue-600/20 to-indigo-600/10", border: "hover:border-blue-600/40" },
  { key: "notebooks", label: "Notebooks", icon: "💻", gradient: "from-violet-500/20 to-purple-500/10", border: "hover:border-violet-500/40" },
  { key: "pcs-e-desktops", label: "PCs e Desktops", icon: "🖥️", gradient: "from-indigo-500/20 to-blue-500/10", border: "hover:border-indigo-500/40" },
  { key: "perfumes", label: "Perfumes", icon: "🌺", gradient: "from-rose-500/20 to-pink-500/10", border: "hover:border-rose-500/40" },
  { key: "perifericos", label: "Periféricos", icon: "⌨️", gradient: "from-cyan-500/20 to-blue-500/10", border: "hover:border-cyan-500/40" },
  { key: "pet", label: "Pet", icon: "🐾", gradient: "from-emerald-500/20 to-teal-500/10", border: "hover:border-emerald-500/40" },
  { key: "roupas-moda", label: "Roupas e Moda", icon: "👕", gradient: "from-blue-500/20 to-indigo-500/10", border: "hover:border-blue-500/40" },
  { key: "shampoo-cabelo", label: "Shampoo e Cabelo", icon: "💆", gradient: "from-purple-500/20 to-pink-500/10", border: "hover:border-purple-500/40" },
  { key: "smartphones", label: "Smartphones", icon: "📱", gradient: "from-violet-500/20 to-fuchsia-500/10", border: "hover:border-violet-500/40" },
  { key: "smart-tvs", label: "Smart TVs", icon: "📺", gradient: "from-blue-500/20 to-indigo-500/10", border: "hover:border-blue-500/40" },
  { key: "smartwatches", label: "Smartwatches", icon: "⌚", gradient: "from-cyan-500/20 to-blue-500/10", border: "hover:border-cyan-500/40" },
  { key: "ssd-hds-memoria", label: "SSD, HDs e Memória", icon: "💾", gradient: "from-emerald-500/20 to-teal-500/10", border: "hover:border-emerald-500/40" },
  { key: "tablets", label: "Tablets", icon: "📱", gradient: "from-purple-500/20 to-indigo-500/10", border: "hover:border-purple-500/40" },
  { key: "tenis-calcados", label: "Tênis e Calçados", icon: "👟", gradient: "from-amber-500/20 to-orange-500/10", border: "hover:border-amber-500/40" },
  { key: "viagem", label: "Viagem", icon: "✈️", gradient: "from-sky-500/20 to-blue-500/10", border: "hover:border-sky-500/40" },
  { key: "whey-suplementos", label: "Whey e Suplementos", icon: "💪", gradient: "from-red-500/20 to-orange-500/10", border: "hover:border-red-500/40" },
];

// Ordenação Alfabética Estrita (A-Z) em Português
const CATEGORIES = [...RAW_CATEGORIES].sort((a, b) =>
  a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base" })
);

export function CategoriesModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Filtragem em tempo real das categorias
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return CATEGORIES;
    const q = searchQuery.toLowerCase().trim();
    return CATEGORIES.filter((c) => c.label.toLowerCase().includes(q));
  }, [searchQuery]);

  // Sincronização de hash (#categorias) e eventos customizados
  useEffect(() => {
    const checkHash = () => {
      if (window.location.hash === "#categorias") {
        setIsOpen(true);
      }
    };

    const handleOpen = () => setIsOpen(true);
    window.addEventListener("open-categories", handleOpen);
    window.addEventListener("hashchange", checkHash);

    checkHash();

    return () => {
      window.removeEventListener("open-categories", handleOpen);
      window.removeEventListener("hashchange", checkHash);
    };
  }, []);

  // Bloqueio de scroll do body quando modal está aberto
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

  // Carrega produtos quando categoria é selecionada
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
    setSearchQuery("");
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
            className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-6"
          >
            {/* Backdrop com blur profundo */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/85 backdrop-blur-xl"
              onClick={handleClose}
            />

            {/* Modal Body Card */}
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 24 }}
              animate={{
                scale: 1,
                opacity: 1,
                y: 0,
                transition: { type: "spring", stiffness: 350, damping: 30 },
              }}
              exit={{ scale: 0.94, opacity: 0, y: 16 }}
              className="relative w-full max-w-4xl bg-zinc-950/95 border border-white/10 shadow-2xl shadow-black/80 rounded-[2rem] sm:rounded-[2.5rem] flex flex-col overflow-hidden max-h-[88vh] z-10 backdrop-blur-2xl"
            >
              {/* Top Header Bar */}
              <div className="flex items-center justify-between p-5 sm:p-6 pb-4 border-b border-white/10 bg-zinc-900/40">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-violet-600/30 via-fuchsia-500/20 to-pink-500/10 border border-violet-500/30 flex items-center justify-center shadow-lg shadow-violet-500/10 shrink-0">
                    <Tag size={22} weight="fill" className="text-violet-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-none">
                        Categorias
                      </h2>
                      <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                        {CATEGORIES.length}
                      </span>
                    </div>
                    <p className="text-zinc-400 text-xs sm:text-sm mt-1">
                      Explore e descubra as melhores ofertas
                    </p>
                  </div>
                </div>

                {/* Close Button */}
                <button
                  onClick={handleClose}
                  aria-label="Fechar modal"
                  className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-all shrink-0 active:scale-95"
                >
                  <X size={18} weight="bold" />
                </button>
              </div>

              {/* Scrollable Content Container */}
              <div className="overflow-y-auto hidden-scrollbar flex-1 p-4 sm:p-6">
                <AnimatePresence mode="wait">
                  {!activeCategory ? (
                    <motion.div
                      key="categories-view"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.15 }}
                      className="flex flex-col space-y-4"
                    >
                      {/* Search Bar */}
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                          <MagnifyingGlass size={18} weight="bold" />
                        </div>
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Buscar categoria (ex: smartphones, fones, tvs...)"
                          className="w-full bg-white/[0.04] border border-white/10 rounded-2xl pl-10 pr-10 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500/60 focus:bg-white/[0.07] transition-all"
                        />
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery("")}
                            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-white transition-colors"
                          >
                            <X size={16} weight="bold" />
                          </button>
                        )}
                      </div>

                      {/* No Results */}
                      {filteredCategories.length === 0 && (
                        <div className="text-center py-12 text-zinc-400">
                          <p className="text-sm">Nenhuma categoria encontrada para "{searchQuery}".</p>
                        </div>
                      )}

                      {/* Categories Grid - 2 cols on mobile, 3 on sm, 4 on lg */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
                        {filteredCategories.map((category) => (
                          <button
                            key={category.key}
                            onClick={() => setActiveCategory(category.key)}
                            className={`group flex items-center gap-3 p-3 sm:p-3.5 rounded-2xl text-left border bg-zinc-900/60 border-white/[0.08] ${category.border} hover:bg-zinc-800/80 hover:shadow-lg hover:shadow-black/40 transition-all duration-200 active:scale-[0.98]`}
                          >
                            {/* Icon Container */}
                            <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br ${category.gradient} border border-white/5 flex items-center justify-center text-xl sm:text-2xl shrink-0 group-hover:scale-110 transition-transform duration-200`}>
                              <span>{category.icon}</span>
                            </div>

                            {/* Label */}
                            <span className="text-xs sm:text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors line-clamp-2 leading-snug">
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
                      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
                        <button
                          onClick={() => setActiveCategory(null)}
                          className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-zinc-300 hover:text-white border border-white/10 flex items-center gap-1.5 text-xs font-semibold shrink-0"
                        >
                          <CaretLeft size={18} weight="bold" />
                          <span className="hidden sm:inline">Voltar</span>
                        </button>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl sm:text-3xl">{activeCategoryInfo?.icon}</span>
                          <div>
                            <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white leading-none">
                              {activeCategoryInfo?.label}
                            </h3>
                            <p className="text-zinc-400 text-xs mt-1">
                              {products.length} {products.length === 1 ? "produto encontrado" : "produtos encontrados"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Loading State */}
                      {loading && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                          {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div
                              key={i}
                              className="h-56 bg-zinc-900/60 border border-white/5 rounded-2xl animate-pulse"
                            />
                          ))}
                        </div>
                      )}

                      {/* No Products in Category */}
                      {!loading && products.length === 0 && (
                        <div className="text-center py-16 text-zinc-400 border border-dashed border-white/10 rounded-2xl">
                          <Sparkle size={32} weight="duotone" className="mx-auto mb-2 text-zinc-500" />
                          <p className="text-sm font-medium text-zinc-300">
                            Nenhum produto nesta categoria no momento.
                          </p>
                          <p className="text-xs text-zinc-500 mt-1">
                            Novas promoções são adicionadas automaticamente!
                          </p>
                        </div>
                      )}

                      {/* Products Grid */}
                      {!loading && products.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                          {products.map((product, index) => {
                            const price = product.price || 0;
                            const originalPrice = product.originalPrice || 0;
                            const discount =
                              originalPrice > price && price > 0
                                ? Math.round(((originalPrice - price) / originalPrice) * 100)
                                : 0;

                            return (
                              <motion.div
                                key={product.id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{
                                  delay: index * 0.03,
                                  type: "spring",
                                  stiffness: 120,
                                }}
                                onClick={() => {
                                  handleClose();
                                  router.push(`/produto/${product.shortId || product.id}`);
                                }}
                                className="group cursor-pointer bg-zinc-900/80 border border-white/10 hover:border-violet-500/40 hover:bg-zinc-900 rounded-2xl p-3 flex flex-col relative transition-all duration-200 hover:-translate-y-0.5 shadow-lg shadow-black/40"
                              >
                                {/* Discount Badge */}
                                {discount > 0 && (
                                  <div className="absolute top-2 right-2 z-10 bg-rose-600 text-white font-bold text-[10px] px-1.5 py-0.5 rounded-md shadow-md">
                                    -{discount}%
                                  </div>
                                )}

                                {/* Product Image */}
                                <div className="w-full aspect-square bg-black/40 rounded-xl mb-2.5 relative overflow-hidden flex items-center justify-center">
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
                                  <h4 className="text-zinc-200 font-semibold text-xs leading-snug line-clamp-2 mb-2 group-hover:text-violet-400 transition-colors">
                                    {product.name}
                                  </h4>
                                  <div className="mt-auto pt-2 border-t border-zinc-800/80 flex flex-col">
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
                                        <span className="text-sm font-bold text-white tracking-tight">
                                          {new Intl.NumberFormat("pt-BR", {
                                              style: "currency",
                                              currency: "BRL",
                                            }).format(price)}
                                        </span>
                                      </>
                                    ) : (
                                      <span className="text-xs font-bold text-violet-400">
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

      {/* Product Details Modal */}
      <PlatformModal
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        product={selectedProduct}
        onSelectRelated={setSelectedProduct}
      />
    </>
  );
}

