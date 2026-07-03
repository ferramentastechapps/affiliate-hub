"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { PlatformModal } from "./PlatformModal";
import { useAuth } from "./AuthProvider";
import { AuthPanel } from "./AuthPanel";
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
  ArrowUpRight,
  ThumbsUp,
  ThumbsDown,
  Tag,
  ShieldCheck,
  Truck,
  Heart,
  ChatCircle,
  ArrowRight,
  Bell,
  Star,
  TrendDown
} from "@phosphor-icons/react";

// Types
type Product = {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  price?: number;
  originalPrice?: number;
  description?: string;
  coupons?: { id: string; code: string; discount: string; platform: string }[];
  alerts?: { userId: string }[];
  links: Record<string, string | undefined>;
  createdAt?: string;
  clicks?: number;
  votes?: { type: string, userId: string }[];
  _count?: {
    likes?: number;
    dislikes?: number;
    comments?: number;
  };
  shortId?: number;
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

const categoryColors: Record<string, string> = {
  "Todas": "#f43f5e",
  "Smartphones e TV": "#3b82f6",
  "Informática e Games": "#8b5cf6",
  "Casa e Eletrodomésticos": "#10b981",
  "Moda e Acessórios": "#ec4899",
  "Bebês e Crianças": "#f97316",
  "Saúde e Beleza": "#14b8a6",
  "Esporte e Suplementos": "#ef4444",
  "Supermercado e Delivery": "#84cc16",
  "Livros, eBooks e eReaders": "#a855f7",
  "Ferramentas e Jardim": "#eab308",
  "Automotivo": "#64748b",
  "Pet": "#0ea5e9",
  "Viagem": "#6366f1",
  "Diversos": "#a1a1aa"
};

// Helper for deterministic discount simulation based on string ID


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

import { useRouter } from "next/navigation";

export function DailyDeals() {
  const router = useRouter();
  const { user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [openCommentsFor, setOpenCommentsFor] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(50);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("Todas");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterType, setFilterType] = useState<'alertas' | 'destaques' | 'recentes' | 'menorPreco' | 'pontuados' | 'baratinho'>('recentes');

  useEffect(() => {
    fetchProducts();
    
    // Refresh a cada 5 minutos silenciosamente
    const interval = setInterval(() => fetchProducts(true), 5 * 60 * 1000);
    
    // Refresh quando o usuário volta pro app (foco ou visibilidade)
    const handleFocus = () => fetchProducts(true);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchProducts(true);
      }
    };
    
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [filterType, user?.id]);

  // Reset pagination when filters change
  useEffect(() => {
    setVisibleCount(50);
  }, [searchQuery, selectedCategory, filterType]);

  // Listen to search change custom event from Header
  useEffect(() => {
    const handleSearchChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ query: string }>;
      setSearchQuery(customEvent.detail.query || "");
    };
    
    const handleChangeFilter = (e: Event) => {
      const customEvent = e as CustomEvent<{ filter: any }>;
      setFilterType(customEvent.detail.filter);
      const dealsSection = document.getElementById('ofertas');
      if (dealsSection) {
        dealsSection.scrollIntoView({ behavior: 'smooth' });
      }
    };

    window.addEventListener("search-change", handleSearchChange);
    window.addEventListener("change-filter", handleChangeFilter);
    return () => {
      window.removeEventListener("search-change", handleSearchChange);
      window.removeEventListener("change-filter", handleChangeFilter);
    };
  }, []);

  async function fetchProducts(silent = false) {
    try {
      if (!silent) {
        setLoading(true);
      }
      const userParam = user?.id ? `&userId=${user.id}` : '';
      const res = await fetch(`/api/products?filter=${filterType}${userParam}&_t=${Date.now()}`, { cache: "no-store" });
      const data = await res.json();
      
      if (data && data.length > 0) {
        const parsedProducts = data.map((p: any) => ({
          id: p.id,
          shortId: p.shortId,
          name: p.name,
          category: p.category,
          imageUrl: p.imageUrl,
          price: p.price,
          originalPrice: p.originalPrice,
          createdAt: p.createdAt,
          description: p.description,
          coupons: p.coupons || [],
          votes: p.votes || [],
          alerts: p.alerts || [],
          _count: p._count || { likes: 0, dislikes: 0, comments: 0 },
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
      if (!silent) {
        setLoading(false);
      }
    }
  }

  // Filtrar produtos por categoria e query de busca
  let filteredProducts = allProducts.filter(p => {
    // Category filter
    const matchesCategory = selectedCategory === "Todas" || p.category === selectedCategory;
    
    // Search query filter (matches name, description, category or brand)
    let matchesSearch = true;
    if (searchQuery) {
      if (searchQuery.toUpperCase() === "CUPOM") {
        matchesSearch = !!(p.coupons && p.coupons.length > 0);
      } else {
        const terms = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
        const productText = `${p.name} ${p.category} ${p.description || ''}`.toLowerCase();
        matchesSearch = terms.every(term => productText.includes(term));
      }
      }
    }

    let matchesAlert = true;
    if (filterType === 'alertas') {
      matchesAlert = p.alerts?.some((al: any) => al.userId === user?.id) || false;
    }

    return matchesCategory && matchesSearch && matchesAlert;
  });

  // Aplicar ordenação baseada no filtro selecionado
  filteredProducts = [...filteredProducts].sort((a, b) => {
    switch (filterType) {
      case 'alertas':
        // Produtos alertados pelo usuário vêm primeiro
        const aAlert = a.alerts?.some((al: any) => al.userId === user?.id) ? 1 : 0;
        const bAlert = b.alerts?.some((al: any) => al.userId === user?.id) ? 1 : 0;
        if (aAlert !== bAlert) return bAlert - aAlert;
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      
      case 'destaques':
        // Produtos com maior desconto
        const aDiscount = a.originalPrice && a.price ? ((a.originalPrice - a.price) / a.originalPrice) * 100 : 0;
        const bDiscount = b.originalPrice && b.price ? ((b.originalPrice - b.price) / b.originalPrice) * 100 : 0;
        return bDiscount - aDiscount;
      
      case 'recentes':
        // Mais recentes primeiro
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      
      case 'menorPreco':
        // Menor preço primeiro
        const aPrice = a.price || Infinity;
        const bPrice = b.price || Infinity;
        return aPrice - bPrice;
      
      case 'pontuados':
        // Produtos com aiScore maior (simulado por clicks + desconto)
        const aScore = (a.clicks || 0) * 10 + (a.originalPrice && a.price ? ((a.originalPrice - a.price) / a.originalPrice) * 100 : 0);
        const bScore = (b.clicks || 0) * 10 + (b.originalPrice && b.price ? ((b.originalPrice - b.price) / b.originalPrice) * 100 : 0);
        return bScore - aScore;
      
      case 'baratinho':
        // Produtos com preço até R$ 50
        return (a.price || Infinity) - (b.price || Infinity);
      
      default:
        return 0;
    }
  });

  // Filtrar "baratinho" para mostrar só produtos até R$ 50
  if (filterType === 'baratinho') {
    filteredProducts = filteredProducts.filter(p => p.price && p.price <= 50);
  }
  
  // Obter categorias únicas
  const categories = ["Todas", ...Array.from(new Set(allProducts.map(p => p.category)))].filter(Boolean);

  if (loading && allProducts.length === 0) {
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

  if (allProducts.length === 0 && !loading) {
    return null;
  }

  const displayProducts = filteredProducts.slice(0, visibleCount);

  return (
    <section 
      className="w-full max-w-[1400px] mx-auto px-3 md:px-8 pt-0 mb-10 relative"
      onTouchStart={() => (document.activeElement as HTMLElement)?.blur()}
    >
      {/* Abas de Filtro */}
      <div className="flex gap-2 mt-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
        {[
          { key: 'alertas', label: 'Meus Alertas', icon: <Bell size={18} weight="regular" className="text-[#ff334b]" /> },
          { key: 'destaques', label: 'Destaques', icon: <Star size={18} weight="regular" className="text-[#ff334b]" /> },
          { key: 'recentes', label: 'Recentes', icon: <Clock size={18} weight="regular" className="text-[#ff334b]" /> },
          { key: 'menorPreco', label: 'Menor Preço', icon: <TrendDown size={18} weight="regular" className="text-[#ff334b]" /> },
          { key: 'pontuados', label: 'Mais Pontuados', icon: <Flame size={18} weight="regular" className="text-[#ff334b]" /> },
          { key: 'baratinho', label: 'Baratinho', icon: <Tag size={18} weight="regular" className="text-[#ff334b]" /> },
        ].map((filter) => (
          <button
            key={filter.key}
            onClick={() => setFilterType(filter.key as any)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium text-[13px] md:text-sm transition-all whitespace-nowrap ${
              filterType === filter.key
                ? 'bg-transparent text-white border border-[#ff334b] shadow-[0_0_15px_rgba(255,51,75,0.4)]'
                : 'bg-transparent text-white hover:bg-white/5 border border-white/10'
            }`}
          >
            {filter.icon}
            {filter.label}
          </button>
        ))}
      </div>

      {/* Seção Cabeçalho */}
      <div className="flex items-center justify-between mb-4 md:mb-5">
        <div>
          <h2 className="text-lg md:text-2xl font-black tracking-tight text-white mb-1 flex items-center gap-2">
            Promoções do dia
          </h2>
          <p className="text-zinc-400 text-xs md:text-sm">As melhores ofertas atualizadas em tempo real</p>
        </div>
      </div>

      {/* Sem resultados de busca/categoria */}
      {filteredProducts.length === 0 && (
        <div className="text-center py-16 rounded-[20px] bg-card border border-border-custom text-zinc-500">
          <p className="text-base font-semibold">Nenhuma promoção encontrada para a sua busca.</p>
          <p className="text-xs text-zinc-600 mt-1.5">Tente usar outros termos de busca ou mude de categoria.</p>
        </div>
      )}

      {/* Grid de promoções */}
      {filteredProducts.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          {displayProducts.map((product, index) => {
            const price = product.price || 0;
            const originalPrice = product.originalPrice || 0;
            const discount = (originalPrice > price && price > 0)
              ? Math.round(((originalPrice - price) / originalPrice) * 100)
              : 0;

            const userVote = user ? product.votes?.find(v => v.userId === user.id)?.type : null;

            let displayCoupon = "";
            if (product.coupons && Array.isArray(product.coupons) && product.coupons.length > 0) {
              const firstCoupon = product.coupons[0];
              if (firstCoupon.code && firstCoupon.code.toUpperCase() !== "NORMAL") {
                displayCoupon = firstCoupon.code;
              }
            } else if (product.description && typeof product.description === 'string' && product.description.includes('🎟️ CUPOM:')) {
              const extracted = product.description.split('🎟️ CUPOM:')[1].trim();
              if (extracted && extracted.toUpperCase() !== "NORMAL") {
                displayCoupon = extracted.split('\n')[0].trim();
              }
            }

            async function handleVote(type: 'LIKE' | 'DISLIKE') {
              if (!user) {
                setShowAuthModal(true);
                return;
              }
              try {
                const newType = userVote === type ? 'REMOVE' : type;
                
                // Optimistic update na lista global
                setAllProducts(prev => prev.map(p => {
                  if (p.id === product.id) {
                    let likes = p._count?.likes || 0;
                    let dislikes = p._count?.dislikes || 0;
                    
                    if (userVote === 'LIKE') likes--;
                    if (userVote === 'DISLIKE') dislikes--;
                    
                    if (newType === 'LIKE') likes++;
                    if (newType === 'DISLIKE') dislikes++;

                    const newVotes = p.votes?.filter(v => v.userId !== user.id) || [];
                    if (newType !== 'REMOVE') {
                      newVotes.push({ type: newType, userId: user.id });
                    }

                    return {
                      ...p,
                      votes: newVotes,
                      _count: {
                        ...p._count,
                        likes,
                        dislikes
                      }
                    };
                  }
                  return p;
                }));

                await fetch(`/api/products/${product.id}/vote`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId: user!.id, type: newType })
                });
              } catch (e) {
                console.error("Erro ao votar", e);
              }
            }

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
                initial={{ opacity: 0, y: 20, rotateX: 5 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ delay: (index % 4) * 0.05, type: "spring", stiffness: 100 }}
                onClick={() => router.push(`/produto/${product.shortId || product.id}`)}
                className="group cursor-pointer glass-3d-card rounded-[16px] overflow-hidden flex flex-col relative z-0"
              >
                {/* Header (Store Info) */}
                <div className="p-3 pb-2 flex items-center justify-between border-b border-white/5 bg-white/[0.02]">
                  <div className="flex items-center gap-2">
                    <img src={mainPlatformLogo} className="w-5 h-5 rounded-full object-contain" />
                    <span className="text-white font-bold text-xs flex items-center gap-1">
                      {mainPlatformText}
                      <ShieldCheck size={14} weight="fill" className="text-blue-500" />
                    </span>
                  </div>
                  <span className="text-[#8e92a4] text-[10px] flex items-center gap-1">
                    <Clock size={10} weight="bold" /> {getTimeAgo(product.createdAt)}
                  </span>
                </div>

                {/* Middle (Image + Info) */}
                <div className="flex flex-row">
                  <div className="w-28 h-28 sm:w-32 sm:h-32 shrink-0 relative bg-white flex items-center justify-center m-3 rounded-2xl p-2 shadow-inner overflow-hidden">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/placeholder.webp";
                      }}
                    />
                    {discount > 0 && (
                      <span className="absolute -top-1 -left-1 bg-[#ff334b] text-white font-black text-[10px] px-1.5 py-0.5 rounded-md shadow-md">
                        -{discount}%
                      </span>
                    )}
                  </div>

                  <div className="p-3 sm:p-4 flex flex-col flex-1 relative overflow-hidden">
                    <span 
                      className="text-[9px] font-bold uppercase tracking-wider mb-0.5 truncate"
                      style={{ color: categoryColors[product.category] || "#8e92a4" }}
                    >
                      {product.category || "OFERTA"}
                    </span>

                    <h3 className="text-[11px] sm:text-xs font-normal text-[#8e92a4] uppercase mb-1.5 line-clamp-2 leading-snug group-hover:text-white transition-colors">
                      {product.name}
                    </h3>

                    {/* Coupons and Conditions Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      {displayCoupon && (
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 max-w-[90px] sm:max-w-[140px] truncate" title={displayCoupon}>
                          <Tag size={10} weight="fill" className="shrink-0" /> <span className="truncate">{displayCoupon}</span>
                        </span>
                      )}
                      {(() => {
                        const desc = product.description || '';
                        const name = product.name || '';
                        const store = (product.storeName || '').toLowerCase();
                        const isAmazon = store.includes('amazon') || desc.toLowerCase().includes('amazon') || Object.keys(product.links || {}).includes('amazon');
                        const isPrime = isAmazon; // Todo produto Amazon é Prime

                        return isPrime ? (
                          <span className="bg-[#00a8e1]/10 text-[#00a8e1] border border-[#00a8e1]/20 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 max-w-[120px] sm:max-w-[150px] truncate" title="Exclusivo Membros Prime">
                            <Star size={10} weight="fill" className="shrink-0" /> <span className="truncate">EXCLUSIVO PRIME</span>
                          </span>
                        ) : null;
                      })()}
                    </div>

                    <div className="mt-auto flex items-end gap-2">
                      {price > 0 ? (
                        <>
                          <span className="text-base sm:text-lg font-black text-white leading-none">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price)}
                          </span>
                          {discount > 0 && (
                            <span className="text-[10px] sm:text-[11px] text-[#8e92a4] line-through leading-none pb-[2px]">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(originalPrice)}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-xs font-bold text-white">Ver detalhes</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer (Actions) */}
                <div className="p-2.5 px-4 border-t border-white/5 flex items-center justify-between bg-black/20">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        handleVote('LIKE');
                      }}
                      className={`flex items-center gap-1 transition-colors text-[11px] font-bold ${userVote === 'LIKE' ? 'text-emerald-500' : 'text-[#8e92a4] hover:text-emerald-500'}`}
                    >
                      <ThumbsUp size={16} weight={userVote === 'LIKE' ? "fill" : "bold"} /> {product._count?.likes || 0}
                    </button>
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        handleVote('DISLIKE');
                      }}
                      className={`flex items-center gap-1 transition-colors text-[11px] font-bold ${userVote === 'DISLIKE' ? 'text-red-500' : 'text-[#8e92a4] hover:text-red-500'}`}
                    >
                      <ThumbsDown size={16} weight={userVote === 'DISLIKE' ? "fill" : "bold"} /> {product._count?.dislikes || 0}
                    </button>
                    <div className="w-[1px] h-3 bg-white/10 mx-1"></div>
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        router.push(`/produto/${product.shortId || product.id}#comments`);
                      }}
                      className="flex items-center gap-1.5 text-[#8e92a4] hover:text-white transition-colors text-[11px] font-bold"
                    >
                      <ChatCircle size={16} weight="bold" /> {product._count?.comments || 0}
                    </button>
                  </div>
                  <button className="text-[10px] font-bold uppercase tracking-wider text-white hover:text-[#ff334b] transition-colors flex items-center gap-1">
                    VER MAIS <ArrowRight size={10} weight="bold" className="text-[#ff334b]" />
                  </button>
                </div>

              </motion.div>
            );
          })}
        </div>
      )}

      {visibleCount < filteredProducts.length && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => setVisibleCount(prev => prev + 10)}
            className="btn-3d group flex items-center justify-center gap-2 font-semibold text-sm md:text-base py-3 px-8 rounded-[20px] shadow-lg min-h-[48px]"
          >
            Ver mais {Math.min(10, filteredProducts.length - visibleCount)} produtos
          </button>
        </div>
      )}

      <PlatformModal 
        isOpen={!!selectedProduct} 
        onClose={() => {
          setSelectedProduct(null);
          setOpenCommentsFor(null);
        }} 
        product={selectedProduct} 
        onSelectRelated={setSelectedProduct}
        autoFocusComments={openCommentsFor === selectedProduct?.id}
      />
      
      <AuthPanel isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </section>
  );
}
