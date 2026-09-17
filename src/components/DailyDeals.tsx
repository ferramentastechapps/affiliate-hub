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
  ThumbsUp,
  ThumbsDown,
  Tag,
  Heart,
  ChatCircle,
  ArrowRight,
  Bell,
  Star,
  TrendDown,
  ArrowUpRight,
  Check,
} from "@phosphor-icons/react";

import { Product } from "@/types/product";
import { calculateDealTemperature } from "@/lib/deal-temperature";
import { StoreLogo, detectStoreKey, STORE_INFOS } from "./StoreLogos";
import { ProductImage } from "./ProductImage";
import { useRouter } from "next/navigation";

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
  "Todas": "#ff334b",
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
  "Diversos": "#a1a1aa",
};

function getTimeAgo(dateString?: string | Date) {
  if (!dateString) return "há pouco";
  const date = new Date(dateString);
  const now = new Date();
  const mins = Math.floor((now.getTime() - date.getTime()) / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

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
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>("");
  const [filterType, setFilterType] = useState<
    "alertas" | "destaques" | "recentes" | "menorPreco" | "emAlta" | "baratinho"
  >("recentes");
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [copiedCouponId, setCopiedCouponId] = useState<string | null>(null);

  // Sync favorites
  useEffect(() => {
    try {
      const stored = localStorage.getItem("economizei_favorites");
      if (stored) setFavoriteIds(new Set(JSON.parse(stored)));
    } catch {}
    if (user) {
      fetch("/api/favorites")
        .then((r) => r.json())
        .then((d) => {
          if (d.favorites && Array.isArray(d.favorites)) {
            const ids = d.favorites.map((f: any) => f.productId);
            setFavoriteIds((prev) => new Set([...prev, ...ids]));
          }
        })
        .catch(() => {});
    }
  }, [user]);

  const toggleFavorite = async (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextSet = new Set(favoriteIds);
    const isFav = nextSet.has(productId);
    if (isFav) nextSet.delete(productId);
    else nextSet.add(productId);
    setFavoriteIds(nextSet);
    try {
      const arr = Array.from(nextSet);
      localStorage.setItem("economizei_favorites", JSON.stringify(arr));
      window.dispatchEvent(
        new CustomEvent("favorites-updated", { detail: { count: arr.length } })
      );
    } catch {}
    if (user) {
      await fetch("/api/favorites", {
        method: isFav ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      }).catch(() => {});
    }
  };

  const copyCoupon = (e: React.MouseEvent, code: string, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCouponId(id);
    setTimeout(() => setCopiedCouponId(null), 2000);
  };

  // Debounce search
  useEffect(() => {
    const h = setTimeout(() => setDebouncedSearchQuery(searchQuery), 400);
    return () => clearTimeout(h);
  }, [searchQuery]);

  useEffect(() => {
    fetchProducts();
    const interval = setInterval(() => fetchProducts(true), 5 * 60 * 1000);
    const onFocus = () => fetchProducts(true);
    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchProducts(true);
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [filterType, user?.id, selectedCategory, debouncedSearchQuery]);

  useEffect(() => {
    setVisibleCount(50);
  }, [searchQuery, selectedCategory, filterType]);

  useEffect(() => {
    const onSearch = (e: Event) => {
      setSearchQuery((e as CustomEvent<{ query: string }>).detail.query || "");
    };
    const onFilter = (e: Event) => {
      setFilterType((e as CustomEvent<{ filter: any }>).detail.filter);
      document.getElementById("ofertas")?.scrollIntoView({ behavior: "smooth" });
    };
    window.addEventListener("search-change", onSearch);
    window.addEventListener("change-filter", onFilter);
    return () => {
      window.removeEventListener("search-change", onSearch);
      window.removeEventListener("change-filter", onFilter);
    };
  }, []);

  async function fetchProducts(silent = false) {
    try {
      if (!silent) setLoading(true);
      let extra = "";
      if (filterType === "alertas") {
        try {
          const cached = localStorage.getItem("push_preferences_cache");
          if (cached) {
            const p = JSON.parse(cached);
            if (p.customInterests?.length)
              extra += `&keywords=${encodeURIComponent(p.customInterests.join(","))}`;
            if (p.categories?.length)
              extra += `&categories=${encodeURIComponent(p.categories.join(","))}`;
          }
        } catch {}
      }
      const catParam =
        selectedCategory !== "Todas"
          ? `&category=${encodeURIComponent(selectedCategory)}`
          : "";
      const searchParam = debouncedSearchQuery
        ? `&search=${encodeURIComponent(debouncedSearchQuery)}`
        : "";
      const userParam = user?.id ? `&userId=${user.id}` : "";
      const res = await fetch(
        `/api/products?filter=${filterType}${userParam}${catParam}${searchParam}${extra}&_t=${Date.now()}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (data && data.length > 0) {
        setAllProducts(
          data.map((p: any) => ({
            id: p.id,
            shortId: p.shortId,
            name: p.name,
            category: p.category,
            imageUrl: p.imageUrl,
            enhancedImageUrl: p.enhancedImageUrl,
            storeName: p.storeName,
            source: p.source,
            platformType: p.platformType,
            price: p.price,
            originalPrice: p.originalPrice,
            createdAt: p.createdAt,
            description: p.description,
            coupons: p.coupons || [],
            votes: p.votes || [],
            alerts: p.alerts || [],
            clicks: p.clicks,
            isLowestPriceEver: p.isLowestPriceEver,
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
            },
          }))
        );
      }
    } catch (err) {
      console.error("Erro ao buscar promoções:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  // Filter + Sort
  let filteredProducts = allProducts.filter((p) => {
    const matchCat = selectedCategory === "Todas" || p.category === selectedCategory;
    let matchSearch = true;
    if (searchQuery) {
      if (searchQuery.toUpperCase() === "CUPOM") {
        matchSearch = !!(p.coupons && p.coupons.length > 0);
      } else {
        const terms = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
        const text = `${p.name} ${p.category} ${p.description || ""}`.toLowerCase();
        matchSearch = terms.every((t) => text.includes(t));
      }
    }
    return matchCat && matchSearch;
  });

  filteredProducts = [...filteredProducts].sort((a, b) => {
    const disc = (p: any) =>
      p.originalPrice && p.price
        ? ((p.originalPrice - p.price) / p.originalPrice) * 100
        : 0;
    switch (filterType) {
      case "alertas":
        const aA = a.alerts?.some((al: any) => al.userId === user?.id) ? 1 : 0;
        const bA = b.alerts?.some((al: any) => al.userId === user?.id) ? 1 : 0;
        return (
          bA - aA ||
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
      case "destaques":
        return disc(b) - disc(a);
      case "recentes":
        return (
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
      case "menorPreco":
        return (a.price || Infinity) - (b.price || Infinity);
      case "emAlta":
        return (
          (b.clicks || 0) * 10 +
          disc(b) -
          ((a.clicks || 0) * 10 + disc(a))
        );
      case "baratinho":
        return (a.price || Infinity) - (b.price || Infinity);
      default:
        return 0;
    }
  });

  if (filterType === "baratinho") {
    filteredProducts = filteredProducts.filter((p) => p.price && p.price <= 50);
  }

  const categories = [
    "Todas",
    ...Array.from(new Set(allProducts.map((p) => p.category))),
  ].filter(Boolean);
  const displayProducts = filteredProducts.slice(0, visibleCount);

  // ── LOADING SKELETON ──
  if (loading && allProducts.length === 0) {
    return (
      <div className="w-full max-w-[1400px] mx-auto px-4 md:px-8 py-4">
        {/* Filter skeleton */}
        <div className="flex gap-2 mb-4 overflow-hidden">
          {[80, 100, 72, 90, 80, 68].map((w, i) => (
            <div
              key={i}
              className="skeleton rounded-full flex-none"
              style={{ width: w, height: 32 }}
            />
          ))}
        </div>
        {/* Cards skeleton */}
        <div className="flex flex-col gap-3 md:grid md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[108px] skeleton rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (allProducts.length === 0 && !loading) return null;

  return (
    <section
      className="w-full max-w-[1400px] mx-auto px-3 md:px-8 pt-0 mb-10"
      onTouchStart={() => (document.activeElement as HTMLElement)?.blur()}
    >
      {/* ── FILTER TABS ── */}
      <div className="flex gap-1.5 mt-3 mb-3 overflow-x-auto pb-1 scrollbar-hide">
        {[
          { key: "recentes",   label: "Recentes",      Icon: Clock },
          { key: "emAlta",     label: "Em Alta",       Icon: Flame },
          { key: "destaques",  label: "Destaques",     Icon: Star },
          { key: "menorPreco", label: "Menor Preço",   Icon: TrendDown },
          { key: "baratinho",  label: "Até R$ 50",     Icon: Tag },
          { key: "alertas",    label: "Meus Alertas", Icon: Bell },
        ].map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setFilterType(key as any)}
            className={`flex items-center gap-1.5 px-3 h-8 rounded-full text-[12.5px] font-medium whitespace-nowrap transition-all flex-none ${
              filterType === key
                ? "bg-[rgba(255,51,75,0.12)] text-[#ff4b60] border border-[rgba(255,51,75,0.35)] shadow-sm"
                : "text-[#8e92a4] border border-white/[0.07] hover:border-white/[0.14] hover:text-white"
            }`}
          >
            <Icon size={13} weight={filterType === key ? "fill" : "regular"} />
            {label}
          </button>
        ))}
      </div>

      {/* ── CATEGORY PILLS ── */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-hide">
        {categories.map((cat) => {
          const CatIcon = categoryIconMap[cat] || Package;
          const color = categoryColors[cat] || "#6b7280";
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`cat-pill ${isActive ? "active" : ""}`}
              style={
                isActive
                  ? { borderColor: `${color}60`, color, background: `${color}14` }
                  : {}
              }
            >
              <CatIcon size={13} weight={isActive ? "fill" : "regular"} />
              {cat === "Todas" ? "Todas" : cat.split(" ")[0]}
            </button>
          );
        })}
      </div>

      {/* ── SECTION HEADER ── */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div>
          <h2 className="text-[16px] md:text-[20px] font-bold text-white tracking-tight flex items-center gap-2">
            Promoções do dia
          </h2>
          <p className="text-[12px] text-[#8e92a4] mt-0.5">
            Atualizadas em tempo real pela comunidade
          </p>
        </div>
        {filteredProducts.length > 0 && (
          <span className="text-[12px] font-medium text-[#8e92a4]">
            {filteredProducts.length} ofertas
          </span>
        )}
      </div>

      {/* ── EMPTY STATE ── */}
      {filteredProducts.length === 0 && (
        <div className="py-16 text-center bg-[#0e1018] rounded-2xl border border-white/[0.06]">
          <Package size={40} weight="duotone" className="text-zinc-600 mx-auto mb-3" />
          <p className="text-[15px] font-semibold text-white mb-1">
            Nenhuma promoção encontrada
          </p>
          <p className="text-[13px] text-[#8e92a4]">
            Tente outros termos de busca ou selecione outra categoria
          </p>
        </div>
      )}

      {/* ── DEAL LIST ── */}
      {filteredProducts.length > 0 && (
        <div className="flex flex-col gap-2.5 md:grid md:grid-cols-2 xl:grid-cols-3">
          {displayProducts.map((product, index) => {
            const price = product.price || 0;
            const originalPrice = (product as any).originalPrice || 0;
            const discount =
              originalPrice > price && price > 0
                ? Math.round(((originalPrice - price) / originalPrice) * 100)
                : 0;

            const userVote = user
              ? product.votes?.find((v: any) => v.userId === user.id)?.type
              : null;

            // Extract coupon code
            let displayCoupon = "";
            if (product.coupons?.length) {
              const first = product.coupons[0];
              if (first.code && first.code.toUpperCase() !== "NORMAL") {
                displayCoupon = first.code;
              }
            } else if (product.description?.includes("🎟️ CUPOM:")) {
              const extracted = product.description.split("🎟️ CUPOM:")[1]?.trim();
              if (extracted && extracted.toUpperCase() !== "NORMAL") {
                displayCoupon = extracted.split("\n")[0].trim();
              }
            }

            const storeKey = detectStoreKey(product);
            const storeInfo = STORE_INFOS[storeKey] || STORE_INFOS.default;

            // Calculate deal temperature
            const tempResult = calculateDealTemperature({
              price: product.price,
              originalPrice: product.originalPrice,
              likesCount: product._count?.likes,
              dislikesCount: product._count?.dislikes,
              clicksCount: product.clicks,
              hasCoupon: !!displayCoupon,
              isLowestPriceEver: (product as any).isLowestPriceEver,
              createdAt: product.createdAt,
            });

            async function handleVote(type: "LIKE" | "DISLIKE") {
              if (!user) {
                setShowAuthModal(true);
                return;
              }
              try {
                const newType = userVote === type ? "REMOVE" : type;
                setAllProducts((prev) =>
                  prev.map((p) => {
                    if (p.id !== product.id) return p;
                    let likes = p._count?.likes || 0;
                    let dislikes = p._count?.dislikes || 0;
                    if (userVote === "LIKE") likes--;
                    if (userVote === "DISLIKE") dislikes--;
                    if (newType === "LIKE") likes++;
                    if (newType === "DISLIKE") dislikes++;
                    const newVotes =
                      p.votes?.filter((v: any) => v.userId !== user.id) || [];
                    if (newType !== "REMOVE")
                      newVotes.push({ type: newType, userId: user.id });
                    return {
                      ...p,
                      votes: newVotes,
                      _count: { ...p._count, likes, dislikes },
                    };
                  })
                );
                await fetch(`/api/products/${product.id}/vote`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ userId: user.id, type: newType }),
                });
              } catch {}
            }

            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (index % 6) * 0.03 }}
                onClick={() =>
                  router.push(`/produto/${product.shortId || product.id}`)
                }
                className="deal-card cursor-pointer group overflow-hidden"
              >
                {/* ── MAIN ROW ── */}
                <div className="flex items-stretch">
                  {/* Image container: clean white background, crisp square box */}
                  <div className="relative w-[92px] md:w-[106px] shrink-0 bg-white m-2.5 mr-0 rounded-xl overflow-hidden flex items-center justify-center self-center aspect-square shadow-sm">
                    <ProductImage
                      src={product.imageUrl}
                      enhancedSrc={product.enhancedImageUrl}
                      alt={product.name}
                      store={storeKey}
                      category={product.category}
                      className="w-full h-full object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                      containerClassName="w-full h-full flex items-center justify-center"
                    />
                    {discount > 0 && (
                      <span className="absolute top-1.5 left-1.5 bg-[#ff334b] text-white text-[10px] font-black px-1.5 py-0.5 rounded leading-none shadow-sm">
                        -{discount}%
                      </span>
                    )}
                  </div>

                  {/* Content container */}
                  <div className="flex flex-col flex-1 py-2.5 px-3 min-w-0 justify-between">
                    {/* Top Row: Store Badge + Temperature + Time */}
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.07] text-[11px] font-semibold text-zinc-300">
                        <StoreLogo
                          store={storeKey}
                          className="w-4 h-4 rounded-sm shrink-0"
                        />
                        <span className="truncate max-w-[85px]">{storeInfo.label}</span>
                      </span>

                      {/* Deal Hotness / Temperature Score */}
                      <span
                        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${tempResult.textColorClass} bg-white/[0.04]`}
                      >
                        <Flame size={11} weight="fill" />
                        {tempResult.formattedTemperature}
                      </span>

                      <span className="text-[#6b7280] text-[10px] ml-auto shrink-0 flex items-center gap-0.5">
                        <Clock size={10} weight="bold" />{" "}
                        {getTimeAgo(product.createdAt)}
                      </span>
                    </div>

                    {/* Product Name */}
                    <p className="text-[13px] md:text-[13.5px] font-medium text-[#e2e4e9] leading-snug line-clamp-2 mb-1 group-hover:text-white transition-colors">
                      {product.name}
                    </p>

                    {/* Highlights row: Coupon / Lowest Price */}
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {(product as any).isLowestPriceEver && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-teal-500/10 border border-teal-500/25 text-teal-400 text-[9.5px] font-bold">
                          🏆 Menor preço
                        </span>
                      )}
                      {displayCoupon && (
                        <button
                          onClick={(e) => copyCoupon(e, displayCoupon, product.id)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[9.5px] font-bold active:scale-95 transition-all"
                          title="Clique para copiar cupom"
                        >
                          {copiedCouponId === product.id ? (
                            <>
                              <Check size={10} weight="bold" className="text-emerald-400" />
                              <span className="text-emerald-400">Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Tag size={9} weight="fill" className="shrink-0" />
                              <span className="max-w-[100px] truncate">
                                Cupom: {displayCoupon}
                              </span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Price row */}
                    <div className="flex items-end gap-2 mt-auto">
                      {price > 0 ? (
                        <>
                          <span className="text-[16px] md:text-[17px] font-bold text-[#ff334b] leading-none">
                            {fmt(price)}
                          </span>
                          {discount > 0 && (
                            <span className="text-[11px] text-[#6b7280] line-through leading-none pb-px">
                              {fmt(originalPrice)}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-[13px] font-semibold text-white">
                          Ver oferta
                        </span>
                      )}

                      {/* Action Chevron */}
                      <span className="ml-auto flex-shrink-0 w-7 h-7 rounded-lg bg-white/[0.05] border border-white/[0.06] flex items-center justify-center text-[#8e92a4] group-hover:text-[#ff334b] group-hover:border-[#ff334b]/30 group-hover:bg-[#ff334b]/10 transition-all">
                        <ArrowUpRight size={14} weight="bold" />
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── FOOTER ACTIONS (Likes, Comments, Favorites) ── */}
                <div
                  className="flex items-center gap-3 px-3 py-1.5 border-t border-white/[0.05] bg-white/[0.01]"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Upvote */}
                  <button
                    onClick={() => handleVote("LIKE")}
                    className={`flex items-center gap-1 text-[11px] font-semibold transition-colors py-1 ${
                      userVote === "LIKE"
                        ? "text-emerald-400"
                        : "text-[#8e92a4] hover:text-emerald-400"
                    }`}
                    title="Votar positivo"
                  >
                    <ThumbsUp
                      size={13}
                      weight={userVote === "LIKE" ? "fill" : "regular"}
                    />
                    {product._count?.likes || 0}
                  </button>

                  {/* Downvote */}
                  <button
                    onClick={() => handleVote("DISLIKE")}
                    className={`flex items-center gap-1 text-[11px] font-semibold transition-colors py-1 ${
                      userVote === "DISLIKE"
                        ? "text-red-400"
                        : "text-[#8e92a4] hover:text-red-400"
                    }`}
                    title="Votar negativo"
                  >
                    <ThumbsDown
                      size={13}
                      weight={userVote === "DISLIKE" ? "fill" : "regular"}
                    />
                    {product._count?.dislikes || 0}
                  </button>

                  {/* Comments */}
                  <button
                    onClick={() =>
                      router.push(`/produto/${product.shortId || product.id}#comments`)
                    }
                    className="flex items-center gap-1 text-[11px] font-semibold text-[#8e92a4] hover:text-white transition-colors py-1"
                    title="Ver comentários"
                  >
                    <ChatCircle size={13} weight="regular" />
                    {product._count?.comments || 0}
                  </button>

                  {/* Favorite / Bookmark */}
                  <button
                    onClick={(e) => toggleFavorite(product.id, e)}
                    className={`flex items-center gap-1 text-[11px] font-semibold transition-colors ml-auto py-1 ${
                      favoriteIds.has(product.id)
                        ? "text-rose-400"
                        : "text-[#8e92a4] hover:text-rose-400"
                    }`}
                    title="Salvar oferta"
                  >
                    <Heart
                      size={14}
                      weight={favoriteIds.has(product.id) ? "fill" : "regular"}
                    />
                  </button>

                  {/* Ver mais */}
                  <button
                    onClick={() =>
                      router.push(`/produto/${product.shortId || product.id}`)
                    }
                    className="flex items-center gap-0.5 text-[11px] font-semibold text-white hover:text-[#ff334b] transition-colors py-1 pl-1"
                  >
                    Ver <ArrowRight size={10} weight="bold" className="text-[#ff334b]" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Load more */}
      {visibleCount < filteredProducts.length && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => setVisibleCount((p) => p + 20)}
            className="btn-primary h-11 px-8 text-[14px]"
          >
            Ver mais {Math.min(20, filteredProducts.length - visibleCount)} ofertas
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
