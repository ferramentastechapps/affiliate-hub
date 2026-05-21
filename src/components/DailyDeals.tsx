"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { PlatformModal } from "./PlatformModal";
import { 
  Flame, 
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
  Package,
  Clock,
  ArrowUpRight
} from "@phosphor-icons/react";

// Types
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

const categoryIconMap: Record<string, React.ComponentType<any>> = {
  "Todas": Flame,
  "Smartphones e TV": DeviceMobile,
  "Informática e Games": GameController,
  "Casa e Eletrodomésticos": House,
  "Moda e Acessórios": TShirt,
  "Bebês e Crianças": Baby,
  "Saúde e Beleza": Sparkle,
  "Esporte e Suplementos": Barbell,
  "Supermercado e Delivery": ShoppingCart,
  "Livros, eBooks e eReaders": BookOpen,
  "Ferramentas e Jardim": Wrench,
  "Automotivo": Car,
  "Pet": PawPrint,
  "Viagem": Airplane,
  "Diversos": Package,
};

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
  if (diffInHours < 24) return `há ${diffInHours} h`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `há ${diffInDays} ${diffInDays === 1 ? 'dia' : 'dias'}`;
}

export function DailyDeals() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("Todas");
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    fetchProducts();
  }, []);

  // Listen to search change custom event from Header
  useEffect(() => {
    const handleSearchChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ query: string }>;
      setSearchQuery(customEvent.detail.query || "");
    };

    window.addEventListener("search-change", handleSearchChange);
    return () => {
      window.removeEventListener("search-change", handleSearchChange);
    };
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
          description: p.description,
          coupons: p.coupons || [],
          links: {
            amazon: p.links?.amazon,
            mercadoLivre: p.links?.mercadoLivre,
            shopee: p.links?.shopee,
            aliexpress: p.links?.aliexpress,
            tiktok: p.links?.tiktok,
            netshoes: p.links?.netshoes,
            magalu: p.links?.magalu,
            kabum: p.links?.kabum,
          }
        }));
        setAllProducts(parsedProducts);
      }
    } catch (error) {
      console.error("Erro ao buscar promoções:", error);
    } finally {
      setLoading(false);
    }
  }

  // Filtrar produtos por categoria e query de busca
  const filteredProducts = allProducts.filter(p => {
    // Category filter
    const matchesCategory = selectedCategory === "Todas" || p.category === selectedCategory;
    
    // Search query filter (matches name, description, category or brand)
    const matchesSearch = !searchQuery || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      // Special case: if query is "CUPOM", filter products that have coupons
      (searchQuery.toUpperCase() === "CUPOM" && p.coupons && p.coupons.length > 0);

    return matchesCategory && matchesSearch;
  });
  
  // Obter categorias únicas
  const categories = ["Todas", ...Array.from(new Set(allProducts.map(p => p.category)))].filter(Boolean);

  if (loading) {
    return (
      <div className="w-full max-w-[1400px] mx-auto px-4 md:px-8 py-12">
        <div className="h-8 w-48 bg-zinc-900 rounded-lg animate-pulse mb-8" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-80 bg-zinc-900/50 rounded-3xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (allProducts.length === 0) {
    return null;
  }

  const displayProducts = showAll ? filteredProducts : filteredProducts.slice(0, 8);

  return (
    <section className="w-full max-w-[1400px] mx-auto px-4 md:px-8 mb-16 relative">
      {/* Seção Cabeçalho */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white mb-2 flex items-center gap-3">
            Promoções do dia 📍
          </h2>
          <p className="text-zinc-400 text-sm">As ofertas de afiliados verificadas mais quentes da internet</p>
        </div>
        {filteredProducts.length > 8 && (
          <button 
            onClick={() => setShowAll(!showAll)}
            className="flex text-sm font-bold text-blue-400 hover:text-white transition-colors items-center gap-1.5 bg-blue-500/10 px-4.5 py-2.5 rounded-full hover:bg-blue-500/20 min-h-[44px] cursor-pointer"
          >
            {showAll ? "Ver menos" : "Ver todas"} 
            <ArrowUpRight weight="bold" className={showAll ? "rotate-180 transition-transform" : "transition-transform"} />
          </button>
        )}
      </div>

      {/* Filtro de Categorias em botões circulares elegantes */}
      {categories.length > 1 && (
        <div className="flex gap-6 mb-10 overflow-x-auto pb-4 pt-1 scrollbar-hide snap-x snap-mandatory">
          {categories.map((category) => {
            const IconComponent = categoryIconMap[category] || Package;
            const isSelected = selectedCategory === category;
            
            return (
              <button
                key={category}
                onClick={() => {
                  setSelectedCategory(category);
                  setShowAll(false);
                }}
                className="flex flex-col items-center gap-2 group.5 cursor-pointer shrink-0 snap-start"
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center border transition-all duration-300 ${
                  isSelected 
                    ? "bg-blue-600/20 border-blue-500 text-white shadow-lg shadow-blue-500/20 scale-105" 
                    : "bg-zinc-950/60 border-zinc-900/80 text-zinc-400 hover:bg-zinc-900/60 hover:text-white hover:border-zinc-800"
                }`}>
                  <IconComponent size={24} weight={isSelected ? "fill" : "regular"} />
                </div>
                <span className={`text-[11px] font-bold max-w-[84px] text-center leading-tight transition-colors ${
                  isSelected ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                }`}>
                  {category}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Sem resultados de busca/categoria */}
      {filteredProducts.length === 0 && (
        <div className="text-center py-16 rounded-3xl bg-zinc-950/40 border border-zinc-900 text-zinc-500">
          <p className="text-base font-semibold">Nenhuma promoção encontrada para a sua busca.</p>
          <p className="text-xs text-zinc-600 mt-1.5">Tente usar outros termos de busca ou mude de categoria.</p>
        </div>
      )}

      {/* Grid de promoções */}
      {filteredProducts.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {displayProducts.map((product, index) => {
            const discount = getSimulatedDiscount(product.id);
            const price = product.price || 0;
            const originalPrice = price > 0 ? price / (1 - discount / 100) : 0;

            // Extrair a plataforma principal
            let mainPlatformText = "Link";
            let mainPlatformLogo = "https://www.google.com/s2/favicons?domain=amazon.com&sz=64";
            
            if (product.links?.amazon) { 
              mainPlatformText = "Amazon"; 
              mainPlatformLogo = "https://www.google.com/s2/favicons?domain=amazon.com.br&sz=64"; 
            }
            else if (product.links?.mercadoLivre) { 
              mainPlatformText = "Mercado Livre"; 
              mainPlatformLogo = "https://www.google.com/s2/favicons?domain=mercadolivre.com.br&sz=64"; 
            }
            else if (product.links?.shopee) { 
              mainPlatformText = "Shopee"; 
              mainPlatformLogo = "https://www.google.com/s2/favicons?domain=shopee.com.br&sz=64"; 
            }
            else if (product.links?.aliexpress) { 
              mainPlatformText = "AliExpress"; 
              mainPlatformLogo = "https://www.google.com/s2/favicons?domain=aliexpress.com&sz=64"; 
            }
            else if (product.links?.tiktok) { 
              mainPlatformText = "TikTok Shop"; 
              mainPlatformLogo = "https://www.google.com/s2/favicons?domain=tiktok.com&sz=64"; 
            }
            else if (product.links?.netshoes) { 
              mainPlatformText = "Netshoes"; 
              mainPlatformLogo = "https://www.google.com/s2/favicons?domain=netshoes.com.br&sz=64"; 
            }
            else if (product.links?.magalu) { 
              mainPlatformText = "Magalu"; 
              mainPlatformLogo = "https://www.google.com/s2/favicons?domain=magazineluiza.com.br&sz=64"; 
            }
            else if (product.links?.kabum) { 
              mainPlatformText = "KaBuM"; 
              mainPlatformLogo = "https://www.google.com/s2/favicons?domain=kabum.com.br&sz=64"; 
            }

            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (index % 4) * 0.05, type: "spring", stiffness: 100 }}
                onClick={() => setSelectedProduct(product)}
                className="group cursor-pointer bg-zinc-950/60 backdrop-blur-sm border border-zinc-900 hover:border-zinc-700/80 rounded-3xl p-4 flex flex-col relative transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_12px_30px_-10px_rgba(0,0,0,0.6)]"
              >
                {/* Badge Desconto */}
                <div className="absolute top-3 right-3 z-10 bg-red-650 text-white font-black text-[11px] px-2.5 py-1 rounded-xl shadow-lg border border-red-500/10">
                  -{discount}%
                </div>

                {/* Tempo Atrás */}
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-bold mb-3">
                  <Clock size={12} className="text-zinc-650" />
                  {getTimeAgo(product.createdAt)}
                </div>

                {/* Imagem Premium Vertical */}
                <div className="w-full aspect-[3/4] bg-zinc-900/80 rounded-2xl mb-4 relative overflow-hidden flex items-center justify-center border border-zinc-900">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                  />
                  
                  {/* Store Favicon floating badge */}
                  <div className="absolute bottom-2.5 right-2.5 bg-white/95 backdrop-blur-md rounded-[12px] shadow-[0_4px_12px_rgba(0,0,0,0.2)] px-2.5 py-1 border border-zinc-200/50 flex items-center gap-1.5">
                    <img src={mainPlatformLogo} alt={mainPlatformText} className="w-3.5 h-3.5 rounded-full object-contain" />
                    <span className="text-[9px] font-black text-zinc-900 uppercase tracking-wider">{mainPlatformText}</span>
                  </div>

                  {/* Badge cupom */}
                  {product.coupons && product.coupons.length > 0 && (
                    <div className="absolute top-2.5 left-2.5 bg-blue-600 text-white text-[9px] font-black px-2 py-0.5 rounded-lg tracking-wide uppercase">
                      CUPOM
                    </div>
                  )}
                </div>

                {/* Detalhes do Produto */}
                <div className="flex flex-col flex-grow">
                  <span className="text-[9px] font-bold tracking-widest text-zinc-500 uppercase mb-1.5 block">
                    {product.category}
                  </span>
                  
                  <h3 className="text-white font-bold text-sm leading-snug line-clamp-2 mb-3 group-hover:text-blue-400 transition-colors">
                    {product.name}
                  </h3>
                  
                  <div className="mt-auto pt-2.5 border-t border-zinc-900/80 flex flex-col">
                    {price > 0 ? (
                      <>
                        <span className="text-zinc-500 text-[10px] line-through font-medium mb-0.5">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(originalPrice)}
                        </span>
                        <span className="text-base font-extrabold text-white tracking-tight">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price)}
                        </span>
                      </>
                    ) : (
                      <span className="text-sm font-bold text-blue-400">Ver detalhes</span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <PlatformModal 
        isOpen={!!selectedProduct} 
        onClose={() => setSelectedProduct(null)}
        product={selectedProduct}
      />
    </section>
  );
}
