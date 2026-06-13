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
      <div className="w-full max-w-[1400px] mx-auto px-4 md:px-8 py-4">
        <div className="h-6 w-40 bg-zinc-900 rounded-lg animate-pulse mb-5" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 bg-zinc-900/50 rounded-2xl animate-pulse" />
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
    <section className="w-full max-w-[1400px] mx-auto px-3 md:px-8 mb-10 relative">
      {/* Seção Cabeçalho */}
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <div>
          <h2 className="text-sm md:text-xl font-black tracking-tight text-white mb-0.5 md:mb-1 flex items-center gap-2">
            Promoções do dia 🔴
          </h2>
          <p className="text-zinc-400 text-[11px] md:text-xs">As melhores ofertas atualizadas em tempo real</p>
        </div>
        {filteredProducts.length > 8 && (
          <button 
            onClick={() => setShowAll(!showAll)}
            className="flex text-sm font-bold text-accent hover:text-white transition-colors items-center gap-1.5 bg-accent/10 px-4.5 py-2.5 rounded-full hover:bg-accent/20 min-h-[44px] cursor-pointer"
          >
            {showAll ? "Ver menos" : "Ver todas"} 
            <ArrowUpRight weight="bold" className={showAll ? "rotate-180 transition-transform" : "transition-transform"} />
          </button>
        )}
      </div>

      {/* Filtro de Categorias em botões horizontais no estilo do mockup */}
      {categories.length > 1 && (
        <div className="flex gap-1.5 md:gap-2 mb-4 md:mb-5 overflow-x-auto pb-2 pt-1 scrollbar-hide snap-x snap-mandatory">
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
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[11px] md:text-[13px] font-semibold cursor-pointer transition-all duration-250 whitespace-nowrap shrink-0 snap-start ${
                  isSelected
                    ? "bg-[#ff334b] text-white border-[#ff334b] shadow-[0_4px_14px_rgba(255,51,75,0.25)]"
                    : "bg-card border-border-custom text-zinc-400 hover:bg-card-hover hover:text-white hover:border-zinc-700/80"
                }`}
              >
                <IconComponent size={14} weight={isSelected ? "fill" : "bold"} />
                {category}
              </button>
            );
          })}
        </div>
      )}

      {/* Sem resultados de busca/categoria */}
      {filteredProducts.length === 0 && (
        <div className="text-center py-16 rounded-[20px] bg-card border border-border-custom text-zinc-500">
          <p className="text-base font-semibold">Nenhuma promoção encontrada para a sua busca.</p>
          <p className="text-xs text-zinc-600 mt-1.5">Tente usar outros termos de busca ou mude de categoria.</p>
        </div>
      )}

      {/* Grid de promoções */}
      {filteredProducts.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {displayProducts.map((product, index) => {
            const discount = getSimulatedDiscount(product.id);
            const price = product.price || 0;
            const originalPrice = price > 0 ? price / (1 - discount / 100) : 0;

            // Mapeamento de cor e label do badge de plataforma
            const storeBadgeConfig: Record<string, { bg: string, text: string, label: string }> = {
              amazon:       { bg: "#ff9900", text: "#ffffff", label: "Amazon" },
              mercadoLivre: { bg: "#3483FA", text: "#ffffff", label: "Mercado Livre" },
              shopee:       { bg: "#ee4d2d", text: "#ffffff", label: "Shopee" },
              aliexpress:   { bg: "#e43225", text: "#ffffff", label: "AliExpress" },
              tiktok:       { bg: "#010101", text: "#ffffff", label: "TikTok Shop" },
              magalu:       { bg: "#0086ff", text: "#ffffff", label: "Magalu" },
              kabum:        { bg: "#0d47a1", text: "#ffffff", label: "KaBuM" },
              netshoes:     { bg: "#5c2a9d", text: "#ffffff", label: "Netshoes" }
            };


            // Extrair a plataforma principal
            let mainPlatformText = "Link";
            let mainPlatformLogo = "https://www.google.com/s2/favicons?domain=amazon.com&sz=128";
            let platformKey = "amazon";
            
            if (product.links?.amazon) { 
              mainPlatformText = "Amazon"; 
              mainPlatformLogo = "https://www.google.com/s2/favicons?domain=amazon.com.br&sz=128"; 
              platformKey = "amazon";
            }
            else if (product.links?.mercadoLivre) { 
              mainPlatformText = "Mercado Livre"; 
              mainPlatformLogo = "https://www.google.com/s2/favicons?domain=mercadolivre.com.br&sz=128"; 
              platformKey = "mercadoLivre";
            }
            else if (product.links?.shopee) { 
              mainPlatformText = "Shopee"; 
              mainPlatformLogo = "https://www.google.com/s2/favicons?domain=shopee.com.br&sz=128"; 
              platformKey = "shopee";
            }
            else if (product.links?.aliexpress) { 
              mainPlatformText = "AliExpress"; 
              mainPlatformLogo = "https://www.google.com/s2/favicons?domain=aliexpress.com&sz=128"; 
              platformKey = "aliexpress";
            }
            else if (product.links?.tiktok) { 
              mainPlatformText = "TikTok Shop"; 
              mainPlatformLogo = "https://www.google.com/s2/favicons?domain=tiktok.com&sz=128"; 
              platformKey = "tiktok";
            }
            else if (product.links?.netshoes) { 
              mainPlatformText = "Netshoes"; 
              mainPlatformLogo = "https://www.google.com/s2/favicons?domain=netshoes.com.br&sz=128"; 
              platformKey = "netshoes";
            }
            else if (product.links?.magalu) { 
              mainPlatformText = "Magalu"; 
              mainPlatformLogo = "https://www.google.com/s2/favicons?domain=magazineluiza.com.br&sz=128"; 
              platformKey = "magalu";
            }
            else if (product.links?.kabum) { 
              mainPlatformText = "KaBuM"; 
              mainPlatformLogo = "https://www.google.com/s2/favicons?domain=kabum.com.br&sz=128"; 
              platformKey = "kabum";
            }

            const badgeStyle = storeBadgeConfig[platformKey] || { bg: "#ff334b", text: "#ffffff", label: mainPlatformText };

            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (index % 4) * 0.05, type: "spring", stiffness: 100 }}
                onClick={() => setSelectedProduct(product)}
                className="group cursor-pointer bg-card border border-border-custom rounded-[20px] overflow-hidden flex flex-col relative transition-all duration-300 hover:-translate-y-1 hover:border-zinc-700/80"
              >
                {/* Imagem Container Wrapper (No overflow-hidden to allow badge to overlap) */}
                <div className="w-full aspect-square relative">
                  {/* Imagem Container (With overflow-hidden for image hover scale zoom) */}
                  <div className="w-full h-full bg-zinc-900/30 flex items-center justify-center relative overflow-hidden border-b border-white/[0.04]">
                    <div className="absolute top-3.5 left-3.5 right-3.5 flex justify-between items-center z-10">
                      <span className="bg-[#ff334b] text-white font-bold text-[12px] px-2 py-0.5 rounded-[6px]">
                        -{discount}%
                      </span>
                      <span className="bg-black/30 backdrop-blur-md text-[#8e92a4] text-[10px] font-bold px-2 py-1 rounded-[6px] flex items-center gap-1 border border-white/5">
                        <Clock size={11} weight="bold" />
                        {getTimeAgo(product.createdAt)}
                      </span>
                    </div>

                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>

                  {/* Overlapping Brand Badge — Logo only, premium circular style */}
                  <div 
                    className="absolute -bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center justify-center rounded-full"
                    style={{
                      width: '36px',
                      height: '36px',
                      background: badgeStyle.bg,
                      boxShadow: `0 0 0 2.5px #18181b, 0 0 14px 2px ${badgeStyle.bg}88`,
                    }}
                  >
                    <img 
                      src={mainPlatformLogo} 
                      alt={badgeStyle.label}
                      title={badgeStyle.label}
                      className="w-5 h-5 object-contain rounded-full" 
                    />
                  </div>
                </div>


                {/* Deal Body */}
                <div className="p-4 pt-7 flex flex-col flex-1">
                  <span className="text-[10px] font-bold text-[#8e92a4] uppercase tracking-wider mb-1">
                    {product.category || "Oferta"}
                  </span>

                  <h3 className="text-sm font-bold text-white mb-2 line-clamp-2 leading-snug min-h-[38px] group-hover:text-[#ff334b] transition-colors">
                    {product.name}
                  </h3>

                  <div className="mt-auto flex flex-col">
                    {price > 0 ? (
                      <>
                        <span className="text-[12px] text-[#8e92a4] line-through leading-none mb-1">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(originalPrice)}
                        </span>
                        <span className="text-base font-black text-[#ff334b]">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price)}
                        </span>
                      </>
                    ) : (
                      <span className="text-sm font-bold text-[#ff334b]">Ver detalhes</span>
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
